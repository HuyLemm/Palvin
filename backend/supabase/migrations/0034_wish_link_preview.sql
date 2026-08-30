-- PALVIN — link preview for gift-wishlist items
-- When you paste a product link into the wishlist add form, the frontend
-- fetches its title/image (via a client-side link-unfurling API) and stores
-- them here so the wishlist card can show a concise preview instead of a
-- raw URL.
-- Scope: wishes.ts, screens/Us.tsx (GiftWishlistScreen).
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

alter table wishes add column link_image text;
alter table wishes add column link_title text;

notify pgrst, 'reload schema';
