import { useState, useRef } from 'react';
import { useApp } from '../context';
import Avatar from '../components/Avatar';
import type { User } from '../types';
import type { NotifyPrefs } from '../auth';

const DEFAULT_NOTIFY_PREFS: NotifyPrefs = { love: true, memories: true, expenses: true, events: true };

export default function Settings() {
  const {
    currentUser, toast, profilePhotos, updateProfilePhoto, state, toggleDarkMode, logout,
    isLinked, myProfile, partnerProfile, sentInvite, invitePartner, cancelSentInvite, pendingInvite, acceptInvite, rejectInvite,
    updateNotifyPrefs,
  } = useApp();
  const [responding, setResponding] = useState(false);
  const notifyPrefs = myProfile?.notifyPrefs ?? DEFAULT_NOTIFY_PREFS;
  const darkMode = state.darkMode;
  const [showLogout, setShowLogout] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviting, setInviting] = useState(false);

  async function handleInvite() {
    setInviteError('');
    if (!inviteUsername.trim()) return setInviteError('Nhập tên người bạn muốn mời.');
    setInviting(true);
    const res = await invitePartner(inviteUsername.trim());
    setInviting(false);
    if (!res.ok) return setInviteError(res.error || 'Có lỗi xảy ra.');
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
            <Avatar user={currentUser} size={64} ring photoUrl={profilePhotos[currentUser]} />
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
            <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              {partnerProfile ? `Đã kết nối với ${partnerProfile.displayName} 💕` : 'PALVIN · Alvin ❤️ Paoi'}
            </p>
          </div>
        </div>
        {/* Partner info / invite form */}
        {isLinked && partnerProfile ? (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--sakura-light)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar user={partnerProfile.displayName as User} size={36} photoUrl={profilePhotos[partnerProfile.displayName]} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{partnerProfile.displayName}</p>
              <p style={{ fontSize: 11, color: 'var(--sakura-deep)' }}>Nửa kia của bạn 💖</p>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-2)', textAlign: 'right' }}>
              <p>🔒 Đã liên kết</p>
              <p>Vĩnh viễn</p>
            </div>
          </div>
        ) : pendingInvite ? (
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--sakura-light)', borderRadius: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 12 }}>
              💕 <strong>{pendingInvite.name}</strong> muốn liên kết với bạn
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleRespond(true)}
                disabled={responding}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Đồng ý 💕
              </button>
              <button
                onClick={() => handleRespond(false)}
                disabled={responding}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Từ chối
              </button>
            </div>
          </div>
        ) : sentInvite ? (
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--sakura-light)', borderRadius: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 4 }}>
              Đã gửi lời mời tới <strong>{sentInvite.name}</strong>
            </p>
            <p style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 10 }}>Đang chờ xác nhận...</p>
            <button
              onClick={() => cancelSentInvite(sentInvite.id)}
              style={{ width: '100%', padding: '8px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', color: 'var(--sakura-deep)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              Huỷ lời mời
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--sakura-light)', borderRadius: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--sakura-deep)', marginBottom: 8 }}>Mời nửa kia liên kết 💕</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={inviteUsername}
                onChange={e => { setInviteUsername(e.target.value); setInviteError(''); }}
                placeholder="Tên đăng nhập của người kia"
                style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 13 }}
              />
              <button onClick={handleInvite} disabled={inviting} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: 'var(--sakura-deep)', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                {inviting ? '...' : 'Mời'}
              </button>
            </div>
            {inviteError && <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6 }}>{inviteError}</p>}
          </div>
        )}
      </div>

      {/* Couple */}
      <Section title="Couple">
        <SettingRow emoji="❤️" label="Couple Name" value="Alvin ❤️ Paoi" onEdit={() => toast('Edit couple name', '✏️')} />
        <SettingRow emoji="📅" label="Anniversary" value="August 21, 2023" onEdit={() => toast('Edit anniversary', '✏️')} />
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <ToggleRow emoji="💌" label="Love notes" value={notifyPrefs.love} onToggle={() => toggleNotif('love')} />
        <ToggleRow emoji="🌸" label="New memories" value={notifyPrefs.memories} onToggle={() => toggleNotif('memories')} />
        <ToggleRow emoji="💰" label="Expenses" value={notifyPrefs.expenses} onToggle={() => toggleNotif('expenses')} />
        <ToggleRow emoji="📅" label="Events & reminders" value={notifyPrefs.events} onToggle={() => toggleNotif('events')} />
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <ToggleRow emoji="🌙" label="Dark mode" value={darkMode} onToggle={toggleDarkMode} />
        <SettingRow emoji="🌸" label="Theme" value="Sakura Pink" />
      </Section>

      {/* Privacy */}
      <Section title="Privacy">
        <SettingRow emoji="🔐" label="Private mode" value="Enabled" />
        <SettingRow emoji="🛡️" label="Data" value="Local only" />
      </Section>

      {/* Danger zone */}
      <div className="card" style={{ padding: '16px', marginTop: 8 }}>
        {showLogout ? (
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Are you sure you want to sign out?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, padding: '10px', background: '#FEE2E2', border: 'none', borderRadius: 12, color: '#DC2626', fontWeight: 700, cursor: 'pointer', fontSize: 14 }} onClick={() => { setShowLogout(false); logout(); toast('Signed out', '👋'); }}>Sign out</button>
              <button style={{ flex: 1, padding: '10px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 12, color: 'var(--ink-2)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }} onClick={() => setShowLogout(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowLogout(true)} style={{ width: '100%', padding: '12px', background: 'none', border: 'none', color: '#DC2626', fontWeight: 600, fontSize: 15, cursor: 'pointer', textAlign: 'center' }}>Sign out</button>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-2)', marginTop: 24 }}>PALVIN v1.0 · Made with ❤️ for Alvin & Paoi</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 8, padding: '0 4px' }}>{title}</p>
      <div className="card" style={{ padding: '4px 0', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ emoji, label, value, onEdit }: { emoji: string; label: string; value: string; onEdit?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{emoji}</span>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{emoji}</span>
      <p style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{label}</p>
      <button onClick={onToggle} style={{ width: 48, height: 27, borderRadius: 99, border: 'none', background: value ? 'var(--sakura-accent)' : 'var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: value ? 24 : 3, width: 21, height: 21, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
      </button>
    </div>
  );
}
