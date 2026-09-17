import { useState, type CSSProperties } from 'react';
import Icon from '../Icon';
import type { Trip, TripDay } from '../../types';

// Duplicated from TripPlanner.tsx's own MoneyInput/todayISO/daysBetween/
// addDaysToDate/buildItinerary rather than imported — TripPlanner is
// lazy-loaded as its own chunk (see App.tsx via Us.tsx), and importing from
// it here (used by the bottom navbar's eagerly-loaded quick-add menu) would
// pull the whole screen into the main bundle.
function MoneyInput({ value, onChange, placeholder, style }: { value: string; onChange: (raw: string) => void; placeholder?: string; style?: CSSProperties }) {
  return (
    <input
      className="input-field"
      inputMode="numeric"
      placeholder={placeholder}
      value={value ? Number(value).toLocaleString('en-US') : ''}
      onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
      style={style}
    />
  );
}

function daysBetween(start?: string, end?: string): number {
  if (!start) return 1;
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : s;
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function addDaysToDate(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildItinerary(nDays: number, startDate?: string): TripDay[] {
  return Array.from({ length: Math.max(1, nDays) }, (_, i) => ({
    id: `day${Date.now()}_${i}`,
    day: i + 1,
    date: startDate ? addDaysToDate(startDate, i) : undefined,
    places: [],
  }));
}

export default function AddTripForm({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Omit<Trip, 'id'>) => void }) {
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
    <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 400, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 23, color: 'var(--ink)' }}>New trip</p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="input-field" placeholder="Trip name" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="input-field" placeholder="Destination" value={destination} onChange={e => setDestination(e.target.value)} />
        </div>

        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-2)', marginBottom: 10 }}>When are you going?</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button type="button" onClick={() => setDatesKnown('approx')} style={{ flex: 1, padding: '8px', borderRadius: 10, border: datesKnown === 'approx' ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', background: datesKnown === 'approx' ? 'var(--sakura-light)' : 'var(--bg)', color: 'var(--ink)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Just a rough timeframe</button>
            <button type="button" onClick={() => setDatesKnown('exact')} style={{ flex: 1, padding: '8px', borderRadius: 10, border: datesKnown === 'exact' ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', background: datesKnown === 'exact' ? 'var(--sakura-light)' : 'var(--bg)', color: 'var(--ink)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>I know exact dates</button>
          </div>

          {datesKnown === 'approx' ? (
            <input className="input-field" type="number" min={1} placeholder="About how many days?" value={approxDays} onChange={e => setApproxDays(e.target.value)} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 4 }}>Departure date</p>
                <input className="input-field" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600, marginBottom: 4 }}>Return date</p>
                <input className="input-field" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>
          )}
          {nDays > 0 && (
            <p style={{ fontSize: 12, color: 'var(--sakura-deep)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
              <Icon emoji="📅" size={12} /> {nDays} days {nDays - 1} nights — we'll set up {nDays} empty itinerary days for you to fill in
            </p>
          )}
        </div>

        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MoneyInput placeholder="Budget (VND)" value={budget} onChange={setBudget} />
          <textarea className="input-field" placeholder="Notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ resize: 'none' }} />
          <button onClick={handleSubmit} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15 }}>Add trip</button>
        </div>
      </div>
    </div>
  );
}
