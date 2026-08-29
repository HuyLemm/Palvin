-- PALVIN — order the Quỹ (savings goals) list by creation time, like Thu chi
-- does with its transactions, instead of by the unrelated `deadline` field.
-- Scope: money.ts fetchSavingsGoals().
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

alter table savings_goals add column created_at timestamptz not null default now();

notify pgrst, 'reload schema';
