// Plain outbound links (no API keys, nothing sent until the user taps one).

export const mapsUrl = (place: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

const songQuery = (title: string, artist?: string) => [title, artist].filter(Boolean).join(' ').trim();

export const spotifyUrl = (title: string, artist?: string) =>
  `https://open.spotify.com/search/${encodeURIComponent(songQuery(title, artist))}`;

export const youtubeMusicUrl = (title: string, artist?: string) =>
  `https://music.youtube.com/search?q=${encodeURIComponent(songQuery(title, artist))}`;
