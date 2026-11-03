// Picks black-ish or white text for a user-chosen background colour so chip
// labels stay readable whatever colour was picked (WCAG relative luminance).
export function readableText(bg: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(bg.trim());
  if (!m) return 'white';
  const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const whiteContrast = 1.05 / (L + 0.05);
  return whiteContrast >= 4.5 ? 'white' : '#241318';
}
