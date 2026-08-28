import { useState } from 'react';
import { useApp } from '../../context';
import BottomSheet from '../BottomSheet';

const EMOJIS = ['🌸', '✈️', '🇯🇵', '💰', '🌅', '🍳', '📷', '🌱', '🎬', '🏠', '🎁', '💪', '🌍', '🎵', '✨'];

export default function AddGoalForm({ onClose }: { onClose: () => void }) {
  const { addGoal } = useApp();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) { setError('Please enter a goal.'); return; }
    addGoal({ title, emoji });
    onClose();
  };

  return (
    <BottomSheet onClose={onClose} title="New Goal ✨">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
        <input className="input-field" placeholder="What do you want to achieve together?" value={title} onChange={e => setTitle(e.target.value)} />
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Pick an emoji</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {EMOJIS.map(em => (
              <button key={em} onClick={() => setEmoji(em)} style={{ fontSize: 22, background: emoji === em ? 'var(--sakura-light)' : 'transparent', border: emoji === em ? '2px solid var(--sakura)' : '2px solid transparent', borderRadius: 10, width: 44, height: 44, cursor: 'pointer', transition: 'all 0.15s' }}>{em}</button>
            ))}
          </div>
        </div>
        {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} style={{ flex: 2 }}>Add Goal</button>
        </div>
      </div>
    </BottomSheet>
  );
}
