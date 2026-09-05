import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { removeBackground, preload, type Config as BgRemovalConfig } from '@imgly/background-removal';
import { useApp } from '../context';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';

const ONLINE_WINDOW_MS = 2 * 60000;
function isOnline(iso: string | null | undefined): boolean {
  return !!iso && Date.now() - new Date(iso).getTime() < ONLINE_WINDOW_MS;
}

// Messenger-style presence line: "Active now" while inside the online
// window, otherwise "Active <n> ago" counting up from their last activity.
function formatPresence(iso: string | null | undefined): string {
  if (!iso) return 'Offline';
  if (isOnline(iso)) return 'Active now';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `Active ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Active ${days}d ago`;
  return `Active ${new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: diffDays < 7 ? 'long' : undefined, day: 'numeric', month: 'long' });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDuration(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function pickAudioMime(): string {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  for (const candidate of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return '';
}

function AudioBubble({ src, duration, mine }: { src: string; duration: number | null; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 150 }}>
      <button
        onClick={e => { e.stopPropagation(); const el = audioRef.current; if (!el) return; if (playing) el.pause(); else el.play(); }}
        style={{
          width: 28, height: 28, borderRadius: '50%', border: 'none', flexShrink: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: mine ? 'rgba(255,255,255,0.25)' : 'var(--sakura-light)', color: mine ? 'white' : 'var(--sakura-deep)',
        }}
      >
        <Icon emoji={playing ? '⏸️' : '▶️'} size={13} />
      </button>
      <div style={{ flex: 1, height: 3, borderRadius: 99, background: mine ? 'rgba(255,255,255,0.35)' : 'var(--border)' }} />
      <span style={{ fontSize: 11, opacity: 0.85, flexShrink: 0 }}>{duration != null ? formatDuration(duration) : ''}</span>
      <audio ref={audioRef} src={src} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} style={{ display: 'none' }} />
    </div>
  );
}

// Cross-fades in once the bitmap actually arrives instead of popping in
// mid-paint — a plain gray background shows through until then, since the
// natural (unknown ahead of time) aspect ratio rules out a shimmer box
// reserving the right size up front the way FadeImage does elsewhere.
function ChatImage({ src, pending }: { src: string; pending?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // context.tsx preloads every chat image up front — if this one's already
  // sitting in the browser's cache, `complete` is true before the first
  // paint, so catching it here (before paint) skips the fade-in rather than
  // still visibly waiting out a 300ms transition for nothing.
  useLayoutEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [src]);
  return (
    <img
      ref={imgRef}
      src={src}
      alt=""
      onLoad={() => setLoaded(true)}
      style={{
        // width (not max-width) fills whatever the flex-item wrapper resolves
        // to — see the caller: a raw camera photo's own intrinsic pixel width
        // (often 3000px+) otherwise wins the flex sizing pass before a
        // percentage max-width here ever gets a chance to apply, overflowing
        // the row and reading as the bubble sitting off on the wrong side.
        width: '100%', height: 'auto', borderRadius: 16, display: 'block', background: 'var(--border)',
        opacity: pending ? 0.6 : loaded ? 1 : 0, transition: 'opacity 0.3s ease',
      }}
    />
  );
}

// A grid tile for a sticker thumbnail. Deliberately NOT the more obvious
// `aspectRatio: '1'` box + `<img width="100%" height="100%" objectFit="cover">`
// — that combination clips fine for ordinary photos, but on iOS Safari an
// *animated* image (Klipy's stickers are animated gif/webp) ignores the
// percentage height and paints at its own intrinsic size, so tiles bleed
// into the row below and the grid looks like a pile of overlapping stickers.
// The classic padding-top trick sidesteps it: the image is absolutely
// positioned inside a box whose size is fixed by layout before the image
// ever needs to report an intrinsic size, so there's nothing for it to
// ignore.
function StickerTile({ src, onClick }: { src: string; onClick: () => void }) {
  return (
    <button className="sticker-tile" onClick={onClick} style={{ display: 'block', width: '100%', padding: 0, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg)', cursor: 'pointer', overflow: 'hidden' }}>
      <div style={{ position: 'relative', width: '100%', paddingTop: '100%' }}>
        <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    </button>
  );
}

// A topic/pack tile (Messenger-style sticker store browsing) — same tile
// shape as StickerTile plus a caption naming the topic.
function CategoryTile({ label, previewUrl, onClick }: { label: string; previewUrl: string; onClick: () => void }) {
  return (
    <button className="sticker-tile" onClick={onClick} style={{ display: 'block', width: '100%', padding: 0, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg)', cursor: 'pointer', overflow: 'hidden' }}>
      <div style={{ position: 'relative', width: '100%', paddingTop: '100%' }}>
        <img src={previewUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '10px 6px 5px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', color: 'white', fontSize: 11, fontWeight: 700, textTransform: 'capitalize', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      </div>
    </button>
  );
}

// Turning an arbitrary photo into a sticker means cutting the subject out
// onto a transparent background, not just cropping the rectangle — see the
// "Ours" tab. Background removal itself runs entirely on-device (no photo
// ever leaves the phone) via @imgly/background-removal; this just takes its
// transparent-background result (same pixel size as the input, subject
// somewhere inside it) and turns that into a tight, centered square sticker
// by trimming to the subject's own opaque bounding box and padding it onto
// a square transparent canvas.
//
// 'isnet_quint8' (~40MB) instead of the ~80MB default model — quantized, so
// it downloads and runs faster; this is a couple's sticker maker, not a
// professional photo editor, so the occasional rougher edge is a fine trade.
// Assets are fetched from IMG.LY's CDN and cached by the browser afterward,
// so only the very first cutout (per device) pays the download cost.
const BG_REMOVAL_CONFIG: BgRemovalConfig = { model: 'isnet_quint8' };
const STICKER_OUTPUT = 480;
async function loadImageBitmap(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function cutoutToSquareSticker(cutout: Blob): Promise<Blob> {
  const img = await loadImageBitmap(cutout);
  const w = img.naturalWidth, h = img.naturalHeight;
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = w;
  srcCanvas.height = h;
  const sctx = srcCanvas.getContext('2d')!;
  sctx.drawImage(img, 0, 0);
  const { data } = sctx.getImageData(0, 0, w, h);
  // Scanning every pixel's alpha for the bounding box of the actual subject
  // — a stride of 3 keeps this fast on large camera photos while still
  // landing within a pixel or two of the true edge, plenty for a sticker.
  const STRIDE = 3;
  let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < h; y += STRIDE) {
    for (let x = 0; x < w; x += STRIDE) {
      if (data[(y * w + x) * 4 + 3] > 10) {
        found = true;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) { minX = 0; minY = 0; maxX = w - 1; maxY = h - 1; }
  const boxW = maxX - minX + 1, boxH = maxY - minY + 1;
  const longest = Math.max(boxW, boxH) * 1.16; // headroom so the subject doesn't touch the edges
  const scale = STICKER_OUTPUT / longest;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = STICKER_OUTPUT;
  outCanvas.height = STICKER_OUTPUT;
  const octx = outCanvas.getContext('2d')!;
  octx.drawImage(
    srcCanvas, minX, minY, boxW, boxH,
    (STICKER_OUTPUT - boxW * scale) / 2, (STICKER_OUTPUT - boxH * scale) / 2, boxW * scale, boxH * scale,
  );
  const result: Blob | null = await new Promise(resolve => outCanvas.toBlob(resolve, 'image/png'));
  return result ?? cutout;
}

type KlipyResult = { id: string; url: string; thumbnail: string };

// Klipy is Tenor's near-identical successor after Google shut Tenor's API
// down — see backend/supabase/functions/klipy-search. Verified against a
// real response: each item is `{ id, slug, title, file: { hd|md|sm|xs: {
// gif|webp|webm|png: { url, width, height, size } } } }` — a size tier
// (resolution) containing multiple format options, not a single url/
// thumbnail pair. `<img>` renders animated gif/webp natively, so either
// works as the src; gif is picked first for the widest compatibility.
function pickFormatUrl(sizeTier: Record<string, { url?: string }> | undefined): string | undefined {
  return sizeTier?.gif?.url ?? sizeTier?.webp?.url ?? sizeTier?.png?.url;
}

function parseKlipyResults(json: unknown): KlipyResult[] {
  const root = json as { data?: { data?: unknown[] } };
  const items = root?.data?.data;
  if (!Array.isArray(items)) return [];
  return items.map((raw): KlipyResult | null => {
    const item = raw as { id?: number | string; file?: { hd?: Record<string, { url?: string }>; md?: Record<string, { url?: string }>; sm?: Record<string, { url?: string }> } };
    const url = pickFormatUrl(item.file?.md) ?? pickFormatUrl(item.file?.hd) ?? pickFormatUrl(item.file?.sm);
    const thumbnail = pickFormatUrl(item.file?.sm) ?? url;
    if (!url || item.id == null) return null;
    return { id: String(item.id), url, thumbnail: thumbnail ?? url };
  }).filter((r): r is KlipyResult => r !== null);
}

// Klipy's "categories" endpoint is a curated list of topic tiles (name +
// preview thumbnail + a `query` string) — not stickers themselves. Browsing
// a topic means feeding its `query` back into the ordinary search endpoint.
type KlipyCategory = { category: string; query: string; previewUrl: string };
function parseKlipyCategories(json: unknown): KlipyCategory[] {
  const root = json as { data?: { categories?: unknown[] } };
  const items = root?.data?.categories;
  if (!Array.isArray(items)) return [];
  return items.map((raw): KlipyCategory | null => {
    const item = raw as { category?: string; query?: string; preview_url?: string };
    if (!item.category || !item.query || !item.preview_url) return null;
    return { category: item.category, query: item.query, previewUrl: item.preview_url };
  }).filter((c): c is KlipyCategory => c !== null);
}

// Chat wallpaper is a personal display preference (like WhatsApp's per-chat
// wallpaper), not couple data — kept in localStorage per profile so picking
// one never affects what the partner sees on their own device.
const CHAT_THEMES: { key: string; label: string; background: string }[] = [
  { key: 'default',  label: 'Default',  background: 'var(--bg)' },
  { key: 'sakura',   label: 'Sakura',   background: 'linear-gradient(160deg, #FFF0F5, #FCE4EF)' },
  { key: 'sky',      label: 'Sky',      background: 'linear-gradient(160deg, #EAF4FF, #DCEBFC)' },
  { key: 'mint',     label: 'Mint',     background: 'linear-gradient(160deg, #EAFBF3, #DBF3E8)' },
  { key: 'lavender', label: 'Lavender', background: 'linear-gradient(160deg, #F3EEFC, #E8DFF7)' },
  { key: 'night',    label: 'Night',    background: 'linear-gradient(160deg, #232030, #2E2A3E)' },
];
function chatThemeKey(profileId: string) { return `palvin_chat_theme_${profileId}`; }

// Recently-used stickers — like the chat theme above, this is a per-device
// display convenience (not couple data), tracking both "Ours" and topic
// stickers so whichever the account actually reaches for surfaces on the
// first tab instead of a separate emoji-picker no one used once real
// stickers existed.
const RECENT_STICKERS_MAX = 16;
function recentStickersKey(profileId: string) { return `palvin_recent_stickers_${profileId}`; }

interface Props { onBack: () => void; }

export default function Chat({ onBack }: Props) {
  const { state, screen, myProfile, partnerProfile, sendChatMessage, markChatRead, uploadChatMedia, addCustomSticker, removeCustomSticker, sendTypingSignal } = useApp();
  const messages = state.chatMessages;
  const partnerName = partnerProfile?.displayName ?? 'Partner';
  const [text, setText] = useState('');
  const [sendingMedia, setSendingMedia] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [stickerTab, setStickerTab] = useState<'recent' | 'ours' | 'search'>('recent');
  const [recentStickers, setRecentStickers] = useState<string[]>(() => {
    if (!myProfile?.id) return [];
    try {
      const raw = localStorage.getItem(recentStickersKey(myProfile.id));
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch { return []; }
  });
  const [customStickerUploading, setCustomStickerUploading] = useState(false);
  const customStickerInputRef = useRef<HTMLInputElement>(null);
  // 'idle' -> nothing to show. 'processing' -> background removal running.
  // 'preview' -> cutout ready, waiting on Cancel/Use. 'error' -> it failed.
  const [importStage, setImportStage] = useState<'idle' | 'processing' | 'preview' | 'error'>('idle');
  const [importPreviewUrl, setImportPreviewUrl] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const importBlobRef = useRef<Blob | null>(null);
  const bgRemovalPreloadedRef = useRef(false);
  const [klipyQuery, setKlipyQuery] = useState('');
  const [klipyResults, setKlipyResults] = useState<KlipyResult[]>([]);
  const [klipyLoading, setKlipyLoading] = useState(false);
  const [klipyFailed, setKlipyFailed] = useState(false);
  const [klipyCategories, setKlipyCategories] = useState<KlipyCategory[]>([]);
  const [klipyCategoriesLoading, setKlipyCategoriesLoading] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [chatThemeKeyValue, setChatThemeKeyValue] = useState(() => {
    if (!myProfile?.id) return 'default';
    try { return localStorage.getItem(chatThemeKey(myProfile.id)) ?? 'default'; } catch { return 'default'; }
  });
  const chatBackground = CHAT_THEMES.find(t => t.key === chatThemeKeyValue)?.background ?? 'var(--bg)';
  function pickChatTheme(key: string) {
    setChatThemeKeyValue(key);
    setShowThemePicker(false);
    if (myProfile?.id) { try { localStorage.setItem(chatThemeKey(myProfile.id), key); } catch { /* ignore */ } }
  }
  // Only while the keyboard is actually up (input focused) does the input
  // bar use its own tunable .chat-input-bar padding — closed, it behaves
  // exactly like the shared .app-bottom-nav everywhere else in the app.
  const [inputFocused, setInputFocused] = useState(false);
  // Which message's timestamp is currently revealed by a tap — the last
  // message you sent always shows its own regardless of this.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Bubbles present at first render (the initial history fetch) render
  // as-is — only ones added afterward (sent, or arriving live) play the
  // fade/slide-in, so reopening a long thread doesn't animate all of them
  // in at once.
  const settledKeysRef = useRef<Set<string> | null>(null);
  if (settledKeysRef.current === null) {
    settledKeysRef.current = new Set(messages.map(m => m.clientKey ?? m.id));
  }

  // Real devices only — the desktop mockup frame has no on-screen keyboard to
  // make way for, and forcing this height there would blow past the phone
  // frame and fill the whole browser window instead.
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  // The last real on-screen-keyboard height this device showed — remembered
  // (not just read live) because by the time the sticker panel needs it the
  // keyboard has already closed and visualViewport is back to full height.
  // Sizing the sticker panel to match keeps swapping between "typing" and
  // "picking a sticker" from visibly jumping the messages list. 320px is a
  // reasonable guess for before the keyboard has ever been seen this visit.
  const keyboardHeightRef = useRef(320);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !window.matchMedia('(max-width: 480px)').matches) return;
    const update = () => {
      setViewportHeight(vv.height);
      const kb = window.innerHeight - vv.height;
      if (kb > 80) keyboardHeightRef.current = kb;
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);

  // Chat stays mounted (just hidden) once opened — see App.tsx's keep-alive
  // overlay — so this needs to re-fire on every return visit, not just the
  // first-ever mount, to mark newly-arrived messages read and land back at
  // the bottom of the thread.
  useEffect(() => {
    if (screen !== 'chat') return;
    markChatRead();
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [screen, markChatRead]);

  // Keyboard opening/closing (or the tab becoming visible again) snaps to
  // the bottom instantly — an animated scroll racing the keyboard's own
  // slide would look laggy. A genuinely new message, though, eases in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [viewportHeight]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, state.partnerTyping]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendChatMessage({ text: trimmed });
    setText('');
    sendTypingSignal(false);
    inputRef.current?.focus();
  };

  const handleTextChange = (value: string) => {
    setText(value);
    sendTypingSignal(value.trim().length > 0);
  };

  const sendHeart = () => sendChatMessage({ text: '❤️' });

  const handleSendStickerImage = (url: string) => {
    sendChatMessage({ stickerImageUrl: url });
    setShowStickers(false);
    setRecentStickers(prev => {
      const next = [url, ...prev.filter(u => u !== url)].slice(0, RECENT_STICKERS_MAX);
      if (myProfile?.id) { try { localStorage.setItem(recentStickersKey(myProfile.id), JSON.stringify(next)); } catch { /* ignore */ } }
      return next;
    });
  };

  const openStickerImport = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setImportStage('processing');
    setImportProgress(null);
    try {
      const cutout = await removeBackground(file, {
        ...BG_REMOVAL_CONFIG,
        progress: (_key, current, total) => setImportProgress(total > 0 ? Math.round((current / total) * 100) : null),
      });
      const sticker = await cutoutToSquareSticker(cutout);
      importBlobRef.current = sticker;
      setImportPreviewUrl(URL.createObjectURL(sticker));
      setImportStage('preview');
    } catch {
      setImportStage('error');
    }
  };

  const cancelStickerImport = () => {
    if (importPreviewUrl) URL.revokeObjectURL(importPreviewUrl);
    importBlobRef.current = null;
    setImportPreviewUrl(null);
    setImportStage('idle');
  };

  const confirmStickerImport = async () => {
    const blob = importBlobRef.current;
    cancelStickerImport();
    if (!blob) return;
    setCustomStickerUploading(true);
    await addCustomSticker(new File([blob], 'sticker.png', { type: 'image/png' }));
    setCustomStickerUploading(false);
  };

  // Debounced Klipy search — an empty query shows topic tiles instead (see
  // the categories effect below), so this only runs once there's something
  // to actually search for (typed, or a tapped topic's query string).
  useEffect(() => {
    if (stickerTab !== 'search' || !klipyQuery.trim()) { setKlipyResults([]); setKlipyLoading(false); setKlipyFailed(false); return; }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!supabaseUrl) { setKlipyFailed(true); return; }
    setKlipyLoading(true);
    setKlipyFailed(false);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/klipy-search?q=${encodeURIComponent(klipyQuery.trim())}`, { signal: controller.signal });
        const json = await res.json();
        const results = parseKlipyResults(json);
        setKlipyResults(results);
        setKlipyFailed(results.length === 0);
      } catch {
        setKlipyResults([]);
        setKlipyFailed(true);
      } finally {
        setKlipyLoading(false);
      }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [stickerTab, klipyQuery]);

  // Topic tiles (Messenger-style sticker packs) — fetched once per session,
  // not re-fetched every time the Search tab reopens.
  useEffect(() => {
    if (stickerTab !== 'search' || klipyCategories.length > 0 || klipyCategoriesLoading) return;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!supabaseUrl) return;
    setKlipyCategoriesLoading(true);
    (async () => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/klipy-search?mode=categories`);
        const json = await res.json();
        setKlipyCategories(parseKlipyCategories(json));
      } catch {
        // Topic tiles just stay empty — typing a search still works.
      } finally {
        setKlipyCategoriesLoading(false);
      }
    })();
  }, [stickerTab, klipyCategories.length, klipyCategoriesLoading]);

  // Warm the background-removal model/wasm as soon as the "Ours" tab opens
  // (a decent signal they're about to add a photo), so by the time they've
  // actually picked one, the ~40MB one-time download is already underway or
  // done instead of only starting after they tap +.
  useEffect(() => {
    if (stickerTab !== 'ours' || bgRemovalPreloadedRef.current) return;
    bgRemovalPreloadedRef.current = true;
    preload(BG_REMOVAL_CONFIG).catch(() => { bgRemovalPreloadedRef.current = false; });
  }, [stickerTab]);

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSendingMedia(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const url = await uploadChatMedia(file, ext);
    setSendingMedia(false);
    if (url) sendChatMessage({ imageUrl: url });
  };

  // Voice messages — tap the mic to start, tap again to stop and send (no
  // press-and-hold, which is unreliable across touch/mouse/desktop preview).
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickAudioMime();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch {
      // Mic permission denied or unsupported — fail quietly, same as other
      // browser-permission features in this app.
    }
  };

  const stopRecording = (send: boolean) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    const duration = recordSeconds;
    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setIsRecording(false);
      mediaRecorderRef.current = null;
      if (!send || chunksRef.current.length === 0) return;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      const ext = blob.type.includes('mp4') || blob.type.includes('aac') ? 'm4a' : 'webm';
      setSendingMedia(true);
      const url = await uploadChatMedia(blob, ext);
      setSendingMedia(false);
      if (url) sendChatMessage({ audioUrl: url, audioDuration: duration });
    };
    recorder.stop();
  };

  useEffect(() => () => { if (mediaRecorderRef.current) stopRecording(false); }, []);

  const lastMineIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].mine) return i;
    return -1;
  })();

  return (
    <div style={{ height: viewportHeight != null ? `${viewportHeight}px` : '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <style>{`
        @keyframes chatBubbleIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .chat-bubble-in { animation: chatBubbleIn 0.22s cubic-bezier(0.32,0.72,0,1) both; }
        .chat-icon-btn { transition: transform 0.12s ease; }
        .chat-icon-btn:active { transform: scale(0.85); }
        .chat-send-btn { transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1); }
        .chat-send-btn:active { transform: scale(0.88); }
        .sticker-tile { transition: transform 0.12s ease; }
        .sticker-tile:active { transform: scale(0.92); }
        .sticker-tab-content { animation: fadeIn 0.16s ease; }
        @keyframes chatTypingDot { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
      `}</style>
      {/* Header — reuses .app-header's real-device safe-area rule (padding-top
          clearing the status bar/notch) so it lines up with the main header. */}
      <div className="app-header" style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        borderBottom: '1px solid var(--border)', background: 'var(--header-bg)',
        backdropFilter: 'blur(12px)', flexShrink: 0,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--ink)', padding: 4, display: 'flex' }}>
          <Icon emoji="←" size={20} />
        </button>
        <div style={{ position: 'relative' }}>
          <Avatar user={partnerName} size={36} ring />
          {isOnline(partnerProfile?.lastActiveAt) && (
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: '#3EC46D', border: '2px solid var(--header-bg)' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{partnerName}</p>
          <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>{formatPresence(partnerProfile?.lastActiveAt)}</p>
        </div>
        <button onClick={() => setShowThemePicker(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--ink-2)', flexShrink: 0 }} title="Chat theme">
          <Icon emoji="🎨" size={19} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '14px 14px', display: 'flex', flexDirection: 'column', background: chatBackground, transition: 'background 0.2s ease' }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', padding: '0 30px' }}>
            <Avatar user={partnerName} size={64} ring />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>{partnerName}</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Say hi to start the conversation 💕</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
            const startOfGroup = newDay || !prev || prev.mine !== m.mine;
            const endOfGroup = !next || next.mine !== m.mine || dayLabel(next.createdAt) !== dayLabel(m.createdAt);
            const isMedia = !!m.imageUrl || !!m.sticker || !!m.stickerImageUrl;
            const msgKey = m.clientKey ?? m.id;
            const isNew = !settledKeysRef.current!.has(msgKey);
            if (isNew) settledKeysRef.current!.add(msgKey);
            // The last message you sent always shows its status without
            // asking — tapping any other bubble (including this one) toggles
            // the same line for whichever message was tapped.
            const alwaysShow = m.pending || m.failed || (i === lastMineIdx && !isMedia);
            const showStatus = alwaysShow || expandedId === msgKey;
            return (
              <div key={msgKey} className={isNew ? 'chat-bubble-in' : undefined}>
                {newDay && (
                  <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '14px 0 10px' }}>{dayLabel(m.createdAt)}</p>
                )}
                <div style={{ display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 6, marginTop: startOfGroup ? 10 : 2 }}>
                  {!m.mine && (
                    <div style={{ width: 24, flexShrink: 0 }}>
                      {endOfGroup && <Avatar user={partnerName} size={24} />}
                    </div>
                  )}
                  {m.sticker ? (
                    <div onClick={() => setExpandedId(id => id === msgKey ? null : msgKey)} style={{ cursor: 'pointer', lineHeight: 1, opacity: m.pending ? 0.6 : 1, transition: 'opacity 0.25s ease' }}>
                      <Icon emoji={m.sticker} size={72} />
                    </div>
                  ) : m.stickerImageUrl ? (
                    <div onClick={() => setExpandedId(id => id === msgKey ? null : msgKey)} style={{ cursor: 'pointer', width: 120, opacity: m.pending ? 0.6 : 1, transition: 'opacity 0.25s ease' }}>
                      <ChatImage src={m.stickerImageUrl} pending={m.pending} />
                    </div>
                  ) : m.imageUrl ? (
                    <div onClick={() => setExpandedId(id => id === msgKey ? null : msgKey)} style={{ cursor: 'pointer', maxWidth: '65%', minWidth: 0 }}>
                      <ChatImage src={m.imageUrl} pending={m.pending} />
                    </div>
                  ) : (
                    <div
                      onClick={() => setExpandedId(id => id === msgKey ? null : msgKey)}
                      style={{
                        maxWidth: '72%', padding: m.audioUrl ? '8px 12px' : '9px 14px', fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word', cursor: 'pointer',
                        background: m.mine ? 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))' : 'var(--card)',
                        color: m.mine ? 'white' : 'var(--ink)',
                        border: m.mine ? 'none' : '1px solid var(--border)',
                        opacity: m.pending ? 0.6 : 1,
                        transition: 'opacity 0.25s ease',
                        borderRadius: m.mine
                          ? `18px 18px ${endOfGroup ? 4 : 18}px 18px`
                          : `18px 18px 18px ${endOfGroup ? 4 : 18}px`,
                      }}>
                      {m.audioUrl ? <AudioBubble src={m.audioUrl} duration={m.audioDuration} mine={m.mine} /> : m.text}
                    </div>
                  )}
                </div>
                {showStatus && (
                  <p style={{ textAlign: 'right', fontSize: 10, color: m.failed ? '#DC2626' : 'var(--ink-2)', marginTop: 3, marginRight: 2 }}>
                    {m.pending ? 'Sending...' : m.failed ? 'Failed to send' : m.mine && m.read ? 'Seen' : timeLabel(m.createdAt)}
                  </p>
                )}
              </div>
            );
          })
        )}
        {state.partnerTyping && (
          <div className="chat-bubble-in" style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 2 }}>
            <div style={{ width: 24, flexShrink: 0 }}><Avatar user={partnerName} size={24} /></div>
            <div style={{ padding: '11px 14px', borderRadius: '18px 18px 18px 4px', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-2)', animation: `chatTypingDot 1.1s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticker panel — three tabs: recently-used (across "Ours" and topic
          stickers alike), the couple's own uploaded pack, and Klipy's topic
          packs of real illustrated stickers. */}
      {showStickers && (
        <div className="app-bottom-nav" style={{ borderTop: '1px solid var(--border)', background: 'var(--card)', flexShrink: 0, display: 'flex', flexDirection: 'column', height: keyboardHeightRef.current, animation: 'slideUp 0.22s cubic-bezier(0.32,0.72,0,1)' }}>
          <div style={{ display: 'flex', gap: 4, padding: '8px 10px 0', flexShrink: 0 }}>
            <button className="chat-icon-btn" onClick={() => setShowStickers(false)} title="Back to keyboard" style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'none', color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon emoji="⌨️" size={18} />
            </button>
            {([['recent', '🕒', 'Recent'], ['ours', '📸', 'Ours'], ['search', '🗂️', 'Topics']] as const).map(([key, emoji, label]) => (
              <button key={key} onClick={() => setStickerTab(key)} style={{ flex: 1, padding: '7px', borderRadius: 10, border: 'none', background: stickerTab === key ? 'var(--sakura-light)' : 'none', color: stickerTab === key ? 'var(--sakura-deep)' : 'var(--ink-2)', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'background 0.15s ease, color 0.15s ease' }}>
                <Icon emoji={emoji} size={14} /> {label}
              </button>
            ))}
          </div>

          <div key={stickerTab} className="sticker-tab-content" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px' }}>
            {stickerTab === 'recent' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {recentStickers.map(url => (
                  <StickerTile key={url} src={url} onClick={() => handleSendStickerImage(url)} />
                ))}
                {recentStickers.length === 0 && (
                  <p style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--ink-2)', textAlign: 'center', padding: '20px 10px' }}>Stickers you send from Ours or Topics will show up here.</p>
                )}
              </div>
            )}

            {stickerTab === 'ours' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                <input ref={customStickerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { openStickerImport(e.target.files); e.target.value = ''; }} />
                <button onClick={() => customStickerInputRef.current?.click()} disabled={customStickerUploading} style={{ aspectRatio: '1', borderRadius: 12, border: '2px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {customStickerUploading ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(201,95,124,0.3)', borderTopColor: 'var(--sakura-deep)', animation: 'palvin-spin 0.7s linear infinite' }} /> : '+'}
                </button>
                {state.customStickers.map(s => (
                  <div key={s.id} style={{ position: 'relative' }}>
                    <StickerTile src={s.imageUrl} onClick={() => handleSendStickerImage(s.imageUrl)} />
                    <button onClick={() => removeCustomSticker(s.id)} title="Remove" style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon emoji="✕" size={9} />
                    </button>
                  </div>
                ))}
                {state.customStickers.length === 0 && !customStickerUploading && (
                  <p style={{ gridColumn: '2 / span 3', fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center' }}>Add your own photos as stickers!</p>
                )}
                <style>{`@keyframes palvin-spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {stickerTab === 'search' && (
              klipyQuery.trim() === '' ? (
                <div key="categories" className="sticker-tab-content">
                {klipyCategories.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {klipyCategories.map(c => (
                      <CategoryTile key={c.category} label={c.category} previewUrl={c.previewUrl} onClick={() => setKlipyQuery(c.query)} />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'center', padding: '20px 10px' }}>
                    {klipyCategoriesLoading ? 'Loading topics...' : 'Couldn’t load topics.'}
                  </p>
                )}
                </div>
              ) : (
                <div key="results" className="sticker-tab-content">
                  <button onClick={() => setKlipyQuery('')} style={{ background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 12, cursor: 'pointer', padding: '0 0 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Icon emoji="←" size={12} /> Topics
                  </button>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {klipyResults.map(r => (
                      <StickerTile key={r.id} src={r.thumbnail} onClick={() => handleSendStickerImage(r.url)} />
                    ))}
                  </div>
                  {klipyLoading && <p style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'center', marginTop: 8 }}>Searching...</p>}
                  {!klipyLoading && klipyFailed && (
                    <p style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'center', marginTop: 8 }}>No stickers found.</p>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Sticker import — cuts the subject out onto a transparent background
          (entirely on-device) instead of just cropping the rectangle, since
          a whole rectangular photo pasted in isn't what a sticker is. */}
      {importStage !== 'idle' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, animation: 'fadeIn 0.18s ease' }}>
          {importStage === 'processing' && (
            <>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3.5px solid rgba(255,255,255,0.25)', borderTopColor: 'white', animation: 'palvin-spin 0.8s linear infinite' }} />
              <p style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Cutting out your sticker{importProgress != null ? `... ${importProgress}%` : '...'}</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, textAlign: 'center' }}>First time takes longer — it's remembered after that.</p>
            </>
          )}
          {importStage === 'error' && (
            <>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 14, textAlign: 'center' }}>Couldn't process that photo.</p>
              <button onClick={cancelStickerImport} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'var(--sakura-accent)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>OK</button>
            </>
          )}
          {importStage === 'preview' && importPreviewUrl && (
            <>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Here's your sticker</p>
              <div style={{
                width: 220, height: 220, borderRadius: 20, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundImage: 'conic-gradient(#3a3a3a 90deg, #2a2a2a 90deg 180deg, #3a3a3a 180deg 270deg, #2a2a2a 270deg)', backgroundSize: '20px 20px',
                animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both',
              }}>
                <img src={importPreviewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={cancelStickerImport} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={confirmStickerImport} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'var(--sakura-accent)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Use as sticker</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Chat theme picker */}
      {showThemePicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setShowThemePicker(false)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 340, animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="🎨" size={17} /> Chat theme</p>
              <button onClick={() => setShowThemePicker(false)} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 14 }}>Only changes how chat looks on this device.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {CHAT_THEMES.map(t => (
                <button key={t.key} onClick={() => pickChatTheme(t.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <div style={{
                    width: '100%', aspectRatio: '1', borderRadius: 14, background: t.background,
                    border: chatThemeKeyValue === t.key ? '2.5px solid var(--sakura-accent)' : '1.5px solid var(--border)',
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input bar — hidden while the sticker panel is open (that panel takes
          its place at the bottom entirely, rather than sitting below it) so
          opening stickers doesn't also raise the text field/keyboard. While
          the text field is focused (keyboard up), this uses .chat-input-bar's
          own tunable real-device padding-bottom (index.css) instead of the
          shared .app-bottom-nav's, so it can sit right above the keyboard
          without affecting the main tab bar elsewhere. Once unfocused it
          falls back to plain .app-bottom-nav, unchanged. */}
      {!showStickers && (
      <div className={inputFocused ? 'chat-input-bar' : 'app-bottom-nav'} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderTop: '1px solid var(--border)', background: 'var(--card)', flexShrink: 0 }}>
        <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFilePicked} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFilePicked} />

        {isRecording ? (
          <>
            <button className="chat-icon-btn" onClick={() => stopRecording(false)} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'var(--border)', color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon emoji="✕" size={15} />
            </button>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 20, background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div className="animate-heart-pop" style={{ width: 9, height: 9, borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{formatDuration(recordSeconds)}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Recording...</span>
            </div>
            <button className="chat-send-btn" onClick={() => stopRecording(true)} style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
            </button>
          </>
        ) : (
          <>
            <button className="chat-icon-btn" onMouseDown={e => e.preventDefault()} onClick={() => galleryInputRef.current?.click()} disabled={sendingMedia} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'none', color: 'var(--sakura-deep)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon emoji="🖼️" size={20} />
            </button>
            <button className="chat-icon-btn" onMouseDown={e => e.preventDefault()} onClick={() => cameraInputRef.current?.click()} disabled={sendingMedia} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'none', color: 'var(--sakura-deep)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon emoji="📷" size={20} />
            </button>
            <button className="chat-icon-btn" onMouseDown={e => e.preventDefault()} onClick={() => setShowStickers(v => !v)} disabled={sendingMedia} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: showStickers ? 'var(--sakura-light)' : 'none', color: 'var(--sakura-deep)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon emoji="😊" size={20} />
            </button>
            <input
              ref={inputRef}
              value={text}
              onChange={e => handleTextChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => { setInputFocused(false); sendTypingSignal(false); }}
              placeholder={`Message ${partnerName}...`}
              autoCorrect="off"
              spellCheck={false}
              style={{ flex: 1, minWidth: 0, padding: '9px 14px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 14, outline: 'none' }}
            />
            {text.trim() ? (
              <button className="chat-send-btn" onMouseDown={e => e.preventDefault()} onClick={handleSend} style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
              </button>
            ) : (
              <button className="chat-icon-btn" onMouseDown={e => e.preventDefault()} onClick={startRecording} disabled={sendingMedia} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'none', color: 'var(--sakura-deep)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon emoji="🎤" size={20} />
              </button>
            )}
            {!text.trim() && (
              <button className="chat-icon-btn" onMouseDown={e => e.preventDefault()} onClick={sendHeart} disabled={sendingMedia} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon emoji="❤️" size={22} style={{ color: '#E8517A', fill: '#E8517A' }} />
              </button>
            )}
          </>
        )}
      </div>
      )}
    </div>
  );
}
