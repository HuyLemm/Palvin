import { useState } from 'react';
import { useApp } from '../context';
import Icon from '../components/Icon';
import type { Capsule } from '../types';

function truncate(text: string, max = 100): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

// Local calendar date (not UTC) so "today" matches what the user's clock
// actually shows, regardless of timezone.
function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function TimeCapsule() {
  const { state, currentUser, addCapsule, openCapsule, updateCapsule, deleteCapsule } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Capsule | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'Alvin' | 'Paoi' | 'both'>(currentUser);
  const [viewing, setViewing] = useState<Capsule | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const canOpen = (c: Capsule) => !c.opened && c.unlockDate <= today;
  // Time capsules are addressed to a specific person — only that person (or
  // both, for a 'both' letter) gets to open it, even the one who wrote it.
  const isRecipient = (c: Capsule) => c.to === 'both' || c.to === currentUser;
  // Only the person who wrote a letter can edit it — a recipient can only
  // discard it, not rewrite what was sent to them.
  const isSender = (c: Capsule) => c.from === currentUser;

  const filtered = state.capsules.filter(c => c.to === filter);
  const sorted = [...filtered].sort((a, b) => a.unlockDate.localeCompare(b.unlockDate));
  const sealed = sorted.filter(c => !c.opened);
  const opened = sorted.filter(c => c.opened);

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });

  const daysUntilOpen = (d: string) => {
    const diff = new Date(d).getTime() - new Date(today).getTime();
    return Math.ceil(diff / 86400000);
  };

  const handleOpenLetter = (c: Capsule) => {
    openCapsule(c.id);
    setViewing(c);
  };

  const confirmingCapsule = state.capsules.find(c => c.id === confirmDeleteId);

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ marginBottom: 8 }}><Icon emoji="💌" size={44} /></div>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--ink)', marginBottom: 4 }}>Time Capsule</p>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>Viết thư cho tương lai.<br />Chỉ mở được đúng ngày đã hẹn.</p>
      </div>

      <button onClick={() => setShowAdd(true)} style={{
        width: '100%', padding: '12px', marginBottom: 16, borderRadius: 14, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))',
        color: 'white', fontWeight: 700, fontSize: 14,
        boxShadow: '0 4px 12px rgba(201,95,124,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}><Icon emoji="✍️" size={16} /> Viết thư mới</button>

      {/* Filter — which recipient's letters to show */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['Alvin', 'Paoi', 'both'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: filter === f ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', background: filter === f ? 'var(--sakura-light)' : 'var(--bg)', color: filter === f ? 'var(--sakura-deep)' : 'var(--ink-2)', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Icon emoji={f === 'both' ? '💑' : f === 'Alvin' ? '💙' : '💗'} size={14} /> {f === 'both' ? 'Cả hai' : f}
          </button>
        ))}
      </div>

      {/* Sealed */}
      {sealed.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 10 }}>Chưa mở · {sealed.length}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sealed.map(c => {
              const unlockable = canOpen(c);
              const mine = isRecipient(c);
              const days = daysUntilOpen(c.unlockDate);
              return (
                <div key={c.id} className="card" style={{ padding: '16px 18px', borderLeft: `3px solid ${unlockable && mine ? '#5AC26A' : 'var(--sakura-accent)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <Icon emoji={c.to === 'both' ? '💑' : c.to === 'Alvin' ? '💙' : '💗'} size={18} />
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{c.title}</p>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4 }}>Từ {c.from} <Icon emoji="→" size={11} /> {c.to === 'both' ? 'cả hai' : c.to}</p>
                      {c.occasion && <p style={{ fontSize: 11, color: 'var(--sakura-deep)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}><Icon emoji="🎉" size={11} /> {c.occasion}</p>}
                      <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>Tạo: {formatDate(c.createdDate)}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      {unlockable ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#5AC26A', background: 'rgba(90,194,106,0.1)', padding: '3px 8px', borderRadius: 99 }}>Mở được rồi!</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sakura-deep)', background: 'var(--sakura-light)', padding: '3px 8px', borderRadius: 99 }}>{days}d nữa</span>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {isSender(c) && <button onClick={() => setEditing(c)} title="Chỉnh sửa" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 28, height: 28, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✏️" size={13} /></button>}
                        <button onClick={() => setConfirmDeleteId(c.id)} title="Xóa" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 28, height: 28, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="🗑️" size={13} /></button>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', marginBottom: (unlockable && mine) ? 10 : 0 }}>
                    {unlockable ? (
                      mine ? (
                        <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-line', display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="🔓" size={16} /> Mở để đọc...</p>
                      ) : (
                        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="🔒" size={16} /> Chỉ {c.to === 'both' ? 'cả hai' : c.to} mới mở được thư này</p>
                      )
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

                  {unlockable && mine && (
                    <button onClick={() => handleOpenLetter(c)} style={{ width: '100%', padding: '10px', background: '#5AC26A', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Icon emoji="💌" size={16} /> Mở thư
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Opened — truncated preview; tap to read the full letter */}
      {opened.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 10 }}>Đã mở · {opened.length}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {opened.map(c => (
              <div key={c.id} onClick={() => setViewing(c)} className="card" style={{ padding: '16px 18px', opacity: 0.85, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Icon emoji={c.to === 'both' ? '💑' : c.to === 'Alvin' ? '💙' : '💗'} size={18} />
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#5AC26A', background: 'rgba(90,194,106,0.1)', padding: '2px 8px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon emoji="✓" size={10} /> Đã đọc</span>
                    {isSender(c) && <button onClick={e => { e.stopPropagation(); setEditing(c); }} title="Chỉnh sửa" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 28, height: 28, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✏️" size={13} /></button>}
                    <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(c.id); }} title="Xóa" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 28, height: 28, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="🗑️" size={13} /></button>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>Từ {c.from} <Icon emoji="→" size={11} /> {c.to === 'both' ? 'cả hai' : c.to}{c.occasion && ` · ${c.occasion}`}</p>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.7 }}>{truncate(c.message)}</p>
                </div>
                <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 6 }}>Ngày mở: {formatDate(c.unlockDate)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-2)', fontSize: 14 }}>
          Chưa có thư nào ở đây.
        </div>
      )}

      {showAdd && (
        <CapsuleForm
          onClose={() => setShowAdd(false)}
          currentUser={currentUser}
          onSubmit={data => addCapsule({ from: currentUser, ...data, opened: false, createdDate: todayISO() })}
        />
      )}
      {editing && (
        <CapsuleForm
          onClose={() => setEditing(null)}
          currentUser={currentUser}
          existing={editing}
          onSubmit={data => updateCapsule({ ...editing, ...data })}
        />
      )}
      {viewing && (
        <CapsuleDetail
          capsule={viewing}
          onClose={() => setViewing(null)}
          formatDate={formatDate}
          canEdit={isSender(viewing)}
          onEdit={() => { setViewing(null); setEditing(viewing); }}
          onDelete={() => { setViewing(null); setConfirmDeleteId(viewing.id); }}
        />
      )}
      {confirmingCapsule && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDeleteId(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 300, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Xóa thư này?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>"{confirmingCapsule.title}" sẽ bị xóa vĩnh viễn.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
              <button onClick={() => { deleteCapsule(confirmingCapsule.id); setConfirmDeleteId(null); }} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: '#E8524A', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CapsuleDetail({ capsule: c, onClose, formatDate, canEdit, onEdit, onDelete }: {
  capsule: Capsule;
  onClose: () => void;
  formatDate: (d: string) => string;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 400, maxHeight: '80vh', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <Icon emoji={c.to === 'both' ? '💑' : c.to === 'Alvin' ? '💙' : '💗'} size={20} style={{ flexShrink: 0 }} /> {c.title}
          </p>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {canEdit && <button onClick={onEdit} title="Chỉnh sửa" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✏️" size={14} /></button>}
            <button onClick={onDelete} title="Xóa" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="🗑️" size={14} /></button>
            <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>Từ {c.from} <Icon emoji="→" size={12} /> {c.to === 'both' ? 'cả hai' : c.to}</p>
        {c.occasion && <p style={{ fontSize: 13, color: 'var(--sakura-deep)', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Icon emoji="🎉" size={12} /> {c.occasion}</p>}
        <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '14px 16px', marginTop: c.occasion ? 0 : 12, marginBottom: 12 }}>
          <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{c.message}</p>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>Viết ngày: {formatDate(c.createdDate)}</p>
        <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>Mở vào ngày: {formatDate(c.unlockDate)}</p>
      </div>
    </div>
  );
}

interface CapsuleFormData {
  to: Capsule['to'];
  title: string;
  occasion?: string;
  message: string;
  unlockDate: string;
}

function CapsuleForm({ onClose, onSubmit, currentUser, existing }: {
  onClose: () => void;
  onSubmit: (data: CapsuleFormData) => void;
  currentUser: 'Alvin' | 'Paoi';
  existing?: Capsule;
}) {
  const [to, setTo] = useState<'Alvin' | 'Paoi' | 'both'>(existing?.to ?? 'both');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [occasion, setOccasion] = useState(existing?.occasion ?? '');
  const [message, setMessage] = useState(existing?.message ?? '');
  const [unlockDate, setUnlockDate] = useState(existing?.unlockDate ?? todayISO());
  const isEdit = !!existing;

  const handleSubmit = () => {
    if (!title.trim() || !message.trim() || !unlockDate) return;
    onSubmit({ to, title: title.trim(), occasion: occasion.trim() || undefined, message: message.trim(), unlockDate });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 400, maxHeight: '80vh', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon emoji="✍️" size={20} /> {isEdit ? 'Chỉnh sửa thư' : 'Viết thư'}</p>
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
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>TIÊU ĐỀ</p>
            <input className="input-field" placeholder="VD: Gửi tương lai của chúng mình" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>NGÀY NÀY LÀ DỊP GÌ? (tùy chọn)</p>
            <input className="input-field" placeholder="VD: Kỷ niệm 1 năm yêu nhau" value={occasion} onChange={e => setOccasion(e.target.value)} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>MỞ VÀO NGÀY</p>
            <input className="input-field" type="date" value={unlockDate} onChange={e => setUnlockDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>NỘI DUNG THƯ</p>
            <textarea className="input-field" placeholder="Viết điều bạn muốn nói với tương lai..." value={message} onChange={e => setMessage(e.target.value)} rows={6} style={{ resize: 'none', lineHeight: 1.6 }} />
          </div>
          <button onClick={handleSubmit} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon emoji="💌" size={16} /> {isEdit ? 'Lưu thay đổi' : 'Niêm phong thư'}</button>
        </div>
      </div>
    </div>
  );
}
