-- PALVIN — Enable Realtime on notifications
-- Lets the client subscribe to new rows via Supabase Realtime (postgres_changes)
-- instead of polling, so a new notification can pop up as an instant toast on
-- the partner's screen. RLS still applies to the realtime feed (same
-- "couple full access" policy from 0003_notifications.sql).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;
