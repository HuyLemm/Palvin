import { useEffect, useState } from 'react';
import { useApp } from '../context';
import { getCalendarFeedUrl } from '../lib/serverFeatures';

// "Subscribe in your phone's calendar": a private link that keeps Apple / Google Calendar in sync
// with PALVIN's events. Hidden until the calendar-feed migration + function are deployed.
export default function CalendarFeedLink() {
  const { toast } = useApp();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  // Asking for the link also creates the couple's token row — harmless, and it tells us whether
  // the feature is deployed at all.
  useEffect(() => {
    let live = true;
    void getCalendarFeedUrl().then(r => { if (live) { setUrl(r.url); setAvailable(!r.missing && !!r.url); } });
    return () => { live = false; };
  }, []);

  const show = async (rotate = false) => {
    if (!rotate && url) { setOpen(true); return; }
    const r = await getCalendarFeedUrl(rotate);
    if (!r.url) { toast('Could not get the link', '⚠️'); return; }
    setUrl(r.url); setOpen(true);
  };

  if (!available) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      {!open ? (
        <button onClick={() => void show()} style={{ background: 'none', border: 'none', padding: '8px 0', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Subscribe in your phone&apos;s calendar
        </button>
      ) : (
        <div className="card" style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 8 }}>
            Add this private link as a calendar subscription and new events show up on both phones.
          </p>
          <input className="input-field" readOnly aria-label="Calendar subscription link" value={url ?? ''} onFocus={e => e.currentTarget.select()} style={{ marginBottom: 8, fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-ghost" onClick={() => { void navigator.clipboard?.writeText(url ?? ''); toast('Link copied', '📋'); }} style={{ flex: 1, padding: '10px' }}>Copy link</button>
            <a className="btn-primary" href={(url ?? '').replace(/^https?:/, 'webcal:')} style={{ flex: 1, padding: '10px', textAlign: 'center', textDecoration: 'none' }}>Open in Calendar</a>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 10 }}>
            Anyone with the link can see your events.{' '}
            <button onClick={() => void show(true)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Make a new link</button>{' '}
            if it gets shared by mistake. <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ink-2)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Close</button>
          </p>
        </div>
      )}
    </div>
  );
}
