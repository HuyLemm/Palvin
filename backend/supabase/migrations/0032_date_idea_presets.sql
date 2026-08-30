-- PALVIN — Date Idea Jar preset catalog gets its own table
-- The 20 built-in ideas used to be a hardcoded array in DateIdeaJar.tsx with
-- no way to edit/delete them. They now live per-couple in this table (kept
-- separate from `date_ideas`, which is only ever couple-added ideas) so the
-- same edit/delete UI can apply to presets too, without one couple's edits
-- ever touching another couple's copy.
--
-- No seed data here on purpose: money.ts's fetchDateIdeaPresets() seeds the
-- default 20 for a couple the first time it sees zero rows for them — that
-- covers existing couples on their next visit AND every future couple,
-- without needing a signup-time trigger (couples are created at signup,
-- before two people are actually linked, so seeding there would attach data
-- to a couple row that may end up discarded once linking reassigns it).
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

create table date_idea_presets (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade default auth_couple_id(),
  emoji      text not null default '✨',
  text       text not null,
  created_at timestamptz not null default now()
);

alter table date_idea_presets enable row level security;

create policy "couple full access" on date_idea_presets for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
