-- PALVIN — Reset auth/couples schema
-- Drops everything from 0001_init.sql but leaves `auth.users` untouched, so
-- any accounts you've already created are preserved. Safe to re-run any
-- time before re-applying 0001_init.sql.
--
-- If later migrations (0002+, for other features) have already been applied
-- on top of this, drop those tables first — this file only knows about the
-- auth/couples scope.

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists partner_invites cascade;
drop table if exists profiles cascade;
drop table if exists couples cascade;

drop function if exists handle_new_user();
drop function if exists invite_partner(text);
drop function if exists respond_invite(uuid, boolean);
drop function if exists cancel_invite(uuid);
drop function if exists get_my_invites();
drop function if exists email_for_username(text);
drop function if exists auth_couple_id();

notify pgrst, 'reload schema';
