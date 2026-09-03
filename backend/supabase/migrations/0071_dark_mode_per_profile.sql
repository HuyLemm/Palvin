-- PALVIN — Dark mode was persisted per COUPLE (couples.dark_mode), so
-- toggling it for one partner silently flipped it for the other too.
-- Moves it to profiles.dark_mode instead, seeded from whatever the couple's
-- shared value already was so nobody's current preference resets. The old
-- couples.dark_mode column is left in place (now unused) rather than
-- dropped, since it costs nothing to keep and this migration shouldn't
-- risk touching anything else on that table.

alter table profiles add column if not exists dark_mode boolean not null default false;

update profiles p
set dark_mode = c.dark_mode
from couples c
where p.couple_id = c.id and c.dark_mode = true;

notify pgrst, 'reload schema';
