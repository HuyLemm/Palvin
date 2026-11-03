// Weather for a place + date from Open-Meteo (free, no API key). Best-effort:
// any failure just means "no forecast shown". The only thing sent is the
// place text the user already typed (to find coordinates) and those coordinates.
export interface DayWeather { place: string; label: string; max: number; min: number }

const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const MAX_AHEAD_DAYS = 15; // Open-Meteo's forecast horizon is 16 days

export function describeWeatherCode(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'Rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Snow';
  if (code >= 95) return 'Thunderstorm';
  return 'Cloudy';
}

export function isWithinForecast(dateISO: string, now = new Date()): boolean {
  const [y, m, d] = dateISO.split('-').map(Number);
  if (!y || !m || !d) return false;
  // whole calendar days between today and the date (UTC midnights avoid half-day rounding)
  const diff = (Date.UTC(y, m - 1, d) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000;
  return diff >= 0 && diff <= MAX_AHEAD_DAYS;
}

const cache = new Map<string, Promise<DayWeather | null>>();

export function getWeather(place: string, dateISO: string): Promise<DayWeather | null> {
  const q = place.trim();
  if (!q || !isWithinForecast(dateISO)) return Promise.resolve(null);
  const key = `${q.toLowerCase()}|${dateISO}`;
  let p = cache.get(key);
  if (!p) {
    p = load(q, dateISO).catch(() => null);
    cache.set(key, p);
  }
  return p;
}

async function load(q: string, dateISO: string): Promise<DayWeather | null> {
  const g = await (await fetch(`${GEO}?name=${encodeURIComponent(q)}&count=1&language=en&format=json`)).json();
  const hit = g?.results?.[0];
  // Only trust matches that are a town/city/region; a venue name like "Cherry Coffee"
  // must not silently resolve to some unrelated village.
  if (!hit || !/^(PPL|ADM)/.test(hit.feature_code ?? '')) return null;
  const f = await (await fetch(`${FORECAST}?latitude=${hit.latitude}&longitude=${hit.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${dateISO}&end_date=${dateISO}`)).json();
  const code = f?.daily?.weathercode?.[0];
  const max = f?.daily?.temperature_2m_max?.[0];
  const min = f?.daily?.temperature_2m_min?.[0];
  if (code == null || max == null || min == null) return null;
  return { place: hit.name, label: describeWeatherCode(code), max: Math.round(max), min: Math.round(min) };
}
