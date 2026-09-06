-- PALVIN — To Do List, a new Us-tab section.
-- Two kinds of task on one shared couple list: 'daily' (a recurring
-- checklist item — "Gym", "Take vitamins" — whose done/not-done state
-- resets every day, tracked separately in todo_daily_completions since the
-- same task needs a fresh checkbox each day) and 'once' (a specific day's
-- ad-hoc task — task_date set, completed tracked directly on the row since
-- it never repeats). Deliberately has NO notification trigger — this
-- feature is explicitly meant to stay quiet, unlike most of the rest of
-- the app.

create table todos (
  id                    uuid primary key default gen_random_uuid(),
  couple_id             uuid not null references couples(id) on delete cascade default auth_couple_id(),
  created_by_profile_id uuid references profiles(id) default auth.uid(),
  owner                 text not null, -- a partner's display name, or 'Both'
  title                 text not null,
  category              text not null default 'other',
  kind                  text not null check (kind in ('daily', 'once')),
  task_date             date, -- only set (and meaningful) for kind = 'once'
  completed             boolean not null default false, -- only meaningful for kind = 'once'
  created_at            timestamptz not null default now()
);

alter table todos enable row level security;

create policy "couple full access" on todos for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

-- One row per (task, date) that's been checked off — existence means done;
-- deleting the row un-checks it. Only ever used for kind = 'daily' tasks.
create table todo_daily_completions (
  todo_id               uuid not null references todos(id) on delete cascade,
  completion_date       date not null,
  couple_id             uuid not null default auth_couple_id(),
  completed_by_profile_id uuid references profiles(id) default auth.uid(),
  created_at            timestamptz not null default now(),
  primary key (todo_id, completion_date)
);

alter table todo_daily_completions enable row level security;

create policy "couple full access" on todo_daily_completions for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
