import { useRef, useState } from 'react';
import { useApp } from '../../context';
import { parseVietQR } from '../../lib/vietqr';
import AmountInput from '../AmountInput';
import Icon from '../Icon';

// Quick-add for the couple's shared Expenses/Income ("hũ chung") — unlike
// Money.tsx's own Expenses tab, which has two separate "+ Expense"/"+
// Income" buttons each opening its own dedicated form, this is one slot in
// the bottom navbar's quick-add menu, so it needs its own type toggle
// (mirroring Private Stash's own add flow) rather than picking one type
// ahead of time. Both types post through the same addExpense() call either
// form uses — only the type field and category list differ.
export default function AddCoupleTransactionForm({ onClose }: { onClose: () => void }) {
  const { state, addExpense, currentUser, partnerProfile } = useApp();
  const partnerName = partnerProfile?.displayName;
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const CATEGORIES = type === 'income' ? state.moneyCategories.income : state.moneyCategories.expense;
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paidBy, setPaidBy] = useState<string>(currentUser);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const switchType = (t: 'expense' | 'income') => {
    setType(t);
    const list = t === 'income' ? state.moneyCategories.income : state.moneyCategories.expense;
    setCategory(list[0]);
  };

  // Scanning a bank transfer QR only ever means "I'm paying someone" —
  // always switches to Expense regardless of whatever was selected before.
  // jsQR (pulled in by qrDecode.ts) is a fairly hefty pure-JS image decoder
  // only this one quick-add button ever needs — dynamically imported here
  // instead of statically, so it gets its own lazy chunk rather than
  // bloating the main bundle (CreateModal, unlike Us's sub-screens, isn't
  // itself lazy-loaded).
  const handleScanQR = async (file: File | null) => {
    if (!file) return;
    setError('');
    setScanning(true);
    try {
      const { decodeQRFromFile } = await import('../../lib/qrDecode');
      const raw = await decodeQRFromFile(file);
      if (!raw) { setError("Couldn't find a QR code in that photo — try again with it more in-frame."); return; }
      const info = parseVietQR(raw);
      if (!info) { setError("That QR code isn't a recognized bank transfer QR."); return; }
      switchType('expense');
      if (info.beneficiaryName) setTitle(`Chuyển khoản cho ${info.beneficiaryName}`);
      else setTitle('Bank transfer');
      if (info.amount) setAmount(String(Math.round(info.amount)));
      if (info.note) setNote(info.note);
      else if (info.accountNumber) setNote(`To account ${info.accountNumber}`);
    } catch {
      setError('Something went wrong reading that QR code.');
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError(type === 'income' ? 'Please enter the income source.' : 'Please enter a title.'); return; }
    if (!amount || isNaN(+amount)) { setError('Please enter a valid amount.'); return; }
    setSaving(true);
    await addExpense({ title, category: category.label, categoryEmoji: category.emoji, amount: parseFloat(amount), paidBy, date, note, type });
    onClose();
  };

  const accent = type === 'income' ? '#5AC26A' : 'var(--sakura-accent)';
  const accentDeep = type === 'income' ? '#3D8A4E' : 'var(--sakura-deep)';
  const accentBg = type === 'income' ? 'rgba(90,194,106,0.12)' : 'var(--sakura-light)';

  return (
    <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Add to Our Money <Icon emoji="💰" size={16} /></p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button
            onClick={() => qrInputRef.current?.click()}
            disabled={scanning}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 12, border: '1.5px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 13, cursor: scanning ? 'default' : 'pointer', opacity: scanning ? 0.7 : 1 }}
          >
            {scanning ? (
              <div style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(201,95,124,0.3)', borderTopColor: 'var(--sakura-deep)', animation: 'palvin-qr-spin 0.7s linear infinite' }} />
            ) : (
              <Icon emoji="📷" size={15} />
            )}
            {scanning ? 'Reading QR code...' : 'Scan a bank transfer QR'}
          </button>
          <input ref={qrInputRef} type="file" accept="image/*" capture="environment" onChange={e => { handleScanQR(e.target.files?.[0] ?? null); e.target.value = ''; }} style={{ display: 'none' }} />
          <style>{`@keyframes palvin-qr-spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => switchType('expense')} style={{ flex: 1, padding: '9px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: type === 'expense' ? 'var(--sakura-light)' : 'var(--bg)', border: type === 'expense' ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: type === 'expense' ? 'var(--sakura-deep)' : 'var(--ink-2)' }}>Expense</button>
            <button onClick={() => switchType('income')} style={{ flex: 1, padding: '9px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: type === 'income' ? 'rgba(90,194,106,0.12)' : 'var(--bg)', border: type === 'income' ? '1.5px solid #5AC26A' : '1.5px solid var(--border)', color: type === 'income' ? '#3D8A4E' : 'var(--ink-2)' }}>Income</button>
          </div>
          <input className="input-field" placeholder={type === 'income' ? "What's the income source?" : 'What was it for?'} value={title} onChange={e => setTitle(e.target.value)} />
          <AmountInput placeholder="Amount (VND)" value={amount} onChange={setAmount} />
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Category</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button key={cat.label} onClick={() => setCategory(cat)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: category.label === cat.label ? accentBg : 'var(--bg)', border: category.label === cat.label ? `1.5px solid ${accent}` : '1.5px solid var(--border)', color: category.label === cat.label ? accentDeep : 'var(--ink-2)', transition: 'all 0.15s' }}>
                  <Icon emoji={cat.emoji} size={14} /> {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>{type === 'income' ? 'Received by' : 'Paid by'}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[currentUser, ...(partnerName ? [partnerName] : []), 'Both'].map(u => (
                <button key={u} onClick={() => setPaidBy(u)} style={{ flex: 1, padding: '10px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: paidBy === u ? accentBg : 'var(--bg)', border: paidBy === u ? `1.5px solid ${accent}` : '1.5px solid var(--border)', color: paidBy === u ? accentDeep : 'var(--ink-2)', transition: 'all 0.15s' }}>{u}</button>
              ))}
            </div>
          </div>
          <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
          <input className="input-field" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
          {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={onClose} disabled={saving} style={{ flex: 1 }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${accent}, ${accentDeep})`, color: 'white', fontWeight: 700, fontSize: 15, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
