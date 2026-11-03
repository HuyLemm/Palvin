// PALVIN — calendar-feed edge function
//
// GET /functions/v1/calendar-feed?token=<uuid> returns the couple's events as an
// .ics feed (text/calendar) so a phone calendar can subscribe to it. The token is the
// only credential (see migration 0096), so the function is deployed without JWT checks.
//
// Deploy (from backend/supabase):
//   npx supabase functions deploy calendar-feed --no-verify-jwt --project-ref <ref>

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pad = (n: number) => String(n).padStart(2, '0');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);

// RFC 5545 asks for lines of at most 75 octets; fold longer ones.
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = []; let cur = '';
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length === 0 ? 75 : 74)) { out.push(cur); cur = ch; } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

interface Row { id: string; title: string; event_date: string; event_time: string | null; location: string | null; notes: string | null; recurrence: string }

function vevent(e: Row): string[] {
  const [y, m, d] = e.event_date.split('-').map(Number);
  const day = `${y}${pad(m)}${pad(d)}`;
  const lines = ['BEGIN:VEVENT', `UID:${e.id}@palvin`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`];
  const t = e.event_time ? /^(\d{2}):(\d{2})/.exec(e.event_time) : null;
  if (t) {
    const hh = Number(t[1]);
    lines.push(`DTSTART:${day}T${t[1]}${t[2]}00`, `DTEND:${day}T${pad((hh + 1) % 24)}${t[2]}00`);
  } else {
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`);
  }
  lines.push(`SUMMARY:${esc(e.title)}`);
  if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
  if (e.notes) lines.push(`DESCRIPTION:${esc(e.notes)}`);
  if (e.recurrence && e.recurrence !== 'none') lines.push(`RRULE:FREQ=${e.recurrence.toUpperCase()}`);
  lines.push('END:VEVENT');
  return lines;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!UUID.test(token)) return new Response('Not found', { status: 404 });

  const { data: tok } = await supabase.from('calendar_feed_tokens').select('couple_id').eq('token', token).maybeSingle();
  if (!tok) return new Response('Not found', { status: 404 });

  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('id, title, event_date, event_time, location, notes, recurrence')
    .eq('couple_id', tok.couple_id)
    .order('event_date');
  if (error) return new Response('Server error', { status: 500 });

  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PALVIN//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:PALVIN', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H',
    ...(events as Row[] ?? []).flatMap(vevent),
    'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n';

  return new Response(ics, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Disposition': 'inline; filename="palvin.ics"' },
  });
});
