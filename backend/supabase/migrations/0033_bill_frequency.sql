-- PALVIN — recurring bills with a custom cadence (not just monthly)
-- Adds `frequency_months` so a bill can roll forward every N months instead
-- of every single month — covers "every 2 months", "every 3 months", and
-- "once a year" bills alongside the existing default monthly ones.
-- Scope: money.ts rollBillsForward/createBill/updateBillRow, Add/EditBillForm.tsx.
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

alter table bills add column frequency_months integer not null default 1
  check (frequency_months between 1 and 60);

notify pgrst, 'reload schema';
