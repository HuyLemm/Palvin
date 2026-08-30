import { useState } from 'react';
import { useApp } from '../../context';
import AmountInput from '../AmountInput';
import Icon from '../Icon';
import type { Bill } from '../../types';

const EMOJIS = ['🏠', '⚡', '💧', '📡', '🎬', '🎵', '🚗', '📱', '🏋️', '🛡️', '🧾'];
const CAT_OPTIONS: { key: Bill['category']; label: string }[] = [
  { key: 'rent', label: 'Tiền nhà' },
  { key: 'utilities', label: 'Điện / Nước' },
  { key: 'internet', label: 'Internet' },
  { key: 'subscription', label: 'Subscription' },
  { key: 'other', label: 'Khác' },
];
const FREQUENCY_PRESETS = [1, 2, 3, 6, 12];
function frequencyLabel(n: number): string {
  if (n === 1) return 'Hàng tháng';
  if (n === 12) return 'Hàng năm';
  return `${n} tháng/lần`;
}

export default function EditBillForm({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const { updateBill, deleteBill } = useApp();
  const [title, setTitle] = useState(bill.title);
  const [emoji, setEmoji] = useState(bill.emoji);
  const [category, setCategory] = useState<Bill['category']>(bill.category);
  const [amount, setAmount] = useState(String(Math.round(bill.amount)));
  const [dueDay, setDueDay] = useState(String(bill.dueDay));
  const [note, setNote] = useState(bill.note ?? '');
  const [frequencyMonths, setFrequencyMonths] = useState(bill.frequencyMonths);
  const [error, setError] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = () => {
    if (!title.trim())     { setError('Nhập tên hóa đơn.'); return; }
    if (!amount || isNaN(+amount) || +amount <= 0) { setError('Nhập số tiền hợp lệ.'); return; }
    if (!dueDay || +dueDay < 1 || +dueDay > 31) { setError('Ngày đến hạn phải từ 1 đến 31.'); return; }
    setConfirmSave(true);
  };

  const confirmSubmit = () => {
    updateBill(bill.id, { title, emoji, category, amount: parseFloat(amount), dueDay: +dueDay, reminder: bill.reminder, note, frequencyMonths });
    setConfirmSave(false);
    onClose();
  };

  const confirmDeleteNow = () => {
    deleteBill(bill.id);
    setConfirmDelete(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: '80vh', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Sửa hóa đơn <Icon emoji="✏️" size={15} /></p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input className="input-field" placeholder="Tên hóa đơn" value={title} onChange={e => setTitle(e.target.value)} />

          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Icon</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)} style={{
                  width: 38, height: 38, border: emoji === e ? '2px solid #8B6FD4' : '1.5px solid var(--border)',
                  borderRadius: 10, background: emoji === e ? 'rgba(139,111,212,0.12)' : 'var(--bg)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><Icon emoji={e} size={18} /></button>
              ))}
            </div>
          </div>

          <select className="input-field" value={category} onChange={e => setCategory(e.target.value as Bill['category'])}>
            {CAT_OPTIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>

          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Chu kỳ lặp lại</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {FREQUENCY_PRESETS.map(f => (
                <button key={f} onClick={() => setFrequencyMonths(f)} style={{
                  padding: '6px 12px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  border: frequencyMonths === f ? 'none' : '1.5px solid var(--border)',
                  background: frequencyMonths === f ? '#8B6FD4' : 'var(--bg)',
                  color: frequencyMonths === f ? 'white' : 'var(--ink-2)',
                }}>{frequencyLabel(f)}</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input className="input-field" type="number" min="1" max="60" value={frequencyMonths}
                onChange={e => setFrequencyMonths(Math.min(60, Math.max(1, +e.target.value || 1)))}
                style={{ width: 90 }} />
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>tháng / lần (tùy chỉnh)</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <AmountInput placeholder="Số tiền (VND)" value={amount} onChange={setAmount} />
            <input className="input-field" type="number" placeholder="Ngày đến hạn (1-31)" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} />
          </div>

          <input className="input-field" placeholder="Ghi chú (tùy chọn)" value={note} onChange={e => setNote(e.target.value)} />

          {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setConfirmDelete(true)} style={{ padding: '13px 16px', borderRadius: 14, border: '1.5px solid #E8524A', background: 'white', color: '#E8524A', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Xóa</button>
            <button onClick={handleSubmit} style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #8B6FD4, #6A4FB8)', color: 'white', fontWeight: 700, fontSize: 15 }}>Lưu thay đổi</button>
          </div>
        </div>
      </div>

      {/* Confirm save */}
      {confirmSave && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Lưu thay đổi này?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>Thông tin hóa đơn sẽ được cập nhật.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmSave(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Hủy</button>
              <button onClick={confirmSubmit} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #8B6FD4, #6A4FB8)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Xóa hóa đơn này?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>Không thể hoàn tác sau khi xóa.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Hủy</button>
              <button onClick={confirmDeleteNow} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
