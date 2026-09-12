-- PALVIN — "Quỹ đen" (Alvin's own private stash), a Money tab visible only
-- on that one account (client-side gated by isAdmin, same as Settings'
-- Activity Monitor). Genuinely private at the RLS level too, not just
-- hidden in the UI — scoped by profile_id = auth.uid(), not couple_id, so
-- even a partner probing the API directly can't read or write it. Two
-- linked pieces: private_expenses (a personal Thu chi ledger) and
-- private_jar (a single savings pot — "Hũ") whose deposits/withdrawals
-- mirror into that ledger, the same way the couple's SavingsGoal
-- contribute/withdraw already mirrors into the shared expenses table.

create table private_expenses (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles(id) on delete cascade default auth.uid(),
  title           text not null,
  category        text not null,
  category_emoji  text not null default '💰',
  amount          numeric(12,2) not null check (amount > 0),
  occurred_on     date not null,
  note            text,
  type            text not null default 'expense' check (type in ('expense', 'income')),
  created_at      timestamptz not null default now()
);

alter table private_expenses enable row level security;

create policy "own private expenses only" on private_expenses for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- One row per profile, created on first deposit/withdrawal (see
-- privateMoney.ts) rather than seeded up front.
create table private_jar (
  profile_id  uuid primary key references profiles(id) on delete cascade,
  current     numeric(12,2) not null default 0
);

alter table private_jar enable row level security;

create policy "own private jar only" on private_jar for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

notify pgrst, 'reload schema';
