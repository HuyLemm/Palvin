import { useState } from 'react';
import { useApp } from '../context';
import type { Trip } from '../types';

const VND = (n: number) => n >= 1000000
  ? `${(n / 1000000).toFixed(1)}M ₫`
  : n >= 1000 ? `${(n / 1000).toFixed(0)}K ₫` : `${n} ₫`;

const STATUS_LABELS: Record<Trip['status'], string> = {
  planning: 'Đang lên kế hoạch',
  upcoming: 'Sắp tới',
  completed: 'Đã hoàn thành',
};
const STATUS_COLORS: Record<Trip['status'], string> = {
  planning: '#8B6FD4', upcoming: '#4A8AE8', completed: '#5AC26A',
};

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0,0,0,0);
  return Math.ceil(diff / 86400000);
}

export default function TripPlanner() {
  const { state, addTrip, deleteTrip, toggleTripCheck, updateTrip } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  const trip = state.trips.find(t => t.id === selected);

  if (trip) return <TripDetail trip={trip} onBack={() => setSelected(null)} toggleCheck={toggleTripCheck} updateTrip={updateTrip} onDelete={(id) => { deleteTrip(id); setSelected(null); }} />;

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--ink)' }}>Trip Planner</p>
        <button onClick={() => setShowAdd(true)} style={{ background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', border: 'none', borderRadius: 12, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Thêm chuyến</button>
      </div>

      {state.trips.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✈️</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Chưa có chuyến đi nào</p>
          <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>Lên kế hoạch cho chuyến phiêu lưu tiếp theo!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {state.trips.map(t => {
            const d = daysUntil(t.startDate);
            const done = t.checklist.filter(c => c.done).length;
            const pct = t.checklist.length > 0 ? Math.round((done / t.checklist.length) * 100) : 0;
            const budgetPct = t.budget > 0 ? Math.min((t.spent / t.budget) * 100, 100) : 0;
            return (
              <div key={t.id} onClick={() => setSelected(t.id)} className="card" style={{ padding: '16px 18px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 48, height: 48, background: 'var(--sakura-light)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{t.emoji}</div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{t.title}</p>
                      <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>📍 {t.destination}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLORS[t.status], background: `${STATUS_COLORS[t.status]}18`, padding: '4px 10px', borderRadius: 99 }}>{STATUS_LABELS[t.status]}</span>
                </div>

                {t.status !== 'completed' && d > 0 && (
                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>⏳</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sakura-deep)' }}>{d} ngày nữa</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>· {t.startDate}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px 10px' }}>
                    <p style={{ fontSize: 10, color: 'var(--ink-2)', fontWeight: 700, marginBottom: 2 }}>CHECKLIST</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{done}/{t.checklist.length} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-2)' }}>done</span></p>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, marginTop: 4 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#5AC26A', borderRadius: 99 }} />
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px 10px' }}>
                    <p style={{ fontSize: 10, color: 'var(--ink-2)', fontWeight: 700, marginBottom: 2 }}>NGÂN SÁCH</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{VND(t.spent)} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-2)' }}>/ {VND(t.budget)}</span></p>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, marginTop: 4 }}>
                      <div style={{ width: `${budgetPct}%`, height: '100%', background: budgetPct > 90 ? '#E8524A' : 'var(--sakura-accent)', borderRadius: 99 }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddTripForm onClose={() => setShowAdd(false)} onAdd={addTrip} />}
    </div>
  );
}

function TripDetail({ trip: t, onBack, toggleCheck, updateTrip, onDelete }: {
  trip: Trip; onBack: () => void;
  toggleCheck: (tid: string, iid: string) => void;
  updateTrip: (t: Trip) => void;
  onDelete: (id: string) => void;
}) {
  const [addItem, setAddItem] = useState('');
  const [addSpend, setAddSpend] = useState('');
  const [addSpendNote, setAddSpendNote] = useState('');
  const d = daysUntil(t.startDate);
  const done = t.checklist.filter(c => c.done).length;
  const budgetLeft = t.budget - t.spent;

  const handleAddItem = () => {
    if (!addItem.trim()) return;
    updateTrip({ ...t, checklist: [...t.checklist, { id: `tc${Date.now()}`, text: addItem.trim(), done: false }] });
    setAddItem('');
  };

  const handleAddSpend = () => {
    const amt = parseFloat(addSpend);
    if (!amt) return;
    updateTrip({ ...t, spent: t.spent + amt });
    setAddSpend('');
    setAddSpendNote('');
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}>← Back</button>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--sakura-deep), #a8436a)', borderRadius: 20, padding: '20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
        <p style={{ fontSize: 32, marginBottom: 4 }}>{t.emoji}</p>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: 'white', lineHeight: 1.2, marginBottom: 2 }}>{t.title}</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 8 }}>📍 {t.destination} · {t.startDate} → {t.endDate}</p>
        {t.status !== 'completed' && d > 0 && (
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '4px 12px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>⏳ {d} ngày nữa!</span>
          </div>
        )}
      </div>

      {/* Budget */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 12 }}>Ngân sách</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[{ l: 'Tổng', v: VND(t.budget), c: 'var(--ink)' }, { l: 'Đã chi', v: VND(t.spent), c: 'var(--sakura-deep)' }, { l: 'Còn lại', v: VND(budgetLeft), c: budgetLeft < 0 ? '#E8524A' : '#5AC26A' }].map(x => (
            <div key={x.l} style={{ textAlign: 'center', background: 'var(--bg)', borderRadius: 10, padding: '8px' }}>
              <p style={{ fontSize: 10, color: 'var(--ink-2)', fontWeight: 700, marginBottom: 2 }}>{x.l.toUpperCase()}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: x.c }}>{x.v}</p>
            </div>
          ))}
        </div>
        <div style={{ height: 6, background: 'var(--bg)', borderRadius: 99, marginBottom: 10, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min((t.spent / t.budget) * 100, 100)}%`, height: '100%', background: t.spent > t.budget ? '#E8524A' : 'linear-gradient(90deg, var(--sakura-accent), var(--sakura-deep))', borderRadius: 99 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input-field" type="number" placeholder="Thêm chi phí (VND)" value={addSpend} onChange={e => setAddSpend(e.target.value)} style={{ flex: 1, padding: '8px 12px' }} />
          <button onClick={handleAddSpend} style={{ background: 'var(--sakura-accent)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>+</button>
        </div>
      </div>

      {/* Checklist */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)' }}>Checklist</p>
          <span style={{ fontSize: 12, color: 'var(--sakura-deep)', fontWeight: 700 }}>{done}/{t.checklist.length}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {t.checklist.map(item => (
            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', background: item.done ? 'rgba(90,194,106,0.08)' : 'var(--bg)', borderRadius: 10, transition: 'background 0.15s' }}>
              <input type="checkbox" checked={item.done} onChange={() => toggleCheck(t.id, item.id)} style={{ width: 16, height: 16, accentColor: '#5AC26A' }} />
              <span style={{ fontSize: 14, color: item.done ? 'var(--ink-2)' : 'var(--ink)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input-field" placeholder="Thêm mục..." value={addItem} onChange={e => setAddItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddItem()} style={{ flex: 1, padding: '8px 12px' }} />
          <button onClick={handleAddItem} style={{ background: 'var(--sakura-accent)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}>+</button>
        </div>
      </div>

      {/* Notes */}
      {t.notes && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 8 }}>Ghi chú</p>
          <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>{t.notes}</p>
        </div>
      )}

      <button onClick={() => onDelete(t.id)} style={{ width: '100%', padding: '12px', background: 'none', border: '1.5px solid rgba(232,82,74,0.3)', borderRadius: 12, color: '#E8524A', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Xóa chuyến đi</button>
    </div>
  );
}

function AddTripForm({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Omit<Trip, 'id'>) => void }) {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');

  const EMOJIS = ['✈️', '🌏', '🏖️', '🗻', '🌆', '🏕️', '🚢', '🗼', '🎡', '🏯'];

  const handleSubmit = () => {
    if (!title || !destination || !startDate) return;
    onAdd({ title, emoji, destination, startDate, endDate: endDate || startDate, budget: +budget || 0, spent: 0, checklist: [], notes, status: 'planning' });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'var(--white)', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 430 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)' }}>Chuyến đi mới</p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)} style={{ width: 38, height: 38, border: emoji === e ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', borderRadius: 10, background: emoji === e ? 'var(--sakura-light)' : 'var(--bg)', fontSize: 18, cursor: 'pointer' }}>{e}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="input-field" placeholder="Tên chuyến đi" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="input-field" placeholder="Điểm đến" value={destination} onChange={e => setDestination(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input className="input-field" type="date" placeholder="Ngày đi" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <input className="input-field" type="date" placeholder="Ngày về" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <input className="input-field" type="number" placeholder="Ngân sách (VND)" value={budget} onChange={e => setBudget(e.target.value)} />
          <textarea className="input-field" placeholder="Ghi chú..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ resize: 'none' }} />
          <button onClick={handleSubmit} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15 }}>Thêm chuyến đi</button>
        </div>
      </div>
    </div>
  );
}
