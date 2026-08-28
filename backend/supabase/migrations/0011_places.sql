-- PALVIN — Our Places
-- Scope: Us.tsx's "Our Places" sub-screen + Search.tsx's place results.
--
-- The old local-state build had NO way to add a place at all (no addPlace
-- action ever existed in context.tsx) — this migration + the paired
-- frontend change adds a real "+ Thêm địa điểm" flow so the list can
-- actually grow. Linking a place to specific memories (place_memories) is
-- modelled for future use but isn't wired to any UI yet — new places start
-- with 0 linked memories.

create table places (
  id        uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade default auth_couple_id(),
  name      text not null,
  flag      text,
  image_url text not null
);

create table place_memories (
  place_id  uuid not null references places(id) on delete cascade,
  memory_id uuid not null references memories(id) on delete cascade,
  primary key (place_id, memory_id)
);

alter table places enable row level security;
alter table place_memories enable row level security;

create policy "couple full access" on places for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

create policy "couple full access" on place_memories for all
  using (place_id in (select id from places where couple_id = auth_couple_id()))
  with check (place_id in (select id from places where couple_id = auth_couple_id()));

notify pgrst, 'reload schema';
