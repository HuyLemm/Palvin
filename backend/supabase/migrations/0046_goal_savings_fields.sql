-- Future Us goals can now carry an optional savings target — for big life
-- plans (a wedding, a down payment) tracked separately from Money's
-- SavingsGoal, which is for everyday budget funds.
alter table goals add column target numeric;
alter table goals add column current numeric not null default 0;
alter table goals add column deadline date;
