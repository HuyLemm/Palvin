-- PALVIN — Debt tracker ("Sổ nợ") on the Us tab.
-- Lets either partner record money lent to someone outside the couple (a
-- friend, a coworker...) and mark it paid back later. `debtor_name` is free
-- text (the borrower isn't a PALVIN account), `created_by_profile_id` is
-- whichever partner recorded it.

create table debts (
  id                    uuid primary key default gen_random_uuid(),
  couple_id             uuid not null references couples(id) on delete cascade default auth_couple_id(),
  created_by_profile_id uuid references profiles(id) default auth.uid(),
  debtor_name           text not null,
  amount                numeric(12,2) not null check (amount > 0),
  note                  text,
  lent_date             date not null,
  due_date              date,
  paid                  boolean not null default false,
  paid_date             date,
  created_at            timestamptz not null default now()
);

alter table debts enable row level security;

create policy "couple full access" on debts for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
