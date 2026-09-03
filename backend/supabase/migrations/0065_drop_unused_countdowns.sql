-- PALVIN — Drop the countdowns table: the frontend feature it backed
-- (frontend/src/countdowns.ts) was removed earlier this session and nothing
-- else references it (no triggers, no functions, no FKs pointing at it).

drop table if exists countdowns;

notify pgrst, 'reload schema';
