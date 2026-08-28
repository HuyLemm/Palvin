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
  drawn: boolean;
}

function rowToWish(row: WishRow, names: ProfileNames): WishItem {
  return {
    id: row.id,
    from: names[row.from_profile_id] ?? 'Alvin',
    wish: row.wish,
    date: row.wish_date,
    drawn: row.drawn,
    price: row.price ?? undefined,
    link: row.link ?? undefined,
  };
}

export async function fetchWishes(names: ProfileNames): Promise<WishItem[]> {
  const { data, error } = await supabase
    .from('wishes')
    .select('id, from_profile_id, wish, wish_date, price, link, drawn')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as WishRow[]).map(r => rowToWish(r, names));
}

export async function createWish(fromId: string, w: { wish: string; date: string; price?: string; link?: string }) {
  return supabase.from('wishes').insert({
    from_profile_id: fromId, wish: w.wish, wish_date: w.date, price: w.price || null, link: w.link || null,
  });
}

export async function drawWishRow(id: string) {
  return supabase.from('wishes').update({ drawn: true }).eq('id', id);
}

export async function deleteWishRow(id: string) {
  return supabase.from('wishes').delete().eq('id', id);
}
