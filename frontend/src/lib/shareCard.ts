export interface ShareableMemory { title: string; date: string; location?: string; description?: string; image?: string }

export type ShareResult = 'shared' | 'saved' | 'copied' | 'cancelled' | 'failed';

const W = 1080, H = 1350;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && cur) { lines.push(cur); cur = w; } else cur = next;
    if (lines.length === maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

/** Draws the memory as a 4:5 card (photo, title, date, place, PALVIN mark). Rejects if the photo can't be read (CORS). */
export async function renderMemoryCard(m: ShareableMemory): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#FFF0F4'); bg.addColorStop(1, '#F3E3F5');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const PHOTO = { x: 60, y: 60, w: W - 120, h: 820 };
  if (m.image) {
    const res = await fetch(m.image, { mode: 'cors' });
    if (!res.ok) throw new Error('image');
    const bmp = await createImageBitmap(await res.blob());
    const s = Math.max(PHOTO.w / bmp.width, PHOTO.h / bmp.height);
    ctx.save();
    ctx.beginPath(); ctx.roundRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h, 36); ctx.clip();
    ctx.drawImage(bmp, PHOTO.x + (PHOTO.w - bmp.width * s) / 2, PHOTO.y + (PHOTO.h - bmp.height * s) / 2, bmp.width * s, bmp.height * s);
    ctx.restore();
  }

  ctx.fillStyle = '#332A2D';
  ctx.font = '700 64px "Playfair Display", Georgia, serif';
  const lines = wrap(ctx, m.title, W - 120, 2);
  lines.forEach((l, i) => ctx.fillText(l, 60, 975 + i * 76));
  const y2 = 975 + lines.length * 76 + 10;
  ctx.fillStyle = '#6F5F65';
  ctx.font = '500 36px Nunito, system-ui, sans-serif';
  ctx.fillText([m.date, m.location].filter(Boolean).join('  ·  '), 60, y2 + 20);
  ctx.fillStyle = '#A83F5F';
  ctx.font = '700 34px "Playfair Display", Georgia, serif';
  ctx.fillText('PALVIN', 60, H - 60);

  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('blob'))), 'image/png'));
}

/** Share the card (or, when the photo can't be drawn, just the text). Falls back to saving the PNG / copying text. */
export async function shareMemory(m: ShareableMemory): Promise<ShareResult> {
  const text = [m.title, [m.date, m.location].filter(Boolean).join(' · '), m.description].filter(Boolean).join('\n');
  try {
    let blob: Blob | null = null;
    try { blob = await renderMemoryCard(m); } catch { blob = null; }
    if (blob) {
      const file = new File([blob], 'palvin-memory.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: m.title, text: m.title });
        return 'shared';
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'palvin-memory.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return 'saved';
    }
    if (navigator.share) { await navigator.share({ title: m.title, text }); return 'shared'; }
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
    try { await navigator.clipboard.writeText(text); return 'copied'; } catch { return 'failed'; }
  }
}
