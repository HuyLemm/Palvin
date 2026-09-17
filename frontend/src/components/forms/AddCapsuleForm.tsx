import { useState } from 'react';
import { useApp } from '../../context';
import Icon from '../Icon';
import type { Capsule } from '../../types';

// Local calendar date (not UTC) — duplicated from TimeCapsule.tsx's own
// todayISO rather than imported, since TimeCapsule is lazy-loaded as its
// own chunk (see App.tsx via Us.tsx) and importing from it here (used by
// the eagerly-loaded quick-add menu) would pull the whole screen in.
function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

interface CapsuleFormData {
  to: Capsule['to'];
  title: string;
  occasion?: string;
  message: string;
  unlockDate: string;
}

export function CapsuleForm({ onClose, onSubmit, currentUser, existing }: {
  onClose: () => void;
  onSubmit: (data: CapsuleFormData) => void;
  currentUser: string;
  existing?: Capsule;
}) {
  const { partnerProfile } = useApp();
  const partnerName = partnerProfile?.displayName;
  const [to, setTo] = useState<string>(existing?.to ?? 'both');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [occasion, setOccasion] = useState(existing?.occasion ?? '');
  const [message, setMessage] = useState(existing?.message ?? '');
  const [unlockDate, setUnlockDate] = useState(existing?.unlockDate ?? todayISO());
  const isEdit = !!existing;

  const handleSubmit = () => {
    if (!title.trim() || !message.trim() || !unlockDate) return;
    onSubmit({ to, title: title.trim(), occasion: occasion.trim() || undefined, message: message.trim(), unlockDate });
    onClose();
  };

  return (
    <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 400, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 23, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon emoji="✍️" size={20} /> {isEdit ? 'Edit Letter' : 'Write a Letter'}</p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>TO</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['both', currentUser, ...(partnerName ? [partnerName] : [])].map(t => (
                <button key={t} onClick={() => setTo(t)} style={{ flex: 1, padding: '8px', border: to === t ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', borderRadius: 10, background: to === t ? 'var(--sakura-light)' : 'var(--bg)', color: to === t ? 'var(--sakura-deep)' : 'var(--ink-2)', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <Icon emoji={t === 'both' ? '💑' : t === currentUser ? '💙' : '💗'} size={14} /> {t === 'both' ? 'Both' : t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>TITLE</p>
            <input className="input-field" placeholder="e.g. To our future selves" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>WHAT'S THE OCCASION? (optional)</p>
            <input className="input-field" placeholder="e.g. Our 1-year anniversary" value={occasion} onChange={e => setOccasion(e.target.value)} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>OPEN ON</p>
            <input className="input-field" type="date" value={unlockDate} onChange={e => setUnlockDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>YOUR MESSAGE</p>
            <textarea className="input-field" placeholder="Write what you want to say to the future..." value={message} onChange={e => setMessage(e.target.value)} rows={6} style={{ resize: 'none', lineHeight: 1.6 }} />
          </div>
          <button onClick={handleSubmit} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon emoji="💌" size={16} /> {isEdit ? 'Save Changes' : 'Seal the Letter'}</button>
        </div>
      </div>
    </div>
  );
}

// Wraps CapsuleForm with the same composition TimeCapsule.tsx's own "+"
// button uses (addCapsule({ from: currentUser, ...data, opened: false,
// createdDate: todayISO() })) — this IS that same add flow, just reachable
// from the bottom navbar's quick-add menu too.
export default function AddCapsuleForm({ onClose }: { onClose: () => void }) {
  const { addCapsule, currentUser } = useApp();
  return (
    <CapsuleForm
      onClose={onClose}
      currentUser={currentUser}
      onSubmit={data => addCapsule({ from: currentUser, ...data, opened: false, createdDate: todayISO() })}
    />
  );
}
