-- PALVIN — release date for playlist songs
-- Stores the track's release date (from iTunes Search's releaseDate),
-- shown alongside title/artist/duration in the preview and the list.
-- Scope: playlist.ts, screens/Us.tsx (PlaylistScreen).
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

alter table playlist_items add column release_date date;

notify pgrst, 'reload schema';
