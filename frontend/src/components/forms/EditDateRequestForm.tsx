import { useState } from 'react';
import { useApp } from '../../context';
import Icon from '../Icon';
import type { DateRequest } from '../../types';

const CATEGORIES = [
  { emoji: '🎱', label: 'Playing Pool' },
  { emoji: '🍺', label: 'Drinks with Friends' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '👥', label: 'Hanging Out with Friends' },
  { emoji: '🎯', label: 'Going Out' },
  { emoji: '💼', label: 'Working Late' },
  { emoji: '🏋️', label: 'Gym' },
  { emoji: '🛒', label: 'Shopping' },
  { emoji: '🎤', label: 'Karaoke' },
  { emoji: '🌙', label: 'Coming Home Late' },
  { emoji: '✈️', label: 'Trip Away' },
  { emoji: '🎲', label: 'Other' },
];

export default function EditDateRequestForm({ req, onClose }: { req: DateRequest; onClose: () => void }) {
  const { updateDateRequest, deleteDateRequest } = useApp();
  const [category, setCategory] = useState(CATEGORIES.find(c => c.label === req.category) ?? CATEGORIES[0]);
  const [activity, setActivity] = useState(req.activity);
  const [location, setLocation] = useState(req.location);
  const [date, setDate] = useState(req.date);
  const [time, setTime] = useState(req.time);
  const [reason, setReason] = useState(req.reason);
  const [error, setError] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = () => {
    if (!activity.trim() || !date || !time) { setError('Please fill in all the details!'); return; }
    setConfirmSave(true);
  };

  const confirmSubmit = async () => {
    setBusy(true);
    await updateDateRequest(req.id, {
      category: category.label, categoryEmoji: category.emoji,
      activity: activity.trim(), location: location.trim() || 'Not decided yet',
      date, time, reason: reason.trim() || req.reason,
    });
    setConfirmSave(false);
    onClose();
  };

  const confirmDeleteNow = async () => {
    setBusy(true);
    await deleteDateRequest(req.id);
    setConfirmDelete(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: '80vh', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Edit Permission Request <Icon emoji="✏️" size={15} /></p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Activity type</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => (
                <button key={c.label} onClick={() => setCategory(c)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: category.label === c.label ? 'var(--sakura-light)' : 'var(--bg)', border: category.label === c.label ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: category.label === c.label ? 'var(--sakura-deep)' : 'var(--ink-2)', transition: 'all 0.15s' }}>
                  <Icon emoji={c.emoji} size={14} /> {c.label}
                </button>
              ))}
            </div>
          </div>

          <input className="input-field" placeholder="Specific activity" value={activity} onChange={e => setActivity(e.target.value)} />
          <input className="input-field" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} style={{ minWidth: 0, fontSize: 12.5, padding: '9px 8px' }} />
            <input type="time" className="input-field" value={time} onChange={e => setTime(e.target.value)} style={{ minWidth: 0, fontSize: 12.5, padding: '9px 8px' }} />
          </div>

          <textarea
            className="input-field"
            placeholder="Reason / promise"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            style={{ resize: 'none', lineHeight: 1.6 }}
          />

          {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setConfirmDelete(true)} style={{ padding: '13px 16px', borderRadius: 14, border: '1.5px solid #E8524A', background: 'var(--white)', color: '#E8524A', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Delete</button>
            <button onClick={handleSubmit} style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15 }}>Save Changes</button>
          </div>
        </div>
      </div>

      {/* Confirm save */}
      {confirmSave && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Save these changes?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>The request's info will be updated.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmSave(false)} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmSubmit} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--sakura), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Delete this request?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>This can't be undone once deleted.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDeleteNow} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
