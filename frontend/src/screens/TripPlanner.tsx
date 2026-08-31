import { useState, type CSSProperties } from 'react';
import { useApp } from '../context';
import Icon from '../components/Icon';
import type { Trip, TripDay, TripPlace, TripLodging } from '../types';

// Full digit grouping (e.g. "200.000 VND"), not an abbreviated "200K" —
// spelled-out amounts are unambiguous when planning an actual budget.
const VND = (n: number) => `${n.toLocaleString('vi-VN')} VND`;

const VNDRange = (min: number, max: number) => min === max ? VND(min) : `${VND(min)} – ${VND(max)}`;

// Displays the raw-digit value with thousand-separator dots while typing
// (e.g. 500000 -> "500.000") — callers keep the raw digit string in state
// and only convert to a number on submit.
function MoneyInput({ value, onChange, placeholder, style }: { value: string; onChange: (raw: string) => void; placeholder?: string; style?: CSSProperties }) {
  return (
    <input
      className="input-field"
      inputMode="numeric"
      placeholder={placeholder}
      value={value ? Number(value).toLocaleString('vi-VN') : ''}
      onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
      style={style}
    />
  );
}

const STATUS_LABELS: Record<Trip['status'], string> = {
  planning: 'Lên kế hoạch',
  upcoming: 'Đang du lịch',
  completed: 'Hoàn thành',
};
const STATUS_COLORS: Record<Trip['status'], string> = {
  planning: '#8B6FD4', upcoming: '#4A8AE8', completed: '#5AC26A',
};
const STATUS_ORDER: Trip['status'][] = ['planning', 'upcoming', 'completed'];

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0,0,0,0);
  return Math.ceil(diff / 86400000);
}

// Inclusive day count between two ISO dates — a trip from and to the same
// date is a 1-day trip, not 0.
function daysBetween(start?: string, end?: string): number {
  if (!start) return 1;
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : s;
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

// Local calendar date (not UTC) so "today" matches what the user's clock
// actually shows, regardless of timezone.
function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// Parsed and mutated in UTC throughout — building the Date from a local
// midnight (`new Date(dateStr + 'T00:00:00')`) and reading it back via
// toISOString() rolls the date back a day in any timezone ahead of UTC
// (e.g. UTC+7), since local midnight becomes the previous day in UTC.
function addDaysToDate(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// The itinerary's whole reason to exist is to answer "how many days, and
// where on each one" right from setup. Exact dates are optional — a trip
// can start out as just "about N days" before dates are locked in, so
// startDate is optional here and per-day dates are simply omitted when
// it's not given.
function buildItinerary(nDays: number, startDate?: string): TripDay[] {
  return Array.from({ length: Math.max(1, nDays) }, (_, i) => ({
    id: `day${Date.now()}_${i}`,
    day: i + 1,
    date: startDate ? addDaysToDate(startDate, i) : undefined,
    places: [],
  }));
}

// Budget is derived from each itinerary place's price range rather than a
// manually-tracked running total, so it can never drift out of sync with
// what's actually planned.
function tripCostRange(t: Trip): { min: number; max: number } {
  let min = 0, max = 0;
  for (const day of t.itinerary) {
    for (const p of day.places) {
      min += p.costMin ?? p.costMax ?? 0;
      max += p.costMax ?? p.costMin ?? 0;
    }
  }
  return { min, max };
}

export default function TripPlanner({ onBack }: { onBack: () => void }) {
  const { state, addTrip, deleteTrip, toggleTripCheck, updateTrip } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const trip = state.trips.find(t => t.id === selected);

  if (trip) return <TripDetail trip={trip} onBack={() => setSelected(null)} toggleCheck={toggleTripCheck} updateTrip={updateTrip} onDelete={(id) => { deleteTrip(id); setSelected(null); }} />;

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--ink)' }}>Trip Planner</p>
        <button onClick={() => setShowAdd(true)} style={{ background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', border: 'none', borderRadius: 10, padding: '6px 11px', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>+ Thêm chuyến</button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>Setup cho chuyến đi tương lai — mấy ngày, đi đâu mỗi ngày, ở đâu.</p>

      {state.trips.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ marginBottom: 12 }}><Icon emoji="✈️" size={48} /></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Chưa có chuyến đi nào</p>
          <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>Lên kế hoạch cho chuyến phiêu lưu tiếp theo!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {state.trips.map(t => {
            const d = daysUntil(t.startDate);
            const done = t.checklist.filter(c => c.done).length;
            const pct = t.checklist.length > 0 ? Math.round((done / t.checklist.length) * 100) : 0;
            const cost = tripCostRange(t);
            const budgetPct = t.budget > 0 ? Math.min((cost.max / t.budget) * 100, 100) : 0;
            const nDays = t.itinerary.length || 1;
            const isCompleted = t.status === 'completed';
            return (
              <div key={t.id} onClick={() => setSelected(t.id)} className="card" style={{ padding: '16px 18px', cursor: 'pointer', opacity: isCompleted ? 0.75 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 48, height: 48, background: 'var(--sakura-light)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <Icon emoji={t.emoji} size={24} />
                      {isCompleted && (
                        <div style={{ position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: STATUS_COLORS.completed, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--white)' }}>
                          <Icon emoji="✓" size={10} style={{ color: 'white' }} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: isCompleted ? 'var(--ink-2)' : 'var(--ink)', textDecoration: isCompleted ? 'line-through' : 'none' }}>{t.title}</p>
                      <p style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon emoji="📍" size={12} /> {t.destination}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Icon emoji="📅" size={12} /> {t.startDate ? `${nDays} ngày ${nDays - 1} đêm` : `~${nDays} ngày (chưa chốt ngày)`}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLORS[t.status], background: `${STATUS_COLORS[t.status]}18`, padding: '4px 10px', borderRadius: 99 }}>{STATUS_LABELS[t.status]}</span>
                </div>

                {t.status !== 'completed' && d !== null && d > 0 && (
                  <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon emoji="⏳" size={16} />
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
                    <p style={{ fontSize: 10, color: 'var(--ink-2)', fontWeight: 700, marginBottom: 2 }}>DỰ TÍNH CHI</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{VNDRange(cost.min, cost.max)} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-2)' }}>/ {VND(t.budget)}</span></p>
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

function ItineraryDayCard({ day, onAddPlace, onRemovePlace, onRemoveDay, locked }: {
  day: TripDay;
  onAddPlace: (dayId: string, place: Omit<TripPlace, 'id'>) => void;
  onRemovePlace: (dayId: string, placeId: string) => void;
  onRemoveDay: (dayId: string) => void;
  locked: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [activity, setActivity] = useState('');
  const [costMin, setCostMin] = useState('');
  const [costMax, setCostMax] = useState('');

  const resetForm = () => { setName(''); setLocation(''); setActivity(''); setCostMin(''); setCostMax(''); setShowForm(false); };

  const submit = () => {
    if (!name.trim()) return;
    onAddPlace(day.id, {
      name: name.trim(),
      location: location.trim() || undefined,
      activity: activity.trim() || undefined,
      costMin: costMin ? +costMin : undefined,
      costMax: costMax ? +costMax : (costMin ? +costMin : undefined),
    });
    resetForm();
  };

  return (
    <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--sakura-deep)', display: 'flex', alignItems: 'baseline', gap: 6 }}>
          Ngày {day.day}
          {day.date && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-2)' }}>{day.date}</span>}
        </p>
        {!locked && <button onClick={() => onRemoveDay(day.id)} title="Xóa ngày" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', display: 'flex' }}><Icon emoji="🗑️" size={13} /></button>}
      </div>

      {day.places.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {day.places.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, background: 'var(--white)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 5 }}><Icon emoji="📍" size={12} /> {p.name}</p>
                {p.location && <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>{p.location}</p>}
                {p.activity && <p style={{ fontSize: 12, color: 'var(--ink)', marginTop: 2 }}>{p.activity}</p>}
                {(p.costMin != null || p.costMax != null) && (
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', marginTop: 3 }}>{VNDRange(p.costMin ?? p.costMax ?? 0, p.costMax ?? p.costMin ?? 0)}</p>
                )}
              </div>
              {!locked && <button onClick={() => onRemovePlace(day.id, p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', flexShrink: 0, display: 'flex' }}><Icon emoji="✕" size={11} /></button>}
            </div>
          ))}
        </div>
      )}

      {locked ? null : !showForm ? (
        <button onClick={() => setShowForm(true)} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1.5px dashed var(--sakura-accent)', background: 'none', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>+ Thêm địa điểm</button>
      ) : (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Địa điểm mới</p>
          <input className="input-field" placeholder="Tên quán / địa điểm" value={name} onChange={e => setName(e.target.value)} style={{ padding: '7px 10px', fontSize: 13 }} />
          <input className="input-field" placeholder="Địa chỉ (tùy chọn)" value={location} onChange={e => setLocation(e.target.value)} style={{ padding: '7px 10px', fontSize: 13 }} />
          <input className="input-field" placeholder="Làm gì ở đó (tùy chọn)" value={activity} onChange={e => setActivity(e.target.value)} style={{ padding: '7px 10px', fontSize: 13 }} />
          <div>
            <p style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 4 }}>Giá tiền dự kiến (VND)</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MoneyInput placeholder="Từ" value={costMin} onChange={setCostMin} style={{ flex: 1, padding: '7px 10px', fontSize: 13, minWidth: 0 }} />
              <span style={{ color: 'var(--ink-2)', fontSize: 12 }}>–</span>
              <MoneyInput placeholder="Đến" value={costMax} onChange={setCostMax} style={{ flex: 1, padding: '7px 10px', fontSize: 13, minWidth: 0 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            <button onClick={resetForm} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink-2)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Hủy</button>
            <button onClick={submit} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'var(--sakura-accent)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Thêm</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LodgingForm({ onAdd, hasDates }: { onAdd: (l: Omit<TripLodging, 'id'>) => void; hasDates: boolean }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [note, setNote] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), address: address.trim() || undefined, checkIn: checkIn || undefined, checkOut: checkOut || undefined, note: note.trim() || undefined });
    setName(''); setAddress(''); setCheckIn(''); setCheckOut(''); setNote('');
  };

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nơi ở mới</p>
      <input className="input-field" placeholder="Tên khách sạn / nơi ở" value={name} onChange={e => setName(e.target.value)} style={{ padding: '8px 12px' }} />
      <input className="input-field" placeholder="Địa chỉ (tùy chọn)" value={address} onChange={e => setAddress(e.target.value)} style={{ padding: '8px 12px' }} />
      {/* Only shown when the trip has real dates — a check-in/check-out
          date is meaningless for a trip that's still just "about N days"
          with no dates picked yet. Stacked, not side-by-side, since two
          native date inputs squeezed into a half-width column clip their
          own text/icon against each other on narrow screens. */}
      {hasDates && (
        <>
          <div>
            <p style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 4 }}>Nhận phòng</p>
            <input className="input-field" type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} style={{ padding: '8px 12px', width: '100%' }} />
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 4 }}>Trả phòng</p>
            <input className="input-field" type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} style={{ padding: '8px 12px', width: '100%' }} />
          </div>
        </>
      )}
      <input className="input-field" placeholder="Ghi chú (tùy chọn)" value={note} onChange={e => setNote(e.target.value)} style={{ padding: '8px 12px' }} />
      <button onClick={submit} style={{ background: 'var(--sakura-accent)', color: 'white', border: 'none', borderRadius: 10, padding: '9px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>+ Thêm nơi ở</button>
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const d = daysUntil(t.startDate);
  const done = t.checklist.filter(c => c.done).length;
  const nDays = t.itinerary.length || 1;
  const cost = tripCostRange(t);
  // A completed trip is a record of what happened, not a plan still being
  // built — lock its contents so nothing edits it by accident. Status stays
  // switchable so a mis-tap back to "planning"/"upcoming" can undo this.
  const locked = t.status === 'completed';

  const handleAddItem = () => {
    if (!addItem.trim()) return;
    updateTrip({ ...t, checklist: [...t.checklist, { id: `tc${Date.now()}`, text: addItem.trim(), done: false }] });
    setAddItem('');
  };

  const addPlace = (dayId: string, place: Omit<TripPlace, 'id'>) => {
    updateTrip({ ...t, itinerary: t.itinerary.map(day => day.id === dayId ? { ...day, places: [...day.places, { id: `pl${Date.now()}`, ...place }] } : day) });
  };
  const removePlace = (dayId: string, placeId: string) => {
    updateTrip({ ...t, itinerary: t.itinerary.map(day => day.id === dayId ? { ...day, places: day.places.filter(p => p.id !== placeId) } : day) });
  };
  const addDay = () => {
    const last = t.itinerary[t.itinerary.length - 1];
    const nextDate = last?.date ? addDaysToDate(last.date, 1) : undefined;
    updateTrip({ ...t, itinerary: [...t.itinerary, { id: `day${Date.now()}`, day: t.itinerary.length + 1, date: nextDate, places: [] }] });
  };
  const removeDay = (dayId: string) => {
    updateTrip({ ...t, itinerary: t.itinerary.filter(day => day.id !== dayId).map((day, i) => ({ ...day, day: i + 1 })) });
  };

  const addLodging = (l: Omit<TripLodging, 'id'>) => {
    updateTrip({ ...t, lodging: [...t.lodging, { id: `lg${Date.now()}`, ...l }] });
  };
  const removeLodging = (id: string) => {
    updateTrip({ ...t, lodging: t.lodging.filter(l => l.id !== id) });
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={15} /> Back</button>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--sakura-deep), #a8436a)', borderRadius: 20, padding: '20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
        <p style={{ marginBottom: 4 }}><Icon emoji={t.emoji} size={32} style={{ color: 'white' }} /></p>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: 'white', lineHeight: 1.2, marginBottom: 2 }}>{t.title}</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <Icon emoji="📍" size={13} /> {t.destination}
          {t.startDate && <> · {t.startDate} <Icon emoji="→" size={13} /> {t.endDate}</>}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>{t.startDate ? `${nDays} ngày ${nDays - 1} đêm` : `~${nDays} ngày · chưa chốt ngày cụ thể`}</p>
        {t.status !== 'completed' && d !== null && d > 0 && (
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '4px 12px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 4 }}><Icon emoji="⏳" size={13} /> {d} ngày nữa!</span>
          </div>
        )}
      </div>

      {/* Status — freely switchable between all three, not just a forward
          cycle, since a trip can slip back to "planning" or need correcting.
          Each keeps its own color always, selected or not, so the three
          states stay visually distinct at a glance — not just "selected vs
          gray". */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {STATUS_ORDER.map(s => (
          <button
            key={s}
            onClick={() => updateTrip({ ...t, status: s })}
            style={{
              flex: 1, padding: '9px 4px', borderRadius: 10,
              border: t.status === s ? `2px solid ${STATUS_COLORS[s]}` : `1.5px solid ${STATUS_COLORS[s]}55`,
              background: t.status === s ? `${STATUS_COLORS[s]}28` : `${STATUS_COLORS[s]}0d`,
              color: STATUS_COLORS[s],
              opacity: t.status === s ? 1 : 0.7,
              fontWeight: 700, fontSize: 12, cursor: 'pointer',
            }}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {locked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(90,194,106,0.1)', border: '1px solid rgba(90,194,106,0.3)', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
          <Icon emoji="🔒" size={14} style={{ color: '#5AC26A' }} />
          <span style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>Chuyến đã hoàn thành — nội dung đã được khóa. Đổi trạng thái để chỉnh sửa lại.</span>
        </div>
      )}

      {/* Itinerary — with budget baked in, since cost is driven by what's
          actually planned per place rather than tracked separately. */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)' }}>Lịch trình</p>
          {!locked && <button onClick={addDay} style={{ background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>+ Thêm ngày</button>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px 10px' }}>
            <p style={{ fontSize: 10, color: 'var(--ink-2)', fontWeight: 700, marginBottom: 2 }}>NGÂN SÁCH</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{VND(t.budget)}</p>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px 10px' }}>
            <p style={{ fontSize: 10, color: 'var(--ink-2)', fontWeight: 700, marginBottom: 2 }}>DỰ TÍNH CHI</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: t.budget > 0 && cost.max > t.budget ? '#E8524A' : 'var(--sakura-deep)' }}>{VNDRange(cost.min, cost.max)}</p>
          </div>
        </div>
        {t.budget > 0 && (
          <div style={{ height: 6, background: 'var(--bg)', borderRadius: 99, marginBottom: 14, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min((cost.max / t.budget) * 100, 100)}%`, height: '100%', background: cost.max > t.budget ? '#E8524A' : 'linear-gradient(90deg, var(--sakura-accent), var(--sakura-deep))', borderRadius: 99 }} />
          </div>
        )}

        {t.itinerary.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Chưa có lịch trình. Thêm ngày để bắt đầu lên kế hoạch từng ngày.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {t.itinerary.map(day => (
              <ItineraryDayCard key={day.id} day={day} onAddPlace={addPlace} onRemovePlace={removePlace} onRemoveDay={removeDay} locked={locked} />
            ))}
          </div>
        )}
      </div>

      {/* Lodging */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 12 }}>Nơi ở</p>
        {t.lodging.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {t.lodging.map(l => (
              <div key={l.id} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="🏨" size={13} /> {l.name}</p>
                  {l.address && <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{l.address}</p>}
                  {(l.checkIn || l.checkOut) && <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>{l.checkIn ?? '?'} <Icon emoji="→" size={10} /> {l.checkOut ?? '?'}</p>}
                  {l.note && <p style={{ fontSize: 12, color: 'var(--ink)', marginTop: 4 }}>{l.note}</p>}
                </div>
                {!locked && <button onClick={() => removeLodging(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', flexShrink: 0 }}><Icon emoji="✕" size={13} /></button>}
              </div>
            ))}
          </div>
        )}
        {!locked && <LodgingForm onAdd={addLodging} hasDates={!!t.startDate} />}
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
              <input type="checkbox" checked={item.done} disabled={locked} onChange={() => toggleCheck(t.id, item.id)} style={{ width: 16, height: 16, accentColor: '#5AC26A' }} />
              <span style={{ fontSize: 14, color: item.done ? 'var(--ink-2)' : 'var(--ink)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
            </label>
          ))}
        </div>
        {!locked && (
          <div style={{ display: 'flex', gap: 8, background: 'var(--bg)', borderRadius: 10, padding: 6 }}>
            <input className="input-field" placeholder="Thêm mục..." value={addItem} onChange={e => setAddItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddItem()} style={{ flex: 1, padding: '8px 12px', background: 'var(--white)' }} />
            <button onClick={handleAddItem} style={{ background: 'var(--sakura-accent)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}>+</button>
          </div>
        )}
      </div>

      {/* Notes */}
      {t.notes && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 8 }}>Ghi chú</p>
          <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>{t.notes}</p>
        </div>
      )}

      <button onClick={() => setConfirmDelete(true)} style={{ width: '100%', padding: '12px', background: 'none', border: '1.5px solid rgba(232,82,74,0.3)', borderRadius: 12, color: '#E8524A', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Xóa chuyến đi</button>

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDelete(false)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 300, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Xóa chuyến đi này?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>Toàn bộ lịch trình, nơi ở và checklist sẽ bị xóa vĩnh viễn.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
              <button onClick={() => onDelete(t.id)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: '#E8524A', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddTripForm({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Omit<Trip, 'id'>) => void }) {
  const emoji = '✈️';
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [datesKnown, setDatesKnown] = useState<'exact' | 'approx'>('approx');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState('');
  const [approxDays, setApproxDays] = useState('3');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');

  const nDays = datesKnown === 'exact'
    ? (startDate ? daysBetween(startDate, endDate || startDate) : 0)
    : (parseInt(approxDays, 10) || 0);

  const handleSubmit = () => {
    if (!title || !destination) return;
    if (datesKnown === 'exact' && !startDate) return;
    if (datesKnown === 'approx' && nDays < 1) return;
    const finalStart = datesKnown === 'exact' ? startDate : undefined;
    const finalEnd = datesKnown === 'exact' ? (endDate || startDate) : undefined;
    onAdd({
      title, emoji, destination, startDate: finalStart, endDate: finalEnd,
      budget: +budget || 0, checklist: [],
      itinerary: buildItinerary(nDays, finalStart),
      lodging: [],
      notes, status: 'planning',
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 400, maxHeight: '80vh', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)' }}>Chuyến đi mới</p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="input-field" placeholder="Tên chuyến đi" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="input-field" placeholder="Điểm đến" value={destination} onChange={e => setDestination(e.target.value)} />
        </div>

        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-2)', marginBottom: 10 }}>Khi nào đi?</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button type="button" onClick={() => setDatesKnown('approx')} style={{ flex: 1, padding: '8px', borderRadius: 10, border: datesKnown === 'approx' ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', background: datesKnown === 'approx' ? 'var(--sakura-light)' : 'var(--bg)', color: 'var(--ink)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Chỉ biết khoảng ngày</button>
            <button type="button" onClick={() => setDatesKnown('exact')} style={{ flex: 1, padding: '8px', borderRadius: 10, border: datesKnown === 'exact' ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', background: datesKnown === 'exact' ? 'var(--sakura-light)' : 'var(--bg)', color: 'var(--ink)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Biết ngày cụ thể</button>
          </div>

          {datesKnown === 'approx' ? (
            <input className="input-field" type="number" min={1} placeholder="Khoảng bao nhiêu ngày?" value={approxDays} onChange={e => setApproxDays(e.target.value)} />
          ) : (
            // Stacked, not side-by-side — two native date inputs squeezed
            // into a half-width column clip their own text/icon against
            // each other on narrow screens.
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 4 }}>Ngày đi</p>
                <input className="input-field" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 4 }}>Ngày về</p>
                <input className="input-field" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>
          )}
          {nDays > 0 && (
            <p style={{ fontSize: 12, color: 'var(--sakura-deep)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
              <Icon emoji="📅" size={12} /> {nDays} ngày {nDays - 1} đêm — sẽ tự tạo {nDays} ngày lịch trình trống để điền
            </p>
          )}
        </div>

        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MoneyInput placeholder="Ngân sách (VND)" value={budget} onChange={setBudget} />
          <textarea className="input-field" placeholder="Ghi chú..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ resize: 'none' }} />
          <button onClick={handleSubmit} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15 }}>Thêm chuyến đi</button>
        </div>
      </div>
    </div>
  );
}
