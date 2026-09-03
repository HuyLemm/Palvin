import { supabase } from './lib/supabaseClient';
import type { StoryQuote } from './types';

interface StoryQuoteRow {
  id: string;
  text: string;
}

export async function fetchStoryQuotes(): Promise<StoryQuote[]> {
  const { data, error } = await supabase
    .from('story_quotes')
    .select('id, text')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data as StoryQuoteRow[];
}

export async function createStoryQuote(text: string) {
  return supabase.from('story_quotes').insert({ text });
}

export async function updateStoryQuoteRow(id: string, text: string) {
  return supabase.from('story_quotes').update({ text }).eq('id', id);
}

export async function deleteStoryQuoteRow(id: string) {
  return supabase.from('story_quotes').delete().eq('id', id);
}
