-- PALVIN — optional photo on a Gratitude Journal entry, so the bottom
-- navbar's global "+" can offer a "Gratitude" option matching how "Memory"
-- already works (title/story + a photo). Reuses the post-images bucket
-- under a gratitude/ subfolder, same pattern as memories.ts's
-- uploadMemoryImage and favourites.ts's uploadFavPlaceImage — no new
-- bucket/policy needed.

alter table gratitude_entries add column image_url text;

notify pgrst, 'reload schema';
