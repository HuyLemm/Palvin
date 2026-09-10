-- PALVIN — daily 11pm (Asia/Ho_Chi_Minh, UTC+7 = 16:00 UTC) reminder push
-- for anyone with an unfinished daily to-do that day. Reuses the exact same
-- send-push edge function + app.settings.push_function_url/push_secret
-- already configured for chat push (0066_push_notifications.sql) — no new
-- secrets needed. This is the one deliberate exception to the To Do
-- list's "no notifications" design (todos.ts/context.tsx) — an explicit,
-- later request specifically for this end-of-day nudge.

create extension if not exists pg_cron with schema extensions;

create or replace function remind_incomplete_daily_todos()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  push_url text := current_setting('app.settings.push_function_url', true);
  push_secret text := current_setting('app.settings.push_secret', true);
  rec record;
  today date := current_date;
  incomplete_count int;
begin
  if push_url is null or push_secret is null then
    return; -- not configured in this environment — no-op
  end if;

  for rec in
    select p.id as profile_id, p.display_name, p.couple_id
    from profiles p
    where p.couple_id is not null
  loop
    select count(*) into incomplete_count
    from todos t
    where t.couple_id = rec.couple_id
      and t.kind = 'daily'
      and (t.owner = rec.display_name or t.owner = 'Both')
      and t.created_at::date <= today
      and not exists (
        select 1 from todo_daily_completions c
        where c.todo_id = t.id and c.completion_date = today
      );

    if incomplete_count > 0 then
      perform net.http_post(
        url := push_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', push_secret),
        body := jsonb_build_object(
          'profileId', rec.profile_id,
          'title', 'Daily to-dos waiting ✅',
          'body', incomplete_count || ' task(s) not finished yet today',
          'url', '/'
        )
      );
    end if;
  end loop;
end;
$$;

select cron.unschedule('remind-incomplete-daily-todos')
where exists (select 1 from cron.job where jobname = 'remind-incomplete-daily-todos');

select cron.schedule('remind-incomplete-daily-todos', '0 16 * * *', $$select remind_incomplete_daily_todos();$$);

notify pgrst, 'reload schema';
