-- PALVIN — Date Idea Jar
-- Scope: Us.tsx's "Hũ Hẹn Hò" sub-screen (DateIdeaJar.tsx).
-- Only the couple's own custom ideas are stored here — the 20 preset ideas
-- are a static constant in the frontend, not couple data. The "recently
-- drawn" history stays local/ephemeral (matches original behaviour: it was
-- never persisted either, and it's a spin log, not created content).

create table date_ideas (
  id                  uuid primary key default gen_random_uuid(),
  couple_id           uuid not null references couples(id) on delete cascade default auth_couple_id(),
  emoji               text not null default '✨',
  text                text not null,
  added_by_profile_id uuid not null references profiles(id),
  created_at          timestamptz not null default now()
);

alter table date_ideas enable row level security;

create policy "couple full access" on date_ideas for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
