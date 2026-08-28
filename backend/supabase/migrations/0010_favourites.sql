-- PALVIN — Our Favourites + Dark Mode setting
-- Scope: Us.tsx's "Our Favourites" sub-screen (song/movie/etc. quick-edit +
-- 4 categorised place lists) and Settings.tsx's dark mode toggle.
--
-- favorite_* and dark_mode live directly on `couples` (1:1 per couple,
-- exactly like the old AppState.favorites/darkMode fields) rather than a
-- separate settings table — no need for one yet.
--
-- Bonus fix: dark mode currently resets on every reload because it was only
-- ever an in-memory flag. Persisting it here fixes that for real.

alter table couples add column if not exists favorite_song  text not null default '';
alter table couples add column if not exists favorite_food  text not null default '';
alter table couples add column if not exists favorite_movie text not null default '';
alter table couples add column if not exists favorite_cafe  text not null default '';
alter table couples add column if not exists favorite_place text not null default '';
alter table couples add column if not exists dark_mode      boolean not null default false;

create table fav_places (
  id        uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade default auth_couple_id(),
  category  text not null check (category in ('food','cafe','bida','gaming')),
  name      text not null,
  note      text
);

alter table fav_places enable row level security;

create policy "couple full access" on fav_places for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
