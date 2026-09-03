-- PALVIN — Our Places: support a list of photos per place + an optional
-- visited date. Was previously a single required `image_url`.

alter table places add column if not exists images text[] not null default '{}';
alter table places add column if not exists visited_date date;

-- Backfill: carry any existing single photo into the new list column.
update places set images = array[image_url] where image_url is not null and images = '{}';

-- image_url is no longer written by the app — kept (nullable now) rather
-- than a forced DROP COLUMN.
alter table places alter column image_url drop not null;

notify pgrst, 'reload schema';
