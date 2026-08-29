import { useState } from 'react';
import { useApp } from '../context';
import Icon from '../components/Icon';
import type { Capsule } from '../types';

export default function TimeCapsule() {
  const { state, currentUser, addCapsule, openCapsule } = useApp();
  const [showAdd, setShowAdd] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const canOpen = (c: Capsule) => !c.opened && c.unlockDate <= today;

  const sorted = [...state.capsules].sort((a, b) => a.unlockDate.localeCompare(b.unlockDate));
  const sealed = sorted.filter(c => !c.opened);
  const opened = sorted.filter(c => c.opened);

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });

  const daysUntilOpen = (d: string) => {
    const diff = new Date(d).getTime() - new Date(today).getTime();
    return Math.ceil(diff / 86400000);
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ marginBottom: 8 }}><Icon emoji="💌" size={44} /></div>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--ink)', marginBottom: 4 }}>Time Capsule</p>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>Viết thư cho tương lai.<br />Chỉ mở được đúng ngày đã hẹn.</p>
      </div>

      <button onClick={() => setShowAdd(true)} style={{
        width: '100%', padding: '12px', marginBottom: 20, borderRadius: 14, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))',
        color: 'white', fontWeight: 700, fontSize: 14,
        boxShadow: '0 4px 12px rgba(201,95,124,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}><Icon emoji="✍️" size={16} /> Viết thư mới</button>

      {/* Sealed */}
      {sealed.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 10 }}>Chưa mở · {sealed.length}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sealed.map(c => {
              const unlockable = canOpen(c);
              const days = daysUntilOpen(c.unlockDate);
              return (
                <div key={c.id} className="card" style={{ padding: '16px 18px', borderLeft: `3px solid ${unlockable ? '#5AC26A' : 'var(--sakura-accent)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <Icon emoji={c.to === 'both' ? '💑' : c.to === 'Alvin' ? '💙' : '💗'} size={18} />
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Từ {c.from} <Icon emoji="→" size={14} /> {c.to === 'both' ? 'cả hai' : c.to}
                        </p>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>Tạo: {formatDate(c.createdDate)}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {unlockable ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#5AC26A', background: 'rgba(90,194,106,0.1)', padding: '3px 8px', borderRadius: 99 }}>Mở được rồi!</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sakura-deep)', background: 'var(--sakura-light)', padding: '3px 8px', borderRadius: 99 }}>{days}d nữa</span>
                      )}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', marginBottom: unlockable ? 10 : 0 }}>
                    {unlockable ? (
                      <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-line', display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="🔓" size={16} /> Mở để đọc...</p>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon emoji="🔒" size={20} />
                        <div>
                          <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>Mở vào</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{formatDate(c.unlockDate)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {unlockable && (
                    <button onClick={() => openCapsule(c.id)} style={{ width: '100%', padding: '10px', background: '#5AC26A', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Icon emoji="💌" size={16} /> Mở thư
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Opened */}
      {opened.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 10 }}>Đã mở · {opened.length}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {opened.map(c => (
              <div key={c.id} className="card" style={{ padding: '16px 18px', opacity: 0.85 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Icon emoji={c.to === 'both' ? '💑' : c.to === 'Alvin' ? '💙' : '💗'} size={18} />
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 4 }}>Từ {c.from} <Icon emoji="→" size={14} /> {c.to === 'both' ? 'cả hai' : c.to}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#5AC26A', background: 'rgba(90,194,106,0.1)', padding: '2px 8px', borderRadius: 99, marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon emoji="✓" size={10} /> Đã đọc</span>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{c.message}</p>
                </div>
                <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 6 }}>Ngày mở: {formatDate(c.unlockDate)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.capsules.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-2)', fontSize: 14 }}>
          Chưa có thư nào. Viết thư đầu tiên ngay!
        </div>
      )}

      {showAdd && <AddCapsuleForm onClose={() => setShowAdd(false)} onAdd={addCapsule} currentUser={currentUser} />}
    </div>
  );
}

function AddCapsuleForm({ onClose, onAdd, currentUser }: {
  onClose: () => void;
  onAdd: (c: Omit<Capsule, 'id'>) => void;
  currentUser: 'Alvin' | 'Paoi';
}) {
  const [to, setTo] = useState<'Alvin' | 'Paoi' | 'both'>('both');
  const [message, setMessage] = useState('');
  const [unlockDate, setUnlockDate] = useState('');

  const handleSubmit = () => {
    if (!message.trim() || !unlockDate) return;
    onAdd({ from: currentUser, to, message: message.trim(), unlockDate, opened: false, createdDate: new Date().toISOString().slice(0, 10) });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ background: 'var(--white)', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 430, animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon emoji="✍️" size={20} /> Viết thư</p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>GỬI ĐẾN</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['both', 'Alvin', 'Paoi'] as const).map(t => (
                <button key={t} onClick={() => setTo(t)} style={{ flex: 1, padding: '8px', border: to === t ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', borderRadius: 10, background: to === t ? 'var(--sakura-light)' : 'var(--bg)', color: to === t ? 'var(--sakura-deep)' : 'var(--ink-2)', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <Icon emoji={t === 'both' ? '💑' : t === 'Alvin' ? '💙' : '💗'} size={14} /> {t === 'both' ? 'Cả hai' : t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>MỞ VÀO NGÀY</p>
            <input className="input-field" type="date" value={unlockDate} onChange={e => setUnlockDate(e.target.value)} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>NỘI DUNG THƯ</p>
            <textarea className="input-field" placeholder="Viết điều bạn muốn nói với tương lai..." value={message} onChange={e => setMessage(e.target.value)} rows={6} style={{ resize: 'none', lineHeight: 1.6 }} />
          </div>
          <button onClick={handleSubmit} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon emoji="💌" size={16} /> Niêm phong thư</button>
        </div>
      </div>
    </div>
  );
}
