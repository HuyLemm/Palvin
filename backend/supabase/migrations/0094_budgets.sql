-- PALVIN — monthly budgets per expense category, shared by the couple.
--
-- Money > Stats shows each category's spend against its limit. When an expense
-- takes a category to 80% or 100% of its monthly limit, a notification row is
-- inserted (category 'expenses', so the per-person "Expenses" switch in Settings
-- applies) and the existing push_new_notification trigger (0068) delivers it.
--
-- Apply via: supabase db push   (or paste into the Dashboard SQL editor).

create table if not exists budgets (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references couples(id) on delete cascade default auth_couple_id(),
  category      text not null,
  monthly_limit numeric(14,2) not null check (monthly_limit > 0),
  created_at    timestamptz not null default now(),
  unique (couple_id, category)
);

alter table budgets enable row level security;

drop policy if exists "couple full access" on budgets;
create policy "couple full access" on budgets for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

create or replace function notify_budget_threshold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  b budgets%rowtype;
  month_start date := date_trunc('month', new.occurred_on)::date;
  spent numeric;
  before_spent numeric;
  limit_amt numeric;
begin
  if new.type <> 'expense' then
    return new;
  end if;

  select * into b from budgets
  where couple_id = new.couple_id and lower(category) = lower(new.category);
  if not found then
    return new;
  end if;
  limit_amt := b.monthly_limit;

  select coalesce(sum(amount), 0) into spent
  from expenses
  where couple_id = new.couple_id
    and type = 'expense'
    and lower(category) = lower(new.category)
    and occurred_on >= month_start
    and occurred_on < (month_start + interval '1 month');
  before_spent := spent - new.amount;

  if before_spent < limit_amt and spent >= limit_amt then
    insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, category)
    values (new.couple_id, '⚠️',
      new.category || ' budget reached: ' || trim(to_char(spent, 'FM999,999,999,999')) || 'đ of ' || trim(to_char(limit_amt, 'FM999,999,999,999')) || 'đ',
      new.added_by_profile_id, 'money', 'expenses');
  elsif before_spent < 0.8 * limit_amt and spent >= 0.8 * limit_amt then
    insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, category)
    values (new.couple_id, '💸',
      new.category || ' budget 80% used: ' || trim(to_char(spent, 'FM999,999,999,999')) || 'đ of ' || trim(to_char(limit_amt, 'FM999,999,999,999')) || 'đ',
      new.added_by_profile_id, 'money', 'expenses');
  end if;
  return new;
end;
$$;

drop trigger if exists on_expense_budget_check on expenses;
create trigger on_expense_budget_check
  after insert on expenses
  for each row execute function notify_budget_threshold();

notify pgrst, 'reload schema';
