import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import type { User } from '../types';
import type { NotifyPrefs } from '../auth';
import { fetchActivityStatuses } from '../auth';
import { fetchActivityLog, type ActivityLogEntry } from '../activityLog';
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '../push';

const DEFAULT_NOTIFY_PREFS: NotifyPrefs = { love: true, memories: true, expenses: true, events: true };

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
    currentUser, toast, updateProfilePhoto, state, screen, toggleDarkMode, logout,
    isLinked, isAdmin, myProfile, partnerProfile, sentInvite, invitePartner, cancelSentInvite, pendingInvite, acceptInvite, rejectInvite,
    updateNotifyPrefs, setRelationshipStart, updateDisplayName, changePassword,
  } = useApp();
  const [responding, setResponding] = useState(false);
  const notifyPrefs = myProfile?.notifyPrefs ?? DEFAULT_NOTIFY_PREFS;
  const darkMode = myProfile?.darkMode ?? false;
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
  const [, setTick] = useState(0);

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

    const loadStatuses = () => fetchActivityStatuses(coupleId).then(setActivityStatuses);
    const loadLog = () => fetchActivityLog(names, myProfile.displayName).then(setActivityLog);
    loadStatuses();
    loadLog();
    const statusTimer = setInterval(loadStatuses, 20000);
    const logTimer = setInterval(loadLog, 30000);
    const tickTimer = setInterval(() => setTick(t => t + 1), 15000);
    return () => { clearInterval(statusTimer); clearInterval(logTimer); clearInterval(tickTimer); };
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

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      if (url) updateProfilePhoto(url);
    };
    reader.readAsDataURL(file);
  }

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
              style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--sakura-deep)', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </button>
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
        </>
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

      {showPasswordModal && (
        <div
          onClick={() => setShowPasswordModal(false)}
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

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-2)', marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>PALVIN v1.0 · Made with <Icon emoji="❤️" size={13} /> for Alvin & Paoi</p>
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
