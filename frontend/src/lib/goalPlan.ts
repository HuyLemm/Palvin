export interface GoalPlan {
  state: 'done' | 'overdue' | 'plan' | 'unknown';
  remaining: number;
  daysLeft: number;
  /** What to put aside each month to still make the deadline (only for state 'plan'). */
  perMonth: number;
}

const DAY = 86_400_000;

/** Where a savings goal stands: how much is left, how long, and the monthly amount that gets there on time. */
export function goalPlan(current: number, target: number, deadlineISO: string, now = new Date()): GoalPlan {
  const remaining = Math.max(0, target - current);
  if (target > 0 && current >= target) return { state: 'done', remaining: 0, daysLeft: 0, perMonth: 0 };
  const end = /^\d{4}-\d{2}-\d{2}$/.test(deadlineISO) ? new Date(deadlineISO + 'T23:59:59') : null;
  if (!end || isNaN(end.getTime())) return { state: 'unknown', remaining, daysLeft: 0, perMonth: 0 };
  const daysLeft = Math.ceil((end.getTime() - now.getTime()) / DAY);
  if (daysLeft <= 0) return { state: 'overdue', remaining, daysLeft: 0, perMonth: 0 };
  const months = Math.max(1, daysLeft / 30.4375);
  return { state: 'plan', remaining, daysLeft, perMonth: Math.ceil(remaining / months / 1000) * 1000 };
}

export function describeDaysLeft(days: number): string {
  if (days >= 60) return `${Math.round(days / 30.4375)} months left`;
  if (days >= 14) return `${Math.round(days / 7)} weeks left`;
  return `${days} ${days === 1 ? 'day' : 'days'} left`;
}
