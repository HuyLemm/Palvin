import { supabase } from './lib/supabaseClient';
import type { Capsule, User } from './types';

type ProfileNames = Record<string, User>;

interface CapsuleRow {
  id: string;
  from_profile_id: string;
  to_profile_id: string | null;
  title: string;
  occasion: string | null;
  message: string;
  unlock_date: string;
  opened: boolean;
  created_date: string;
}

function rowToCapsule(row: CapsuleRow, names: ProfileNames, myName: string, partnerName: string): Capsule {
  return {
    id: row.id,
    from: names[row.from_profile_id] ?? myName,
    to: row.to_profile_id ? (names[row.to_profile_id] ?? partnerName) : 'both',
    title: row.title,
    occasion: row.occasion ?? undefined,
    message: row.message,
    unlockDate: row.unlock_date,
    opened: row.opened,
    createdDate: row.created_date,
  };
}

export async function fetchCapsules(names: ProfileNames, myName: string, partnerName: string): Promise<Capsule[]> {
  const { data, error } = await supabase
    .from('capsules')
    .select('id, from_profile_id, to_profile_id, title, occasion, message, unlock_date, opened, created_date')
    .order('unlock_date', { ascending: true });
  if (error || !data) return [];
  return (data as CapsuleRow[]).map(r => rowToCapsule(r, names, myName, partnerName));
}

export async function createCapsule(fromId: string, toId: string | null, title: string, occasion: string | undefined, message: string, unlockDate: string) {
  return supabase.from('capsules').insert({ from_profile_id: fromId, to_profile_id: toId, title, occasion: occasion || null, message, unlock_date: unlockDate });
}

export async function openCapsuleRow(id: string) {
  return supabase.from('capsules').update({ opened: true }).eq('id', id);
}

export async function updateCapsuleRow(id: string, toId: string | null, title: string, occasion: string | undefined, message: string, unlockDate: string) {
  return supabase.from('capsules').update({ to_profile_id: toId, title, occasion: occasion || null, message, unlock_date: unlockDate }).eq('id', id);
}

export async function deleteCapsuleRow(id: string) {
  return supabase.from('capsules').delete().eq('id', id);
}
