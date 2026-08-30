-- PALVIN — fix realtime DELETE events not reaching subscribers on date_requests
-- By default a table's replica identity only includes the primary key, so a
-- DELETE's row data in the WAL has no couple_id — Realtime can't evaluate our
-- `couple_id=eq.<id>` filter (or the RLS policy) for that event and silently
-- drops it. REPLICA IDENTITY FULL includes the whole old row, so deletes are
-- filtered and delivered correctly, same as inserts/updates already are.
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.
-- (Run this AFTER 0030_realtime_date_requests.sql, or in the same sitting —
-- order between the two doesn't matter, but both are required.)

alter table date_requests replica identity full;
