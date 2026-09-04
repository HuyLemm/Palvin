import { useState } from 'react';
import { useApp } from '../../context';
import AmountInput from '../AmountInput';
import Icon from '../Icon';
import type { SavingsGoal } from '../../types';

const EMOJIS = ['🏖️', '✈️', '🏠', '💍', '🚗', '🎓', '💻', '📱', '🎉', '💰', '🐶', '🎁'];

export default function EditGoalForm({ goal, onClose }: { goal: SavingsGoal; onClose: () => void }) {
  const { updateSavingsGoal, deleteSavingsGoal } = useApp();
  const [title, setTitle] = useState(goal.title);
  const [emoji, setEmoji] = useState(goal.emoji);
  const [target, setTarget] = useState(String(Math.round(goal.target)));
  const [deadline, setDeadline] = useState(goal.deadline);
  const [error, setError] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = () => {
    if (!title.trim())      { setError('Please enter a fund name.'); return; }
    if (!target || isNaN(+target) || +target <= 0) { setError('Please enter a valid target.'); return; }
    setConfirmSave(true);
  };

  const confirmSubmit = async () => {
    setBusy(true);
    await updateSavingsGoal(goal.id, { title, emoji, target: parseFloat(target), deadline });
    setConfirmSave(false);
    onClose();
  };

  const confirmDeleteNow = async () => {
    setBusy(true);
    await deleteSavingsGoal(goal.id);
    setConfirmDelete(false);
    onClose();
  };

  return (
    <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Edit Fund <Icon emoji="✏️" size={15} /></p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input className="input-field" placeholder="Fund name" value={title} onChange={e => setTitle(e.target.value)} />
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Icon</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)} style={{
                  width: 38, height: 38, border: emoji === e ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)',
                  borderRadius: 10, background: emoji === e ? 'var(--sakura-light)' : 'var(--bg)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><Icon emoji={e} size={18} /></button>
              ))}
            </div>
          </div>
          <AmountInput placeholder="Target (VND)" value={target} onChange={setTarget} />
          <input className="input-field" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
          {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setConfirmDelete(true)} style={{ padding: '13px 16px', borderRadius: 14, border: '1.5px solid #E8524A', background: 'var(--white)', color: '#E8524A', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Delete</button>
            <button onClick={handleSubmit} style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15 }}>Save Changes</button>
          </div>
        </div>
      </div>

      {/* Confirm save */}
      {confirmSave && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Save these changes?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>The fund's info will be updated.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmSave(false)} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmSubmit} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Delete this fund?</p>
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
