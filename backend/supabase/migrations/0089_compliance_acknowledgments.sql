-- PALVIN — let the Daily Compliance admin panel (Settings, Alvinne-only)
-- dismiss individual miss entries instead of them accumulating forever.
-- dailyCompliance.ts derives streakMisses/todoMisses entirely from existing
-- data (streak_activity, todos, todo_daily_completions) with no persisted
-- miss log of its own — so "dismissing" a miss can't mean deleting a row
-- that represents it (there isn't one). Instead this adds a small
-- acknowledgment table the fetch filters against: dismissing a
-- (profile_name, miss_date, kind) triple just hides that one already-past
-- day's entry from the log going forward.

create table compliance_acknowledgments (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references couples(id) on delete cascade default auth_couple_id(),
  profile_name text not null,
  miss_date    date not null,
  kind         text not null check (kind in ('streak', 'todo')),
  created_at   timestamptz not null default now(),
  unique (couple_id, profile_name, miss_date, kind)
);

alter table compliance_acknowledgments enable row level security;

create policy "couple full access" on compliance_acknowledgments for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
