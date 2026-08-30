-- PALVIN — Enable Realtime on date_requests
-- Lets an already-open session pick up submit/approve/reject/edit/delete on
-- a date request instantly (context.tsx's date-requests-<coupleId> channel)
-- instead of showing stale data until the app is reloaded — in particular,
-- so a deleted pending request actually disappears from the other side's
-- "Cần duyệt" list right away. RLS still applies to the realtime feed (same
-- "couple full access" policy from 0018_date_requests.sql).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'date_requests'
  ) then
    alter publication supabase_realtime add table date_requests;
  end if;
end $$;
