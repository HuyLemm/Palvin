import { useState } from 'react';
import { useApp } from '../../context';
import Icon from '../Icon';
import type { DateRequest } from '../../types';

const CATEGORIES = [
  { emoji: '🎱', label: 'Đi bida' },
  { emoji: '🍺', label: 'Đi nhậu' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '👥', label: 'Đi với bạn' },
  { emoji: '🎯', label: 'Đi chơi' },
  { emoji: '💼', label: 'Làm thêm' },
  { emoji: '🏋️', label: 'Tập gym' },
  { emoji: '🛒', label: 'Đi mua sắm' },
  { emoji: '🎤', label: 'Karaoke' },
  { emoji: '🌙', label: 'Về muộn' },
  { emoji: '✈️', label: 'Đi xa' },
  { emoji: '🎲', label: 'Khác' },
];

export default function EditDateRequestForm({ req, onClose }: { req: DateRequest; onClose: () => void }) {
  const { updateDateRequest, deleteDateRequest } = useApp();
  const [category, setCategory] = useState(CATEGORIES.find(c => c.label === req.category) ?? CATEGORIES[0]);
  const [activity, setActivity] = useState(req.activity);
  const [location, setLocation] = useState(req.location);
  const [date, setDate] = useState(req.date);
  const [time, setTime] = useState(req.time);
  const [reason, setReason] = useState(req.reason);
  const [error, setError] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = () => {
    if (!activity.trim() || !date || !time) { setError('Điền đầy đủ thông tin nhé!'); return; }
    setConfirmSave(true);
  };

  const confirmSubmit = () => {
    updateDateRequest(req.id, {
      category: category.label, categoryEmoji: category.emoji,
      activity: activity.trim(), location: location.trim() || 'Chưa xác định',
      date, time, reason: reason.trim() || req.reason,
    });
    setConfirmSave(false);
    onClose();
  };

  const confirmDeleteNow = () => {
    deleteDateRequest(req.id);
    setConfirmDelete(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: '80vh', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Sửa đơn xin phép <Icon emoji="✏️" size={15} /></p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Loại hoạt động</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => (
                <button key={c.label} onClick={() => setCategory(c)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: category.label === c.label ? 'var(--sakura-light)' : 'var(--bg)', border: category.label === c.label ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: category.label === c.label ? 'var(--sakura-deep)' : 'var(--ink-2)', transition: 'all 0.15s' }}>
                  <Icon emoji={c.emoji} size={14} /> {c.label}
                </button>
              ))}
            </div>
          </div>

          <input className="input-field" placeholder="Hoạt động cụ thể" value={activity} onChange={e => setActivity(e.target.value)} />
          <input className="input-field" placeholder="Địa điểm" value={location} onChange={e => setLocation(e.target.value)} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} style={{ minWidth: 0, fontSize: 12.5, padding: '9px 8px' }} />
            <input type="time" className="input-field" value={time} onChange={e => setTime(e.target.value)} style={{ minWidth: 0, fontSize: 12.5, padding: '9px 8px' }} />
          </div>

          <textarea
            className="input-field"
            placeholder="Lý do / lời hứa"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            style={{ resize: 'none', lineHeight: 1.6 }}
          />

          {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setConfirmDelete(true)} style={{ padding: '13px 16px', borderRadius: 14, border: '1.5px solid #E8524A', background: 'white', color: '#E8524A', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Xóa</button>
            <button onClick={handleSubmit} style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15 }}>Lưu thay đổi</button>
          </div>
        </div>
      </div>

      {/* Confirm save */}
      {confirmSave && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Lưu thay đổi này?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>Thông tin đơn xin phép sẽ được cập nhật.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmSave(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Hủy</button>
              <button onClick={confirmSubmit} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, var(--sakura), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Xóa đơn xin phép này?</p>
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
