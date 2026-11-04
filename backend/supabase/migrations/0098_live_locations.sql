-- PALVIN — live location sharing ("Map").
--
-- One row per person holding their latest position. Sharing is opt-in and time-boxed:
-- the partner can read a row only while `sharing_until` is in the future, which is
-- enforced here by row-level security, not by the app. Stopping a share clears the
-- coordinates. Only the owner can write their own row.
--
-- Apply by pasting into the Dashboard SQL editor (or `supabase db query --remote -f`).
-- Do NOT use `supabase db push` — production has no migration history.

create table if not exists locations (
  profile_id    uuid primary key references profiles(id) on delete cascade default auth.uid(),
  couple_id     uuid not null references couples(id) on delete cascade default auth_couple_id(),
  lat           double precision,
  lng           double precision,
  accuracy_m    real,
  sharing_until timestamptz,           -- null = not sharing
  updated_at    timestamptz not null default now()
);

alter table locations enable row level security;

drop policy if exists "read own, and partner's while sharing" on locations;
create policy "read own, and partner's while sharing" on locations for select
  using (couple_id = auth_couple_id()
         and (profile_id = auth.uid() or (sharing_until is not null and sharing_until > now())));

drop policy if exists "write only my own location" on locations;
create policy "write only my own location" on locations for insert
  with check (profile_id = auth.uid() and couple_id = auth_couple_id());

drop policy if exists "update only my own location" on locations;
create policy "update only my own location" on locations for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() and couple_id = auth_couple_id());

drop policy if exists "delete only my own location" on locations;
create policy "delete only my own location" on locations for delete
  using (profile_id = auth.uid());

-- Saved places ("Home", "Work", ...): shared by the couple, shown as landmarks on the map, and used
-- to say "paoi is at Work" when their shared position is inside the radius.
create table if not exists saved_places (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade default auth_couple_id(),
  name       text not null check (char_length(name) between 1 and 40),
  emoji      text not null default '📍',
  lat        double precision not null,
  lng        double precision not null,
  radius_m   int not null default 150 check (radius_m between 30 and 2000),
  created_by uuid references profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table saved_places enable row level security;

drop policy if exists "couple full access" on saved_places;
create policy "couple full access" on saved_places for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

-- Places I stayed at for about an hour (detected on my phone while "Remember places" is on).
-- Private: only the person it belongs to can read it. `place_id` links a visit to a saved place.
create table if not exists visits (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade default auth.uid(),
  couple_id    uuid not null references couples(id) on delete cascade default auth_couple_id(),
  lat          double precision not null,
  lng          double precision not null,
  label        text,
  place_id     uuid references saved_places(id) on delete set null,
  arrived_at   timestamptz not null,
  last_seen_at timestamptz not null default now()
);
create index if not exists visits_profile_arrived on visits (profile_id, arrived_at desc);

alter table visits enable row level security;

drop policy if exists "my visits only" on visits;
create policy "my visits only" on visits for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() and couple_id = auth_couple_id());

-- Realtime so the partner's pin moves live. RLS still applies to the realtime feed.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'locations'
  ) then
    alter publication supabase_realtime add table locations;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'saved_places'
  ) then
    alter publication supabase_realtime add table saved_places;
  end if;
end $$;

notify pgrst, 'reload schema';
