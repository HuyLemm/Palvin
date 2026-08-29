import { useState } from 'react';
import { useApp } from '../context';
import AddEventForm from '../components/forms/AddEventForm';
import Icon from '../components/Icon';
import type { CalendarEvent } from '../types';

const CAT_EMOJI: Record<CalendarEvent['category'], string> = { anniversary: '💕', birthday: '🎂', trip: '✈️', date: '❤️', reminder: '📅' };
const CAT_COLOR: Record<CalendarEvent['category'], string> = { anniversary: '#E67F9A', birthday: '#F3A6B9', trip: '#8C7A80', date: '#C95F7C', reminder: '#FADCE4' };

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export default function Calendar() {
  const { state, addEvent, deleteEvent } = useApp();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(now.toISOString().split('T')[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [detail, setDetail] = useState<CalendarEvent | null>(null);

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
    <div style={{ paddingBottom: 32 }}>
      {/* Calendar header */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={prevMonth} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)', fontWeight: 400 }}>{MONTHS[month]}</p>
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
            : selectedEvents.map(ev => <EventCard key={ev.id} event={ev} onDelete={deleteEvent} />)
          }
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 10 }}>Upcoming</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map(ev => <EventCard key={ev.id} event={ev} onDelete={deleteEvent} />)}
          </div>
        </div>
      )}

      {showAdd && <AddEventForm onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function EventCard({ event: ev, onDelete }: { event: CalendarEvent; onDelete: (id: string) => void }) {
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
        ? <button onClick={() => setConfirm(true)} style={{ background: 'none', border: 'none', color: 'var(--ink-2)', opacity: 0.4, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
        : <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => onDelete(ev.id)} style={{ background: 'var(--sakura-deep)', color: 'white', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Delete</button>
            <button onClick={() => setConfirm(false)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)' }}>No</button>
          </div>
      }
    </div>
  );
}
