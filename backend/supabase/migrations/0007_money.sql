-- PALVIN — Money (expenses, bills, savings goals)
-- Scope: screens/Money.tsx (all 4 tabs) + components/forms/AddExpenseForm.tsx.
-- `paid_by_profile_id` is nullable = "Both" (shared expense), matching the
-- original Expense.paidBy: User | 'Both' type — resolved to a real profile
-- id on write, never a hardcoded name.
--
-- Matches original app behaviour: none of addExpense/addBill/addSavingsGoal/
-- addToGoal ever pushed a shared notification in the old local-state code
-- (only a local toast) — so no notify triggers here, same as Calendar.
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

create table expenses (
  id                 uuid primary key default gen_random_uuid(),
  couple_id          uuid not null references couples(id) on delete cascade default auth_couple_id(),
  title              text not null,
  category           text not null,
  category_emoji     text not null,
  amount             numeric(12,2) not null check (amount > 0),
  paid_by_profile_id uuid references profiles(id),
  occurred_on        date not null,
  note               text,
  type               text not null default 'expense' check (type in ('expense','income')),
  created_at         timestamptz not null default now()
);

create table bills (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade default auth_couple_id(),
  title      text not null,
  emoji      text,
  category   text not null check (category in ('rent','utilities','internet','subscription','other')),
  amount     numeric(12,2) not null check (amount > 0),
  due_day    int not null check (due_day between 1 and 31),
  paid       boolean not null default false,
  paid_date  date,
  reminder   boolean not null default false,
  note       text
);

create table savings_goals (
  id        uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade default auth_couple_id(),
  title     text not null,
  emoji     text,
  current   numeric(12,2) not null default 0 check (current >= 0),
  target    numeric(12,2) not null check (target > 0),
  deadline  text
);

alter table expenses enable row level security;
alter table bills enable row level security;
alter table savings_goals enable row level security;

create policy "couple full access" on expenses for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

create policy "couple full access" on bills for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

create policy "couple full access" on savings_goals for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
