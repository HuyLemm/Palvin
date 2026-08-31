// PALVIN — song search proxy
//
// Calls the iTunes Search API from Supabase's own servers instead of the
// user's browser, so it works even on networks that block itunes.apple.com
// directly (seen with some ISPs/wifi) — this function has no such block.
//
// Scope: frontend/src/screens/Us.tsx (PlaylistScreen's song search).
//
// Deploy with (from backend/supabase):
//   npx supabase login
//   npx supabase link --project-ref qxzordcbytsogzvndmas
//   npx supabase functions deploy song-search --no-verify-jwt

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const term = new URL(req.url).searchParams.get('term') ?? '';
  if (!term.trim()) {
    return new Response(JSON.stringify({ resultCount: 0, results: [] }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=6`;
    const res = await fetch(itunesUrl);
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
