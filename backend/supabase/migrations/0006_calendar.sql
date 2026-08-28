-- PALVIN — Calendar
-- Scope: screens/Calendar.tsx, components/forms/AddEventForm.tsx, plus the
-- "Sắp tới" (upcoming events) widget on Home.tsx and event search results.
--
-- Matches original app behaviour: adding an event only toasts locally, it
-- does not push a shared notification (addMemory/addPost do; addEvent never
-- did) — so no notify trigger here, unlike memories/posts.
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

create table calendar_events (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade default auth_couple_id(),
  title      text not null,
  event_date date not null,
  event_time time,
  category   text not null check (category in ('anniversary','birthday','trip','date','reminder')),
  location   text,
  notes      text,
  created_at timestamptz not null default now()
);

alter table calendar_events enable row level security;

create policy "couple full access" on calendar_events for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

notify pgrst, 'reload schema';
