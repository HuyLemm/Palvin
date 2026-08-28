import { supabase } from './lib/supabaseClient';
import type { Capsule, User } from './types';

type ProfileNames = Record<string, User>;

interface CapsuleRow {
  id: string;
  from_profile_id: string;
  to_profile_id: string | null;
  message: string;
  unlock_date: string;
  opened: boolean;
  created_date: string;
}

function rowToCapsule(row: CapsuleRow, names: ProfileNames): Capsule {
  return {
    id: row.id,
    from: names[row.from_profile_id] ?? 'Alvin',
    to: row.to_profile_id ? (names[row.to_profile_id] ?? 'Paoi') : 'both',
    message: row.message,
    unlockDate: row.unlock_date,
    opened: row.opened,
    createdDate: row.created_date,
  };
}

export async function fetchCapsules(names: ProfileNames): Promise<Capsule[]> {
  const { data, error } = await supabase
    .from('capsules')
    .select('id, from_profile_id, to_profile_id, message, unlock_date, opened, created_date')
    .order('unlock_date', { ascending: true });
  if (error || !data) return [];
  return (data as CapsuleRow[]).map(r => rowToCapsule(r, names));
}

export async function createCapsule(fromId: string, toId: string | null, message: string, unlockDate: string) {
  return supabase.from('capsules').insert({ from_profile_id: fromId, to_profile_id: toId, message, unlock_date: unlockDate });
}

export async function openCapsuleRow(id: string) {
  return supabase.from('capsules').update({ opened: true }).eq('id', id);
}
