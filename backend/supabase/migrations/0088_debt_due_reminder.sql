-- PALVIN — daily debt due-date reminder push, mirroring the 11pm daily
-- to-do reminder (0083, timeout-fixed in 0087). Runs once a day at 8am
-- Asia/Ho_Chi_Minh (UTC+7 = 01:00 UTC) — due-date nudges read better in the
-- morning than at 11pm. Notifies every profile in the couple (the debt
-- ledger is shared, not owned by one partner) for any unpaid debt whose
-- due_date is today or already past; repeats daily while still unpaid,
-- same as the to-do reminder's behavior.

create or replace function remind_debt_due()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  push_url text;
  push_secret text;
  d record;
  p record;
  today date := current_date;
  headline text;
  detail text;
begin
  select value into push_url from app_config where key = 'push_function_url';
  select value into push_secret from app_config where key = 'push_secret';
  if push_url is null or push_secret is null then
    return; -- not configured in this environment — no-op
  end if;

  for d in
    select * from debts
    where paid = false and due_date is not null and due_date <= today
  loop
    headline := case when d.due_date < today then 'Debt overdue ⚠️' else 'Debt due today 💸' end;
    detail := d.debtor_name
      || ' · ' || trim(to_char(d.amount, 'FM999,999,999,999')) || 'đ'
      || (case when d.direction = 'they_owe' then ' owes you' else ' you owe' end)
      || (case when d.due_date < today then ' (was due ' || to_char(d.due_date, 'DD/MM') || ')' else '' end);

    for p in
      select id from profiles where couple_id = d.couple_id
    loop
      perform net.http_post(
        url := push_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', push_secret),
        body := jsonb_build_object(
          'profileId', p.id,
          'title', headline,
          'body', detail,
          'url', '/'
        ),
        timeout_milliseconds := 15000
      );
    end loop;
  end loop;
end;
$$;

select cron.unschedule('remind-debt-due')
where exists (select 1 from cron.job where jobname = 'remind-debt-due');

select cron.schedule('remind-debt-due', '0 1 * * *', $$select remind_debt_due();$$);

notify pgrst, 'reload schema';
