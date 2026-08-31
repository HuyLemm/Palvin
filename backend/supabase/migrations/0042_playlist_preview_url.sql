-- PALVIN — 30s audio preview for playlist songs
-- Stores iTunes Search's previewUrl (a real, playable ~30s audio clip) so
-- the Home dashboard's "Our Playlist" widget can actually play something
-- instead of just showing title/artist. Full-track streaming isn't
-- available without a paid music API — this is the real, legal option.
-- Scope: playlist.ts, screens/Us.tsx (PlaylistScreen), screens/Home.tsx.
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

alter table playlist_items add column preview_url text;

notify pgrst, 'reload schema';
