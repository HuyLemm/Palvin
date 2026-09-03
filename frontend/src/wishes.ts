import { supabase } from './lib/supabaseClient';
import type { WishItem, User } from './types';

type ProfileNames = Record<string, User>;

interface WishRow {
  id: string;
  from_profile_id: string;
  wish: string;
  wish_date: string;
  price: string | null;
  link: string | null;
  link_image: string | null;
  link_title: string | null;
  link_description: string | null;
  drawn: boolean;
}

function rowToWish(row: WishRow, names: ProfileNames, myName: string): WishItem {
  return {
    id: row.id,
    from: names[row.from_profile_id] ?? myName,
    wish: row.wish,
    date: row.wish_date,
    drawn: row.drawn,
    price: row.price ?? undefined,
    link: row.link ?? undefined,
    linkImage: row.link_image ?? undefined,
    linkTitle: row.link_title ?? undefined,
    linkDescription: row.link_description ?? undefined,
  };
}

export async function fetchWishes(names: ProfileNames, myName: string): Promise<WishItem[]> {
  const { data, error } = await supabase
    .from('wishes')
    .select('id, from_profile_id, wish, wish_date, price, link, link_image, link_title, link_description, drawn')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as WishRow[]).map(r => rowToWish(r, names, myName));
}

export async function createWish(fromId: string, w: { wish: string; date: string; price?: string; link?: string; linkImage?: string; linkTitle?: string; linkDescription?: string }) {
  return supabase.from('wishes').insert({
    from_profile_id: fromId, wish: w.wish, wish_date: w.date, price: w.price || null, link: w.link || null,
    link_image: w.linkImage || null, link_title: w.linkTitle || null, link_description: w.linkDescription || null,
  });
}

export async function updateWishRow(id: string, w: { wish: string; price?: string; link?: string; linkImage?: string; linkTitle?: string; linkDescription?: string }) {
  return supabase.from('wishes').update({
    wish: w.wish, price: w.price || null, link: w.link || null,
    link_image: w.linkImage || null, link_title: w.linkTitle || null, link_description: w.linkDescription || null,
  }).eq('id', id);
}

export async function setWishDrawnRow(id: string, drawn: boolean) {
  return supabase.from('wishes').update({ drawn }).eq('id', id);
}

export async function deleteWishRow(id: string) {
  return supabase.from('wishes').delete().eq('id', id);
}
