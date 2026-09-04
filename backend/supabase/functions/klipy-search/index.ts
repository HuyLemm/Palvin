// PALVIN — sticker/GIF search via Klipy
//
// Klipy is the near-identical successor to Tenor's GIF/sticker API, which
// Google stopped accepting new API clients for in Jan 2026 and fully shut
// down in June 2026 — Klipy was founded by former Tenor employees
// specifically to give apps (WhatsApp, Discord, Bluesky, ...) somewhere to
// migrate to, with a free tier and a very similar API shape.
//
// This proxies the search so the API key (in the URL path, per Klipy's
// convention) never reaches the browser — same reasoning as every other
// third-party API key in this project.
//
// Scope: frontend/src/screens/Chat.tsx's sticker picker "Search" tab.
//
// Needs the KLIPY_API_KEY secret set on the project:
//   npx supabase secrets set --project-ref qxzordcbytsogzvndmas KLIPY_API_KEY=...
// Get a free key at https://klipy.com/developers
//
// Deploy with (from backend/supabase):
//   npx supabase functions deploy klipy-search --no-verify-jwt

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  // "stickers" for the sticker-specific catalog; Klipy also serves "gifs"
  // under the same shape if that's ever wanted here too.
  const type = url.searchParams.get('type') === 'gifs' ? 'gifs' : 'stickers';

  const apiKey = Deno.env.get('KLIPY_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ result: false, error: 'KLIPY_API_KEY not configured' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    // No query -> trending (a sensible default when the picker first opens,
    // before the user has typed anything).
    const path = q ? `${type}/search` : `${type}/trending`;
    const qs = new URLSearchParams({ per_page: '30', page: '1', locale: 'en_US' });
    if (q) qs.set('q', q);
    const klipyUrl = `https://api.klipy.com/api/v1/${apiKey}/${path}?${qs.toString()}`;
    const res = await fetch(klipyUrl, { signal: controller.signal });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ result: false, error: String(err) }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }
});
