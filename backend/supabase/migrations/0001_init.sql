-- PALVIN — Auth & Couples schema
-- Scope: ONLY what the "sign up / log in / link with partner" feature
-- actually needs right now (auth.ts + context.tsx). Every other domain table
-- (posts, memories, expenses...) gets its own migration file the day that
-- feature is actually wired to Supabase — don't pre-create schema for
-- features that don't exist in the app yet.
--
-- Nothing here is tied to specific names like "Alvin"/"Paoi" — the only
-- place a name ever lives is `profiles.display_name` (whatever each person
-- typed at signup). Once 2 profiles share a `couple_id`, that's "linked".
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.
-- (Run 0000_reset.sql first if rebuilding on top of an existing project.)

-- ============================================================
-- 1. CORE: couples & profiles
-- ============================================================

create table couples (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- 1 row per Supabase Auth user, extends auth.users
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  couple_id    uuid references couples(id) on delete set null,
  display_name text not null,                     -- also the login username
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create unique index profiles_display_name_lower_idx on profiles (lower(display_name));

-- Helper used by every RLS policy: the couple_id of the caller.
-- MUST be security definer: it queries `profiles`, and `profiles` itself has
-- a policy that calls this function — without security definer that query
-- re-triggers RLS (including that same policy) and recurses infinitely
-- ("stack depth limit exceeded"). security definer runs this one lookup with
-- elevated privileges so it bypasses RLS instead of re-entering it; it's
-- still safe since it only ever reads the caller's own row (auth.uid()).
create or replace function auth_couple_id() returns uuid
language sql stable
security definer
set search_path = public
as $$
  select couple_id from profiles where id = auth.uid()
$$;

alter table couples enable row level security;
alter table profiles enable row level security;

create policy "member can read own couple" on couples
  for select using (id = auth_couple_id());
create policy "member can update own couple" on couples
  for update using (id = auth_couple_id());

create policy "user can read own profile" on profiles
  for select using (id = auth.uid());
create policy "user can read partner profile" on profiles
  for select using (couple_id = auth_couple_id());
create policy "user can update own profile" on profiles
  for update using (id = auth.uid());

-- ------------------------------------------------------------
-- Auto-create a couple + profile whenever someone signs up
-- (fires immediately on auth.users insert, even before email confirmation)
-- ------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_couple_id uuid;
begin
  insert into couples default values returning id into new_couple_id;
  insert into profiles (id, couple_id, display_name)
  values (
    new.id,
    new_couple_id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------
-- Login by username instead of email
-- ------------------------------------------------------------

create or replace function email_for_username(username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  target_email text;
begin
  select id into target_id from profiles where lower(display_name) = lower(trim(username));
  if target_id is null then
    return null;
  end if;
  select email into target_email from auth.users where id = target_id;
  return target_email;
end;
$$;

grant execute on function email_for_username(text) to anon, authenticated;

-- ============================================================
-- 2. PARTNER INVITES (request/accept linking)
-- ============================================================

create table partner_invites (
  id           uuid primary key default gen_random_uuid(),
  from_profile uuid not null references profiles(id) on delete cascade,
  to_profile   uuid not null references profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz
);

alter table partner_invites enable row level security;

create policy "see own invites" on partner_invites
  for select using (from_profile = auth.uid() or to_profile = auth.uid());
-- No insert/update policy for regular clients — all writes go through the
-- security-definer RPCs below, which validate before mutating.

create or replace function invite_partner(target_username text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  me_id uuid := auth.uid();
  me record;
  target record;
  member_count int;
  existing record;
begin
  if me_id is null then
    return json_build_object('ok', false, 'error', 'Chưa đăng nhập.');
  end if;

  select * into me from profiles where id = me_id;

  select * into target from profiles where lower(display_name) = lower(trim(target_username));
  if target.id is null then
    return json_build_object('ok', false, 'error', 'Không tìm thấy người dùng với tên này.');
  end if;
  if target.id = me_id then
    return json_build_object('ok', false, 'error', 'Không thể tự mời chính mình.');
  end if;

  select count(*) into member_count from profiles where couple_id = me.couple_id;
  if member_count > 1 then
    return json_build_object('ok', false, 'error', 'Bạn đã liên kết rồi.');
  end if;

  select count(*) into member_count from profiles where couple_id = target.couple_id;
  if member_count > 1 then
    return json_build_object('ok', false, 'error', 'Người này đã liên kết với người khác rồi.');
  end if;

  select * into existing from partner_invites
    where status = 'pending'
      and ((from_profile = me_id and to_profile = target.id) or (from_profile = target.id and to_profile = me_id));
  if existing.id is not null then
    return json_build_object('ok', false, 'error', 'Đã có lời mời đang chờ giữa hai người.');
  end if;

  insert into partner_invites (from_profile, to_profile) values (me_id, target.id);

  return json_build_object('ok', true);
end;
$$;

grant execute on function invite_partner(text) to authenticated;

create or replace function respond_invite(invite_id uuid, accept boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  me_id uuid := auth.uid();
  inv record;
begin
  if me_id is null then
    return json_build_object('ok', false, 'error', 'Chưa đăng nhập.');
  end if;

  select * into inv from partner_invites where id = invite_id and to_profile = me_id and status = 'pending';
  if inv.id is null then
    return json_build_object('ok', false, 'error', 'Lời mời không tồn tại hoặc đã được xử lý.');
  end if;

  if accept then
    update partner_invites set status = 'accepted', responded_at = now() where id = invite_id;
    update profiles set couple_id = (select couple_id from profiles where id = inv.from_profile) where id = me_id;
  else
    update partner_invites set status = 'rejected', responded_at = now() where id = invite_id;
  end if;

  return json_build_object('ok', true);
end;
$$;

grant execute on function respond_invite(uuid, boolean) to authenticated;

create or replace function cancel_invite(invite_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  update partner_invites set status = 'cancelled', responded_at = now()
  where id = invite_id and from_profile = auth.uid() and status = 'pending';
  return json_build_object('ok', true);
end;
$$;

grant execute on function cancel_invite(uuid) to authenticated;

-- Returns { sent: [{id,toName,createdAt}], received: [{id,fromName,createdAt}] }
-- for the caller's own pending invites — bypasses profiles RLS (which would
-- otherwise block seeing a not-yet-linked person's display name).
create or replace function get_my_invites()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  me_id uuid := auth.uid();
  result json;
begin
  select json_build_object(
    'sent', coalesce((
      select json_agg(json_build_object('id', pi.id, 'toName', p.display_name, 'createdAt', pi.created_at) order by pi.created_at desc)
      from partner_invites pi join profiles p on p.id = pi.to_profile
      where pi.from_profile = me_id and pi.status = 'pending'
    ), '[]'::json),
    'received', coalesce((
      select json_agg(json_build_object('id', pi.id, 'fromName', p.display_name, 'createdAt', pi.created_at) order by pi.created_at desc)
      from partner_invites pi join profiles p on p.id = pi.from_profile
      where pi.to_profile = me_id and pi.status = 'pending'
    ), '[]'::json)
  ) into result;
  return result;
end;
$$;

grant execute on function get_my_invites() to authenticated;

-- ============================================================
-- 3. Make sure the API layer picks up everything immediately
-- ============================================================

notify pgrst, 'reload schema';
