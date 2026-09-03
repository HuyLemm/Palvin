-- PALVIN — 0075 only changed the notify_* FUNCTIONS, so every wish
-- notification already sitting in the table from before that migration
-- still has target_screen='us' (and no target_id) — tapping one of those
-- still just lands on the Us hub, not Gift Wishlist. Backfills the
-- target_screen for those existing rows so testing works immediately
-- without waiting for a brand new wish to be added/edited. target_id can't
-- be safely recovered for these old rows (the message only has the wish's
-- text, not its id, and that text isn't guaranteed unique/still current),
-- so they land on Gift Wishlist without the specific-item highlight —
-- only newly created notifications (post-0075) get that.

update notifications
set target_screen = 'wishlist'
where target_screen = 'us'
  and (
    message like '% added a wish to the Gift Wishlist:%'
    or message like '% updated a wish:%'
    or message like '% deleted a wish:%'
  );
