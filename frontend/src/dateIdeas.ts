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
  { emoji: '🍜', text: 'Thử một quán mì mới chưa đến bao giờ' },
  { emoji: '🎬', text: 'Xem phim tại nhà, tắt điện thoại hẳn' },
  { emoji: '🌅', text: 'Dậy sớm xem bình minh cùng nhau' },
  { emoji: '🧁', text: 'Làm bánh cùng nhau, dù có thất bại' },
  { emoji: '🚲', text: 'Đạp xe không cần điểm đến' },
  { emoji: '📷', text: 'Đi chụp ảnh phố phường, random' },
  { emoji: '☕', text: 'Ngồi cà phê cả buổi sáng, không vội' },
  { emoji: '🎮', text: 'Chơi board game hoặc video game cùng nhau' },
  { emoji: '🌿', text: 'Đi chợ hoa, mua một chậu cây mới' },
  { emoji: '🛁', text: 'Spa tại nhà — mặt nạ, nhạc nhẹ, nến thơm' },
  { emoji: '🎨', text: 'Cùng vẽ tranh (không cần đẹp)' },
  { emoji: '🎵', text: 'Mỗi người chọn 5 bài hát, nghe cùng nhau' },
  { emoji: '🌙', text: 'Ra ban công ngắm sao buổi tối' },
  { emoji: '📖', text: 'Đọc sách cùng nhau ở một quán ổn' },
  { emoji: '🍕', text: 'Tự làm pizza tại nhà' },
  { emoji: '💌', text: 'Viết thư tay cho nhau, đọc cùng lúc' },
  { emoji: '🎤', text: 'Hát karaoke tại nhà, to hết cỡ' },
  { emoji: '🏊', text: 'Đi bơi buổi sáng sớm' },
  { emoji: '🌸', text: 'Ngắm hoàng hôn ở một điểm cao' },
  { emoji: '🎪', text: 'Đi dạo trung tâm thương mại không mua gì' },
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
