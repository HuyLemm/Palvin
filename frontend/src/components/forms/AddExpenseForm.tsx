import { useState } from 'react';
import { useApp } from '../../context';
import AmountInput from '../AmountInput';
import Icon from '../Icon';

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
    addExpense({ title, category: category.label, categoryEmoji: category.emoji, amount: parseFloat(amount), paidBy, date, note, type: 'expense' });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: '80vh', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Add Expense <Icon emoji="💰" size={16} /></p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input className="input-field" placeholder="What was it for?" value={title} onChange={e => setTitle(e.target.value)} />
          <AmountInput placeholder="Số tiền (VND)" value={amount} onChange={setAmount} />
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Category</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button key={cat.label} onClick={() => setCategory(cat)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: category.label === cat.label ? 'var(--sakura-light)' : 'var(--bg)', border: category.label === cat.label ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: category.label === cat.label ? 'var(--sakura-deep)' : 'var(--ink-2)', transition: 'all 0.15s' }}>
                  <Icon emoji={cat.emoji} size={14} /> {cat.label}
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
      </div>
    </div>
  );
}
