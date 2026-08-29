import type { CSSProperties } from 'react';
import { EMOJI_ICON_MAP } from '../lib/emojiIcons';

// Drop-in replacement for rendering a raw emoji glyph: looks up the matching
// Lucide icon and renders that instead. Falls back to the emoji itself if a
// glyph has no mapping yet, so nothing ever silently disappears.
export default function Icon({ emoji, size = 16, className, style, strokeWidth = 2 }: {
  emoji: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}) {
  const Glyph = EMOJI_ICON_MAP[emoji];
  if (!Glyph) return <span className={className} style={style}>{emoji}</span>;
  return <Glyph size={size} className={className} style={style} strokeWidth={strokeWidth} />;
}
