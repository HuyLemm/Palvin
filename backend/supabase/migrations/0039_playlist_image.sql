-- PALVIN — cover art for playlist songs
-- Lets Playlist's add-song search (iTunes Search API, client-side, no key
-- needed) store the real album artwork alongside title/artist instead of
-- just a manually picked emoji.
-- Scope: playlist.ts, screens/Us.tsx (PlaylistScreen).
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

alter table playlist_items add column image_url text;

notify pgrst, 'reload schema';
