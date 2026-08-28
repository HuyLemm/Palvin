-- PALVIN — Multi-image posts + real photo uploads + edit/delete
-- Scope: Feed.tsx / PostDetail.tsx / AddPostForm.tsx.
-- Replaces the single image_url column with an ordered image_urls array,
-- and adds a Storage bucket so people can upload their own photos instead
-- of picking from a fixed set of stock images. Edit/delete on posts needs
-- no new RLS — the existing "couple full access ... for all" policy on
-- posts (0002_feed.sql) already covers update/delete.

alter table posts add column if not exists image_urls text[] not null default '{}';
update posts set image_urls = array[image_url] where image_url is not null and image_urls = '{}';
alter table posts drop column if exists image_url;

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- Scoped to the caller's own couple via a couple_id/ path prefix — anyone
-- can register an account in this app, so a bare "authenticated" check would
-- let any stranger upload into or delete from another couple's photos.
create policy "couple members manage their own post images"
on storage.objects for all
to authenticated
using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth_couple_id()::text)
with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth_couple_id()::text);

notify pgrst, 'reload schema';
