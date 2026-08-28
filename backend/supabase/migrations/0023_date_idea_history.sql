-- PALVIN — Date Idea Jar draw history
-- Scope: DateIdeaJar.tsx's "Đã rút gần đây" list.
-- Was component-local state (lost on navigating back, not just reload) —
-- now a shared log so both partners see the same recent draws.

create table date_idea_draws (
  id                  uuid primary key default gen_random_uuid(),
  couple_id           uuid not null references couples(id) on delete cascade default auth_couple_id(),
  emoji               text not null,
  text                text not null,
  drawn_by_profile_id uuid not null references profiles(id),
  created_at          timestamptz not null default now()
);

alter table date_idea_draws enable row level security;

create policy "couple full access" on date_idea_draws for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
