import { describe, expect, it } from 'vitest';
import { plural } from './plural';

describe('plural', () => {
  it('uses the singular only for exactly 1', () => {
    expect(plural(1, 'day')).toBe('day');
    expect(plural(0, 'day')).toBe('days');
    expect(plural(2, 'day')).toBe('days');
  });
  it('accepts an irregular plural', () => {
    expect(plural(2, 'child', 'children')).toBe('children');
  });
});
