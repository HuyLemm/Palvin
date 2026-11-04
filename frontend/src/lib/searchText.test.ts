import { describe, expect, it } from 'vitest';
import { fold, matchesAll } from './searchText';

describe('search text', () => {
  it('ignores case and Vietnamese accents', () => {
    expect(fold('Đà Lạt')).toBe('da lat');
    expect(matchesAll('cafe', 'Cà phê sáng')).toBe(false); // "cafe" is not "ca phe"
    expect(matchesAll('ca phe', 'Cà phê sáng')).toBe(true);
    expect(matchesAll('DA LAT', 'Chuyến đi Đà Lạt')).toBe(true);
  });
  it('needs every word, in any order', () => {
    expect(matchesAll('lat chuyen', 'Chuyến đi Đà Lạt')).toBe(true);
    expect(matchesAll('lat hue', 'Chuyến đi Đà Lạt')).toBe(false);
  });
  it('ignores empty queries and missing fields', () => {
    expect(matchesAll('  ', 'anything')).toBe(false);
    expect(matchesAll('a', undefined, null, 'a')).toBe(true);
  });
});
