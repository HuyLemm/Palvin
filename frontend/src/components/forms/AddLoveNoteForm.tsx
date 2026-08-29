import { useState } from 'react';
import { useApp } from '../../context';
import BottomSheet from '../BottomSheet';
import Icon from '../Icon';
import type { User } from '../../types';

const MOODS = ['💕', '🥰', '😍', '🌸', '✨', '🥺', '💌', '🎀'];

export default function AddLoveNoteForm({ onClose }: { onClose: () => void }) {
  const { addLoveNote, currentUser } = useApp();
  const to: User = currentUser === 'Alvin' ? 'Paoi' : 'Alvin';
  const [message, setMessage] = useState('');
  const [mood, setMood] = useState('💕');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!message.trim()) { setError('Write something beautiful'); return; }
    const now = new Date();
    addLoveNote({
      from: currentUser, to,
      message,
      date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      mood
    });
    onClose();
  };

  return (
    <BottomSheet onClose={onClose} title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Write a Love Note <Icon emoji="💌" size={18} /></span>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
        <div style={{ background: 'var(--sakura-light)', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: 'var(--sakura-deep)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          From <strong>{currentUser}</strong> <Icon emoji="→" size={14} /> <strong>{to}</strong>
        </div>
        <textarea className="input-field" placeholder={`Write something for ${to}...`} value={message} onChange={e => setMessage(e.target.value)} rows={5} />
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Mood</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MOODS.map(m => (
              <button key={m} onClick={() => setMood(m)} style={{ background: mood === m ? 'var(--sakura-light)' : 'transparent', border: mood === m ? '2px solid var(--sakura)' : '2px solid transparent', borderRadius: 10, width: 44, height: 44, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji={m} size={22} /></button>
            ))}
          </div>
        </div>
        {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{error} <Icon emoji="✨" size={14} /></p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>Send Note <Icon emoji="💌" size={16} /></button>
        </div>
      </div>
    </BottomSheet>
  );
}
