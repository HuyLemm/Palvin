-- PALVIN — Feed (posts, comments, likes, saves, reactions)
-- Scope: exactly what screens/Feed.tsx, screens/PostDetail.tsx, and
-- components/forms/AddPostForm.tsx need. Every "who did this" column is a
-- foreign key to profiles(id) — never a hardcoded name.
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

create table posts (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade default auth_couple_id(),
  author_id  uuid not null references profiles(id),
  image_url  text not null,
  caption    text not null,
  location   text,
  created_at timestamptz not null default now()
);

create table post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  author_id  uuid not null references profiles(id),
  text       text not null,
  created_at timestamptz not null default now()
);

create table post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

create table post_saves (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

create table post_reactions (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  emoji   text not null,
  primary key (post_id, user_id, emoji)
);

alter table posts enable row level security;
alter table post_comments enable row level security;
alter table post_likes enable row level security;
alter table post_saves enable row level security;
alter table post_reactions enable row level security;

create policy "couple full access" on posts for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

create policy "couple full access" on post_comments for all
  using (post_id in (select id from posts where couple_id = auth_couple_id()))
  with check (post_id in (select id from posts where couple_id = auth_couple_id()));

create policy "couple full access" on post_likes for all
  using (post_id in (select id from posts where couple_id = auth_couple_id()))
  with check (post_id in (select id from posts where couple_id = auth_couple_id()));

create policy "couple full access" on post_saves for all
  using (post_id in (select id from posts where couple_id = auth_couple_id()))
  with check (post_id in (select id from posts where couple_id = auth_couple_id()));

create policy "couple full access" on post_reactions for all
  using (post_id in (select id from posts where couple_id = auth_couple_id()))
  with check (post_id in (select id from posts where couple_id = auth_couple_id()));

notify pgrst, 'reload schema';
