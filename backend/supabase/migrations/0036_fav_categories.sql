-- PALVIN — editable/deletable "Our Favourites" category tabs
-- The 4 filter tabs (food/cafe/bida/gaming) were a hardcoded enum. This
-- moves them into their own per-couple table so they can be added, renamed,
-- and deleted from the UI — same lazy-seeding idea as date_idea_presets
-- (0032): a couple's default set is created the first time the app fetches
-- an empty list for them, covering both existing and future couples.
-- Scope: favourites.ts, screens/Us.tsx (OurFavouritesScreen), screens/Home.tsx.
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

create table fav_categories (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade default auth_couple_id(),
  label      text not null,
  emoji      text not null default '📍',
  color      text not null default '#C95F7C',
  created_at timestamptz not null default now()
);

alter table fav_categories enable row level security;

create policy "couple full access" on fav_categories for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

alter table fav_places add column category_id uuid references fav_categories(id) on delete cascade;

-- One-time backfill for couples that already have fav_places rows under the
-- old fixed categories — create a matching fav_categories row per distinct
-- category they actually used, and repoint their existing places at it.
-- Couples with zero existing fav_places rows get nothing here; the app
-- lazy-seeds the default 4 for them on first fetch instead (see
-- fetchFavCategories in favourites.ts), same as any new couple going forward.
do $$
declare
  legacy record;
  new_cat_id uuid;
  v_label text;
  v_emoji text;
  v_color text;
begin
  for legacy in select distinct couple_id, category from fav_places loop
    v_label := case legacy.category
      when 'food' then 'Ăn uống' when 'cafe' then 'Cafe'
      when 'bida' then 'Bida' when 'gaming' then 'Gaming'
      else initcap(legacy.category) end;
    v_emoji := case legacy.category
      when 'food' then '🍜' when 'cafe' then '☕'
      when 'bida' then '🎱' when 'gaming' then '🎮'
      else '📍' end;
    v_color := case legacy.category
      when 'food' then '#E8844A' when 'cafe' then '#C48A52'
      when 'bida' then '#4A8AE8' when 'gaming' then '#8B6FD4'
      else '#C95F7C' end;

    insert into fav_categories (couple_id, label, emoji, color)
    values (legacy.couple_id, v_label, v_emoji, v_color)
    returning id into new_cat_id;

    update fav_places set category_id = new_cat_id
      where couple_id = legacy.couple_id and category = legacy.category;
  end loop;
end $$;

alter table fav_places alter column category_id set not null;
alter table fav_places drop column category;

notify pgrst, 'reload schema';
