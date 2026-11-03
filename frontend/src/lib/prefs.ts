// Small device-level preferences (not synced between the two phones).
const WEATHER_KEY = 'palvin:weather';
const EVENT = 'palvin:prefs';

export function weatherEnabled(): boolean {
  try { return localStorage.getItem(WEATHER_KEY) !== 'off'; } catch { return true; }
}

export function setWeatherEnabled(on: boolean) {
  try { localStorage.setItem(WEATHER_KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribePrefs(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
