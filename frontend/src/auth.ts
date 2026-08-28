import { supabase } from './lib/supabaseClient';

export interface AuthProfile {
  id: string;
  displayName: string;
  photoUrl?: string;
  coupleId: string | null;
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
  if (message.includes('Email not confirmed')) return 'Email chưa được xác nhận. Hãy kiểm tra hộp thư.';
  if (message.includes('Invalid login credentials')) return 'Email hoặc mật khẩu không đúng.';
  if (message.includes('User already registered')) return 'Email này đã được đăng ký.';
  if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('database error')) {
    return 'Tên đăng nhập này đã có người dùng, hãy chọn tên khác.';
  }
  if (message.toLowerCase().includes('token') && message.toLowerCase().includes('expired')) return 'Mã đã hết hạn, hãy gửi lại mã mới.';
  if (message.toLowerCase().includes('token') || message.toLowerCase().includes('otp')) return 'Mã xác nhận không đúng.';
  if (message.toLowerCase().includes('password')) return 'Mật khẩu không hợp lệ (tối thiểu 6 ký tự).';
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
  if (lookupError || !email) return { ok: false, error: 'Không tìm thấy tài khoản.' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: mapAuthError(error.message) };
  return { ok: true };
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

function rowToProfile(row: { id: string; display_name: string; couple_id: string | null; avatar_url: string | null }): AuthProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    coupleId: row.couple_id,
    photoUrl: row.avatar_url ?? undefined,
  };
}

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, couple_id, avatar_url')
    .eq('id', user.id)
    .maybeSingle();
  return data ? rowToProfile(data) : null;
}

export async function getPartnerProfile(): Promise<AuthProfile | null> {
  const me = await getCurrentProfile();
  if (!me?.coupleId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, couple_id, avatar_url')
    .eq('couple_id', me.coupleId)
    .neq('id', me.id)
    .maybeSingle();
  return data ? rowToProfile(data) : null;
}

export async function updatePhoto(photoUrl: string): Promise<Result> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Chưa đăng nhập.' };
  const { error } = await supabase.from('profiles').update({ avatar_url: photoUrl }).eq('id', user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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
