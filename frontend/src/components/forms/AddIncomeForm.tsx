import { useState } from 'react';
import { useApp } from '../../context';
import AmountInput from '../AmountInput';
import Icon from '../Icon';

const CATEGORIES = [
  { label: 'Salary', emoji: '💵' }, { label: 'Bonus', emoji: '🎉' },
  { label: 'Gift', emoji: '🎁' }, { label: 'Investment', emoji: '📈' },
  { label: 'Selling Stuff', emoji: '🛍️' }, { label: 'Other', emoji: '📦' },
];

export default function AddIncomeForm({ onClose }: { onClose: () => void }) {
  const { addExpense, currentUser, partnerProfile } = useApp();
  const partnerName = partnerProfile?.displayName;
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paidBy, setPaidBy] = useState<string>(currentUser);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim())     { setError('Please enter the income source.'); return; }
    if (!amount || isNaN(+amount)) { setError('Please enter a valid amount.'); return; }
    setSaving(true);
    await addExpense({ title, category: category.label, categoryEmoji: category.emoji, amount: parseFloat(amount), paidBy, date, note, type: 'income' });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Add Income <Icon emoji="💵" size={16} /></p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input className="input-field" placeholder="What's the income source?" value={title} onChange={e => setTitle(e.target.value)} />
          <AmountInput placeholder="Amount" value={amount} onChange={setAmount} />
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Type</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button key={cat.label} onClick={() => setCategory(cat)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: category.label === cat.label ? 'rgba(90,194,106,0.12)' : 'var(--bg)', border: category.label === cat.label ? '1.5px solid #5AC26A' : '1.5px solid var(--border)', color: category.label === cat.label ? '#3D8A4E' : 'var(--ink-2)', transition: 'all 0.15s' }}>
                  <Icon emoji={cat.emoji} size={14} /> {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Received by</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[currentUser, ...(partnerName ? [partnerName] : []), 'Both'].map(u => (
                <button key={u} onClick={() => setPaidBy(u)} style={{ flex: 1, padding: '10px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: paidBy === u ? 'rgba(90,194,106,0.12)' : 'var(--bg)', border: paidBy === u ? '1.5px solid #5AC26A' : '1.5px solid var(--border)', color: paidBy === u ? '#3D8A4E' : 'var(--ink-2)', transition: 'all 0.15s' }}>{u}</button>
              ))}
            </div>
          </div>
          <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
          <input className="input-field" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
          {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={onClose} disabled={saving} style={{ flex: 1 }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #5AC26A, #3D8A4E)', color: 'white', fontWeight: 700, fontSize: 15, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save Income'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
