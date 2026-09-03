import { useState } from 'react';
import { useApp } from '../../context';
import Icon from '../Icon';
import type { CalendarEvent } from '../../types';

const CATEGORIES: CalendarEvent['category'][] = ['anniversary', 'birthday', 'trip', 'date', 'reminder'];
const CAT_EMOJIS: Record<string, string> = { anniversary: '💕', birthday: '🎂', trip: '✈️', date: '❤️', reminder: '📅' };

// Local calendar date (not UTC) so "today" matches what the user's clock
// actually shows, regardless of timezone.
function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function AddEventForm({ onClose, existing }: { onClose: () => void; existing?: CalendarEvent }) {
  const { addEvent, updateEvent } = useApp();
  const isEdit = !!existing;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [category, setCategory] = useState<CalendarEvent['category']>(existing?.category ?? 'date');
  const [location, setLocation] = useState(existing?.location ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) { setError('Please enter a title.'); return; }
    if (!date)         { setError('Please select a date.'); return; }
    const data = { title, date, time: '', category, location, notes };
    if (isEdit) updateEvent(existing.id, data);
    else addEvent(data);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 400, maxHeight: '80vh', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 23, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon emoji="📅" size={20} /> {isEdit ? 'Edit Event' : 'New Event'}</p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input className="input-field" placeholder="Event title..." value={title} onChange={e => setTitle(e.target.value)} />
          <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Category</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: category === cat ? 'var(--sakura-light)' : 'var(--bg)', border: category === cat ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: category === cat ? 'var(--sakura-deep)' : 'var(--ink-2)', transition: 'all 0.15s', textTransform: 'capitalize' }}>
                  <Icon emoji={CAT_EMOJIS[cat]} size={14} /> {cat}
                </button>
              ))}
            </div>
          </div>
          <input className="input-field" placeholder="Location (optional)" value={location} onChange={e => setLocation(e.target.value)} />
          <input className="input-field" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
          {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
          <button className="btn-primary" onClick={handleSubmit} style={{ padding: '13px', fontSize: 15 }}>{isEdit ? 'Save Changes' : 'Add Event'}</button>
        </div>
      </div>
    </div>
  );
}
