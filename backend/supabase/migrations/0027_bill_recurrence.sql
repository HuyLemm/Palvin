-- PALVIN — recurring monthly bills
-- Scope: money.ts fetchBills/createBill, context.tsx refreshMoney (roll-forward).
--
-- `series_id` groups every monthly instance of the same recurring bill (rent,
-- internet, ...) so the app can find "the latest instance" and roll it
-- forward into a fresh unpaid row once its month has passed. `bill_month`
-- ('YYYY-MM') tags which month a given row belongs to — existing bills are
-- backfilled to the current month since there was no month concept before.
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

alter table bills add column series_id uuid not null default gen_random_uuid();
alter table bills add column bill_month text not null default to_char(now(), 'YYYY-MM');

create index bills_series_id_idx on bills(series_id);

notify pgrst, 'reload schema';
