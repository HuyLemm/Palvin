import { describe, expect, it } from 'vitest';
import { suggestCategory } from './suggestCategory';

const cats = ['Coffee', 'Entertainment', 'Food', 'Gifts', 'Home', 'Other', 'Transportation', 'Travel'].map(label => ({ label }));
const pick = (t: string) => suggestCategory(t, cats)?.label ?? null;

describe('suggestCategory', () => {
  it('understands Vietnamese with or without diacritics', () => {
    expect(pick('Đổ xăng cho Alvin')).toBe('Transportation');
    expect(pick('do xang')).toBe('Transportation');
    expect(pick('Ăn phá lấu')).toBe('Food');
    expect(pick('Ún koithe')).toBeNull();
  });
  it('matches whole words only', () => {
    expect(pick('Bé mua 2 đĩa cho 2 đứa')).toBeNull(); // "cho" must not mean food
    expect(pick('xem phim CGV')).toBe('Entertainment');
  });
  it('picks the more specific phrase and ignores categories the user does not have', () => {
    expect(pick('cafe với paoi')).toBe('Coffee');
    expect(suggestCategory('cafe', [{ label: 'Food' }])).toBeNull();
  });
  it('returns null for empty text', () => { expect(pick('   ')).toBeNull(); });
});
