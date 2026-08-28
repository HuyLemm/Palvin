-- PALVIN — Trip Planner
-- Scope: Us.tsx's "Trip Planner" sub-screen (TripPlanner.tsx).
-- Checklist items are only ever read/written as part of their parent trip,
-- so they're stored as a jsonb array on the trip row rather than a join table.
-- Matches original behaviour: trip actions never pushed a shared notification
-- (only local toasts) — no notify trigger here.

create table trips (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade default auth_couple_id(),
  title      text not null,
  emoji      text not null,
  destination text not null,
  start_date date not null,
  end_date   date not null,
  budget     numeric not null default 0,
  spent      numeric not null default 0,
  checklist  jsonb not null default '[]',
  notes      text not null default '',
  status     text not null default 'planning' check (status in ('planning', 'upcoming', 'completed')),
  created_at timestamptz not null default now()
);

alter table trips enable row level security;

create policy "couple full access" on trips for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
