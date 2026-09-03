-- PALVIN — Optional custom date for a post (e.g. sharing today about
-- something from last week and wanting it to sort/display under that date
-- instead of today). Defaults to the day it was actually posted when left
-- blank. Feed sorts and filters by this instead of created_at, which stays
-- untouched as the real, immutable "when this row was inserted" audit trail.

alter table posts add column if not exists post_date date;
update posts set post_date = created_at::date where post_date is null;
alter table posts alter column post_date set not null;
alter table posts alter column post_date set default current_date;

create index if not exists idx_posts_post_date on posts (post_date desc, created_at desc);

notify pgrst, 'reload schema';
