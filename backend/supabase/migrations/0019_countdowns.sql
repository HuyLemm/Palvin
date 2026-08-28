-- PALVIN — Countdowns
-- Scope: Home.tsx's "Đếm ngược" widget.
-- Matches original behaviour: addCountdown toasts, deleteCountdown doesn't —
-- neither ever pushed a shared notification — no notify trigger here.

create table countdowns (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade default auth_couple_id(),
  title      text not null,
  emoji      text not null,
  event_date date not null,
  color      text not null,
  created_at timestamptz not null default now()
);

alter table countdowns enable row level security;

create policy "couple full access" on countdowns for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
