import { supabase } from './supabaseClient';

// Client side of the optional server features (migrations 0094–0096 and the
// calendar-feed / monthly-recap edge functions). Each call reports `missing: true`
// when the piece is not deployed yet, so the UI can simply hide that feature
// instead of showing errors.
type Err = { code?: string; message?: string; status?: number } | null | undefined;

export const isMissing = (err: Err) =>
  !!err && (['PGRST205', 'PGRST202', '42P01', '42883'].includes(err.code ?? '')
    || /schema cache|does not exist|could not find|not found/i.test(err.message ?? '')
    || err.status === 404);

// ---------------------------------------------------------------- budgets
export interface Budget { id: string; category: string; limit: number }

export async function fetchBudgets(): Promise<{ data: Budget[]; missing: boolean }> {
  const { data, error } = await supabase.from('budgets').select('id, category, monthly_limit').order('category');
  if (error) return { data: [], missing: isMissing(error) };
  return { data: (data ?? []).map(r => ({ id: r.id, category: r.category, limit: Number(r.monthly_limit) })), missing: false };
}

export async function saveBudget(category: string, limit: number): Promise<boolean> {
  const { error } = await supabase.from('budgets').upsert({ category, monthly_limit: limit }, { onConflict: 'couple_id,category' });
  return !error;
}

export async function deleteBudget(id: string): Promise<boolean> {
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  return !error;
}

/** 0 = untouched, 1 = at the limit; anything above 1 is over budget. */
export const budgetRatio = (spent: number, limit: number) => (limit > 0 ? spent / limit : 0);

// ---------------------------------------------------------- daily question
export interface DailyState {
  question: { id: number; body: string } | null;
  mine: string | null;
  theirs: string | null;
  missing: boolean;
}

export async function fetchDaily(dateISO: string, myProfileId: string): Promise<DailyState> {
  const q = await supabase.rpc('daily_question', { d: dateISO });
  if (q.error) return { question: null, mine: null, theirs: null, missing: isMissing(q.error) };
  const row = Array.isArray(q.data) ? q.data[0] : q.data;
  if (!row) return { question: null, mine: null, theirs: null, missing: false };
  const a = await supabase.from('daily_answers').select('profile_id, body').eq('answer_date', dateISO);
  const rows = a.data ?? [];
  return {
    question: { id: row.id, body: row.body },
    mine: rows.find(r => r.profile_id === myProfileId)?.body ?? null,
    theirs: rows.find(r => r.profile_id !== myProfileId)?.body ?? null,
    missing: false,
  };
}

export async function submitDailyAnswer(questionId: number, dateISO: string, body: string): Promise<boolean> {
  const { error } = await supabase.from('daily_answers')
    .upsert({ question_id: questionId, answer_date: dateISO, body: body.trim() }, { onConflict: 'profile_id,answer_date' });
  return !error;
}

// ------------------------------------------------------------ calendar feed
export async function getCalendarFeedUrl(rotate = false): Promise<{ url: string | null; missing: boolean }> {
  const { data, error } = await supabase.rpc(rotate ? 'rotate_calendar_feed_token' : 'get_calendar_feed_token');
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (error || typeof data !== 'string' || !uuid.test(data)) return { url: null, missing: isMissing(error) || !error };
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
  return { url: `${base}/functions/v1/calendar-feed?token=${data}`, missing: false };
}

// ------------------------------------------------------------------ recap
export interface RecapInput {
  month: string; currency: string; income: number; expense: number; prevExpense: number | null;
  byCategory: { category: string; amount: number }[];
}

export async function requestRecap(input: RecapInput): Promise<{ text?: string; unavailable?: boolean; failed?: boolean }> {
  const { data, error } = await supabase.functions.invoke('monthly-recap', { body: input });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    return status === 404 || status === 503 ? { unavailable: true } : { failed: true };
  }
  return data?.text ? { text: String(data.text) } : { failed: true };
}
