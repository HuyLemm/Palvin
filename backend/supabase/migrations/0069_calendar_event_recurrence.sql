-- PALVIN — Calendar events can now repeat (weekly/monthly/yearly) instead
-- of only ever being a fixed one-off date. Defaults to 'none' so every
-- existing event keeps behaving exactly as before.

alter table calendar_events
  add column if not exists recurrence text not null default 'none'
  check (recurrence in ('none', 'weekly', 'monthly', 'yearly'));

notify pgrst, 'reload schema';
