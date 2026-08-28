-- PALVIN — Time Capsule
-- Scope: Us.tsx's "Time Capsule" sub-screen (TimeCapsule.tsx).
-- to_profile_id is nullable: null means "both" (Capsule.to === 'both' in the UI).
-- Matches original behaviour: addCapsule/openCapsule never pushed a shared
-- notification (only a local toast) — no notify trigger here.

create table capsules (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references couples(id) on delete cascade default auth_couple_id(),
  from_profile_id uuid not null references profiles(id),
  to_profile_id   uuid references profiles(id),
  message         text not null,
  unlock_date     date not null,
  opened          boolean not null default false,
  created_date    date not null default current_date
);

alter table capsules enable row level security;

create policy "couple full access" on capsules for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
