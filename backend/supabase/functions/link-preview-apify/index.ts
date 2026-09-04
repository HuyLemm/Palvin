// PALVIN — deep link preview via Apify (real headless browser + proxy pool)
//
// The plain-fetch link-preview function (and Microlink) can't get real data
// off JS-rendered storefronts like Shopee — the product's title/image are
// injected by client-side JS a static HTML fetch never runs, and Shopee's
// anti-bot measures make even Microlink's own headless render unreliable.
// Apify's `apify/web-scraper` actor runs a real Puppeteer browser (through
// Apify's proxy pool) and can wait for the page to actually finish
// hydrating before reading its meta tags — a real fix for that class of
// site, not just a faster failure.
//
// This is deliberately its own function, not folded into link-preview:
// an Apify actor run can legitimately take 10-60+ seconds (spinning up a
// browser, navigating, waiting for JS), so it is only ever called from the
// frontend's BACKGROUND retry path (after the fast link-preview/Microlink
// chain already came back empty) — never from the live "while you're
// typing" preview, which stays fast. See frontend/src/screens/Us.tsx's
// fetchFromApify + the background .then() chains in Add/Edit.
//
// Needs the APIFY_API_TOKEN secret set on the project:
//   npx supabase secrets set --project-ref qxzordcbytsogzvndmas APIFY_API_TOKEN=apify_api_...
//
// Deploy with (from backend/supabase):
//   npx supabase functions deploy link-preview-apify --no-verify-jwt

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// apify/web-scraper's pageFunction runs INSIDE the actor's real browser
// page already (Apify injects and evaluates it there itself) — there is no
// context.page/Puppeteer handle to reach for; `document` is directly
// available. Waits a few seconds after load for client-side-rendered meta
// tags (Shopee-style SPAs) to actually populate before reading them, via
// this actor's own context.waitFor(ms), not a Puppeteer API.
const PAGE_FUNCTION = `
async function pageFunction(context) {
  await context.waitFor(4000);
  function meta(selector) {
    const el = document.querySelector(selector);
    return el ? el.getAttribute('content') : undefined;
  }
  return {
    title: meta('meta[property="og:title"]') || meta('meta[name="twitter:title"]') || document.title || undefined,
    description: meta('meta[property="og:description"]') || meta('meta[name="twitter:description"]') || meta('meta[name="description"]') || undefined,
    image: meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]') || undefined,
  };
}
`;

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

  const token = Deno.env.get('APIFY_API_TOKEN');
  if (!token) {
    return new Response(JSON.stringify({ status: 'fail', error: 'APIFY_API_TOKEN not configured' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const controller = new AbortController();
  // run-sync-get-dataset-items holds the connection open until the actor
  // run finishes (up to 300s server-side) — 90s here is our own ceiling
  // since this is a background best-effort call, not something anything
  // else is waiting on synchronously.
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=85`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url: targetUrl }],
          pageFunction: PAGE_FUNCTION,
          // Shopee-style anti-bot blocks Apify's shared DATACENTER proxy
          // pool just like it blocks everyone else's — residential IPs cost
          // $8/GB on Apify but a single page fetch is a tiny fraction of a
          // GB, so this is still well within the free $5/month credit at
          // this app's actual (very low) volume.
          proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
          maxRequestRetries: 1,
          maxPagesPerCrawl: 1,
          pageLoadTimeoutSecs: 30,
        }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ status: 'fail', error: `Apify run failed: ${res.status} ${text.slice(0, 300)}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    const items = await res.json();
    const item = Array.isArray(items) ? items[0] : undefined;
    if (!item || (!item.title && !item.image)) {
      return new Response(JSON.stringify({ status: 'fail', error: 'No usable preview data found' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({ status: 'success', data: { title: item.title, description: item.description, image: item.image } }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ status: 'fail', error: String(err) }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }
});
