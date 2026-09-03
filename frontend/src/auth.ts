import { supabase } from './lib/supabaseClient';

export interface NotifyPrefs {
  love: boolean;
  memories: boolean;
  expenses: boolean;
  events: boolean;
}

const DEFAULT_NOTIFY_PREFS: NotifyPrefs = { love: true, memories: true, expenses: true, events: true };

export interface AuthProfile {
  id: string;
  displayName: string;
  photoUrl?: string;
  coupleId: string | null;
  notifyPrefs: NotifyPrefs;
  lastActiveAt: string | null;
}

export interface PendingInvite {
  id: string;
  name: string;
  createdAt: string;
}

interface Result {
  ok: boolean;
  error?: string;
}

function mapAuthError(message: string): string {
  if (message.includes('Email not confirmed')) return "Email not confirmed yet. Please check your inbox.";
  if (message.includes('Invalid login credentials')) return 'Incorrect email or password.';
  if (message.includes('User already registered')) return 'This email is already registered.';
  if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('database error')) {
    return "This username is taken — please choose another.";
  }
  if (message.toLowerCase().includes('token') && message.toLowerCase().includes('expired')) return 'This code has expired — please request a new one.';
  if (message.toLowerCase().includes('token') || message.toLowerCase().includes('otp')) return 'Incorrect verification code.';
  if (message.toLowerCase().includes('password')) return 'Invalid password (minimum 6 characters).';
  return message;
}

export async function register(email: string, password: string, username: string): Promise<Result> {
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: username.trim() } },
  });
  if (error) return { ok: false, error: mapAuthError(error.message) };
  return { ok: true };
}

export async function login(username: string, password: string): Promise<Result> {
  const { data: email, error: lookupError } = await supabase.rpc('email_for_username', { username: username.trim() });
  if (lookupError || !email) return { ok: false, error: 'Account not found.' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: mapAuthError(error.message) };
  return { ok: true };
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

function rowToProfile(row: { id: string; display_name: string; couple_id: string | null; avatar_url: string | null; notify_prefs?: Partial<NotifyPrefs> | null; last_active_at: string | null }): AuthProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    coupleId: row.couple_id,
    photoUrl: row.avatar_url ?? undefined,
    notifyPrefs: { ...DEFAULT_NOTIFY_PREFS, ...(row.notify_prefs ?? {}) },
    lastActiveAt: row.last_active_at,
  };
}

const PROFILE_SELECT = 'id, display_name, couple_id, avatar_url, notify_prefs, last_active_at';

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', user.id)
    .maybeSingle();
  return data ? rowToProfile(data) : null;
}

export async function getPartnerProfile(): Promise<AuthProfile | null> {
  const me = await getCurrentProfile();
  if (!me?.coupleId) return null;
  const { data } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('couple_id', me.coupleId)
    .neq('id', me.id)
    .maybeSingle();
  return data ? rowToProfile(data) : null;
}

// Lightweight poll (no notify_prefs/avatar, just presence) — used by the
// activity monitor to refresh live without re-fetching everything.
export async function fetchActivityStatuses(coupleId: string): Promise<{ id: string; displayName: string; lastActiveAt: string | null }[]> {
  const { data, error } = await supabase.from('profiles').select('id, display_name, last_active_at').eq('couple_id', coupleId);
  if (error || !data) return [];
  return data.map(r => ({ id: r.id, displayName: r.display_name, lastActiveAt: r.last_active_at }));
}

export async function updatePhoto(photoUrl: string): Promise<Result> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not logged in.' };
  const { error } = await supabase.from('profiles').update({ avatar_url: photoUrl }).eq('id', user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateDisplayName(name: string): Promise<Result> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not logged in.' };
  const { error } = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', user.id);
  if (error) return { ok: false, error: mapAuthError(error.message) };
  return { ok: true };
}

export async function changePassword(newPassword: string): Promise<Result> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: mapAuthError(error.message) };
  return { ok: true };
}

export async function updateNotifyPrefs(prefs: NotifyPrefs): Promise<Result> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not logged in.' };
  const { error } = await supabase.from('profiles').update({ notify_prefs: prefs }).eq('id', user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Called once per app session (see context.tsx) — simply opening the app
// counts as "activity" here, unlike the stricter "did something real" bar
// mark_active_today() uses for the couple streak.
export async function touchLastActive(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', user.id);
}

/* ── Partner invite / accept flow (replaces instant link-code linking) ── */

export async function sendInvite(username: string): Promise<Result> {
  const { data, error } = await supabase.rpc('invite_partner', { target_username: username.trim() });
  if (error) return { ok: false, error: error.message };
  return data as Result;
}

export async function respondInvite(inviteId: string, accept: boolean): Promise<Result> {
  const { data, error } = await supabase.rpc('respond_invite', { invite_id: inviteId, accept });
  if (error) return { ok: false, error: error.message };
  return data as Result;
}

export async function cancelInvite(inviteId: string): Promise<Result> {
  const { data, error } = await supabase.rpc('cancel_invite', { invite_id: inviteId });
  if (error) return { ok: false, error: error.message };
  return data as Result;
}

export async function getMyInvites(): Promise<{ sent: PendingInvite[]; received: PendingInvite[] }> {
  const { data, error } = await supabase.rpc('get_my_invites');
  if (error || !data) return { sent: [], received: [] };
  const d = data as {
    sent: { id: string; toName: string; createdAt: string }[];
    received: { id: string; fromName: string; createdAt: string }[];
  };
  return {
    sent: d.sent.map(s => ({ id: s.id, name: s.toName, createdAt: s.createdAt })),
    received: d.received.map(r => ({ id: r.id, name: r.fromName, createdAt: r.createdAt })),
  };
}
