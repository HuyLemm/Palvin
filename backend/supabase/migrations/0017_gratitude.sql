-- PALVIN — Gratitude Journal
-- Scope: Us.tsx's "Nhật Ký Biết Ơn" sub-screen (GratitudeJournal.tsx).
-- Matches original behaviour: addGratitude is append-only (no edit/delete UI)
-- and never pushed a shared notification — no notify trigger here.

create table gratitude_entries (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references couples(id) on delete cascade default auth_couple_id(),
  from_profile_id uuid not null references profiles(id),
  text            text not null,
  entry_date      date not null default current_date
);

alter table gratitude_entries enable row level security;

create policy "couple full access" on gratitude_entries for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
