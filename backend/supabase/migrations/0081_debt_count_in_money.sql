-- PALVIN — Debt tracker: persist the "count in Expenses" preference.
-- Previously logging a debt with this checked immediately dropped the full
-- amount into Expenses at creation time. That double-counted against
-- payDebt's own per-payment entries, so it's now a persisted, editable
-- flag instead: payDebt/resetDebtPayments only mirror a payment into
-- Expenses when this is on, and logging/editing the debt itself never
-- touches Expenses on its own.

alter table debts add column count_in_money boolean not null default false;

notify pgrst, 'reload schema';
