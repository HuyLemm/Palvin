-- PALVIN — date-request notifications now carry the request's real id so
-- tapping one can actually land inside DatePermit's inbox/mine tab, instead
-- of only reaching the "Us" screen and stopping at its main menu.
-- Scope: screens/Us.tsx (auto-opens the permit sub-screen when a real id is
-- attached), screens/DatePermit.tsx (picks inbox vs mine from that id).
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

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
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id, preview_text)
  values (new.couple_id, new.category_emoji, coalesce(from_name, 'Ai đó') || ' đã nộp đơn xin phép: ' || new.activity, new.from_profile_id, 'us', new.id, new.reason);
  return new;
end;
$$;

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
    insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id)
    values (
      new.couple_id,
      case when new.status = 'approved' then '✅' else '❌' end,
      coalesce(to_name, 'Ai đó') || ' đã ' || (case when new.status = 'approved' then 'DUYỆT' else 'TỪ CHỐI' end)
        || ' đơn xin phép của ' || coalesce(from_name, 'Ai đó')
        || (case when new.response_note <> '' then ': "' || new.response_note || '"' else '' end),
      new.to_profile_id,
      'us',
      new.id
    );
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
