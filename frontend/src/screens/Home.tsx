import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import FadeImage from '../components/FadeImage';
import { getDaysTogether, getDuration } from '../data';
import { nextOccurrence } from '../calendarRecurrence';
import type { FavCategory, FavPlace, StoryQuote } from '../types';

// Picks a quote that looks random day to day (not a fixed 0,1,2... queue
// order) while staying identical for both partners on the same calendar
// day — a plain day-index scramble instead of storing which quote was
// shown when. No quotes added yet (Us tab → "Câu nói mỗi ngày") → show
// nothing, no hardcoded fallback line.
function dailyQuote(quotes: StoryQuote[]): string | null {
  if (quotes.length === 0) return null;
  const dayIndex = Math.floor(Date.now() / 86400000);
  let seed = dayIndex ^ 0x9E3779B9;
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  seed = seed ^ (seed >>> 16);
  return quotes[Math.abs(seed) % quotes.length].text;
}

const MOODS_LIST = [
  { emoji: '🥰', label: 'Feeling loved' },
  { emoji: '😍', label: 'In love' },
  { emoji: '😊', label: 'Happy today' },
  { emoji: '😐', label: 'Just okay' },
  { emoji: '🥺', label: 'Missing you' },
  { emoji: '😭', label: 'Emotional' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '😤', label: 'Need a hug' },
];

const HUG_MESSAGES = [
  '🫂 Holding you so tight!',
  '🌸 Sending a sweet hug~',
  '💕 Missing your hugs so much!',
  '✨ A warm hug for you!',
  '🥰 Hug hug hug!',
];

const THINKING_MESSAGES = [
  '💭 Thinking of you...',
  '🌸 Miss you so much!',
  '💕 Where are you right now?',
  '✨ Just thought of you out of nowhere!',
  '🥰 Are you thinking of me too?',
  '💙 Thinking of you all day~',
];

const MOOD_SCORE: Record<string, number> = {
  '😍': 5, '🥰': 5, '😊': 4, '😐': 3, '🥺': 2, '😭': 2, '😴': 2, '😤': 1,
};

export default function Home() {
  const { state, screen, navigate, setMood, currentUser, partnerProfile, sendHug } = useApp();
  const partnerName = partnerProfile?.displayName;
  const relationshipStart = state.relationshipStart ? new Date(state.relationshipStart + 'T00:00:00') : null;
  const [days, setDays] = useState(relationshipStart ? getDaysTogether(relationshipStart) : 0);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [picks, setPicks] = useState<Partial<Record<FavCategory, FavPlace>>>({});
  const [pickAnim, setPickAnim] = useState<Partial<Record<FavCategory, boolean>>>({});
  const [selectedFavCat, setSelectedFavCat] = useState<FavCategory>('');
  const streak = state.streak;
  const streakLitToday = state.streakLitToday;
  const quote = dailyQuote(state.storyQuotes);
  const [hugAnim, setHugAnim] = useState(false);
  const [thinkAnim, setThinkAnim] = useState(false);
  const [vinylIdx, setVinylIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlistFilter, setPlaylistFilter] = useState<string>('all');
  const audioRef = useRef<HTMLAudioElement>(null);
  const dur = relationshipStart ? getDuration(relationshipStart) : { years: 0, months: 0, days: 0 };
  const playlistPool = playlistFilter === 'all' ? state.playlist : state.playlist.filter(p => p.addedBy === playlistFilter);

  // Home stays mounted in the background once visited (App.tsx's keep-alive
  // ScreenRouter) — without the `screen === 'home'` guard, this tick (and
  // the vinyl-rotation one below) would keep firing and re-rendering every
  // 60s/4s for the rest of the session even while some other tab is the one
  // actually on screen, needlessly competing with whatever *is* animating.
  useEffect(() => {
    if (!relationshipStart) { setDays(0); return; }
    setDays(getDaysTogether(relationshipStart));
    if (screen !== 'home') return;
    const t = setInterval(() => setDays(getDaysTogether(relationshipStart)), 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.relationshipStart, screen]);

  // Cycle through playlist songs for the vinyl widget — paused while a
  // preview is actively playing, and once the user has manually picked a
  // song via Next (otherwise the auto-tick fires a few seconds later and,
  // with a short pool, silently swaps away from the song they just chose —
  // reads as "pressing Next snaps back to the previous song").
  const [manualNav, setManualNav] = useState(false);
  useEffect(() => {
    if (playlistPool.length < 2 || isPlaying || manualNav || screen !== 'home') return;
    const t = setInterval(() => setVinylIdx(i => (i + 1) % playlistPool.length), 4000);
    return () => clearInterval(t);
  }, [playlistPool.length, isPlaying, manualNav, screen]);

  // Switching the "who added it" filter swaps the underlying song list
  // out from under whatever index was showing — snap back to the start of
  // the new list instead of landing on an unrelated index, and hand control
  // back to auto-rotation.
  useEffect(() => {
    setVinylIdx(0);
    setManualNav(false);
  }, [playlistFilter]);

  // Only a ~30s preview clip is available (iTunes Search's previewUrl) —
  // full-track streaming needs a paid music API, which this app doesn't
  // have. Switching songs (rotation, Next, or a manual pick) always stops
  // whatever's playing rather than silently swapping the audio under it.
  const togglePlay = (previewUrl: string | undefined) => {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    if (audio.src !== previewUrl) audio.src = previewUrl;
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  const nextSong = () => {
    if (playlistPool.length < 2) return;
    setManualNav(true);
    setVinylIdx(i => (i + 1) % playlistPool.length);
  };

  useEffect(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vinylIdx]);

  // Keep a valid selection as categories load in or get deleted out from
  // under the current one.
  useEffect(() => {
    if (state.favCategories.length === 0) { if (selectedFavCat) setSelectedFavCat(''); return; }
    if (!state.favCategories.some(c => c.id === selectedFavCat)) setSelectedFavCat(state.favCategories[0].id);
  }, [state.favCategories, selectedFavCat]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = [...state.events]
    .map(e => ({ event: e, displayDate: nextOccurrence(e, new Date()) }))
    .filter(({ displayDate }) => displayDate >= todayStr)
    .sort((a, b) => a.displayDate.localeCompare(b.displayDate))
    .slice(0, 3);

  const recentMemories = state.memories.slice(0, 5);

  const rollPick = (cat: FavCategory) => {
    const list = state.favPlaces[cat] ?? [];
    if (list.length === 0) return;
    setPickAnim(prev => ({ ...prev, [cat]: true }));
    setTimeout(() => {
      const pick = list[Math.floor(Math.random() * list.length)];
      setPicks(prev => ({ ...prev, [cat]: pick }));
      setPickAnim(prev => ({ ...prev, [cat]: false }));
    }, 220);
  };

  const handleHug = () => {
    setHugAnim(true);
    sendHug(currentUser, HUG_MESSAGES[Math.floor(Math.random() * HUG_MESSAGES.length)]);
    setTimeout(() => setHugAnim(false), 800);
  };

  const handleThinking = () => {
    setThinkAnim(true);
    // kind:'thinking' gets its own short headline server-side ("X đang nghĩ
    // đến bạn 💭") instead of the generic hug one — the random flavor text
    // goes into the notification's preview_text, not the toast/headline.
    const msg = THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)];
    sendHug(currentUser, msg, 'thinking');
    setTimeout(() => setThinkAnim(false), 800);
  };

  const today = new Date();
  const lastYearMems = state.memories.filter(m => {
    const d = new Date(m.date);
    return Math.abs(d.getMonth() - today.getMonth()) <= 0 && Math.abs(d.getDate() - today.getDate()) <= 1 && d.getFullYear() < today.getFullYear();
  });

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const moodChartData = last7.map(date => {
    const entry = state.moodHistory.find(e => e.date === date);
    const myMood = entry?.moods[currentUser];
    const partnerMood = partnerName ? entry?.moods[partnerName] : undefined;
    const alvinScore = myMood ? (MOOD_SCORE[myMood.emoji] || 3) : null;
    const paoiScore = partnerMood ? (MOOD_SCORE[partnerMood.emoji] || 3) : null;
    const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' });
    return { date, alvinScore, paoiScore, label };
  });

  const currentSong = playlistPool[vinylIdx % Math.max(playlistPool.length, 1)];

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Hero Counter */}
      <div style={{
        background: 'linear-gradient(135deg, var(--pink-glow) 0%, var(--bg) 50%, var(--pink-glow) 100%)',
        borderRadius: 24, padding: '24px 20px', margin: '0 0 16px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        {['🌸', '🌸', '🌸'].map((p, i) => (
          <Icon key={i} emoji={p} size={18} style={{ position: 'absolute', opacity: 0.2, top: `${20 + i * 30}%`, left: i % 2 === 0 ? '5%' : '88%', transform: `rotate(${i * 30}deg)` }} />
        ))}
        <p style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Together for</p>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 68, fontWeight: 700, color: 'var(--sakura-deep)', lineHeight: 1, marginBottom: 8 }}>
          {days.toLocaleString()}
        </div>
        <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>DAYS</p>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 12 }}>
          {dur.years} Years · {dur.months} Months · {dur.days} Days
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
          {relationshipStart ? (
            <div style={{ background: 'var(--white)', borderRadius: 12, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Since</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sakura-deep)' }}>
                {relationshipStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          ) : (
            <button onClick={() => navigate('settings')} style={{ background: 'var(--white)', border: '1.5px dashed var(--sakura-accent)', borderRadius: 12, padding: '6px 14px', color: 'var(--sakura-deep)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon emoji="💕" size={14} /> Set your anniversary date
            </button>
          )}
          <div style={{ background: 'var(--white)', borderRadius: 12, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)' }}>
            <Icon emoji="🔥" size={16} style={{ color: streakLitToday ? '#FF5A1F' : 'var(--ink-2)', fill: streakLitToday ? '#FF5A1F' : 'none', transition: 'color 0.3s, fill 0.3s' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sakura-deep)' }}>{streak} day streak</span>
          </div>
        </div>
        {quote && <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: 'var(--ink-2)', marginBottom: 14, fontSize: 15 }}>"{quote}"</p>}

        {/* Spinning Vinyl Disk */}
        {state.playlist.length > 0 && (
          <div>
            {/* Mine / partner's / Tất cả — which pool of songs the widget draws from */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 8, justifyContent: 'center' }}>
              {[
                { k: 'all', label: 'All' },
                { k: currentUser, label: currentUser },
                ...(partnerName ? [{ k: partnerName, label: partnerName }] : []),
              ].map(f => (
                <button key={f.k} onClick={() => setPlaylistFilter(f.k)} style={{ padding: '3px 10px', borderRadius: 99, border: 'none', background: playlistFilter === f.k ? 'var(--sakura-accent)' : 'var(--glass)', color: playlistFilter === f.k ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>{f.label}</button>
              ))}
            </div>

            {currentSong ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--glass)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '10px 20px', border: isPlaying ? '1px solid rgba(201,95,124,0.5)' : '1px solid rgba(243,166,185,0.3)', boxShadow: isPlaying ? '0 0 0 4px rgba(243,166,185,0.18)' : 'none', transition: 'box-shadow 0.3s, border-color 0.3s' }}>
                <style>{`
                  @keyframes spin-vinyl { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                  @keyframes vinyl-glow { 0%, 100% { box-shadow: 0 3px 14px rgba(0,0,0,0.3), 0 0 0 0 rgba(243,166,185,0.5); } 50% { box-shadow: 0 3px 14px rgba(0,0,0,0.3), 0 0 0 8px rgba(243,166,185,0); } }
                  @keyframes eq-bar-1 { 0%, 100% { height: 4px; } 30% { height: 13px; } 60% { height: 7px; } }
                  @keyframes eq-bar-2 { 0%, 100% { height: 8px; } 35% { height: 15px; } 70% { height: 5px; } }
                  @keyframes eq-bar-3 { 0%, 100% { height: 5px; } 40% { height: 12px; } 80% { height: 8px; } }
                `}</style>
                <audio ref={audioRef} onEnded={() => setIsPlaying(false)} style={{ display: 'none' }} />
                {/* Decorative — only the dedicated Play button below is interactive */}
                <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, position: 'relative', animation: isPlaying ? 'spin-vinyl 3s linear infinite, vinyl-glow 1.6s ease-in-out infinite' : 'none', boxShadow: '0 3px 14px rgba(0,0,0,0.3)' }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(#1a1a1a 0deg, #2d2d2d 2deg, #1a1a1a 4deg, #2a2a2a 6deg, #111 10deg, #222 14deg, #1a1a1a 18deg, #2d2d2d 22deg, #111 30deg, #1a1a1a 40deg, #222 50deg, #111 60deg, #1a1a1a 80deg, #2a2a2a 100deg, #111 130deg, #222 160deg, #1a1a1a 180deg, #2d2d2d 200deg, #111 220deg, #222 240deg, #1a1a1a 260deg, #2a2a2a 280deg, #111 300deg, #222 320deg, #1a1a1a 340deg, #2d2d2d 360deg)' }} />
                  <div style={{ position: 'absolute', inset: '28%', borderRadius: '50%', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.6)' }} />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <p style={{ fontSize: 11, color: 'var(--sakura-deep)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon emoji="♪" size={11} /> Our Playlist
                    {isPlaying && (
                      <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 15, marginLeft: 2 }}>
                        <span style={{ width: 3, borderRadius: 2, background: 'var(--sakura-deep)', animation: 'eq-bar-1 0.9s ease-in-out infinite' }} />
                        <span style={{ width: 3, borderRadius: 2, background: 'var(--sakura-deep)', animation: 'eq-bar-2 0.9s ease-in-out infinite' }} />
                        <span style={{ width: 3, borderRadius: 2, background: 'var(--sakura-deep)', animation: 'eq-bar-3 0.9s ease-in-out infinite' }} />
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentSong.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{currentSong.artist}</p>
                </div>
                <button
                  onClick={nextSong}
                  disabled={playlistPool.length < 2}
                  title="Next song"
                  style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--white)', color: 'var(--sakura-deep)', cursor: playlistPool.length < 2 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: playlistPool.length < 2 ? 0.4 : 1 }}
                >
                  <Icon emoji="⏭️" size={15} />
                </button>
                <button
                  onClick={() => togglePlay(currentSong.previewUrl)}
                  disabled={!currentSong.previewUrl}
                  title={currentSong.previewUrl ? '30s preview' : 'No preview available'}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: currentSong.previewUrl ? 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))' : 'var(--border)', cursor: currentSong.previewUrl ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <Icon emoji={isPlaying ? '⏸️' : '▶️'} size={16} style={{ color: currentSong.previewUrl ? 'white' : 'var(--ink-2)' }} />
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px', color: 'var(--ink-2)', fontSize: 12 }}>No songs in this list yet.</div>
            )}
          </div>
        )}
      </div>

      {/* Couple Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { emoji: '🌸', value: state.memories.length, label: 'Memories' },
          { emoji: '💌', value: state.loveNotes.length + state.loveLetters.length, label: 'Love notes' },
          { emoji: '🎁', value: state.wishes.filter(w => !w.drawn).length, label: 'Wishlist' },
          { emoji: '🌿', value: state.gratitude.length, label: 'Gratitude' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 6px', textAlign: 'center' }}>
            <p style={{ marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji={s.emoji} size={20} /></p>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--sakura-deep)', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 10, color: 'var(--ink-2)', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Hug + Thinking of you */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <button
          onClick={handleHug}
          style={{
            background: hugAnim ? 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))' : 'linear-gradient(135deg, var(--pink-glow), var(--sakura-light))',
            border: '1.5px solid var(--sakura)', borderRadius: 18, padding: '16px 12px',
            cursor: 'pointer', transition: 'all 0.3s',
            transform: hugAnim ? 'scale(0.96)' : 'scale(1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}
        >
          <Icon emoji="🫂" size={32} style={{ display: 'block', transition: 'transform 0.3s', transform: hugAnim ? 'scale(1.3)' : 'scale(1)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: hugAnim ? 'white' : 'var(--sakura-deep)' }}>Send a hug</span>
          <span style={{ fontSize: 11, color: hugAnim ? 'rgba(255,255,255,0.8)' : 'var(--ink-2)', textAlign: 'center', display: 'flex', alignItems: 'center', gap: 4 }}>
            to {partnerName ?? 'your partner'} <Icon emoji="💗" size={11} />
          </span>
        </button>

        <button
          onClick={handleThinking}
          style={{
            background: thinkAnim ? 'linear-gradient(135deg, #8B6FD4, #6B4FB4)' : 'linear-gradient(135deg, var(--lavender-glow), var(--lavender-light))',
            border: '1.5px solid var(--lavender)', borderRadius: 18, padding: '16px 12px',
            cursor: 'pointer', transition: 'all 0.3s',
            transform: thinkAnim ? 'scale(0.96)' : 'scale(1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}
        >
          <Icon emoji="💭" size={32} style={{ display: 'block', transition: 'transform 0.3s', transform: thinkAnim ? 'scale(1.3)' : 'scale(1)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: thinkAnim ? 'white' : 'var(--lavender)' }}>Thinking of you</span>
          <span style={{ fontSize: 11, color: thinkAnim ? 'rgba(255,255,255,0.8)' : 'var(--ink-2)', textAlign: 'center', display: 'flex', alignItems: 'center', gap: 4 }}>
            to {partnerName ?? 'your partner'} <Icon emoji="💗" size={11} />
          </span>
        </button>
      </div>

      {/* Today's question picker — from Our Favourites */}
      {state.favCategories.length > 0 && (() => {
        const cat = state.favCategories.find(c => c.id === selectedFavCat);
        const list = cat ? (state.favPlaces[cat.id] ?? []) : [];
        const picked = cat ? picks[cat.id] : undefined;
        const animating = cat ? pickAnim[cat.id] : false;
        return (
          <div className="card" style={{ padding: '16px 18px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>Today's pick <Icon emoji="🎲" size={14} /></p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {state.favCategories.map(c => (
                <button key={c.id} onClick={() => setSelectedFavCat(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 99, border: 'none', background: selectedFavCat === c.id ? c.color : 'var(--bg)', color: selectedFavCat === c.id ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s' }}>
                  <Icon emoji={c.emoji} size={13} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
            {cat && (
              <div style={{ background: 'var(--bg)', borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon emoji={cat.emoji} size={20} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>{cat.label} today?</p>
                      {list.length === 0 && (
                        <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>No spots added yet</p>
                      )}
                    </div>
                  </div>
                  {list.length > 0 && (
                    <button
                      onClick={() => rollPick(cat.id)}
                      style={{ background: `${cat.color}20`, border: `1.5px solid ${cat.color}40`, borderRadius: 10, padding: '6px 12px', color: cat.color, fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    >
                      {picked ? <Icon emoji="🔀" size={14} /> : <><Icon emoji="✨" size={14} /> Suggest</>}
                    </button>
                  )}
                </div>
                {picked && (
                  <div style={{ marginTop: 8, background: `${cat.color}10`, border: `1px solid ${cat.color}25`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, opacity: animating ? 0 : 1, transition: 'opacity 0.2s' }}>
                    {picked.image
                      ? <FadeImage src={picked.image} alt="" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
                      : <div style={{ width: 44, height: 44, borderRadius: 10, background: `${cat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji={cat.emoji} size={20} /></div>}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: cat.color }}>{picked.name}</p>
                      {picked.note && <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{picked.note}</p>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* This day last year */}
      {lastYearMems.length > 0 && (
        <div style={{ marginBottom: 16, background: 'linear-gradient(135deg, #FFF8E6, #FFFAEF)', border: '1px solid #F5E6B0', borderRadius: 20, padding: '16px 18px', overflow: 'hidden', position: 'relative' }}>
          <Icon emoji="📅" size={48} style={{ position: 'absolute', top: -8, right: -8, opacity: 0.08 }} />
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B8860B', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>This day last year <Icon emoji="✨" size={14} /></p>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 }}>
            {lastYearMems.map(m => (
              <div key={m.id} onClick={() => navigate('memory-detail', m.id)} style={{ flexShrink: 0, width: 120, cursor: 'pointer' }}>
                <div style={{ width: 120, height: 100, borderRadius: 12, overflow: 'hidden', marginBottom: 6, background: 'var(--sakura-light)' }}>
                  <FadeImage src={m.image} alt={m.title} style={{ width: '100%', height: '100%' }} />
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{m.title}</p>
                <p style={{ fontSize: 11, color: '#B8860B', marginTop: 2 }}>{m.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 12 }}>Upcoming</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.map(({ event: ev, displayDate }) => {
              const d = new Date(displayDate);
              const mon = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <div key={ev.id} onClick={() => navigate('calendar')} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 12px', background: 'var(--bg)', borderRadius: 12, transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--sakura-light)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                >
                  <div style={{ background: 'var(--sakura-light)', borderRadius: 10, padding: '6px 10px', textAlign: 'center', minWidth: 48 }}>
                    <div style={{ fontSize: 11, color: 'var(--sakura-deep)', fontWeight: 700 }}>{mon.split(' ')[0].toUpperCase()}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--sakura-deep)', lineHeight: 1 }}>{mon.split(' ')[1]}</div>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{ev.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{ev.time}{ev.location ? ` · ${ev.location}` : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's Mood */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)' }}>Today</p>
          <button onClick={() => setShowMoodPicker(true)} style={{ fontSize: 12, color: 'var(--sakura-deep)', background: 'var(--sakura-light)', border: 'none', borderRadius: 99, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>Update</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {[currentUser, ...(partnerName ? [partnerName] : [])].map(u => (
            <div key={u} style={{ background: 'var(--bg)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar user={u} size={36} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{u}</p>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {state.moods[u] ? <><Icon emoji={state.moods[u]!.emoji} size={14} /> {state.moods[u]!.label}</> : '— not set yet'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 7-day mood chart */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Mood over the last 7 days</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
          {moodChartData.map(d => (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: '100%', display: 'flex', gap: 1, alignItems: 'flex-end', height: 44 }}>
                <div style={{ flex: 1, background: '#4A8AE8', borderRadius: '2px 2px 0 0', height: d.alvinScore ? `${(d.alvinScore / 5) * 100}%` : '8%', opacity: d.alvinScore ? 1 : 0.2, transition: 'height 0.4s', minHeight: 2 }} />
                <div style={{ flex: 1, background: 'var(--sakura-accent)', borderRadius: '2px 2px 0 0', height: d.paoiScore ? `${(d.paoiScore / 5) * 100}%` : '8%', opacity: d.paoiScore ? 1 : 0.2, transition: 'height 0.4s', minHeight: 2 }} />
              </div>
              <p style={{ fontSize: 8, color: 'var(--ink-2)', textAlign: 'center' }}>{d.label}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4A8AE8' }} /><span style={{ fontSize: 10, color: 'var(--ink-2)' }}>{currentUser}</span></div>
          {partnerName && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sakura-accent)' }} /><span style={{ fontSize: 10, color: 'var(--ink-2)' }}>{partnerName}</span></div>}
        </div>
      </div>

      {/* Recent Memories */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)' }}>Recent Memories</p>
          <button onClick={() => navigate('memories')} style={{ fontSize: 12, color: 'var(--sakura-deep)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all</button>
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {recentMemories.map(m => (
            <div key={m.id} onClick={() => navigate('memory-detail', m.id)} style={{ flexShrink: 0, width: 140, cursor: 'pointer' }}>
              <div style={{ width: 140, height: 160, borderRadius: 16, overflow: 'hidden', marginBottom: 8, background: 'var(--sakura-light)' }}>
                <FadeImage src={m.image} alt={m.title} style={{ width: '100%', height: '100%' }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{m.title}</p>
              <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>{m.date}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mood picker — centered modal (was a bottom sheet) */}
      {showMoodPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setShowMoodPicker(false)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 340, animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4, textAlign: 'center' }}>How are you feeling today?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16, textAlign: 'center' }}>Updating for <strong>{currentUser}</strong></p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {MOODS_LIST.map(m => (
                <button key={m.emoji} onClick={() => { setMood(currentUser, m); setShowMoodPicker(false); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '14px 8px', borderRadius: 14, background: state.moods[currentUser]?.emoji === m.emoji ? 'var(--sakura-light)' : 'var(--bg)', border: state.moods[currentUser]?.emoji === m.emoji ? '1.5px solid var(--sakura)' : '1.5px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <Icon emoji={m.emoji} size={28} />
                  <span style={{ fontSize: 11, color: 'var(--ink-2)', textAlign: 'center', lineHeight: 1.2, fontWeight: 500 }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
