-- PALVIN — Debt tracker: partial repayment tracking + Thu chi link.
-- paid_amount tracks how much of a debt has actually been paid back so far
-- (used for "you owe" debts, which can be paid off gradually) — `paid`
-- still just means "fully settled". debt_id on expenses links a debt's
-- logged payments to the Thu chi transactions they produce, so deleting
-- the debt also removes them (same pattern as bills — see
-- 0028_bill_expense_link.sql).

alter table debts add column paid_amount numeric(12,2) not null default 0;
alter table expenses add column debt_id uuid references debts(id) on delete cascade;

notify pgrst, 'reload schema';
