import { describe, expect, it } from 'vitest';
import { describeWeatherCode, isWithinForecast } from './weather';

describe('weather helpers', () => {
  it('maps WMO codes to short words', () => {
    expect(describeWeatherCode(0)).toBe('Clear');
    expect(describeWeatherCode(63)).toBe('Rain');
    expect(describeWeatherCode(95)).toBe('Thunderstorm');
  });
  it('only asks for dates inside the 16-day forecast window', () => {
    const now = new Date(2026, 10, 3, 9, 0);
    expect(isWithinForecast('2026-11-03', now)).toBe(true);
    expect(isWithinForecast('2026-11-18', now)).toBe(true);
    expect(isWithinForecast('2026-11-19', now)).toBe(false);
    expect(isWithinForecast('2026-11-02', now)).toBe(false);
  });
});
