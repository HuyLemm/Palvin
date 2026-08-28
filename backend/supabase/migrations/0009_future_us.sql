-- PALVIN — Future Us (shared goals/dreams)
-- Scope: screens/FutureUs.tsx + components/forms/AddGoalForm.tsx.
--
-- Matches original app behaviour: addGoal/toggleGoal/deleteGoal never pushed
-- a shared notification (only a local toast + confetti) — so no notify
-- trigger here, same as Calendar/Money.

create table goals (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references couples(id) on delete cascade default auth_couple_id(),
  title          text not null,
  emoji          text,
  completed      boolean not null default false,
  completed_date text,
  created_at     timestamptz not null default now()
);

alter table goals enable row level security;

create policy "couple full access" on goals for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
