-- PALVIN — Love Notes / Love Letters / Secret Notes
-- Scope: screens/LoveNotes.tsx (all 3 tabs) + components/forms/AddLoveNoteForm.tsx.
--
-- Note: the old local-state build had NO way to actually create a secret
-- note despite LoveNotes.tsx's own footer text claiming "Secret notes are
-- written from the Create menu" — context.tsx never had an addSecretNote
-- action. This migration's table + the paired frontend change finally makes
-- that real (a small composer inside the Secret tab).

create table love_notes (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references couples(id) on delete cascade default auth_couple_id(),
  from_profile_id uuid not null references profiles(id),
  to_profile_id   uuid not null references profiles(id),
  message         text not null,
  mood            text,
  read            boolean not null default false,
  created_at      timestamptz not null default now()
);

create table love_letters (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references couples(id) on delete cascade default auth_couple_id(),
  from_profile_id uuid not null references profiles(id),
  to_profile_id   uuid not null references profiles(id),
  title           text not null,
  body            text not null,
  stationery      text not null default 'rose',
  font            text not null default 'serif',
  created_at      timestamptz not null default now()
);

create table secret_notes (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references couples(id) on delete cascade default auth_couple_id(),
  from_profile_id uuid not null references profiles(id),
  message         text not null,
  unlock_date     date not null,
  created_at      timestamptz not null default now()
);

alter table love_notes enable row level security;
alter table love_letters enable row level security;
alter table secret_notes enable row level security;

create policy "couple full access" on love_notes for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

create policy "couple full access" on love_letters for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

create policy "couple full access" on secret_notes for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

-- Auto-notify the couple on new love notes / letters (matches original
-- addLoveNote/addLoveLetter behaviour, which both pushed a notification).
create or replace function notify_new_love_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare sender_name text;
begin
  select display_name into sender_name from profiles where id = new.from_profile_id;
  insert into notifications (couple_id, emoji, message)
  values (new.couple_id, '💌', coalesce(sender_name, 'Ai đó') || ' đã gửi một love note.');
  return new;
end;
$$;

drop trigger if exists on_love_note_created on love_notes;
create trigger on_love_note_created
  after insert on love_notes
  for each row execute function notify_new_love_note();

create or replace function notify_new_love_letter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare sender_name text;
begin
  select display_name into sender_name from profiles where id = new.from_profile_id;
  insert into notifications (couple_id, emoji, message)
  values (new.couple_id, '💌', coalesce(sender_name, 'Ai đó') || ' đã viết cho bạn một bức thư tình.');
  return new;
end;
$$;

drop trigger if exists on_love_letter_created on love_letters;
create trigger on_love_letter_created
  after insert on love_letters
  for each row execute function notify_new_love_letter();

notify pgrst, 'reload schema';
