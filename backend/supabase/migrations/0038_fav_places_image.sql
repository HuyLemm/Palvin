-- PALVIN — photo + edit support for Our Favourites places
-- Adds an optional image to each favourite place, uploaded the same way as
-- Memory/Place photos (post-images bucket, couple-id folder prefix — no new
-- bucket or RLS policy needed).
-- Scope: favourites.ts, screens/Us.tsx (OurFavouritesScreen).
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

alter table fav_places add column image_url text;

notify pgrst, 'reload schema';
