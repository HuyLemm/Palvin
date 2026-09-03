-- PALVIN — Cycle tracker
-- Scope: Calendar.tsx's "Chu kỳ" tab. Each row is one logged period (start,
-- and optionally end once it's over) — cycle length, period length, and
-- the next-period/ovulation predictions are all derived client-side from
-- this history rather than stored, so they stay correct as new logs come in.

create table cycle_logs (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade default auth_couple_id(),
  start_date date not null,
  end_date   date,
  created_at timestamptz not null default now()
);

alter table cycle_logs enable row level security;

create policy "couple full access" on cycle_logs for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
