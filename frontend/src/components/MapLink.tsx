import Icon from './Icon';
import { mapsUrl } from '../lib/links';

// "Open in Maps" link for a place name. Opens Google Maps (the OS may hand it to the Maps app).
export default function MapLink({ place, color = 'var(--sakura-deep)' }: { place: string; color?: string }) {
  if (!place.trim()) return null;
  return (
    <a href={mapsUrl(place)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
      aria-label={`Open ${place} in Google Maps`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 8, padding: '4px 0', fontSize: 12, fontWeight: 700, color, textDecoration: 'none', whiteSpace: 'nowrap' }}>
      <Icon emoji="🗺️" size={12} /> Maps
    </a>
  );
}
