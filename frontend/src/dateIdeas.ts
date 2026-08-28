import { supabase } from './lib/supabaseClient';
import type { DateIdea, DateIdeaDraw } from './types';

interface DateIdeaRow {
  id: string;
  emoji: string;
  text: string;
}

export async function fetchDateIdeas(): Promise<DateIdea[]> {
  const { data, error } = await supabase
    .from('date_ideas')
    .select('id, emoji, text')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as DateIdeaRow[];
}

export async function createDateIdea(addedByProfileId: string, idea: { emoji: string; text: string }) {
  return supabase.from('date_ideas').insert({ added_by_profile_id: addedByProfileId, emoji: idea.emoji, text: idea.text });
}

export async function deleteDateIdeaRow(id: string) {
  return supabase.from('date_ideas').delete().eq('id', id);
}

export async function fetchDateIdeaHistory(): Promise<DateIdeaDraw[]> {
  const { data, error } = await supabase
    .from('date_idea_draws')
    .select('id, emoji, text')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error || !data) return [];
  return data as DateIdeaDraw[];
}

export async function recordDateIdeaDraw(drawnByProfileId: string, idea: { emoji: string; text: string }) {
  return supabase.from('date_idea_draws').insert({ drawn_by_profile_id: drawnByProfileId, emoji: idea.emoji, text: idea.text });
}
