-- PALVIN — Per-account customization of the dashboard's "Send a hug" /
-- "Thinking of you" quick-action buttons: label, icon, and accent color.
-- Stored per profile (like dark_mode), not per couple, so each partner can
-- personalize their own dashboard independently. Missing keys/fields fall
-- back to the app's built-in defaults client-side (see auth.ts).

alter table profiles add column quick_actions jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
