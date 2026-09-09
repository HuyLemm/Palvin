import { supabase } from './lib/supabaseClient';

export interface ComplianceMiss {
  profileName: string;
  date: string; // 'YYYY-MM-DD'
}

export interface DailyComplianceReport {
  // Days a person didn't log any streak-qualifying activity at all.
  streakMisses: ComplianceMiss[];
  // Days a person had at least one daily to-do assigned to them (or "Both")
  // that existed by then, and didn't finish every one of them.
  todoMisses: ComplianceMiss[];
}

const EMPTY_REPORT: DailyComplianceReport = { streakMisses: [], todoMisses: [] };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Derived entirely from existing data (streak_activity, todos,
// todo_daily_completions) — same "no dedicated audit table" approach as
// activityLog.ts's edit/delete log — rather than a separate persisted miss
// log that would need its own daily cron to stay in sync.
export async function fetchDailyCompliance(coupleId: string, profiles: { id: string; displayName: string }[]): Promise<DailyComplianceReport> {
  const [streakRes, todosRes, completionsRes] = await Promise.all([
    supabase.from('streak_activity').select('profile_id, active_date').eq('couple_id', coupleId),
    supabase.from('todos').select('id, owner, created_at').eq('kind', 'daily'),
    supabase.from('todo_daily_completions').select('todo_id, completion_date'),
  ]);
  if (streakRes.error || todosRes.error || completionsRes.error) return EMPTY_REPORT;

  const streakRows = (streakRes.data ?? []) as { profile_id: string; active_date: string }[];
  const todos = (todosRes.data ?? []) as { id: string; owner: string; created_at: string }[];
  const completions = (completionsRes.data ?? []) as { todo_id: string; completion_date: string }[];

  const allDates = [
    ...streakRows.map(r => r.active_date),
    ...todos.map(t => t.created_at.slice(0, 10)),
  ];
  if (allDates.length === 0) return EMPTY_REPORT;
  const startDate = allDates.reduce((min, d) => (d < min ? d : min));
  const today = todayISO();

  const streakSet = new Set(streakRows.map(r => `${r.profile_id}:${r.active_date}`));
  const completionsByTodo = new Map<string, Set<string>>();
  for (const c of completions) {
    if (!completionsByTodo.has(c.todo_id)) completionsByTodo.set(c.todo_id, new Set());
    completionsByTodo.get(c.todo_id)!.add(c.completion_date);
  }

  const streakMisses: ComplianceMiss[] = [];
  const todoMisses: ComplianceMiss[] = [];

  // Walk day by day from the earliest relevant record through yesterday —
  // today isn't over yet, so it can't have "missed" anything.
  for (let d = new Date(startDate + 'T00:00:00'), end = new Date(today + 'T00:00:00'); d < end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    for (const p of profiles) {
      if (!streakSet.has(`${p.id}:${dateStr}`)) {
        streakMisses.push({ profileName: p.displayName, date: dateStr });
      }
      const dailyForPerson = todos.filter(t => (t.owner === p.displayName || t.owner === 'Both') && t.created_at.slice(0, 10) <= dateStr);
      const incomplete = dailyForPerson.some(t => !completionsByTodo.get(t.id)?.has(dateStr));
      if (dailyForPerson.length > 0 && incomplete) {
        todoMisses.push({ profileName: p.displayName, date: dateStr });
      }
    }
  }

  // Newest first, matching activityLog's ordering.
  streakMisses.reverse();
  todoMisses.reverse();
  return { streakMisses, todoMisses };
}
