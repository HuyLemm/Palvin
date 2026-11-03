// Suggests an expense category from what the user typed ("đổ xăng", "cafe với paoi"...).
// Suggestion only — the form never changes the category by itself.
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

// category label (as in the default categories) -> keywords, matched as whole words/phrases
const KEYWORDS: Record<string, string[]> = {
  Coffee: ['cafe', 'ca phe', 'coffee', 'tra sua', 'matcha', 'tra dao', 'starbucks', 'highlands', 'phuc long', 'nuoc ep', 'sinh to'],
  Food: ['an', 'com', 'pho', 'bun', 'banh', 'mi', 'lau', 'nuong', 'quan', 'nha hang', 'an sang', 'an trua', 'an toi', 'an vat', 'dinner', 'lunch', 'breakfast', 'food', 'pizza', 'burger', 'buffet', 'hotpot', 'bbq', 'kem', 'sieu thi', 'bim bim'],
  Transportation: ['xang', 'do xang', 'grab', 'xe', 'taxi', 'gui xe', 'giu xe', 'rua xe', 'thay nhot', 'sua xe', 'bus', 'metro', 'gas', 'fuel', 'parking', 've xe'],
  Travel: ['may bay', 'khach san', 'hotel', 'homestay', 'du lich', 'tour', 'resort', 've tau', 'flight', 'bay'],
  Entertainment: ['phim', 'xem phim', 'cgv', 'game', 'karaoke', 'bida', 'concert', 'netflix', 'spotify', 'nhac', 'billiards'],
  Gifts: ['qua', 'tang', 'hoa', 'sinh nhat', 'gift', 'birthday', 'nhan'],
  Home: ['tien nha', 'thue nha', 'wifi', 'internet', 'dien nuoc', 'tien dien', 'tien nuoc', 'noi that', 'rent', 'sua nha'],
};

export function suggestCategory<T extends { label: string }>(title: string, categories: T[]): T | null {
  const text = ` ${norm(title).replace(/[^a-z0-9]+/g, ' ').trim()} `;
  if (text.trim() === '') return null;
  let best: { cat: T; score: number } | null = null;
  for (const cat of categories) {
    const key = Object.keys(KEYWORDS).find(k => k.toLowerCase() === cat.label.toLowerCase());
    if (!key) continue;
    // longer phrases are more specific, so they count more
    const score = KEYWORDS[key].reduce((n, kw) => n + (text.includes(` ${kw} `) ? kw.split(' ').length : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { cat, score };
  }
  return best ? best.cat : null;
}
