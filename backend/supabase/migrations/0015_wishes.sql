-- PALVIN — Gift Wishlist
-- Scope: Us.tsx's "Gift Wishlist" sub-screen (GiftWishlistScreen).
-- Matches original behaviour: addWish/drawWish/removeWish never pushed a
-- shared notification (only local toasts) — no notify trigger here.

create table wishes (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references couples(id) on delete cascade default auth_couple_id(),
  from_profile_id uuid not null references profiles(id),
  wish            text not null,
  wish_date       text not null,
  price           text,
  link            text,
  drawn           boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table wishes enable row level security;

create policy "couple full access" on wishes for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
