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

export async function updateDateIdeaRow(id: string, idea: { emoji: string; text: string }) {
  return supabase.from('date_ideas').update({ emoji: idea.emoji, text: idea.text }).eq('id', id);
}

export async function deleteDateIdeaRow(id: string) {
  return supabase.from('date_ideas').delete().eq('id', id);
}

// The 20 built-in ideas, seeded per-couple into date_idea_presets the first
// time fetchDateIdeaPresets sees zero rows for them (see below) — this array
// is only ever read from here, at seed time.
const DEFAULT_PRESETS: { emoji: string; text: string }[] = [
  { emoji: '🍜', text: 'Try a noodle place neither of you has been to' },
  { emoji: '🎬', text: 'Movie night at home, phones off for real' },
  { emoji: '🌅', text: 'Wake up early and watch the sunrise together' },
  { emoji: '🧁', text: 'Bake something together, even if it flops' },
  { emoji: '🚲', text: 'Go for a bike ride with no destination' },
  { emoji: '📷', text: 'Wander the streets taking random photos' },
  { emoji: '☕', text: 'Spend a whole slow morning at a coffee shop' },
  { emoji: '🎮', text: 'Play a board game or video game together' },
  { emoji: '🌿', text: 'Visit a flower market and get a new plant' },
  { emoji: '🛁', text: 'At-home spa night — face masks, soft music, candles' },
  { emoji: '🎨', text: 'Paint something together (doesn\'t have to be good)' },
  { emoji: '🎵', text: 'Each pick 5 songs and listen together' },
  { emoji: '🌙', text: 'Sit outside and stargaze in the evening' },
  { emoji: '📖', text: 'Read together at a cozy spot' },
  { emoji: '🍕', text: 'Make homemade pizza' },
  { emoji: '💌', text: 'Write each other letters and read them together' },
  { emoji: '🎤', text: 'Karaoke at home, as loud as you want' },
  { emoji: '🏊', text: 'Go for an early morning swim' },
  { emoji: '🌸', text: 'Watch the sunset from somewhere high up' },
  { emoji: '🎪', text: 'Wander the mall without buying anything' },
];

export async function fetchDateIdeaPresets(): Promise<DateIdea[]> {
  const { data, error } = await supabase
    .from('date_idea_presets')
    .select('id, emoji, text')
    .order('created_at', { ascending: true });
  if (error) return [];
  if (data && data.length > 0) return data as DateIdeaRow[];

  // First time this couple has ever hit this table — seed their own copy of
  // the default catalog once, so it's editable/deletable from here on.
  const { error: seedError } = await supabase.from('date_idea_presets').insert(DEFAULT_PRESETS);
  if (seedError) return [];
  const { data: seeded } = await supabase
    .from('date_idea_presets')
    .select('id, emoji, text')
    .order('created_at', { ascending: true });
  return (seeded as DateIdeaRow[] | null) ?? [];
}

export async function updateDateIdeaPresetRow(id: string, idea: { emoji: string; text: string }) {
  return supabase.from('date_idea_presets').update({ emoji: idea.emoji, text: idea.text }).eq('id', id);
}

export async function deleteDateIdeaPresetRow(id: string) {
  return supabase.from('date_idea_presets').delete().eq('id', id);
}

export async function fetchDateIdeaHistory(): Promise<DateIdeaDraw[]> {
  const { data, error } = await supabase
    .from('date_idea_draws')
    .select('id, emoji, text')
    // Only ever show the 3 most recent draws — an older one silently drops
    // off the list the moment a new one is recorded.
    .order('created_at', { ascending: false })
    .limit(3);
  if (error || !data) return [];
  return data as DateIdeaDraw[];
}

export async function recordDateIdeaDraw(drawnByProfileId: string, idea: { emoji: string; text: string }) {
  return supabase.from('date_idea_draws').insert({ drawn_by_profile_id: drawnByProfileId, emoji: idea.emoji, text: idea.text });
}
