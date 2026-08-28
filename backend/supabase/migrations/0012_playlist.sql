-- PALVIN — Our Playlist
-- Scope: Us.tsx's "Playlist của mình" sub-screen.
-- Matches original behaviour: addToPlaylist/removeFromPlaylist never pushed
-- a shared notification (only a local toast) — no notify trigger here.

create table playlist_items (
  id                  uuid primary key default gen_random_uuid(),
  couple_id           uuid not null references couples(id) on delete cascade default auth_couple_id(),
  title               text not null,
  artist              text not null,
  emoji               text,
  note                text,
  added_by_profile_id uuid not null references profiles(id),
  created_at          timestamptz not null default now()
);

alter table playlist_items enable row level security;

create policy "couple full access" on playlist_items for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
