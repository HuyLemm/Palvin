-- PALVIN — Real "Couple Name" setting.
-- Settings > Couple > "Couple Name" used to be pure decoration: tapping Edit
-- just fired a toast, there was no backing column, and "Alvin ❤️ Paoi" was
-- hardcoded in several screens. This makes it a real per-couple value.

alter table couples add column if not exists couple_name text;

notify pgrst, 'reload schema';
