-- PALVIN — editable/deletable Money category pickers (Food, Entertainment,
-- Other, ...), managed from Settings (admin-only). Previously three
-- hardcoded arrays duplicated across AddExpenseForm/EditExpenseForm/
-- AddIncomeForm/Money.tsx (couple expenses, couple income, Private Stash).
-- Same lazy-seeding pattern as fav_categories (0036/0037): a couple's
-- default set for a `kind` is created the first time the app fetches zero
-- rows for that kind — covers existing and future couples with no backfill.
--
-- Expenses store their category as a plain label+emoji snapshot at creation
-- time, not a foreign key here, so renaming/deleting only affects the
-- picker going forward — past transactions keep their original text.

create table money_categories (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade default auth_couple_id(),
  kind       text not null check (kind in ('expense', 'income', 'private')),
  label      text not null,
  emoji      text not null default '📦',
  created_at timestamptz not null default now(),
  unique (couple_id, kind, label)
);

alter table money_categories enable row level security;

create policy "couple full access" on money_categories for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
