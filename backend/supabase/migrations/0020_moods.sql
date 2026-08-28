-- PALVIN — Mood tracker
-- Scope: Home.tsx's "Hôm nay" mood card + 7-day mood chart.
-- One row per profile per day (upserted on update) — `moods` (today's
-- snapshot) and `moodHistory` are both derived client-side from this table,
-- replacing the two independently-updated local-state fields. Matches
-- original behaviour: setMood only toasts locally — no notify trigger here.

create table mood_entries (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade default auth_couple_id(),
  profile_id uuid not null references profiles(id),
  entry_date date not null default current_date,
  emoji      text not null,
  label      text not null,
  unique (profile_id, entry_date)
);

alter table mood_entries enable row level security;

create policy "couple full access" on mood_entries for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
