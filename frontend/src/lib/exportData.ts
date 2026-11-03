import type { CalendarEvent } from '../types';

// Client-side file helpers: nothing leaves the device — the browser builds the
// file from data already on screen and hands it to the user as a download.

export function downloadFile(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  // Quote anything with a delimiter/newline/quote, and neutralise spreadsheet formulas.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCSV(rows: Record<string, unknown>[], columns: string[]): string {
  // BOM so Excel opens Vietnamese text correctly.
  return '\uFEFF' + [columns.join(','), ...rows.map(r => columns.map(c => csvCell(r[c])).join(','))].join('\r\n');
}

const pad = (n: number) => String(n).padStart(2, '0');
const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);

/** A one-event .ics file (opens in Apple/Google Calendar). Recurring events keep their repeat rule. */
export function eventToICS(ev: CalendarEvent): string {
  const [y, m, d] = ev.date.split('-').map(Number);
  const t = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec((ev.time || '').trim());
  let hh = t ? Number(t[1]) : 0;
  if (t && t[3]) { const pm = t[3].toUpperCase() === 'PM'; if (pm && hh < 12) hh += 12; if (!pm && hh === 12) hh = 0; }
  const mm = t ? Number(t[2]) : 0;
  const day = `${y}${pad(m)}${pad(d)}`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PALVIN//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${ev.id}@palvin`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`];
  if (t) {
    lines.push(`DTSTART:${day}T${pad(hh)}${pad(mm)}00`, `DTEND:${day}T${pad((hh + 1) % 24)}${pad(mm)}00`);
  } else {
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`);
  }
  lines.push(`SUMMARY:${icsEscape(ev.title)}`);
  if (ev.location) lines.push(`LOCATION:${icsEscape(ev.location)}`);
  if (ev.notes) lines.push(`DESCRIPTION:${icsEscape(ev.notes)}`);
  if (ev.recurrence !== 'none') lines.push(`RRULE:FREQ=${ev.recurrence.toUpperCase()}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}
