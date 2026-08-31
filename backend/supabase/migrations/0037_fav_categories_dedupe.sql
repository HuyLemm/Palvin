-- PALVIN — fix duplicated "Our Favourites" categories from the 0036 seed race
-- Two near-simultaneous first-time fetches (React 18 dev-mode double effect
-- invocation) could both see an empty fav_categories table and both insert
-- the same 4 defaults, leaving a couple with 8 duplicated rows. This:
--   1. Keeps the oldest row per (couple_id, label), re-pointing any places
--      that were filed under a duplicate over to the kept row.
--   2. Deletes the now-orphaned duplicate category rows.
--   3. Adds a unique constraint so the app's now-upsert-based seeding
--      (see fetchFavCategories in favourites.ts) can't recreate this.
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

with ranked as (
  select id, couple_id, label,
         row_number() over (partition by couple_id, label order by created_at asc, id asc) as rn
  from fav_categories
),
keep as (
  select couple_id, label, id as keep_id from ranked where rn = 1
),
dupe as (
  select r.id as dupe_id, k.keep_id
  from ranked r
  join keep k on k.couple_id = r.couple_id and k.label = r.label
  where r.rn > 1
)
update fav_places fp
set category_id = d.keep_id
from dupe d
where fp.category_id = d.dupe_id;

delete from fav_categories fc
using (
  select id from (
    select id,
           row_number() over (partition by couple_id, label order by created_at asc, id asc) as rn
    from fav_categories
  ) r
  where r.rn > 1
) todelete
where fc.id = todelete.id;

alter table fav_categories add constraint fav_categories_couple_label_uniq unique (couple_id, label);

notify pgrst, 'reload schema';
