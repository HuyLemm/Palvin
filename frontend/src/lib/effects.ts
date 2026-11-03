// Small, dependency-free delight helpers. Both are no-ops for people who
// asked their OS for reduced motion.
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Short vibration on devices that support it (Android; iOS ignores it). */
export function haptic(ms = 12) {
  try { if (!reducedMotion()) navigator.vibrate?.(ms); } catch { /* unsupported */ }
}

/**
 * Floats a few small hearts/petals up from the centre of `el` (or a point).
 * Pure DOM + CSS (`heartFloat` in index.css) so it never triggers a React
 * re-render, and cleans itself up.
 */
export function burstHearts(
  from: HTMLElement | { x: number; y: number },
  glyphs: string[] = ['\u{1F497}', '\u{1F338}', '\u{1F495}', '✨'],
  count = 7,
) {
  if (reducedMotion() || typeof document === 'undefined') return;
  let x: number, y: number;
  if (from instanceof HTMLElement) {
    const r = from.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  } else { x = from.x; y = from.y; }

  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.textContent = glyphs[i % glyphs.length];
    s.setAttribute('aria-hidden', 'true');
    const dx = (Math.random() - 0.5) * 90;
    const rise = 70 + Math.random() * 60;
    const size = 14 + Math.random() * 10;
    s.style.cssText =
      `position:fixed;left:${x}px;top:${y}px;z-index:9999;pointer-events:none;` +
      `font-size:${size}px;line-height:1;will-change:transform,opacity;` +
      `--dx:${dx}px;--rise:-${rise}px;animation:heartFloat ${0.9 + Math.random() * 0.5}s ease-out ${i * 0.04}s forwards;`;
    s.style.opacity = '0';
    document.body.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
    setTimeout(() => s.remove(), 2200);
  }
}
