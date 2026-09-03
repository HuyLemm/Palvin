-- PALVIN — Wish notifications landed on the Us hub (target_screen 'us')
-- with no way to tell the frontend it should specifically open the Gift
-- Wishlist sub-screen, let alone which wish to scroll to/highlight. 'us'
-- is still a valid landing (it's the correct screen), it just isn't
-- precise — mirrors the 'stats'/'bills'/'goals' -> Money-tab trick from
-- 0074: 'wishlist' is a new global screen key that normalizes to 'us'
-- (see frontend/src/App.tsx's normalizedScreen) while Us.tsx reads it
-- (plus target_id, now populated) to open Gift Wishlist directly and
-- scroll to / briefly highlight that specific wish.
--
-- Message text and all other logic copied verbatim from 0062; only
-- target_screen changes, and target_id is now populated for the two
-- notifications about a wish that still exists (a deleted wish has
-- nothing left to scroll to, so target_id stays unset there).

create or replace function notify_new_wish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.from_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id)
  values (new.couple_id, '🎁', coalesce(author_name, 'Someone') || ' added a wish to the Gift Wishlist: ' || new.wish, new.from_profile_id, 'wishlist', new.id);
  return new;
end;
$$;

create or replace function notify_wish_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id)
  values (new.couple_id, '🎁', coalesce(actor_name, 'Someone') || ' updated a wish: ' || new.wish, auth.uid(), 'wishlist', new.id);
  return new;
end;
$$;

create or replace function notify_wish_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a wish: ' || old.wish, auth.uid(), 'wishlist');
  return old;
end;
$$;

notify pgrst, 'reload schema';
