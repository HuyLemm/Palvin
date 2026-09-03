-- PALVIN — Deleting a post cascades (on delete cascade) into post_likes/
-- post_saves/post_reactions, which fires their own AFTER DELETE notify
-- triggers from 0059 — without a guard that means "deleted a post with 3
-- likes" sends 4 notifications (1 "đã xóa bài viết" + 3 "đã bỏ thích") for
-- a single user action. pg_trigger_depth() > 1 reliably distinguishes a
-- cascade-driven delete (nested inside the posts row's own AFTER DELETE,
-- so depth 2+) from a direct unlike/unsave/un-react (depth 1) — skip
-- notifying in the cascade case, leaving just the one "đã xóa bài viết".

create or replace function notify_post_unliked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; v_couple_id uuid;
begin
  if pg_trigger_depth() > 1 then return old; end if;
  select display_name into actor_name from profiles where id = auth.uid();
  select couple_id into v_couple_id from posts where id = old.post_id;
  if v_couple_id is null then return old; end if;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id)
  values (v_couple_id, '💔', coalesce(actor_name, 'Ai đó') || ' đã bỏ thích bài viết', auth.uid(), 'post-detail', old.post_id);
  return old;
end;
$$;

create or replace function notify_post_unsaved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; v_couple_id uuid;
begin
  if pg_trigger_depth() > 1 then return old; end if;
  select display_name into actor_name from profiles where id = auth.uid();
  select couple_id into v_couple_id from posts where id = old.post_id;
  if v_couple_id is null then return old; end if;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id)
  values (v_couple_id, '🔖', coalesce(actor_name, 'Ai đó') || ' đã bỏ lưu bài viết', auth.uid(), 'post-detail', old.post_id);
  return old;
end;
$$;

create or replace function notify_reaction_removed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; v_couple_id uuid;
begin
  if pg_trigger_depth() > 1 then return old; end if;
  select display_name into actor_name from profiles where id = auth.uid();
  select couple_id into v_couple_id from posts where id = old.post_id;
  if v_couple_id is null then return old; end if;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id)
  values (v_couple_id, old.emoji, coalesce(actor_name, 'Ai đó') || ' đã bỏ ' || old.emoji || ' khỏi bài viết', auth.uid(), 'post-detail', old.post_id);
  return old;
end;
$$;

notify pgrst, 'reload schema';
