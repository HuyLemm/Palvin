import { useEffect, useState } from 'react';
import { getWeather, type DayWeather } from '../lib/weather';
import { subscribePrefs, weatherEnabled } from '../lib/prefs';

// Small "Vũng Tàu · Clear 31°/26°" line; renders nothing when there is no usable forecast.
export default function WeatherChip({ place, date, style }: { place?: string; date?: string; style?: React.CSSProperties }) {
  const [w, setW] = useState<DayWeather | null>(null);
  const [on, setOn] = useState(weatherEnabled);
  useEffect(() => subscribePrefs(() => setOn(weatherEnabled())), []);
  useEffect(() => {
    let live = true;
    setW(null);
    // Nothing is requested while the switch in Settings is off.
    if (on && place && date) getWeather(place, date).then(r => { if (live) setW(r); });
    return () => { live = false; };
  }, [place, date, on]);
  if (!w) return null;
  return (
    <p style={{ fontSize: 12, color: 'var(--ink-2)', ...style }} title="Forecast from Open-Meteo">
      {w.place} · {w.label} {w.max}°/{w.min}°
    </p>
  );
}
