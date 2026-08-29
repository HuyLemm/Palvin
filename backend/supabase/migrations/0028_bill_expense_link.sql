-- PALVIN — link a bill's auto-generated Thu chi transactions back to it, so
-- deleting the bill also removes the transactions it produced (instead of
-- leaving orphaned "Thanh toán hóa đơn ..." rows behind).
-- Scope: money.ts createExpense, context.tsx toggleBillPaid/deleteBill.
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

alter table expenses add column bill_id uuid references bills(id) on delete cascade;

notify pgrst, 'reload schema';
