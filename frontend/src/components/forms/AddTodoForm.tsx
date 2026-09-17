import { useState } from 'react';
import { useApp } from '../../context';
import { TODO_CATEGORIES } from '../../todoCategories';
import BottomSheet from '../BottomSheet';
import Icon from '../Icon';

function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function AddTodoForm({ onClose }: { onClose: () => void }) {
  const { addTodo, currentUser, partnerProfile } = useApp();
  const partnerName = partnerProfile?.displayName;
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [kind, setKind] = useState<'daily' | 'once'>('daily');
  const [date, setDate] = useState(todayISO());
  const [owner, setOwner] = useState(currentUser);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) { setError('Enter a task title.'); return; }
    addTodo({ owner, title: title.trim(), category, kind, date: kind === 'once' ? date : undefined });
    onClose();
  };

  return (
    <BottomSheet onClose={onClose} title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>New To Do <Icon emoji="✅" size={16} /></span>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
        <input className="input-field" placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Category</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TODO_CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setCategory(c.key)} style={{ padding: '7px 11px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: category === c.key ? 'var(--sakura-light)' : 'var(--bg)', border: category === c.key ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: category === c.key ? 'var(--sakura-deep)' : 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Icon emoji={c.emoji} size={12} /> {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Repeats</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setKind('daily')} style={{ flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: kind === 'daily' ? 'var(--sakura-light)' : 'var(--bg)', border: kind === 'daily' ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: kind === 'daily' ? 'var(--sakura-deep)' : 'var(--ink-2)' }}>Every day</button>
            <button onClick={() => setKind('once')} style={{ flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: kind === 'once' ? 'var(--sakura-light)' : 'var(--bg)', border: kind === 'once' ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: kind === 'once' ? 'var(--sakura-deep)' : 'var(--ink-2)' }}>Just one day</button>
          </div>
        </div>
        {kind === 'once' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Date</p>
            <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
          </div>
        )}
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>For</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[currentUser, ...(partnerName ? [partnerName] : []), 'Both'].map(u => (
              <button key={u} onClick={() => setOwner(u)} style={{ flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: owner === u ? 'var(--sakura-light)' : 'var(--bg)', border: owner === u ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: owner === u ? 'var(--sakura-deep)' : 'var(--ink-2)' }}>{u}</button>
            ))}
          </div>
        </div>
        {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} style={{ flex: 2 }}>Add task</button>
        </div>
      </div>
    </BottomSheet>
  );
}
