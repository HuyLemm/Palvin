// Search should find "cafe" in "Cà phê" and "dat" in "Đà Lạt": lower-case and strip accents
// (including Vietnamese đ) from both the query and the text before comparing.
export const fold = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

/** True when every word of the query appears somewhere in the haystack (order does not matter). */
export function matchesAll(query: string, ...fields: (string | null | undefined)[]): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const hay = fields.map(fold).join(' ');
  return words.every(w => hay.includes(w));
}
