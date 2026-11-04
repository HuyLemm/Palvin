import { describe, expect, it } from 'vitest';
import { distanceMeters, formatAge, formatDistance, placeAt, shareRemaining, shouldPublish } from './location';

describe('location helpers', () => {
  it('measures distance between two points', () => {
    const d = distanceMeters({ lat: 10.7769, lng: 106.7009 }, { lat: 10.7869, lng: 106.7009 }); // ~1.11 km north
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1120);
    expect(distanceMeters({ lat: 1, lng: 1 }, { lat: 1, lng: 1 })).toBe(0);
  });
  it('formats distance in human units', () => {
    expect(formatDistance(10)).toBe('right next to you');
    expect(formatDistance(480)).toBe('480 m away');
    expect(formatDistance(1500)).toBe('1.5 km away');
    expect(formatDistance(25000)).toBe('25 km away');
  });
  it('formats how old a fix is', () => {
    const now = new Date('2026-11-04T10:00:00Z').getTime();
    expect(formatAge('2026-11-04T09:59:40Z', now)).toBe('just now');
    expect(formatAge('2026-11-04T09:50:00Z', now)).toBe('10 min ago');
    expect(formatAge('2026-11-04T07:00:00Z', now)).toBe('3 h ago');
    expect(formatAge('2026-11-01T10:00:00Z', now)).toBe('3 d ago');
  });
  it('describes the time left on a share', () => {
    const now = 1_000_000;
    expect(shareRemaining(null, now)).toBeNull();
    expect(shareRemaining(now - 1, now)).toBeNull();
    expect(shareRemaining(now + 52 * 60_000, now)).toBe('52 min left');
    expect(shareRemaining(now + 150 * 60_000, now)).toBe('2 h 30 min left');
    expect(shareRemaining(now + 365 * 24 * 60 * 60_000, now)).toBe('until you stop');
  });
  it('only publishes a fix when it moved or the last write is old', () => {
    const p = { lat: 10.77, lng: 106.7, at: 1000 };
    expect(shouldPublish(null, p, 1000)).toBe(true);
    expect(shouldPublish(p, { lat: 10.77, lng: 106.7 }, 5000)).toBe(false);
    expect(shouldPublish(p, { lat: 10.7702, lng: 106.7 }, 5000)).toBe(true); // ~22 m
    expect(shouldPublish(p, { lat: 10.77, lng: 106.7 }, 40_000)).toBe(true);
  });
  it('finds the saved place a position is inside of', () => {
    const home = { id: 'h', name: 'Home', emoji: '🏠', lat: 10.77, lng: 106.7, radiusM: 150 };
    const work = { id: 'w', name: 'Work', emoji: '🏢', lat: 10.78, lng: 106.7, radiusM: 150 };
    expect(placeAt([home, work], { lat: 10.7705, lng: 106.7 })?.id).toBe('h'); // ~55 m
    expect(placeAt([home, work], { lat: 10.775, lng: 106.7 })).toBeNull();
    expect(placeAt([home, work], null)).toBeNull();
    expect(placeAt([], { lat: 10.77, lng: 106.7 })).toBeNull();
  });
});
