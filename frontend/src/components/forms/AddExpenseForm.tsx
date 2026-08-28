import { useState } from 'react';
import { useApp } from '../../context';
import BottomSheet from '../BottomSheet';

const CATEGORIES = [
  { label: 'Food', emoji: '🍜' }, { label: 'Transportation', emoji: '🚗' },
  { label: 'Entertainment', emoji: '🎬' }, { label: 'Gifts', emoji: '🎁' },
  { label: 'Coffee', emoji: '☕' }, { label: 'Home', emoji: '🏠' },
  { label: 'Travel', emoji: '✈️' }, { label: 'Other', emoji: '📦' }
];

export default function AddExpenseForm({ onClose }: { onClose: () => void }) {
  const { addExpense, currentUser } = useApp();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paidBy, setPaidBy] = useState<'Alvin' | 'Paoi' | 'Both'>(currentUser);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!title.trim())     { setError('Please enter a title.'); return; }
    if (!amount || isNaN(+amount)) { setError('Please enter a valid amount.'); return; }
    addExpense({ title, category: category.label, categoryEmoji: category.emoji, amount: parseFloat(amount), paidBy, date, note });
    onClose();
  };

  return (
    <BottomSheet onClose={onClose} title="Add Expense 💰">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
        <input className="input-field" placeholder="What was it for?" value={title} onChange={e => setTitle(e.target.value)} />
        <input className="input-field" type="number" placeholder="Amount ($)" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" min="0" />
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Category</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button key={cat.label} onClick={() => setCategory(cat)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: category.label === cat.label ? 'var(--sakura-light)' : 'var(--bg)', border: category.label === cat.label ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: category.label === cat.label ? 'var(--sakura-deep)' : 'var(--ink-2)', transition: 'all 0.15s' }}>
                <span>{cat.emoji}</span> {cat.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Paid by</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['Alvin', 'Paoi', 'Both'] as const).map(u => (
              <button key={u} onClick={() => setPaidBy(u)} style={{ flex: 1, padding: '10px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: paidBy === u ? 'var(--sakura-light)' : 'var(--bg)', border: paidBy === u ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: paidBy === u ? 'var(--sakura-deep)' : 'var(--ink-2)', transition: 'all 0.15s' }}>{u}</button>
            ))}
          </div>
        </div>
        <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <input className="input-field" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
        {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} style={{ flex: 2 }}>Save Expense</button>
        </div>
      </div>
    </BottomSheet>
  );
}
