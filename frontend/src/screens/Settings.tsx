import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import EmojiColorPicker from '../components/EmojiColorPicker';
import type { User, MoneyCategoryItem, MoneyCategoryKind } from '../types';
import type { NotifyPrefs } from '../auth';
import { fetchActivityStatuses, DEFAULT_QUICK_ACTIONS } from '../auth';
import { fetchActivityLog, type ActivityLogEntry } from '../activityLog';
import { fetchDailyCompliance, acknowledgeComplianceMiss, type DailyComplianceReport } from '../dailyCompliance';
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '../push';

const DEFAULT_NOTIFY_PREFS: NotifyPrefs = { love: true, memories: true, expenses: true, events: true };

const QUICK_ACTION_EMOJI_CHOICES = ['🫂', '💭', '💗', '💕', '🥰', '😘', '🤗', '💌', '✨', '🌸', '💖', '🫶'];
const QUICK_ACTION_COLOR_CHOICES = ['#C95F7C', '#8B6FD4', '#4A8AE8', '#5AC26A', '#E8844A', '#DC2626', '#E85C97', '#C48A52'];

const MONEY_CATEGORY_EMOJI_CHOICES = ['🍜', '☕', '🎬', '🎁', '🏠', '✈️', '🚗', '🛍️', '🎮', '💰', '💵', '📈', '🎉', '📦'];
const MONEY_CATEGORY_KINDS: { key: MoneyCategoryKind; label: string }[] = [
  { key: 'expense', label: 'Expenses' },
  { key: 'income', label: 'Income' },
  { key: 'private', label: 'Private Stash' },
];

const ONLINE_WINDOW_MS = 2 * 60000;

function isOnline(iso: string | null): boolean {
  return !!iso && Date.now() - new Date(iso).getTime() < ONLINE_WINDOW_MS;
}

function formatLastActive(iso: string | null): string {
  if (!iso) return 'Unknown';
  if (isOnline(iso)) return 'Active now';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `Active ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Active yesterday';
  return `Active ${days}d ago`;
}

function formatRelativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span style={{
      display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
      background: online ? '#5AC26A' : 'var(--border)',
      boxShadow: online ? '0 0 0 3px rgba(90,194,106,0.25)' : 'none',
      flexShrink: 0,
    }} />
  );
}

export default function Settings() {
  const {
    currentUser, toast, updateProfilePhoto, state, screen, toggleDarkMode, updateQuickAction, logout,
    isLinked, isAdmin, myProfile, partnerProfile, sentInvite, invitePartner, cancelSentInvite, pendingInvite, acceptInvite, rejectInvite,
    updateNotifyPrefs, setRelationshipStart, updateDisplayName, changePassword,
    addMoneyCategory, updateMoneyCategory, removeMoneyCategory,
  } = useApp();
  const [responding, setResponding] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const notifyPrefs = myProfile?.notifyPrefs ?? DEFAULT_NOTIFY_PREFS;
  const darkMode = myProfile?.darkMode ?? false;
  const quickActions = myProfile?.quickActions ?? DEFAULT_QUICK_ACTIONS;

  const [editingQuickAction, setEditingQuickAction] = useState<'hug' | 'thinking' | null>(null);
  const [qaLabel, setQaLabel] = useState('');
  const [qaEmoji, setQaEmoji] = useState('');
  const [qaColor, setQaColor] = useState('');
  const [qaMessage, setQaMessage] = useState('');

  const openEditQuickAction = (slot: 'hug' | 'thinking') => {
    const cfg = quickActions[slot];
    setQaLabel(cfg.label); setQaEmoji(cfg.emoji); setQaColor(cfg.color); setQaMessage(cfg.message);
    setEditingQuickAction(slot);
  };
  const saveQuickAction = () => {
    if (!editingQuickAction || !qaLabel.trim()) return;
    updateQuickAction(editingQuickAction, { label: qaLabel.trim(), emoji: qaEmoji, color: qaColor, message: qaMessage.trim() });
    setEditingQuickAction(null);
  };
  const [showLogout, setShowLogout] = useState(false);

  // Push notifications — a real system notification even with Palvin fully
  // closed (chat messages only, for now). Off by default everywhere: only a
  // deliberate tap on this toggle ever prompts for permission.
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  useEffect(() => {
    if (isPushSupported()) isPushSubscribed().then(setPushOn);
  }, []);
  const togglePush = async () => {
    if (!myProfile || pushBusy) return;
    setPushBusy(true);
    if (pushOn) {
      await unsubscribeFromPush();
      setPushOn(false);
    } else {
      const res = await subscribeToPush(myProfile.id);
      if (res.ok) setPushOn(true);
      else toast(res.error || 'Could not enable notifications', '⚠️');
    }
    setPushBusy(false);
  };

  // Private admin-only panel (isAdmin comes from context) — live activity
  // monitor + an edit/delete audit log. Polls on an interval only while this
  // screen is mounted, not globally, since it's a niche view.
  const [activityStatuses, setActivityStatuses] = useState<{ id: string; displayName: string; lastActiveAt: string | null }[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [compliance, setCompliance] = useState<DailyComplianceReport>({ streakMisses: [], todoMisses: [] });
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [, setTick] = useState(0);

  // Manage Categories (admin-only) — Food/Entertainment/Other/... used to be
  // hardcoded arrays in the expense/income/Private Stash forms; now editable
  // per-couple rows (money_categories), same pattern as Our Favourites'
  // category editor in Us.tsx.
  const [catKind, setCatKind] = useState<MoneyCategoryKind>('expense');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState(MONEY_CATEGORY_EMOJI_CHOICES[0]);
  const [editingMoneyCategory, setEditingMoneyCategory] = useState<MoneyCategoryItem | null>(null);
  const [editCatLabel, setEditCatLabel] = useState('');
  const [editCatEmoji, setEditCatEmoji] = useState('');
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<MoneyCategoryItem | null>(null);

  const closeAddCategory = () => { setShowAddCategory(false); setNewCatLabel(''); setNewCatEmoji(MONEY_CATEGORY_EMOJI_CHOICES[0]); };
  const handleAddMoneyCategory = () => {
    if (!newCatLabel.trim()) return;
    addMoneyCategory(catKind, { label: newCatLabel.trim(), emoji: newCatEmoji });
    closeAddCategory();
  };
  const openEditMoneyCategory = (cat: MoneyCategoryItem) => {
    setEditingMoneyCategory(cat); setEditCatLabel(cat.label); setEditCatEmoji(cat.emoji);
  };
  const closeEditMoneyCategory = () => setEditingMoneyCategory(null);
  const handleSaveMoneyCategory = () => {
    if (!editingMoneyCategory || !editCatLabel.trim()) return;
    updateMoneyCategory(catKind, editingMoneyCategory.id, { label: editCatLabel.trim(), emoji: editCatEmoji });
    closeEditMoneyCategory();
  };

  function renderLogEntry(entry: ActivityLogEntry) {
    return (
      <div key={entry.id} className="activity-log-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 26, height: 26, borderRadius: 99, background: entry.action === 'delete' ? '#FEE2E2' : 'var(--sakura-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
          <Icon emoji={entry.action === 'delete' ? '🗑️' : '✏️'} size={12} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>{entry.message}</p>
          <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>{formatRelativeTime(entry.createdAt)}</p>
        </div>
      </div>
    );
  }

  function formatMissDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function dismissMiss(kind: 'streak' | 'todo', m: { profileName: string; date: string }) {
    // Optimistic: drop it from local state immediately, then persist the
    // dismissal — a failed write just means it reappears on the next poll.
    setCompliance(c => kind === 'streak'
      ? { ...c, streakMisses: c.streakMisses.filter(x => !(x.profileName === m.profileName && x.date === m.date)) }
      : { ...c, todoMisses: c.todoMisses.filter(x => !(x.profileName === m.profileName && x.date === m.date)) });
    acknowledgeComplianceMiss(m.profileName, m.date, kind);
  }

  function renderMissRow(kind: 'streak' | 'todo', m: { profileName: string; date: string }, key: string) {
    return (
      <div key={key} className="activity-log-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 26, height: 26, borderRadius: 99, background: kind === 'streak' ? '#FEE2E2' : '#FEF3E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon emoji={kind === 'streak' ? '🔥' : '✅'} size={12} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, color: 'var(--ink)' }}>
            <strong>{m.profileName}</strong> {kind === 'streak' ? "didn't keep the streak" : "left a daily task unfinished"}
          </p>
          <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>{formatMissDate(m.date)}</p>
        </div>
        <button
          onClick={() => dismissMiss(kind, m)}
          title="Dismiss"
          style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <Icon emoji="✕" size={10} />
        </button>
      </div>
    );
  }

  // Settings stays mounted in the background once visited (App.tsx's
  // keep-alive ScreenRouter) — the `screen === 'settings'` guard stops these
  // three polling intervals once the user's actually looked away, instead of
  // three timers competing with whatever tab IS active for the rest of the
  // session.
  useEffect(() => {
    if (!isAdmin || !myProfile?.coupleId || screen !== 'settings') return;
    const coupleId = myProfile.coupleId;
    const names: Record<string, string> = {};
    if (myProfile) names[myProfile.id] = myProfile.displayName;
    if (partnerProfile) names[partnerProfile.id] = partnerProfile.displayName;

    const profiles = [myProfile, partnerProfile].filter((p): p is NonNullable<typeof p> => !!p).map(p => ({ id: p.id, displayName: p.displayName }));

    const loadStatuses = () => fetchActivityStatuses(coupleId).then(setActivityStatuses);
    const loadLog = () => fetchActivityLog(names, myProfile.displayName).then(setActivityLog);
    const loadCompliance = () => fetchDailyCompliance(coupleId, profiles).then(setCompliance);
    loadStatuses();
    loadLog();
    loadCompliance();
    const statusTimer = setInterval(loadStatuses, 20000);
    const logTimer = setInterval(loadLog, 30000);
    const complianceTimer = setInterval(loadCompliance, 60000);
    const tickTimer = setInterval(() => setTick(t => t + 1), 15000);
    return () => { clearInterval(statusTimer); clearInterval(logTimer); clearInterval(complianceTimer); clearInterval(tickTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, myProfile?.coupleId, screen]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [editingAnniversary, setEditingAnniversary] = useState(false);
  const [anniversaryDraft, setAnniversaryDraft] = useState(state.relationshipStart ?? '');

  function saveAnniversary() {
    if (!anniversaryDraft) return;
    setRelationshipStart(anniversaryDraft);
    setEditingAnniversary(false);
  }

  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(myProfile?.displayName ?? '');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  async function saveUsername() {
    if (!usernameDraft.trim()) return;
    setUsernameError('');
    setSavingUsername(true);
    const res = await updateDisplayName(usernameDraft.trim());
    setSavingUsername(false);
    if (!res.ok) return setUsernameError(res.error || "Something went wrong.");
    setEditingUsername(false);
  }

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  function openPasswordModal() {
    setNewPassword(''); setConfirmPassword(''); setPasswordError('');
    setShowPasswordModal(true);
  }

  async function submitPassword() {
    if (newPassword.length < 6) return setPasswordError("Password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return setPasswordError("Passwords don't match.");
    setPasswordError('');
    setSavingPassword(true);
    const res = await changePassword(newPassword);
    setSavingPassword(false);
    if (!res.ok) return setPasswordError(res.error || "Something went wrong.");
    setShowPasswordModal(false);
  }

  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviting, setInviting] = useState(false);

  async function handleInvite() {
    setInviteError('');
    if (!inviteUsername.trim()) return setInviteError("Enter your partner's username.");
    setInviting(true);
    const res = await invitePartner(inviteUsername.trim());
    setInviting(false);
    if (!res.ok) return setInviteError(res.error || "Something went wrong.");
    setInviteUsername('');
  }

  async function handleRespond(accept: boolean) {
    if (!pendingInvite) return;
    setResponding(true);
    if (accept) await acceptInvite(pendingInvite.id);
    else await rejectInvite(pendingInvite.id);
    setResponding(false);
  }

  const toggleNotif = (key: keyof NotifyPrefs) => {
    updateNotifyPrefs({ ...notifyPrefs, [key]: !notifyPrefs[key] });
  };

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoUploading(true);
    await updateProfilePhoto(file);
    setPhotoUploading(false);
  }

  // Merged, newest-first, for the "View all" modal — each entry tagged with
  // which of the two categories it is so renderMissRow can pick the icon.
  const complianceEntries = [
    ...compliance.streakMisses.map(m => ({ kind: 'streak' as const, ...m })),
    ...compliance.todoMisses.map(m => ({ kind: 'todo' as const, ...m })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const complianceNames = [myProfile, partnerProfile].filter((p): p is NonNullable<typeof p> => !!p).map(p => p.displayName);

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Profile section */}
      <div className="card" style={{ padding: '20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Avatar with edit */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar user={currentUser} size={64} ring />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={photoUploading}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--sakura-deep)', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              {photoUploading
                ? <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', animation: 'palvin-settings-spin 0.7s linear infinite' }} />
                : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>}
            </button>
            <style>{`@keyframes palvin-settings-spin { to { transform: rotate(360deg); } }`}</style>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{myProfile?.displayName || currentUser}</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              {partnerProfile ? <>Connected with {partnerProfile.displayName} <Icon emoji="💕" size={13} /></> : <>PALVIN · {myProfile?.displayName ?? currentUser}</>}
            </p>
          </div>
        </div>
        {/* Partner info / invite form */}
        {isLinked && partnerProfile ? (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--sakura-light)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar user={partnerProfile.displayName as User} size={36} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{partnerProfile.displayName}</p>
              <p style={{ fontSize: 11, color: 'var(--sakura-deep)', display: 'flex', alignItems: 'center', gap: 4 }}>Your other half <Icon emoji="💖" size={11} /></p>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-2)', textAlign: 'right' }}>
              <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}><Icon emoji="🔒" size={11} /> Linked</p>
              <p>Forever</p>
            </div>
          </div>
        ) : pendingInvite ? (
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--sakura-light)', borderRadius: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon emoji="💕" size={14} /> <strong>{pendingInvite.name}</strong> wants to link with you
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleRespond(true)}
                disabled={responding}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                Accept <Icon emoji="💕" size={13} />
              </button>
              <button
                onClick={() => handleRespond(false)}
                disabled={responding}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Decline
              </button>
            </div>
          </div>
        ) : sentInvite ? (
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--sakura-light)', borderRadius: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 4 }}>
              Invite sent to <strong>{sentInvite.name}</strong>
            </p>
            <p style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 10 }}>Waiting for confirmation...</p>
            <button
              onClick={() => cancelSentInvite(sentInvite.id)}
              style={{ width: '100%', padding: '8px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--sakura-deep)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              Cancel invite
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--sakura-light)', borderRadius: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--sakura-deep)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>Invite your partner to link <Icon emoji="💕" size={13} /></p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={inviteUsername}
                onChange={e => { setInviteUsername(e.target.value); setInviteError(''); }}
                placeholder="Your partner's username"
                style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 13 }}
              />
              <button onClick={handleInvite} disabled={inviting} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: 'var(--sakura-deep)', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                {inviting ? '...' : 'Invite'}
              </button>
            </div>
            {inviteError && <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6 }}>{inviteError}</p>}
          </div>
        )}
      </div>

      {/* Couple */}
      <Section title="Couple">
        <SettingRow
          emoji="❤️"
          label="Couple Name"
          value={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {myProfile?.displayName ?? currentUser}
              {partnerProfile && <><Icon emoji="❤️" size={13} /> {partnerProfile.displayName}</>}
            </span>
          }
        />
        {editingAnniversary ? (
          <div className="settings-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <Icon emoji="📅" size={20} style={{ flexShrink: 0 }} />
            <input
              type="date"
              value={anniversaryDraft}
              onChange={e => setAnniversaryDraft(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13 }}
            />
            <button onClick={saveAnniversary} style={{ background: 'var(--sakura-deep)', border: 'none', borderRadius: 8, padding: '6px 12px', color: 'white', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Save</button>
            <button onClick={() => setEditingAnniversary(false)} style={{ background: 'var(--bg)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'var(--ink-2)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          </div>
        ) : (
          <SettingRow
            emoji="📅"
            label="Anniversary"
            value={state.relationshipStart
              ? new Date(state.relationshipStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : 'Not set'}
            onEdit={() => { setAnniversaryDraft(state.relationshipStart ?? ''); setEditingAnniversary(true); }}
          />
        )}
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        {isPushSupported() && (
          <ToggleRow emoji="🔔" label="Push notifications for chat" value={pushOn} onToggle={togglePush} />
        )}
        <ToggleRow emoji="💌" label="Love notes" value={notifyPrefs.love} onToggle={() => toggleNotif('love')} />
        <ToggleRow emoji="🌸" label="New memories" value={notifyPrefs.memories} onToggle={() => toggleNotif('memories')} />
        <ToggleRow emoji="💰" label="Expenses" value={notifyPrefs.expenses} onToggle={() => toggleNotif('expenses')} />
        <ToggleRow emoji="📅" label="Events & reminders" value={notifyPrefs.events} onToggle={() => toggleNotif('events')} />
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <ToggleRow emoji="🌙" label="Dark mode" value={darkMode} onToggle={toggleDarkMode} />
      </Section>

      {/* Dashboard's quick-action buttons — personal to this account, doesn't
          change what your partner sees on theirs. */}
      <Section title="Quick Actions">
        <SettingRow emoji={quickActions.hug.emoji} label="Hug button" value={quickActions.hug.label} onEdit={() => openEditQuickAction('hug')} />
        <SettingRow emoji={quickActions.thinking.emoji} label="Thinking-of-you button" value={quickActions.thinking.label} onEdit={() => openEditQuickAction('thinking')} />
      </Section>

      {/* Account & Data */}
      <Section title="Account & Data">
        {editingUsername ? (
          <div className="settings-row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon emoji="👤" size={20} style={{ flexShrink: 0 }} />
              <input
                autoFocus
                value={usernameDraft}
                onChange={e => { setUsernameDraft(e.target.value); setUsernameError(''); }}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 13 }}
              />
              <button onClick={saveUsername} disabled={savingUsername} style={{ background: 'var(--sakura-deep)', border: 'none', borderRadius: 8, padding: '6px 12px', color: 'white', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{savingUsername ? '...' : 'Save'}</button>
              <button onClick={() => { setEditingUsername(false); setUsernameError(''); }} style={{ background: 'var(--bg)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'var(--ink-2)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            </div>
            {usernameError && <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6, marginLeft: 28 }}>{usernameError}</p>}
          </div>
        ) : (
          <SettingRow
            emoji="👤"
            label="Username"
            value={myProfile?.displayName || currentUser}
            onEdit={() => { setUsernameDraft(myProfile?.displayName ?? ''); setEditingUsername(true); }}
          />
        )}
        <SettingRow emoji="🔒" label="Password" value="••••••••" onEdit={openPasswordModal} />
      </Section>

      {/* Private — only visible on this specific account */}
      {isAdmin && partnerProfile && (
        <>
          <Section title="Activity Monitor">
            {(activityStatuses.length > 0
              ? activityStatuses
              : [myProfile, partnerProfile].filter((p): p is NonNullable<typeof p> => !!p).map(p => ({ id: p.id, displayName: p.displayName, lastActiveAt: p.lastActiveAt }))
            ).map(p => (
              <div key={p.id} className="settings-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                <Avatar user={p.displayName} size={36} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusDot online={isOnline(p.lastActiveAt)} /> {p.displayName}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>{formatLastActive(p.lastActiveAt)}</p>
                </div>
                {p.lastActiveAt && (
                  <p style={{ fontSize: 11, color: 'var(--ink-2)', textAlign: 'right' }}>
                    {new Date(p.lastActiveAt).toLocaleString('en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ))}
          </Section>

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 8, padding: '0 4px' }}>Edit & Delete Log</p>
            <div className="card" style={{ padding: '4px 0' }}>
              <style>{`.activity-log-row:last-child { border-bottom: none !important; }`}</style>
              {activityLog.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>No edit or delete activity recorded yet.</p>
                </div>
              ) : (
                <>
                  {activityLog.slice(0, 3).map(renderLogEntry)}
                  <button onClick={() => setShowLogModal(true)} className="activity-log-row" style={{ display: 'block', width: '100%', padding: '10px 16px', border: 'none', borderBottom: '1px solid var(--border)', background: 'none', color: 'var(--sakura-deep)', fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>
                    View all ({activityLog.length})
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 8, padding: '0 4px' }}>Daily Compliance</p>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: complianceEntries.length > 0 ? 14 : 0 }}>
                {complianceNames.map(name => (
                  <div key={name} style={{ flex: 1, textAlign: 'center', padding: '10px 6px', borderRadius: 12, background: 'var(--bg)' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{name}</p>
                    <p style={{ fontSize: 11, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                      <Icon emoji="🔥" size={11} /> {compliance.streakMisses.filter(m => m.profileName === name).length} streak miss{compliance.streakMisses.filter(m => m.profileName === name).length === 1 ? '' : 'es'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 2 }}>
                      <Icon emoji="✅" size={11} /> {compliance.todoMisses.filter(m => m.profileName === name).length} incomplete day{compliance.todoMisses.filter(m => m.profileName === name).length === 1 ? '' : 's'}
                    </p>
                  </div>
                ))}
              </div>
              {complianceEntries.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--ink-2)', textAlign: 'center' }}>No misses logged yet — everyone's kept up so far.</p>
              ) : (
                <button onClick={() => setShowComplianceModal(true)} style={{ display: 'block', width: '100%', padding: '10px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'none', color: 'var(--sakura-deep)', fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>
                  View log ({complianceEntries.length})
                </button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 8, padding: '0 4px' }}>Manage Categories</p>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 12 }}>
                {MONEY_CATEGORY_KINDS.map(k => (
                  <button key={k.key} onClick={() => setCatKind(k.key)} style={{ flex: 1, padding: '7px 4px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: catKind === k.key ? 'var(--sakura-accent)' : 'transparent', color: catKind === k.key ? 'white' : 'var(--ink-2)', transition: 'all 0.2s ease' }}>{k.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {state.moneyCategories[catKind].map(cat => (
                  <button key={cat.id} onClick={() => openEditMoneyCategory(cat)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--ink)' }}>
                    <Icon emoji={cat.emoji} size={14} /> {cat.label}
                  </button>
                ))}
                <button onClick={() => setShowAddCategory(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'var(--sakura-light)', border: '1.5px solid var(--sakura-accent)', color: 'var(--sakura-deep)' }}>
                  <Icon emoji="➕" size={12} /> Add
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showComplianceModal && (
        <div onClick={() => setShowComplianceModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 20, padding: '16px 0 4px', width: '100%', maxWidth: 400, maxHeight: '75vh', display: 'flex', flexDirection: 'column', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 16px' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Daily Compliance Log</p>
              <button onClick={() => setShowComplianceModal(false)} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji="✕" size={14} /></button>
            </div>
            <style>{`.activity-log-row:last-child { border-bottom: none !important; }`}</style>
            <div style={{ overflowY: 'auto' }}>
              {complianceEntries.map(e => renderMissRow(e.kind, e, `${e.kind}:${e.profileName}:${e.date}`))}
            </div>
          </div>
        </div>
      )}

      {showLogModal && (
        <div onClick={() => setShowLogModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 20, padding: '16px 0 4px', width: '100%', maxWidth: 400, maxHeight: '75vh', display: 'flex', flexDirection: 'column', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 16px' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Edit & Delete Log</p>
              <button onClick={() => setShowLogModal(false)} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji="✕" size={14} /></button>
            </div>
            <style>{`.activity-log-row:last-child { border-bottom: none !important; }`}</style>
            <div style={{ overflowY: 'auto' }}>
              {activityLog.map(renderLogEntry)}
            </div>
          </div>
        </div>
      )}

      {/* Add money category */}
      {showAddCategory && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeAddCategory}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>New category</p>
              <button onClick={closeAddCategory} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input-field" placeholder="Category name" value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} autoFocus />
              <div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Icon</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {MONEY_CATEGORY_EMOJI_CHOICES.map(e => (
                    <button key={e} onClick={() => setNewCatEmoji(e)} style={{ width: 36, height: 36, border: newCatEmoji === e ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', borderRadius: 10, background: newCatEmoji === e ? 'var(--sakura-light)' : 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji={e} size={16} /></button>
                  ))}
                </div>
              </div>
              <button onClick={handleAddMoneyCategory} disabled={!newCatLabel.trim()} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: newCatLabel.trim() ? 'pointer' : 'default', background: newCatLabel.trim() ? 'var(--sakura-accent)' : 'var(--border)', color: newCatLabel.trim() ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 15 }}>Create category</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit money category */}
      {editingMoneyCategory && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeEditMoneyCategory}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Edit category</p>
              <button onClick={closeEditMoneyCategory} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input-field" value={editCatLabel} onChange={e => setEditCatLabel(e.target.value)} autoFocus />
              <div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Icon</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {MONEY_CATEGORY_EMOJI_CHOICES.map(e => (
                    <button key={e} onClick={() => setEditCatEmoji(e)} style={{ width: 36, height: 36, border: editCatEmoji === e ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', borderRadius: 10, background: editCatEmoji === e ? 'var(--sakura-light)' : 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji={e} size={16} /></button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setConfirmDeleteCategory(editingMoneyCategory); closeEditMoneyCategory(); }} style={{ padding: '13px 16px', borderRadius: 14, border: '1.5px solid #E8524A', background: 'var(--white)', color: '#E8524A', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Delete</button>
                <button onClick={handleSaveMoneyCategory} disabled={!editCatLabel.trim()} style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', cursor: editCatLabel.trim() ? 'pointer' : 'default', background: editCatLabel.trim() ? 'var(--sakura-accent)' : 'var(--border)', color: editCatLabel.trim() ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 15 }}>Save changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete money category */}
      {confirmDeleteCategory && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDeleteCategory(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 300, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Delete category "{confirmDeleteCategory.label}"?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>Past transactions keep this category — it just won't be offered for new ones anymore.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDeleteCategory(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { removeMoneyCategory(catKind, confirmDeleteCategory.id); setConfirmDeleteCategory(null); }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {editingQuickAction && (
        <div
          onClick={() => setEditingQuickAction(null)}
          className="kb-modal-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)' }}>{editingQuickAction === 'hug' ? 'Hug button' : 'Thinking-of-you button'}</p>
              <button onClick={() => setEditingQuickAction(null)} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input-field" placeholder="Button label" value={qaLabel} onChange={e => setQaLabel(e.target.value)} autoFocus maxLength={24} />
              <EmojiColorPicker
                emojiChoices={QUICK_ACTION_EMOJI_CHOICES} emoji={qaEmoji} onEmojiChange={setQaEmoji}
                colorChoices={QUICK_ACTION_COLOR_CHOICES} color={qaColor} onColorChange={setQaColor}
              />
              <div style={{ padding: '14px 12px', borderRadius: 14, background: `${qaColor}14`, border: `1.5px solid ${qaColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <Icon emoji={qaEmoji} size={26} />
                <span style={{ fontSize: 12, fontWeight: 700, color: qaColor }}>{qaLabel || 'Preview'}</span>
              </div>
              <div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Message sent (optional)</p>
                <input className="input-field" placeholder="e.g. I love you so much" value={qaMessage} onChange={e => setQaMessage(e.target.value)} maxLength={80} />
                <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 6 }}>
                  This is what your partner actually sees — separate from the button label above. Leave blank to keep the rotating surprise messages.
                </p>
              </div>
              <button onClick={saveQuickAction} disabled={!qaLabel.trim()} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: qaLabel.trim() ? 'pointer' : 'default', background: qaLabel.trim() ? qaColor : 'var(--border)', color: qaLabel.trim() ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 15 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div
          onClick={() => setShowPasswordModal(false)}
          className="kb-modal-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}
          >
            <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="🔒" size={17} /> Change Password</p>
            <label style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>New password</label>
            <input
              type="password"
              autoFocus
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setPasswordError(''); }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14, margin: '6px 0 12px' }}
            />
            <label style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setPasswordError(''); }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14, margin: '6px 0 12px' }}
            />
            {passwordError && <p style={{ color: '#DC2626', fontSize: 12, marginBottom: 10 }}>{passwordError}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={submitPassword} disabled={savingPassword} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{savingPassword ? '...' : 'Save password'}</button>
              <button onClick={() => setShowPasswordModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="card" style={{ padding: '16px', marginTop: 8 }}>
        {showLogout ? (
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Are you sure you want to sign out?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, padding: '10px', background: '#FEE2E2', border: 'none', borderRadius: 12, color: '#DC2626', fontWeight: 700, cursor: 'pointer', fontSize: 14 }} onClick={() => { setShowLogout(false); logout(); toast('Signed out', '👋', { passive: true }); }}>Sign out</button>
              <button style={{ flex: 1, padding: '10px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 12, color: 'var(--ink-2)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }} onClick={() => setShowLogout(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowLogout(true)} style={{ width: '100%', padding: '12px', background: 'none', border: 'none', color: '#DC2626', fontWeight: 600, fontSize: 15, cursor: 'pointer', textAlign: 'center' }}>Sign out</button>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-2)', marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>PALVIN v1.1 · Made with <Icon emoji="❤️" size={13} /> for Alvin & Paoi</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 8, padding: '0 4px' }}>{title}</p>
      <div className="card" style={{ padding: '4px 0', overflow: 'hidden' }}>
        <style>{`.settings-row:last-child { border-bottom: none !important; }`}</style>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ emoji, label, value, onEdit }: { emoji: string; label: string; value: React.ReactNode; onEdit?: () => void }) {
  return (
    <div className="settings-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
      <Icon emoji={emoji} size={20} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{value}</p>
      </div>
      {onEdit && <button onClick={onEdit} style={{ background: 'var(--sakura-light)', border: 'none', borderRadius: 8, padding: '5px 12px', color: 'var(--sakura-deep)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Edit</button>}
    </div>
  );
}

function ToggleRow({ emoji, label, value, onToggle }: { emoji: string; label: string; value: boolean; onToggle: () => void }) {
  return (
    <div className="settings-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
      <Icon emoji={emoji} size={20} style={{ flexShrink: 0 }} />
      <p style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{label}</p>
      <button onClick={onToggle} style={{ width: 48, height: 27, borderRadius: 99, border: 'none', background: value ? 'var(--sakura-accent)' : 'var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: value ? 24 : 3, width: 21, height: 21, borderRadius: '50%', background: 'var(--white)', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
      </button>
    </div>
  );
}
