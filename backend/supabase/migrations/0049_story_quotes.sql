-- PALVIN — Daily story quotes
-- Scope: Us.tsx's "Câu nói mỗi ngày" sub-screen and Home.tsx's dashboard
-- quote line (was a hardcoded "Our little story continues."). One quote is
-- shown per day, picked deterministically client-side (day count since
-- epoch mod quote count) so both partners see the same one on a given day
-- without needing to store which quote was shown when.

create table story_quotes (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade default auth_couple_id(),
  text       text not null,
  created_at timestamptz not null default now()
);

alter table story_quotes enable row level security;

create policy "couple full access" on story_quotes for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
