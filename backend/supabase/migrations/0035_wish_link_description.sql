-- PALVIN — short description for gift-wishlist link previews
-- Extends the 0034 link preview (title + image) with a short description
-- pulled from the same link-unfurling call, shown truncated on the card.
-- Scope: wishes.ts, screens/Us.tsx (GiftWishlistScreen).
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

alter table wishes add column link_description text;

notify pgrst, 'reload schema';
