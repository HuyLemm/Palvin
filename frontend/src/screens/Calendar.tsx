import { useState } from 'react';
import { useApp } from '../context';
import AddEventForm from '../components/forms/AddEventForm';
import Icon from '../components/Icon';
import type { CalendarEvent, CycleLog } from '../types';

const CAT_EMOJI: Record<CalendarEvent['category'], string> = { anniversary: '💕', birthday: '🎂', trip: '✈️', date: '❤️', reminder: '📅' };
const CAT_COLOR: Record<CalendarEvent['category'], string> = { anniversary: 'var(--sakura-accent)', birthday: 'var(--sakura)', trip: 'var(--ink-2)', date: 'var(--sakura-deep)', reminder: 'var(--sakura-light)' };

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export default function Calendar() {
  const [tab, setTab] = useState<'special' | 'cycle'>('special');
  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {([['special', 'Special Dates', '📅'], ['cycle', 'Cycle', '🌸']] as const).map(([key, label, emoji]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '9px', borderRadius: 10, border: tab === key ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', background: tab === key ? 'var(--sakura-light)' : 'var(--bg)', color: tab === key ? 'var(--sakura-deep)' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon emoji={emoji} size={14} /> {label}
          </button>
        ))}
      </div>
      {tab === 'special' ? <SpecialDatesTab /> : <CycleTrackerTab />}
    </div>
  );
}

function SpecialDatesTab() {
  const { state, deleteEvent } = useApp();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(now.toISOString().split('T')[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0);  setYear(y => y + 1); } else setMonth(m => m + 1); };

  const eventsOnDay = (d: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return state.events.filter(e => e.date === dateStr);
  };

  const selectedEvents = selected ? state.events.filter(e => e.date === selected) : [];

  const upcoming = [...state.events]
    .filter(e => e.date >= now.toISOString().split('T')[0])
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div>
      {/* Calendar header */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={prevMonth} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)', fontWeight: 400 }}>{MONTHS[month]}</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>{year}</p>
          </div>
          <button onClick={nextMonth} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        </div>

        {/* Day headers */}
        <div className="calendar-grid" style={{ marginBottom: 8 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="calendar-grid">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const events = eventsOnDay(d);
            const isToday = dateStr === now.toISOString().split('T')[0];
            const isSelected = dateStr === selected;
            return (
              <div key={d} onClick={() => setSelected(dateStr)} style={{ textAlign: 'center', padding: '6px 4px', borderRadius: 10, cursor: 'pointer', background: isSelected ? 'var(--sakura-deep)' : isToday ? 'var(--sakura-light)' : 'transparent', transition: 'background 0.15s', position: 'relative' }}>
                <span style={{ fontSize: 14, fontWeight: isToday || isSelected ? 700 : 400, color: isSelected ? 'white' : isToday ? 'var(--sakura-deep)' : 'var(--ink)' }}>{d}</span>
                {events.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 3 }}>
                    {events.slice(0, 2).map(e => (
                      <div key={e.id} style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.7)' : CAT_COLOR[e.category] }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day events */}
      {selected && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
              {new Date(selected + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <button onClick={() => setShowAdd(true)} style={{ background: 'var(--sakura-light)', border: 'none', borderRadius: 99, padding: '6px 14px', color: 'var(--sakura-deep)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+ Add</button>
          </div>
          {selectedEvents.length === 0
            ? <div style={{ textAlign: 'center', padding: '24px', color: 'var(--ink-2)', fontSize: 14 }}>No events · <span style={{ color: 'var(--sakura-deep)', cursor: 'pointer' }} onClick={() => setShowAdd(true)}>Add one</span></div>
            : selectedEvents.map(ev => <EventCard key={ev.id} event={ev} onEdit={setEditing} onDelete={deleteEvent} />)
          }
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 10 }}>Upcoming</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map(ev => <EventCard key={ev.id} event={ev} onEdit={setEditing} onDelete={deleteEvent} />)}
          </div>
        </div>
      )}

      {showAdd && <AddEventForm onClose={() => setShowAdd(false)} />}
      {editing && <AddEventForm onClose={() => setEditing(null)} existing={editing} />}
    </div>
  );
}

function EventCard({ event: ev, onEdit, onDelete }: { event: CalendarEvent; onEdit: (ev: CalendarEvent) => void; onDelete: (id: string) => void }) {
  const [confirm, setConfirm] = useState(false);
  const d = new Date(ev.date + 'T12:00:00');
  return (
    <div className="card" style={{ padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--sakura-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji={CAT_EMOJI[ev.category]} size={22} /></div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{ev.title}</p>
        <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{ev.time ? ` · ${ev.time}` : ''}</p>
        {ev.location && <p style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4 }}><Icon emoji="📍" size={12} /> {ev.location}</p>}
        {ev.notes && <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>{ev.notes}</p>}
      </div>
      {!confirm
        ? <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => onEdit(ev)} title="Edit" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 28, height: 28, color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✏️" size={13} /></button>
            <button onClick={() => setConfirm(true)} title="Delete" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 28, height: 28, color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={13} /></button>
          </div>
        : <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={() => onDelete(ev.id)} style={{ background: 'var(--sakura-deep)', color: 'white', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Delete</button>
            <button onClick={() => setConfirm(false)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)' }}>No</button>
          </div>
      }
    </div>
  );
}

// ── Cycle tracker ────────────────────────────────────────────────────────
// Everything here — next-period date, ovulation window, average lengths —
// is computed client-side from the couple's own logged history. No outside
// API: this is plain arithmetic, and sending menstrual-health data to a
// third-party service would be an unnecessary privacy risk for something
// this simple to work out locally.

function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function addDaysISO(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetweenISO(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000);
}

function formatShortDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

interface CycleStats {
  avgCycle: number;
  avgPeriod: number;
  hasEnoughData: boolean;
  nextStart?: string;
  ovulation?: string;
  fertileStart?: string;
  fertileEnd?: string;
}

// Ovulation is estimated ~14 days before the *next* predicted period (the
// luteal phase is fairly constant across cycle lengths, unlike the
// follicular phase) — the fertile window is the ~5 days leading up to it
// plus the day after, since sperm can survive several days but the egg
// itself only ~24h.
function computeCycleStats(logs: CycleLog[]): CycleStats {
  const sorted = [...logs].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const cycleLengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const days = daysBetweenISO(sorted[i - 1].startDate, sorted[i].startDate);
    if (days > 0) cycleLengths.push(days);
  }
  const avgCycle = cycleLengths.length > 0 ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length) : 28;

  const periodLengths: number[] = [];
  for (const l of sorted) {
    if (l.endDate) {
      const days = daysBetweenISO(l.startDate, l.endDate) + 1;
      if (days > 0) periodLengths.push(days);
    }
  }
  const avgPeriod = periodLengths.length > 0 ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length) : 5;

  const last = sorted[sorted.length - 1];
  if (!last) return { avgCycle, avgPeriod, hasEnoughData: false };

  const nextStart = addDaysISO(last.startDate, avgCycle);
  const ovulation = addDaysISO(nextStart, -14);
  return {
    avgCycle, avgPeriod, hasEnoughData: cycleLengths.length > 0,
    nextStart, ovulation,
    fertileStart: addDaysISO(ovulation, -5),
    fertileEnd: addDaysISO(ovulation, 1),
  };
}

function CycleTrackerTab() {
  const { state, addCycleLog, updateCycleLog, deleteCycleLog } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CycleLog | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const logs = state.cycleLogs;
  const sorted = [...logs].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const stats = computeCycleStats(logs);
  const today = todayISO();
  const daysUntilNext = stats.nextStart ? daysBetweenISO(today, stats.nextStart) : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>Cycle <Icon emoji="🌸" size={18} /></p>
        <button onClick={() => setShowAdd(true)} style={{ background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Log entry</button>
      </div>

      {logs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ marginBottom: 12 }}><Icon emoji="🌸" size={44} /></div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No entries logged yet</p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>Log the start date of your most recent period to begin predictions — the more entries logged, the more accurate they get.</p>
        </div>
      ) : (
        <>
          {/* Predictions — hero */}
          <div style={{ background: 'linear-gradient(135deg, var(--sakura-deep), #a8436a)', borderRadius: 20, padding: '20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />

            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}><Icon emoji="🩸" size={12} /> Next period (predicted)</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, color: 'white' }}>{stats.nextStart && formatShortDate(stats.nextStart)}</p>
              {daysUntilNext !== null && (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'white', background: 'rgba(255,255,255,0.22)', padding: '5px 12px', borderRadius: 99 }}>
                  {daysUntilNext < 0 ? `${-daysUntilNext} days late` : daysUntilNext === 0 ? 'Today!' : `In ${daysUntilNext} days`}
                </span>
              )}
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.18)', marginBottom: 14 }} />

            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}><Icon emoji="🥚" size={12} /> Predicted ovulation day</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 12 }}>{stats.ovulation && formatShortDate(stats.ovulation)}</p>

            <div style={{ background: 'rgba(255,255,255,0.14)', borderRadius: 12, padding: '10px 14px' }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginBottom: 2 }}>Fertile window: {stats.fertileStart && formatShortDate(stats.fertileStart)} – {stats.fertileEnd && formatShortDate(stats.fertileEnd)}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>This is the window with the highest chance of conception.</p>
            </div>

            {!stats.hasEnoughData && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}><Icon emoji="⚠️" size={11} /> Only one entry logged so far, so this estimate uses a default 28-day cycle. Log the next period for a more accurate prediction.</p>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            <div className="card" style={{ padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><Icon emoji="🔄" size={18} /></div>
              <p style={{ fontSize: 10, color: 'var(--ink-2)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Average cycle length</p>
              <p style={{ fontSize: 21, fontWeight: 700, color: 'var(--sakura-deep)' }}>{stats.avgCycle} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>days</span></p>
              <p style={{ fontSize: 10, color: 'var(--ink-2)', marginTop: 2 }}>from the start of one period to the start of the next</p>
            </div>
            <div className="card" style={{ padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><Icon emoji="🩸" size={18} /></div>
              <p style={{ fontSize: 10, color: 'var(--ink-2)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Average period length</p>
              <p style={{ fontSize: 21, fontWeight: 700, color: 'var(--sakura-deep)' }}>{stats.avgPeriod} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>days</span></p>
              <p style={{ fontSize: 10, color: 'var(--ink-2)', marginTop: 2 }}>how long each period lasts</p>
            </div>
          </div>

          {/* History */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)' }}>Logged history</p>
            <span style={{ fontSize: 12, color: 'var(--sakura-deep)', fontWeight: 700 }}>{logs.length} entries</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sorted.map((l, i) => (
              <div key={l.id} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: (!l.endDate) ? 10 : 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--sakura-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji="🩸" size={19} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, color: 'var(--sakura-deep)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Period #{sorted.length - i}</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{formatShortDate(l.startDate)}{l.endDate ? ` → ${formatShortDate(l.endDate)}` : ''}</p>
                    <p style={{ fontSize: 12, color: l.endDate ? 'var(--ink-2)' : '#5AC26A', fontWeight: l.endDate ? 400 : 700 }}>{l.endDate ? `${daysBetweenISO(l.startDate, l.endDate) + 1}-day period` : '● Ongoing'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setEditing(l)} title="Edit" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 28, height: 28, color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✏️" size={13} /></button>
                    <button onClick={() => setConfirmDeleteId(l.id)} title="Delete" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 28, height: 28, color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={13} /></button>
                  </div>
                </div>
                {!l.endDate && (
                  <button onClick={() => updateCycleLog(l.id, { startDate: l.startDate, endDate: today })} style={{ width: '100%', background: 'var(--sakura-light)', border: 'none', borderRadius: 10, padding: '8px', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Mark ended today</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {showAdd && <CycleLogForm onClose={() => setShowAdd(false)} onSave={addCycleLog} />}
      {editing && <CycleLogForm onClose={() => setEditing(null)} onSave={l => updateCycleLog(editing.id, l)} existing={editing} />}

      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDeleteId(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Delete this entry?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>This will affect the accuracy of predictions.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { deleteCycleLog(confirmDeleteId); setConfirmDeleteId(null); }} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: '#E8524A', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CycleLogForm({ onClose, onSave, existing }: {
  onClose: () => void;
  onSave: (l: { startDate: string; endDate?: string }) => void;
  existing?: CycleLog;
}) {
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(existing?.endDate ?? '');

  const handleSubmit = () => {
    if (!startDate) return;
    onSave({ startDate, endDate: endDate || undefined });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon emoji="🌸" size={18} /> {existing ? 'Edit entry' : 'Log period'}</p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>START DATE</p>
            <input className="input-field" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>END DATE (optional — leave blank if ongoing)</p>
            <input className="input-field" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
          </div>
          <button onClick={handleSubmit} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15 }}>{existing ? 'Save changes' : 'Log entry'}</button>
        </div>
      </div>
    </div>
  );
}
