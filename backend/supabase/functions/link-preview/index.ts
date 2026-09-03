// PALVIN — link preview proxy
//
// Fetches a product/article page's own HTML server-side and extracts its
// title/image/description from standard <meta> tags, instead of relying on
// a third-party link-unfurling API (Microlink) called straight from the
// browser — that free tier is capped at 25 requests/day PER IP ADDRESS,
// shared across every wish either partner adds that day, and gets used up
// fast. This has no such shared quota (Supabase's own free Edge Function
// invocation limit is far higher and per-project, not per-IP).
//
// This does NOT fix sites that actively block automated fetches outright
// (Shopee serves a generic "unavailable" shell to non-browser requests,
// Lazada/TikTok Shop don't respond at all) — that's the site's own
// anti-scraping measure, not something fixable from a proxy without a full
// paid headless-browser/residential-proxy service, and even those aren't
// guaranteed against sites built specifically to block them. For any site
// that DOES serve normal server-rendered meta tags (which covers most
// blogs, brand sites, and many shops), this now works with no daily cap.
//
// Scope: frontend/src/screens/Us.tsx (GiftWishlistScreen's link preview).
//
// Deploy with (from backend/supabase):
//   npx supabase login
//   npx supabase link --project-ref qxzordcbytsogzvndmas
//   npx supabase functions deploy link-preview --no-verify-jwt

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// A real browser UA — some sites serve a stripped-down (or blocked)
// response to an obvious bot/script user agent. Doesn't help against sites
// that fingerprint more deeply than that, but costs nothing to send.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

// Meta tags can have their attributes in either order
// (property/name before content, or after) — tries both.
function extractMeta(html: string, key: string, attr: 'property' | 'name' = 'property'): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return undefined;
}

function extractTitleTag(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m?.[1] ? decodeEntities(m[1].trim()) : undefined;
}

// A last-resort fallback for a page with no <meta> tags at all describing
// itself, but that does embed Schema.org Product/ImageObject JSON-LD (many
// storefronts do, purely for Google's rich-result snippets) — pulls the
// first "image" value out of the first <script type="application/ld+json">
// block without needing a full JSON-LD parser.
function extractJsonLdImage(html: string): string | undefined {
  const scripts = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const s of scripts) {
    const m = s[1].match(/"image"\s*:\s*"([^"]+)"/) ?? s[1].match(/"image"\s*:\s*\[\s*"([^"]+)"/);
    if (m?.[1]) return decodeEntities(m[1]);
  }
  return undefined;
}

function resolveUrl(maybeRelative: string | undefined, base: string): string | undefined {
  if (!maybeRelative) return undefined;
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return undefined;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const targetUrl = new URL(req.url).searchParams.get('url') ?? '';
  if (!/^https?:\/\/.+/i.test(targetUrl)) {
    return new Response(JSON.stringify({ status: 'fail', error: 'Missing or invalid url' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,application/xhtml+xml' },
    });
    // Only read enough to find the <head> meta tags — real product pages
    // can be megabytes of HTML/inline data, and everything we want lives
    // near the top of the document.
    const full = await res.text();
    const html = full.slice(0, 200_000);

    const title = extractMeta(html, 'og:title') ?? extractMeta(html, 'twitter:title', 'name') ?? extractTitleTag(html);
    const description = extractMeta(html, 'og:description') ?? extractMeta(html, 'twitter:description', 'name') ?? extractMeta(html, 'description', 'name');
    const image = resolveUrl(
      extractMeta(html, 'og:image') ?? extractMeta(html, 'twitter:image', 'name') ?? extractJsonLdImage(html),
      targetUrl,
    );

    return new Response(JSON.stringify({ status: 'success', data: { title, description, image } }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ status: 'fail', error: String(err) }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }
});
