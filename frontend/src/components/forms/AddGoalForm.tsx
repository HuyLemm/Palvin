import { useState } from 'react';
import { useApp } from '../../context';
import AmountInput from '../AmountInput';
import Icon from '../Icon';

const EMOJIS = ['🏖️', '✈️', '🏠', '💍', '🚗', '🎓', '💻', '📱', '🎉', '💰', '🐶', '🎁'];

export default function AddGoalForm({ onClose }: { onClose: () => void }) {
  const { addSavingsGoal } = useApp();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!title.trim())      { setError('Please enter a fund name.'); return; }
    if (!target || isNaN(+target) || +target <= 0) { setError('Please enter a valid target.'); return; }
    addSavingsGoal({ title, emoji, current: 0, target: parseFloat(target), deadline });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: '80vh', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Create New Fund <Icon emoji="💰" size={16} /></p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input className="input-field" placeholder="Fund name (e.g. Trip to Da Lat)" value={title} onChange={e => setTitle(e.target.value)} />
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
            <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button onClick={handleSubmit} style={{ flex: 2, padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15 }}>Create Fund</button>
          </div>
        </div>
      </div>
    </div>
  );
}
