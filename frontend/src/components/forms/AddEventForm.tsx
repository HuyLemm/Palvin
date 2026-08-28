import { useState } from 'react';
import { useApp } from '../../context';
import BottomSheet from '../BottomSheet';
import type { CalendarEvent } from '../../types';

const CATEGORIES: CalendarEvent['category'][] = ['anniversary', 'birthday', 'trip', 'date', 'reminder'];
const CAT_EMOJIS: Record<string, string> = { anniversary: '💕', birthday: '🎂', trip: '✈️', date: '❤️', reminder: '📅' };

export default function AddEventForm({ onClose }: { onClose: () => void }) {
  const { addEvent } = useApp();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState<CalendarEvent['category']>('date');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) { setError('Please enter a title.'); return; }
    if (!date)         { setError('Please select a date.'); return; }
    addEvent({ title, date, time, category, location, notes });
    onClose();
  };

  return (
    <BottomSheet onClose={onClose} title="New Event 📅">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
        <input className="input-field" placeholder="Event title..." value={title} onChange={e => setTitle(e.target.value)} />
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 1 }} />
          <input className="input-field" type="time" value={time} onChange={e => setTime(e.target.value)} style={{ flex: 1 }} />
        </div>
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Category</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: category === cat ? 'var(--sakura-light)' : 'var(--bg)', border: category === cat ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: category === cat ? 'var(--sakura-deep)' : 'var(--ink-2)', transition: 'all 0.15s', textTransform: 'capitalize' }}>
                {CAT_EMOJIS[cat]} {cat}
              </button>
            ))}
          </div>
        </div>
        <input className="input-field" placeholder="Location (optional)" value={location} onChange={e => setLocation(e.target.value)} />
        <input className="input-field" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
        {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} style={{ flex: 2 }}>Add Event</button>
        </div>
      </div>
    </BottomSheet>
  );
}
