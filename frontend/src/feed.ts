import { supabase } from './lib/supabaseClient';
import type { Post, User } from './types';

type ProfileNames = Record<string, User>;

interface PostRow {
  id: string;
  author_id: string;
  image_url: string;
  caption: string;
  location: string | null;
  created_at: string;
  post_comments: { id: string; author_id: string; text: string; created_at: string }[];
  post_likes: { user_id: string }[];
  post_saves: { user_id: string }[];
  post_reactions: { user_id: string; emoji: string }[];
}

export type ReactionMap = Record<string, Record<string, { count: number; reacted: boolean }>>;

const POST_SELECT = 'id, author_id, image_url, caption, location, created_at,' +
  'post_comments(id, author_id, text, created_at),' +
  'post_likes(user_id), post_saves(user_id), post_reactions(user_id, emoji)';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function rowToPost(row: PostRow, myId: string, names: ProfileNames): Post {
  const comments = [...row.post_comments]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(c => ({ id: c.id, author: names[c.author_id] ?? 'Alvin', text: c.text, date: formatDate(c.created_at) }));
  return {
    id: row.id,
    author: names[row.author_id] ?? 'Alvin',
    date: formatDate(row.created_at),
    image: row.image_url,
    caption: row.caption,
    location: row.location ?? undefined,
    likes: row.post_likes.length,
    liked: row.post_likes.some(l => l.user_id === myId),
    saved: row.post_saves.some(s => s.user_id === myId),
    comments,
  };
}

export async function fetchPosts(myId: string, names: ProfileNames): Promise<{ posts: Post[]; reactions: ReactionMap }> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .order('created_at', { ascending: false });
  if (error || !data) return { posts: [], reactions: {} };

  const rows = data as unknown as PostRow[];
  const posts = rows.map(r => rowToPost(r, myId, names));

  const reactions: ReactionMap = {};
  for (const r of rows) {
    const byEmoji: Record<string, { count: number; reacted: boolean }> = {};
    for (const react of r.post_reactions) {
      const cur = byEmoji[react.emoji] ?? { count: 0, reacted: false };
      cur.count += 1;
      if (react.user_id === myId) cur.reacted = true;
      byEmoji[react.emoji] = cur;
    }
    reactions[r.id] = byEmoji;
  }
  return { posts, reactions };
}

export async function createPost(authorId: string, data: { image: string; caption: string; location?: string }) {
  return supabase.from('posts').insert({
    author_id: authorId, image_url: data.image, caption: data.caption, location: data.location ?? null,
  });
}

export async function addPostComment(postId: string, authorId: string, text: string) {
  return supabase.from('post_comments').insert({ post_id: postId, author_id: authorId, text });
}

export async function setLiked(postId: string, userId: string, liked: boolean) {
  if (liked) return supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
  return supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
}

export async function setSaved(postId: string, userId: string, saved: boolean) {
  if (saved) return supabase.from('post_saves').insert({ post_id: postId, user_id: userId });
  return supabase.from('post_saves').delete().eq('post_id', postId).eq('user_id', userId);
}

export async function toggleReaction(postId: string, userId: string, emoji: string, reacted: boolean) {
  if (!reacted) return supabase.from('post_reactions').insert({ post_id: postId, user_id: userId, emoji });
  return supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', userId).eq('emoji', emoji);
}
