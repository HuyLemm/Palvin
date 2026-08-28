-- PALVIN — Date Permit
-- Scope: Us.tsx's "Đơn Xin Phép" sub-screen (DatePermit.tsx).
-- Matches original behaviour: both submitting a request and responding to
-- one pushed a shared notification — two triggers, one per action.

create table date_requests (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references couples(id) on delete cascade default auth_couple_id(),
  from_profile_id uuid not null references profiles(id),
  to_profile_id   uuid not null references profiles(id),
  category        text not null,
  category_emoji  text not null,
  activity        text not null,
  location        text not null,
  request_date    date not null,
  request_time    time not null,
  reason          text not null,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  response_note   text not null default '',
  created_at      timestamptz not null default now(),
  responded_at    timestamptz
);

alter table date_requests enable row level security;

create policy "couple full access" on date_requests for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

-- Auto-notify the couple whenever a request is submitted.
create or replace function notify_new_date_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  from_name text;
begin
  select display_name into from_name from profiles where id = new.from_profile_id;
  insert into notifications (couple_id, emoji, message)
  values (new.couple_id, new.category_emoji, coalesce(from_name, 'Ai đó') || ' đã nộp đơn xin phép: ' || new.activity);
  return new;
end;
$$;

drop trigger if exists on_date_request_created on date_requests;
create trigger on_date_request_created
  after insert on date_requests
  for each row execute function notify_new_date_request();

-- Auto-notify the couple whenever a request is approved/rejected.
create or replace function notify_date_request_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  from_name text;
  to_name text;
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    select display_name into from_name from profiles where id = new.from_profile_id;
    select display_name into to_name from profiles where id = new.to_profile_id;
    insert into notifications (couple_id, emoji, message)
    values (
      new.couple_id,
      case when new.status = 'approved' then '✅' else '❌' end,
      coalesce(to_name, 'Ai đó') || ' đã ' || (case when new.status = 'approved' then 'DUYỆT' else 'TỪ CHỐI' end)
        || ' đơn xin phép của ' || coalesce(from_name, 'Ai đó')
        || (case when new.response_note <> '' then ': "' || new.response_note || '"' else '' end)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_date_request_responded on date_requests;
create trigger on_date_request_responded
  after update on date_requests
  for each row execute function notify_date_request_response();

notify pgrst, 'reload schema';
