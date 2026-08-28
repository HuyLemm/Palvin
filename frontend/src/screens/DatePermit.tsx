import { useState } from 'react';
import { useApp } from '../context';
import type { DateRequest, User } from '../types';

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

const STATUS_CONFIG = {
  pending:  { label: 'CHỜ DUYỆT', bg: '#FEF9C3', border: '#FDE047', color: '#A16207', stamp: '#CA8A04' },
  approved: { label: 'ĐÃ DUYỆT',  bg: '#F0FDF4', border: '#86EFAC', color: '#166534', stamp: '#16A34A' },
  rejected: { label: 'TỪ CHỐI',  bg: '#FEF2F2', border: '#FCA5A5', color: '#7F1D1D', stamp: '#DC2626' },
};

interface Props { onBack: () => void; }

export default function DatePermit({ onBack }: Props) {
  const { state, currentUser, submitDateRequest, respondToRequest, toast } = useApp();
  const partnerUser: User = currentUser === 'Alvin' ? 'Paoi' : 'Alvin';

  const [tab, setTab] = useState<'submit' | 'inbox' | 'mine'>('submit');

  // Form state
  const [category, setCategory] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('');
  const [activity, setActivity] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Response state
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState('');

  const myRequests = state.dateRequests.filter(r => r.from === currentUser);
  const pendingForMe = state.dateRequests.filter(r => r.to === currentUser && r.status === 'pending');
  const allForMe = state.dateRequests.filter(r => r.to === currentUser);

  function handleSubmit() {
    if (!category || !activity.trim() || !date || !time) {
      toast('Điền đầy đủ thông tin nhé!', '⚠️');
      return;
    }
    submitDateRequest({
      from: currentUser,
      to: partnerUser,
      category,
      categoryEmoji,
      activity: activity.trim(),
      location: location.trim() || 'Chưa xác định',
      date,
      time,
      reason: reason.trim() || 'Em/anh muốn đi lắm 🥺',
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setCategory(''); setCategoryEmoji(''); setActivity('');
      setLocation(''); setDate(''); setTime(''); setReason('');
      setTab('mine');
    }, 2000);
  }

  function handleRespond(id: string, status: 'approved' | 'rejected') {
    respondToRequest(id, status, responseNote);
    setRespondingId(null);
    setResponseNote('');
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function formatCreated(isoStr: string) {
    const d = new Date(isoStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <style>{`
        @keyframes stampIn {
          0% { transform: scale(3) rotate(-15deg); opacity: 0; }
          40% { transform: scale(0.9) rotate(3deg); opacity: 1; }
          60% { transform: scale(1.05) rotate(-1deg); }
          100% { transform: scale(1) rotate(-8deg); opacity: 1; }
        }
        @keyframes permitSlide {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes successPop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .stamp-anim { animation: stampIn 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
        .permit-slide { animation: permitSlide 0.35s ease both; }
        .success-pop { animation: successPop 0.4s ease both; }
        .permit-input {
          width: 100%; padding: 11px 14px;
          border: 1.5px solid #F0DDE4; border-radius: 12px;
          background: #FFFBFC; font-family: 'Outfit', sans-serif;
          font-size: 14px; color: var(--ink); outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .permit-input:focus { border-color: var(--sakura-accent); box-shadow: 0 0 0 3px rgba(230,127,154,0.12); }
        .permit-input::placeholder { color: #C4ADB4; }
      `}</style>

      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}>← Back</button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: 'var(--ink)', marginBottom: 4 }}>Đơn Xin Phép 📋</p>
        <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Nộp đơn để xin phép đi chơi — người kia duyệt 💕</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--sakura-light)', borderRadius: 14, padding: 4, marginBottom: 20 }}>
        {[
          { key: 'submit', label: '📝 Nộp đơn' },
          { key: 'inbox', label: `📥 Cần duyệt${pendingForMe.length > 0 ? ` (${pendingForMe.length})` : ''}` },
          { key: 'mine', label: '📁 Đơn của tôi' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)} style={{ flex: 1, padding: '9px 4px', borderRadius: 11, border: 'none', background: tab === t.key ? 'white' : 'transparent', color: tab === t.key ? 'var(--sakura-deep)' : 'var(--ink-2)', fontWeight: tab === t.key ? 700 : 500, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', boxShadow: tab === t.key ? '0 1px 6px rgba(201,95,124,0.12)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab} className="screen-transition">
      {/* ── SUBMIT TAB ── */}
      {tab === 'submit' && (
        <div>
          {submitted ? (
            <div className="success-pop" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <p style={{ fontSize: 64, marginBottom: 12 }}>📬</p>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)', marginBottom: 6 }}>Đơn đã nộp!</p>
              <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>Đang chờ {partnerUser} duyệt nhé 🥺</p>
            </div>
          ) : (
            <div>
              {/* Permit form — styled like a document */}
              <div style={{ background: 'white', borderRadius: 20, border: '2px dashed #F3A6B9', padding: '24px 20px', marginBottom: 16 }}>
                {/* Document header */}
                <div style={{ textAlign: 'center', borderBottom: '2px solid var(--sakura-light)', paddingBottom: 16, marginBottom: 20 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--ink-2)', textTransform: 'uppercase' }}>CỘNG HÒA TÌNH YÊU</p>
                  <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--sakura-deep)', marginTop: 2 }}>ĐƠN XIN PHÉP ĐI CHƠI</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>Người nộp: <strong>{currentUser}</strong> → Người duyệt: <strong>{partnerUser}</strong></p>
                </div>

                {/* Category picker */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    Loại hoạt động *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {CATEGORIES.map(c => (
                      <button key={c.label} onClick={() => { setCategory(c.label); setCategoryEmoji(c.emoji); setActivity(c.label); }} style={{ padding: '10px 4px', border: `2px solid ${category === c.label ? 'var(--sakura-accent)' : 'var(--border)'}`, borderRadius: 12, background: category === c.label ? 'var(--sakura-light)' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 0.15s' }}>
                        <span style={{ fontSize: 22 }}>{c.emoji}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: category === c.label ? 'var(--sakura-deep)' : 'var(--ink-2)', lineHeight: 1.2, textAlign: 'center' }}>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activity detail */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Hoạt động cụ thể *</label>
                  <input className="permit-input" placeholder="VD: Đi bida với Minh, Tuấn..." value={activity} onChange={e => setActivity(e.target.value)} />
                </div>

                {/* Location */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Địa điểm</label>
                  <input className="permit-input" placeholder="VD: Q.Bình Thạnh, Saigon..." value={location} onChange={e => setLocation(e.target.value)} />
                </div>

                {/* Date + Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Ngày đi *</label>
                    <input type="date" className="permit-input" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Giờ *</label>
                    <input type="time" className="permit-input" value={time} onChange={e => setTime(e.target.value)} />
                  </div>
                </div>

                {/* Reason */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Lý do / Lời hứa 🥺</label>
                  <textarea
                    className="permit-input"
                    placeholder="VD: Em hứa về trước 10 giờ và sẽ mua bánh cho anh/em~"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    style={{ resize: 'none', lineHeight: 1.6 }}
                  />
                </div>

                {/* Signature area */}
                <div style={{ borderTop: '1.5px dashed var(--sakura-light)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--ink-2)', marginBottom: 2 }}>Người nộp đơn</p>
                    <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--sakura-deep)', fontStyle: 'italic' }}>{currentUser}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 10, color: 'var(--ink-2)', marginBottom: 2 }}>Chữ ký</p>
                    <p style={{ fontSize: 22 }}>❤️</p>
                  </div>
                </div>
              </div>

              <button onClick={handleSubmit} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, var(--sakura), var(--sakura-deep))', border: 'none', borderRadius: 16, color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 6px 20px rgba(201,95,124,0.3)', transition: 'opacity 0.15s' }}>
                📋 Nộp đơn cho {partnerUser}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── INBOX TAB (đơn cần tôi duyệt) ── */}
      {tab === 'inbox' && (
        <div>
          {allForMe.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <p style={{ fontSize: 48, marginBottom: 12 }}>📭</p>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--ink)', marginBottom: 4 }}>Chưa có đơn nào</p>
              <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>{currentUser === 'Alvin' ? 'Paoi' : 'Alvin'} chưa nộp đơn nào cả</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {allForMe.map((req, i) => (
                <PermitCard key={req.id} req={req} showActions={req.status === 'pending'} formatDate={formatDate} formatCreated={formatCreated}
                  onApprove={() => { setRespondingId(req.id); setResponseNote(''); }}
                  onReject={() => { setRespondingId(req.id); setResponseNote(''); }}
                  respondingId={respondingId}
                  responseNote={responseNote}
                  setResponseNote={setResponseNote}
                  handleRespond={handleRespond}
                  animIndex={i}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MY REQUESTS TAB ── */}
      {tab === 'mine' && (
        <div>
          {myRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <p style={{ fontSize: 48, marginBottom: 12 }}>📝</p>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--ink)', marginBottom: 4 }}>Chưa có đơn nào</p>
              <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Nộp đơn xin phép đầu tiên đi!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {myRequests.map((req, i) => (
                <PermitCard key={req.id} req={req} showActions={false} formatDate={formatDate} formatCreated={formatCreated}
                  onApprove={() => {}} onReject={() => {}}
                  respondingId={null} responseNote="" setResponseNote={() => {}} handleRespond={() => {}}
                  animIndex={i}
                />
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

/* ── Permit card component ── */
function PermitCard({ req, showActions, formatDate, formatCreated, onApprove, onReject, respondingId, responseNote, setResponseNote, handleRespond, animIndex }: {
  req: DateRequest;
  showActions: boolean;
  formatDate: (s: string) => string;
  formatCreated: (s: string) => string;
  onApprove: () => void;
  onReject: () => void;
  respondingId: string | null;
  responseNote: string;
  setResponseNote: (s: string) => void;
  handleRespond: (id: string, status: 'approved' | 'rejected') => void;
  animIndex: number;
}) {
  const cfg = STATUS_CONFIG[req.status];
  const isResponding = respondingId === req.id;

  return (
    <div className="permit-slide" style={{ animationDelay: `${animIndex * 0.05}s`, background: 'white', borderRadius: 20, overflow: 'hidden', border: `1.5px solid ${cfg.border}`, boxShadow: '0 2px 16px rgba(201,95,124,0.08)' }}>
      {/* Card top banner */}
      <div style={{ background: cfg.bg, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>{req.categoryEmoji}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{req.from} → {req.to}</p>
            <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>{formatCreated(req.createdAt)}</p>
          </div>
        </div>
        {/* Stamp */}
        <div className={req.status !== 'pending' ? 'stamp-anim' : ''} style={{ padding: '4px 10px', border: `2.5px solid ${cfg.stamp}`, borderRadius: 8, transform: req.status !== 'pending' ? 'rotate(-8deg)' : 'none', opacity: req.status === 'pending' ? 0.6 : 1 }}>
          <p style={{ fontSize: 11, fontWeight: 900, color: cfg.stamp, letterSpacing: '0.06em', fontFamily: 'monospace' }}>{cfg.label}</p>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '16px 18px' }}>
        {/* Activity + location */}
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 19, color: 'var(--ink)', marginBottom: 4 }}>{req.activity}</p>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 12 }}>📍 {req.location}</p>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <InfoCell icon="📅" label="Ngày" value={formatDate(req.date)} />
          <InfoCell icon="⏰" label="Giờ" value={req.time} />
        </div>

        {/* Reason */}
        {req.reason && (
          <div style={{ background: 'var(--sakura-light)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', marginBottom: 4 }}>🥺 LÝ DO / LỜI HỨA</p>
            <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, fontStyle: 'italic' }}>"{req.reason}"</p>
          </div>
        )}

        {/* Response note */}
        {req.responseNote && (
          <div style={{ background: req.status === 'approved' ? '#F0FDF4' : '#FEF2F2', borderRadius: 12, padding: '10px 14px', marginBottom: 12, border: `1px solid ${req.status === 'approved' ? '#86EFAC' : '#FCA5A5'}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: req.status === 'approved' ? '#16A34A' : '#DC2626', marginBottom: 4 }}>
              {req.status === 'approved' ? '✅ GHI CHÚ KHI DUYỆT' : '❌ LÝ DO TỪ CHỐI'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink)', fontStyle: 'italic' }}>"{req.responseNote}"</p>
          </div>
        )}

        {/* Action buttons */}
        {showActions && !isResponding && (
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onApprove} style={{ flex: 1, padding: '11px', background: '#16A34A', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              ✅ Duyệt
            </button>
            <button onClick={onReject} style={{ flex: 1, padding: '11px', background: '#DC2626', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              ❌ Từ chối
            </button>
          </div>
        )}

        {/* Response form */}
        {isResponding && (
          <div style={{ marginTop: 8, background: '#FAFAFA', borderRadius: 14, padding: '14px', border: '1.5px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Thêm ghi chú (không bắt buộc)</p>
            <input
              className="permit-input"
              placeholder="VD: Ok nhưng về trước 11 giờ nhé!"
              value={responseNote}
              onChange={e => setResponseNote(e.target.value)}
              autoFocus
              style={{ marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleRespond(req.id, 'approved')} style={{ flex: 1, padding: '10px', background: '#16A34A', border: 'none', borderRadius: 11, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>✅ Duyệt</button>
              <button onClick={() => handleRespond(req.id, 'rejected')} style={{ flex: 1, padding: '10px', background: '#DC2626', border: 'none', borderRadius: 11, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>❌ Từ chối</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCell({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ background: '#FAFAFA', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: 10, color: 'var(--ink-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{icon} {label}</p>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{value || '—'}</p>
    </div>
  );
}
