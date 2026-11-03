-- PALVIN — "Question of the day": one shared question per day; each partner answers,
-- and a partner's answer only becomes visible once you have answered too.
--
-- The question is chosen from the seed list by date (same for both phones). The
-- "answer first, then see theirs" rule is enforced by row-level security, not by
-- the app, using a security-definer helper to avoid a recursive policy.
--
-- Apply via: supabase db push   (or paste into the Dashboard SQL editor).

create table if not exists daily_questions (
  id   serial primary key,
  body text not null unique
);

alter table daily_questions enable row level security;
drop policy if exists "read questions" on daily_questions;
create policy "read questions" on daily_questions for select using (auth.uid() is not null);

insert into daily_questions (body) values
  ('What is one small thing I did recently that made you smile?'),
  ('What is a memory of us you would relive tomorrow?'),
  ('What is something new you would like us to try together this month?'),
  ('When do you feel most loved by me?'),
  ('What is your favourite thing about our ordinary days?'),
  ('What song reminds you of us right now?'),
  ('What is a dream you have not told me about yet?'),
  ('What is the best meal we have shared?'),
  ('What is one thing I do that you hope I never stop doing?'),
  ('Where would you take me for a surprise day out?'),
  ('What is something you are proud of this week?'),
  ('What made you laugh the hardest with me?'),
  ('What is a place that feels like home to you, and why?'),
  ('What is one thing you would like us to do more often?'),
  ('What was your first impression of me?'),
  ('What is a small habit of mine you secretly love?'),
  ('What is a goal you want us to reach this year?'),
  ('What helps you feel calm after a hard day?'),
  ('What is one thing you are grateful for today?'),
  ('If we had a free weekend, how would you spend it?'),
  ('What is a movie or show we should watch next?'),
  ('What is something I taught you?'),
  ('What is something you taught me?'),
  ('What is your favourite photo of us, and why?'),
  ('What would our perfect lazy morning look like?'),
  ('What is a tradition you would like us to start?'),
  ('What is one thing you want me to know today?'),
  ('What was the best surprise you have ever had?'),
  ('Which of our dates would you repeat first?'),
  ('What is a word that describes us right now?'),
  ('What is a food you want to cook together?'),
  ('What is a fear you would like to face with me beside you?'),
  ('What is something you admire about the way I handle stress?'),
  ('Where do you see us in five years?'),
  ('What is a gift that was not expensive but meant a lot?'),
  ('What is a compliment you remember from me?'),
  ('What is the kindest thing someone did for you recently?'),
  ('What is one thing you want to learn this season?'),
  ('What do you miss most when we are apart?'),
  ('What is your favourite thing about where we live?')
on conflict (body) do nothing;

create table if not exists daily_answers (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references couples(id) on delete cascade default auth_couple_id(),
  profile_id  uuid not null references profiles(id) default auth.uid(),
  question_id int  not null references daily_questions(id),
  answer_date date not null,
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now(),
  unique (profile_id, answer_date)
);

alter table daily_answers enable row level security;

-- "Have I answered on that day?" — security definer so the policy below does not
-- query daily_answers through its own policy (which would recurse).
create or replace function has_answered_daily(d date)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from daily_answers where profile_id = auth.uid() and answer_date = d);
$$;

drop policy if exists "read own, and partner's once I answered" on daily_answers;
create policy "read own, and partner's once I answered" on daily_answers for select
  using (couple_id = auth_couple_id() and (profile_id = auth.uid() or has_answered_daily(answer_date)));

drop policy if exists "answer as myself" on daily_answers;
create policy "answer as myself" on daily_answers for insert
  with check (profile_id = auth.uid() and couple_id = auth_couple_id());

drop policy if exists "edit my own answer" on daily_answers;
create policy "edit my own answer" on daily_answers for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() and couple_id = auth_couple_id());

-- Today's question for a given calendar day (the phone passes its local date).
create or replace function daily_question(d date)
returns table (id int, body text)
language sql
security definer
stable
set search_path = public
as $$
  select q.id, q.body
  from daily_questions q
  order by q.id
  offset (abs(d - date '2024-01-01') % greatest((select count(*) from daily_questions), 1))::int
  limit 1;
$$;

notify pgrst, 'reload schema';
