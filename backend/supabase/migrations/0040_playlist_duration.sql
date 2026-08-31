-- PALVIN — song duration for playlist items
-- Stores the track length (from iTunes Search's trackTimeMillis) alongside
-- title/artist/cover art, shown as mm:ss in the preview and the list.
-- Scope: playlist.ts, screens/Us.tsx (PlaylistScreen).
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

alter table playlist_items add column duration_seconds integer;

notify pgrst, 'reload schema';
