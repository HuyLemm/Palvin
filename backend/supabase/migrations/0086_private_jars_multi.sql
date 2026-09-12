-- PALVIN — Private Stash (formerly "Quỹ đen"): replace the single-row
-- private_jar with private_jars, supporting multiple named jars, same as
-- the couple's SavingsGoal. private_jar has been empty since it shipped
-- (verified before writing this migration), so a plain drop-and-replace is
-- safe — nothing to migrate.

drop table if exists private_jar;

create table private_jars (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade default auth.uid(),
  title       text not null,
  emoji       text not null default '🫙',
  target      numeric(12,2),
  current     numeric(12,2) not null default 0,
  created_at  timestamptz not null default now()
);

alter table private_jars enable row level security;

create policy "own private jars only" on private_jars for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

notify pgrst, 'reload schema';
