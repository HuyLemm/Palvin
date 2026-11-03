// PALVIN — monthly-recap edge function
//
// Turns a month's *aggregated* spending numbers into a short, friendly recap using the
// Claude API. The app sends only totals per category (never titles, notes, names or
// photos), and only after the user taps "Write my recap" and accepts the notice.
//
// Needs the secret ANTHROPIC_API_KEY. Deployed WITH JWT verification (signed-in users only):
//   npx supabase secrets set ANTHROPIC_API_KEY=... --project-ref <ref>
//   npx supabase functions deploy monthly-recap --project-ref <ref>

const API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL = 'claude-haiku-5-5';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

interface Input { month: string; currency: string; income: number; expense: number; prevExpense: number | null; byCategory: { category: string; amount: number }[] }

function valid(x: unknown): x is Input {
  const i = x as Input;
  return !!i && typeof i.month === 'string' && /^\d{4}-\d{2}$/.test(i.month)
    && typeof i.currency === 'string' && i.currency.length <= 5
    && Number.isFinite(i.income) && Number.isFinite(i.expense)
    && (i.prevExpense === null || Number.isFinite(i.prevExpense))
    && Array.isArray(i.byCategory) && i.byCategory.length <= 20
    && i.byCategory.every(c => typeof c.category === 'string' && c.category.length <= 40 && Number.isFinite(c.amount));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!API_KEY) return json({ error: 'not_configured' }, 503);

  let input: unknown;
  try { input = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!valid(input)) return json({ error: 'Invalid input' }, 400);

  const top = [...input.byCategory].sort((a, b) => b.amount - a.amount).slice(0, 8);
  const facts = [
    `Month: ${input.month}`,
    `Currency: ${input.currency}`,
    `Income: ${input.income}`,
    `Spent: ${input.expense}`,
    input.prevExpense === null ? 'Previous month spending: not available' : `Previous month spending: ${input.prevExpense}`,
    'Spending by category:',
    ...top.map(c => `- ${c.category}: ${c.amount}`),
  ].join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system: 'You write a warm, concise monthly money recap for a couple using their shared budgeting app. '
        + 'Use only the numbers provided; never invent figures, merchants or events. 3 to 4 short sentences, plain text, '
        + 'no lists, no financial advice beyond one gentle, practical observation. Format amounts with thousands separators.',
      messages: [{ role: 'user', content: facts }],
    }),
  });
  if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
  const data = await res.json();
  const text = (data?.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('').trim();
  if (!text) return json({ error: 'empty' }, 502);
  return json({ text });
});
