import { describe, expect, it } from 'vitest';
import { CONFIRM_MS, DWELL_MS, initialPresence, stepDwell, stepPresence, type DwellState, type PlaceLike } from './dwell';

const MIN = 60_000;
const here = { lat: 10.77, lng: 106.7 };
const far = { lat: 10.78, lng: 106.7 }; // ~1.1 km away

describe('stepDwell', () => {
  it('reports a visit once, after an hour in the same spot', () => {
    let s: DwellState | null = null; let reached = 0;
    for (let m = 0; m <= 90; m += 10) {
      const r = stepDwell(s, { ...here, t: m * MIN }); s = r.state; if (r.reached) reached++;
    }
    expect(reached).toBe(1);
  });
  it('does not report before the hour, and moving away restarts the stay', () => {
    let r = stepDwell(null, { ...here, t: 0 });
    r = stepDwell(r.state, { ...here, t: 50 * MIN }); expect(r.reached).toBe(false);
    r = stepDwell(r.state, { ...far, t: 55 * MIN }); expect(r.state.since).toBe(55 * MIN);
    r = stepDwell(r.state, { ...far, t: 55 * MIN + DWELL_MS - 1 }); expect(r.reached).toBe(false);
  });
  it('does not bridge a long silence (the app was closed)', () => {
    const r1 = stepDwell(null, { ...here, t: 0 });
    const r2 = stepDwell(r1.state, { ...here, t: 2 * 60 * MIN });
    expect(r2.reached).toBe(false);
    expect(r2.state.since).toBe(2 * 60 * MIN);
  });
});

const home: PlaceLike = { id: 'h', name: 'Home', emoji: '🏠', ...here, radiusM: 150 };
const run = (steps: Array<[number, { lat: number; lng: number }]>) => {
  let s = initialPresence(); const events: string[] = [];
  for (const [m, at] of steps) {
    const r = stepPresence(s, [home], { ...at, t: m * MIN }); s = r.state;
    if (r.event) events.push(`${r.event.type}:${r.event.place.name}@${m}`);
  }
  return events;
};

describe('stepPresence', () => {
  it('the first reading is a silent baseline', () => {
    expect(run([[0, here], [5, here]])).toEqual([]);
  });
  it('announces arrival only after staying inside for the confirm time', () => {
    const t = CONFIRM_MS / MIN;
    expect(run([[0, far], [1, here], [1 + t - 0.1, here]])).toEqual([]);
    expect(run([[0, far], [1, here], [1 + t + 0.1, here]])).toEqual(['arrive:Home@2.6']);
  });
  it('ignores a pass-by shorter than the confirm time', () => {
    expect(run([[0, far], [1, here], [1.5, far], [5, far]])).toEqual([]);
  });
  it('announces leaving, and respects the cooldown against jitter', () => {
    const ev = run([[0, here], [1, far], [3, far], [4, here], [6, here], [7, far], [9, far]]);
    expect(ev[0]).toBe('leave:Home@3');
    expect(ev.filter(e => e.startsWith('arrive'))).toEqual(['arrive:Home@6']);
    // the second departure (@9) is only 6 min after the first (@3), so the cooldown swallows it
    expect(ev).toHaveLength(2);
  });
});
