import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabaseClient', () => ({ supabase: {} }));

import { budgetRatio, isMissing } from './serverFeatures';

describe('isMissing', () => {
  it('detects tables / functions that are not deployed', () => {
    expect(isMissing({ code: 'PGRST205' })).toBe(true);
    expect(isMissing({ code: '42P01' })).toBe(true);
    expect(isMissing({ message: 'Could not find the function in the schema cache' })).toBe(true);
    expect(isMissing({ status: 404 })).toBe(true);
  });
  it('does not hide real failures', () => {
    expect(isMissing(null)).toBe(false);
    expect(isMissing({ code: '42501', message: 'permission denied' })).toBe(false);
  });
});

describe('budgetRatio', () => {
  it('is spent / limit and safe for a zero limit', () => {
    expect(budgetRatio(600, 1000)).toBe(0.6);
    expect(budgetRatio(1200, 1000)).toBeGreaterThan(1);
    expect(budgetRatio(500, 0)).toBe(0);
  });
});
