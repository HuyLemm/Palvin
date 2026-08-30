import { useState } from 'react';
import { useApp } from '../context';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import type { User } from '../types';

const PROMPTS = [
  'Hôm nay tôi biết ơn vì...',
  'Điều làm tôi yêu em/anh hơn hôm nay là...',
  'Khoảnh khắc nhỏ đáng nhớ hôm nay là...',
  'Em/Anh đã khiến tôi mỉm cười khi...',
  'Tôi trân trọng em/anh vì...',
];

interface Props { onBack: () => void; }

export default function GratitudeJournal({ onBack }: Props) {
  const { state, addGratitude, updateGratitude, deleteGratitude, currentUser } = useApp();
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<'all' | User>('all');
  const [promptIdx] = useState(() => Math.floor(Math.random() * PROMPTS.length));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function startEdit(id: string, currentText: string) {
    setEditingId(id);
    setEditText(currentText);
  }

  function saveEdit(id: string) {
    if (!editText.trim()) return;
    updateGratitude(id, editText.trim());
    setEditingId(null);
  }

  const today = new Date().toISOString().slice(0, 10);
  const alreadyToday = state.gratitude.find(g => g.from === currentUser && g.date === today);

  function handleSubmit() {
    if (!text.trim()) return;
    addGratitude({ from: currentUser, text: text.trim(), date: today });
    setText('');
  }

  const filtered = filter === 'all'
    ? state.gratitude
    : state.gratitude.filter(g => g.from === filter);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Hôm nay';
    if (diff === 1) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' });
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      <style>{`
        @keyframes gratitudeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .gratitude-in { animation: gratitudeIn 0.4s ease both; }
      `}</style>

      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>

      <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>Nhật Ký Biết Ơn <Icon emoji="🌸" size={20} /></p>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>Ghi lại điều bạn trân trọng về nhau mỗi ngày</p>

      {/* Write entry */}
      <div className="card" style={{ padding: '20px', marginBottom: 20, background: 'linear-gradient(135deg, #FFF8FC, #FADCE4)' }}>
        {alreadyToday ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><Icon emoji="✅" size={28} /></div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--sakura-deep)' }}>Bạn đã ghi hôm nay!</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4, fontStyle: 'italic', lineHeight: 1.5 }}>"{alreadyToday.text}"</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--sakura-deep)', marginBottom: 12, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="💭" size={14} /> {PROMPTS[promptIdx]}</p>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Viết điều bạn biết ơn hôm nay..."
              rows={4}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #F0DDE4', borderRadius: 14, background: 'rgba(255,255,255,0.8)', fontFamily: "'Outfit', sans-serif", fontSize: 14, color: 'var(--ink)', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6, transition: 'border-color 0.2s' }}
              onFocus={e => (e.target.style.borderColor = 'var(--sakura-accent)')}
              onBlur={e => (e.target.style.borderColor = '#F0DDE4')}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{text.length} ký tự</p>
              <button onClick={handleSubmit} disabled={!text.trim()} style={{ padding: '10px 20px', background: text.trim() ? 'linear-gradient(135deg, var(--sakura), var(--sakura-deep))' : 'var(--border)', border: 'none', borderRadius: 12, color: text.trim() ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 14, cursor: text.trim() ? 'pointer' : 'default', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                Ghi lại <Icon emoji="🌸" size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {(['Alvin', 'Paoi'] as User[]).map(u => {
          const count = state.gratitude.filter(g => g.from === u).length;
          return (
            <div key={u} className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <Avatar user={u} size={36} ring />
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--sakura-deep)', marginTop: 8 }}>{count}</p>
              <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>lần biết ơn</p>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['all', 'Alvin', 'Paoi'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 14px', borderRadius: 20, border: 'none', background: filter === f ? 'var(--sakura-deep)' : 'var(--sakura-light)', color: filter === f ? 'white' : 'var(--sakura-deep)', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
            {f === 'all' ? 'Tất cả' : f}
          </button>
        ))}
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><Icon emoji="🌸" size={32} /></div>
          <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>Chưa có ghi chép nào</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((g, i) => (
            <div key={g.id} className="card gratitude-in" style={{ padding: '16px', animationDelay: `${i * 0.04}s` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Avatar user={g.from} size={32} ring />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{g.from}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>{formatDate(g.date)}</p>
                </div>
                {g.from === currentUser ? (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => startEdit(g.id, g.text)}
                      style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 26, height: 26, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    ><Icon emoji="✏️" size={12} /></button>
                    <button
                      onClick={() => setConfirmDeleteId(g.id)}
                      style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 26, height: 26, cursor: 'pointer', color: '#E8524A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    ><Icon emoji="🗑️" size={12} /></button>
                  </div>
                ) : (
                  <Icon emoji="🌸" size={18} style={{ marginLeft: 'auto' }} />
                )}
              </div>
              <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, fontStyle: 'italic', borderLeft: '3px solid var(--sakura)', paddingLeft: 12 }}>"{g.text}"</p>
            </div>
          ))}
        </div>
      )}

      {/* Edit entry */}
      {editingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setEditingId(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Sửa ghi chép <Icon emoji="✏️" size={15} /></p>
              <button onClick={() => setEditingId(null)} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
            </div>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={4}
              autoFocus
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #F0DDE4', borderRadius: 14, background: 'var(--bg)', fontFamily: "'Outfit', sans-serif", fontSize: 14, color: 'var(--ink)', resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6, marginBottom: 14 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditingId(null)} className="btn-ghost" style={{ flex: 1 }}>Hủy</button>
              <button onClick={() => saveEdit(editingId)} disabled={!editText.trim()} style={{ flex: 2, padding: '13px', background: editText.trim() ? 'linear-gradient(135deg, var(--sakura), var(--sakura-deep))' : 'var(--border)', border: 'none', borderRadius: 14, color: editText.trim() ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 15, cursor: editText.trim() ? 'pointer' : 'default' }}>Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDeleteId(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Xóa ghi chép này?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>Không thể hoàn tác sau khi xóa.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Hủy</button>
              <button onClick={() => { deleteGratitude(confirmDeleteId); setConfirmDeleteId(null); }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
