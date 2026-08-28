import { supabase } from './lib/supabaseClient';

export async function createHug(fromProfileId: string, message: string) {
  return supabase.from('hugs').insert({ from_profile_id: fromProfileId, message });
}
