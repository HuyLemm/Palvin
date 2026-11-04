import { describe, expect, it } from 'vitest';
import { describeDaysLeft, goalPlan } from './goalPlan';

const now = new Date('2026-11-01T10:00:00');

describe('goalPlan', () => {
  it('spreads what is left over the months to the deadline', () => {
    const p = goalPlan(2_000_000, 8_000_000, '2027-05-01', now); // ~6 months
    expect(p.state).toBe('plan');
    expect(p.remaining).toBe(6_000_000);
    expect(p.perMonth).toBeGreaterThanOrEqual(1_000_000);
    expect(p.perMonth).toBeLessThan(1_100_000);
  });
  it('treats less than a month as one month', () => {
    expect(goalPlan(0, 500_000, '2026-11-10', now).perMonth).toBe(500_000);
  });
  it('reports done and overdue', () => {
    expect(goalPlan(5_000_000, 5_000_000, '2026-01-01', now).state).toBe('done');
    const o = goalPlan(1_000_000, 5_000_000, '2026-10-01', now);
    expect(o.state).toBe('overdue');
    expect(o.remaining).toBe(4_000_000);
  });
  it('copes with a missing or odd deadline', () => {
    expect(goalPlan(0, 100, '', now).state).toBe('unknown');
    expect(goalPlan(0, 100, 'soon', now).state).toBe('unknown');
  });
  it('words the time left', () => {
    expect(describeDaysLeft(1)).toBe('1 day left');
    expect(describeDaysLeft(20)).toBe('3 weeks left');
    expect(describeDaysLeft(200)).toBe('7 months left');
  });
});
