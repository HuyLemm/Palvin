-- PALVIN — Memories
-- Scope: screens/Memories.tsx, screens/MemoryDetail.tsx, components/forms/AddMemoryForm.tsx,
-- plus the memory-derived widgets on Home.tsx and Us.tsx ("Photo Collage",
-- "Our Places", and "Our Story" — Our Story previously used a hardcoded
-- fictional timeline; this migration lets it become a real one).
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

create table memories (
  id                  uuid primary key default gen_random_uuid(),
  couple_id           uuid not null references couples(id) on delete cascade default auth_couple_id(),
  added_by_profile_id uuid references profiles(id),
  title               text not null,
  occurred_on         date not null,
  location            text,
  description         text,
  image_url           text not null,
  favorite            boolean not null default false,
  people              uuid[] not null default '{}'::uuid[],
  created_at          timestamptz not null default now()
);

alter table memories enable row level security;

create policy "couple full access" on memories for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

-- Auto-notify the couple whenever a new memory is added.
create or replace function notify_new_memory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.added_by_profile_id;
  insert into notifications (couple_id, emoji, message)
  values (new.couple_id, '🌸', coalesce(author_name, 'Ai đó') || ' đã thêm một kỷ niệm mới: ' || new.title);
  return new;
end;
$$;

drop trigger if exists on_memory_created on memories;
create trigger on_memory_created
  after insert on memories
  for each row execute function notify_new_memory();

notify pgrst, 'reload schema';
