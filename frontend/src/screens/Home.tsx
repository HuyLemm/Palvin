import { useState, useEffect } from 'react';
import { useApp } from '../context';
import Avatar from '../components/Avatar';
import { getDaysTogether, getDuration, RELATIONSHIP_START } from '../data';
import type { FavCategory } from '../types';

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
  '🫂 Ôm em thật chặt!',
  '🌸 Gửi ôm ngọt ngào~',
  '💕 Muốn ôm em lắm!',
  '✨ Một cái ôm ấm áp!',
  '🥰 Ôm ôm ôm!',
];

const THINKING_MESSAGES = [
  '💭 Đang nghĩ đến em...',
  '🌸 Nhớ em quá!',
  '💕 Em đang ở đâu vậy?',
  '✨ Tự nhiên nhớ em!',
  '🥰 Em có đang nghĩ đến anh không?',
  '💙 Nghĩ đến em cả ngày~',
];

const CATEGORY_CONFIG: { key: FavCategory; emoji: string; question: string; color: string }[] = [
  { key: 'food',   emoji: '🍜', question: 'Hôm nay ăn gì?',            color: '#E8844A' },
  { key: 'cafe',   emoji: '☕', question: 'Hôm nay đi cafe ở đâu?',   color: '#C48A52' },
  { key: 'bida',   emoji: '🎱', question: 'Hôm nay đánh bida ở đâu?', color: '#4A8AE8' },
  { key: 'gaming', emoji: '🎮', question: 'Hôm nay chơi game gì?',     color: '#8B6FD4' },
];

function getStreak(): number {
  try {
    const data = JSON.parse(localStorage.getItem('palvin_streak') || '{}');
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (data.lastDate === today) return data.streak || 1;
    if (data.lastDate === yesterday) {
      const newStreak = (data.streak || 0) + 1;
      localStorage.setItem('palvin_streak', JSON.stringify({ lastDate: today, streak: newStreak }));
      return newStreak;
    }
    localStorage.setItem('palvin_streak', JSON.stringify({ lastDate: today, streak: 1 }));
    return 1;
  } catch { return 1; }
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

const MOOD_SCORE: Record<string, number> = {
  '😍': 5, '🥰': 5, '😊': 4, '😐': 3, '🥺': 2, '😭': 2, '😴': 2, '😤': 1,
};

export default function Home() {
  const { state, navigate, setMood, currentUser, addCountdown, deleteCountdown, sendHug } = useApp();
  const [days, setDays] = useState(getDaysTogether());
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [picks, setPicks] = useState<Partial<Record<FavCategory, string>>>({});
  const [pickAnim, setPickAnim] = useState<Partial<Record<FavCategory, boolean>>>({});
  const [showAddCountdown, setShowAddCountdown] = useState(false);
  const [streak] = useState(getStreak);
  const [hugAnim, setHugAnim] = useState(false);
  const [thinkAnim, setThinkAnim] = useState(false);
  const [vinylIdx, setVinylIdx] = useState(0);
  const dur = getDuration();

  useEffect(() => {
    const t = setInterval(() => setDays(getDaysTogether()), 60000);
    return () => clearInterval(t);
  }, []);

  // Cycle through playlist songs for the vinyl widget
  useEffect(() => {
    if (state.playlist.length < 2) return;
    const t = setInterval(() => setVinylIdx(i => (i + 1) % state.playlist.length), 4000);
    return () => clearInterval(t);
  }, [state.playlist.length]);

  const upcoming = [...state.events]
    .filter(e => new Date(e.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const recentMemories = state.memories.slice(0, 5);

  const rollPick = (cat: FavCategory) => {
    const list = state.favPlaces[cat];
    if (list.length === 0) return;
    setPickAnim(prev => ({ ...prev, [cat]: true }));
    setTimeout(() => {
      const pick = list[Math.floor(Math.random() * list.length)];
      setPicks(prev => ({ ...prev, [cat]: pick.name }));
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
    const msg = THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)];
    const other = currentUser === 'Alvin' ? 'Paoi' : 'Alvin';
    sendHug(currentUser, `${currentUser} đang nghĩ đến ${other}... ${msg}`);
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
    const alvinScore = entry?.Alvin ? (MOOD_SCORE[entry.Alvin.emoji] || 3) : null;
    const paoiScore = entry?.Paoi ? (MOOD_SCORE[entry.Paoi.emoji] || 3) : null;
    const label = new Date(date + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'narrow' });
    return { date, alvinScore, paoiScore, label };
  });

  const currentSong = state.playlist[vinylIdx % Math.max(state.playlist.length, 1)];

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Hero Counter */}
      <div style={{
        background: 'linear-gradient(135deg, #FFF0F4 0%, #FFF8FA 50%, #FFF0F4 100%)',
        borderRadius: 24, padding: '24px 20px', margin: '0 0 16px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        {['🌸', '🌸', '🌸'].map((p, i) => (
          <span key={i} style={{ position: 'absolute', fontSize: 18, opacity: 0.2, top: `${20 + i * 30}%`, left: i % 2 === 0 ? '5%' : '88%', transform: `rotate(${i * 30}deg)` }}>{p}</span>
        ))}
        <p style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Together for</p>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 64, fontWeight: 400, color: 'var(--sakura-deep)', lineHeight: 1, marginBottom: 8 }}>
          {days.toLocaleString()}
        </div>
        <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>DAYS</p>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 12 }}>
          {dur.years} Years · {dur.months} Months · {dur.days} Days
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ background: 'var(--white)', borderRadius: 12, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Since</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sakura-deep)' }}>August 21, 2023</span>
          </div>
          <div style={{ background: 'var(--white)', borderRadius: 12, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 16 }}>🔥</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sakura-deep)' }}>{streak} day streak</span>
          </div>
        </div>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', color: 'var(--ink-2)', marginBottom: 14, fontSize: 15 }}>"Our little story continues."</p>

        {/* Spinning Vinyl Disk */}
        {state.playlist.length > 0 && currentSong && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '10px 14px', border: '1px solid rgba(243,166,185,0.3)' }}>
            <style>{`@keyframes spin-vinyl { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, position: 'relative', animation: 'spin-vinyl 5s linear infinite', boxShadow: '0 3px 12px rgba(0,0,0,0.25)' }}>
              {/* Vinyl grooves */}
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(#1a1a1a 0deg, #2d2d2d 2deg, #1a1a1a 4deg, #2a2a2a 6deg, #111 10deg, #222 14deg, #1a1a1a 18deg, #2d2d2d 22deg, #111 30deg, #1a1a1a 40deg, #222 50deg, #111 60deg, #1a1a1a 80deg, #2a2a2a 100deg, #111 130deg, #222 160deg, #1a1a1a 180deg, #2d2d2d 200deg, #111 220deg, #222 240deg, #1a1a1a 260deg, #2a2a2a 280deg, #111 300deg, #222 320deg, #1a1a1a 340deg, #2d2d2d 360deg)' }} />
              {/* Center label */}
              <div style={{ position: 'absolute', inset: '28%', borderRadius: '50%', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.6)' }} />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <p style={{ fontSize: 10, color: 'var(--sakura-deep)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>♪ Our Playlist</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentSong.title}</p>
              <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>{currentSong.artist}</p>
            </div>
            <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
              {state.playlist.slice(0, 4).map((_, i) => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i === vinylIdx % state.playlist.length ? 'var(--sakura-accent)' : 'var(--border)', transition: 'background 0.3s' }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Couple Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { emoji: '🌸', value: state.memories.length, label: 'Kỷ niệm' },
          { emoji: '💌', value: state.loveNotes.length + state.loveLetters.length, label: 'Thư tình' },
          { emoji: '🎁', value: state.wishes.filter(w => !w.drawn).length, label: 'Wishlist' },
          { emoji: '🌿', value: state.gratitude.length, label: 'Biết ơn' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 6px', textAlign: 'center' }}>
            <p style={{ fontSize: 20, marginBottom: 4 }}>{s.emoji}</p>
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
            background: hugAnim ? 'linear-gradient(135deg, #E67F9A, #C9507C)' : 'linear-gradient(135deg, #FFF0F4, #FFE4EC)',
            border: '1.5px solid #F3A6B9', borderRadius: 18, padding: '16px 12px',
            cursor: 'pointer', transition: 'all 0.3s',
            transform: hugAnim ? 'scale(0.96)' : 'scale(1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 32, display: 'block', transition: 'transform 0.3s', transform: hugAnim ? 'scale(1.3)' : 'scale(1)' }}>🫂</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: hugAnim ? 'white' : 'var(--sakura-deep)' }}>Gửi ôm</span>
          <span style={{ fontSize: 11, color: hugAnim ? 'rgba(255,255,255,0.8)' : 'var(--ink-2)', textAlign: 'center' }}>
            {currentUser === 'Alvin' ? 'cho Paoi 💗' : 'cho Alvin 💙'}
          </span>
        </button>

        <button
          onClick={handleThinking}
          style={{
            background: thinkAnim ? 'linear-gradient(135deg, #8B6FD4, #6B4FB4)' : 'linear-gradient(135deg, #F5F0FF, #EDE6FF)',
            border: '1.5px solid #C4B0F0', borderRadius: 18, padding: '16px 12px',
            cursor: 'pointer', transition: 'all 0.3s',
            transform: thinkAnim ? 'scale(0.96)' : 'scale(1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 32, display: 'block', transition: 'transform 0.3s', transform: thinkAnim ? 'scale(1.3)' : 'scale(1)' }}>💭</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: thinkAnim ? 'white' : '#8B6FD4' }}>Đang nghĩ đến em</span>
          <span style={{ fontSize: 11, color: thinkAnim ? 'rgba(255,255,255,0.8)' : 'var(--ink-2)', textAlign: 'center' }}>
            {currentUser === 'Alvin' ? 'nhắn Paoi 💗' : 'nhắn Alvin 💙'}
          </span>
        </button>
      </div>

      {/* Today's question pickers — from Our Favourites */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 14 }}>Hôm nay của mình 🎲</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CATEGORY_CONFIG.map(cat => {
            const list = state.favPlaces[cat.key];
            const picked = picks[cat.key];
            const animating = pickAnim[cat.key];
            return (
              <div key={cat.key} style={{ background: 'var(--bg)', borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>{cat.question}</p>
                      {list.length === 0 && (
                        <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>Chưa có địa điểm nào</p>
                      )}
                    </div>
                  </div>
                  {list.length > 0 && (
                    <button
                      onClick={() => rollPick(cat.key)}
                      style={{ background: `${cat.color}20`, border: `1.5px solid ${cat.color}40`, borderRadius: 10, padding: '6px 12px', color: cat.color, fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
                    >
                      {picked ? '🔀' : '✨ Gợi ý'}
                    </button>
                  )}
                </div>
                {picked && (
                  <div style={{ marginTop: 8, background: `${cat.color}10`, border: `1px solid ${cat.color}25`, borderRadius: 10, padding: '8px 12px', opacity: animating ? 0 : 1, transition: 'opacity 0.2s' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: cat.color }}>{picked}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* This day last year */}
      {lastYearMems.length > 0 && (
        <div style={{ marginBottom: 16, background: 'linear-gradient(135deg, #FFF8E6, #FFFAEF)', border: '1px solid #F5E6B0', borderRadius: 20, padding: '16px 18px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -8, right: -8, fontSize: 48, opacity: 0.08 }}>📅</div>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#B8860B', marginBottom: 10 }}>Ngày này năm ngoái ✨</p>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 }}>
            {lastYearMems.map(m => (
              <div key={m.id} onClick={() => navigate('memory-detail', m.id)} style={{ flexShrink: 0, width: 120, cursor: 'pointer' }}>
                <div style={{ width: 120, height: 100, borderRadius: 12, overflow: 'hidden', marginBottom: 6, background: 'var(--sakura-light)' }}>
                  <img src={m.image} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{m.title}</p>
                <p style={{ fontSize: 11, color: '#B8860B', marginTop: 2 }}>{m.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Countdowns */}
      {state.countdowns.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)' }}>Đếm ngược</p>
            <button onClick={() => setShowAddCountdown(true)} style={{ fontSize: 12, color: 'var(--sakura-deep)', background: 'var(--sakura-light)', border: 'none', borderRadius: 99, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>+ Thêm</button>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {state.countdowns.map(cd => {
              const d = daysUntil(cd.date);
              return (
                <div key={cd.id} style={{ flexShrink: 0, width: 110, background: `${cd.color}15`, border: `1.5px solid ${cd.color}30`, borderRadius: 16, padding: '14px 12px', textAlign: 'center', position: 'relative' }}>
                  <button onClick={() => deleteCountdown(cd.id)} style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 'none', fontSize: 10, cursor: 'pointer', color: 'var(--ink-2)', opacity: 0.4 }}>✕</button>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{cd.emoji}</div>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: cd.color, lineHeight: 1 }}>{d <= 0 ? '🎉' : d}</div>
                  {d > 0 && <div style={{ fontSize: 9, color: cd.color, fontWeight: 700, marginBottom: 4 }}>NGÀY NỮA</div>}
                  <div style={{ fontSize: 10, color: 'var(--ink-2)', fontWeight: 600, lineHeight: 1.3 }}>{cd.title}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {state.countdowns.length === 0 && (
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <button onClick={() => setShowAddCountdown(true)} style={{ fontSize: 12, color: 'var(--sakura-deep)', background: 'var(--sakura-light)', border: '1.5px dashed var(--sakura)', borderRadius: 14, padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>⏳ Thêm đếm ngược</button>
        </div>
      )}

      {/* Today's Mood */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)' }}>Hôm nay</p>
          <button onClick={() => setShowMoodPicker(true)} style={{ fontSize: 12, color: 'var(--sakura-deep)', background: 'var(--sakura-light)', border: 'none', borderRadius: 99, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>Cập nhật</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {(['Alvin', 'Paoi'] as const).map(u => (
            <div key={u} style={{ background: 'var(--bg)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar user={u} size={36} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{u}</p>
                <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                  {state.moods[u] ? `${state.moods[u]!.emoji} ${state.moods[u]!.label}` : '— chưa cập nhật'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 7-day mood chart */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Cảm xúc 7 ngày qua</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
          {moodChartData.map(d => (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: '100%', display: 'flex', gap: 1, alignItems: 'flex-end', height: 44 }}>
                <div style={{ flex: 1, background: '#4A8AE8', borderRadius: '2px 2px 0 0', height: d.alvinScore ? `${(d.alvinScore / 5) * 100}%` : '8%', opacity: d.alvinScore ? 1 : 0.2, transition: 'height 0.4s', minHeight: 2 }} />
                <div style={{ flex: 1, background: '#E67F9A', borderRadius: '2px 2px 0 0', height: d.paoiScore ? `${(d.paoiScore / 5) * 100}%` : '8%', opacity: d.paoiScore ? 1 : 0.2, transition: 'height 0.4s', minHeight: 2 }} />
              </div>
              <p style={{ fontSize: 8, color: 'var(--ink-2)', textAlign: 'center' }}>{d.label}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4A8AE8' }} /><span style={{ fontSize: 10, color: 'var(--ink-2)' }}>Alvin</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E67F9A' }} /><span style={{ fontSize: 10, color: 'var(--ink-2)' }}>Paoi</span></div>
        </div>
      </div>

      {/* Recent Memories */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)' }}>Memories gần đây</p>
          <button onClick={() => navigate('memories')} style={{ fontSize: 12, color: 'var(--sakura-deep)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Xem tất cả</button>
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {recentMemories.map(m => (
            <div key={m.id} onClick={() => navigate('memory-detail', m.id)} style={{ flexShrink: 0, width: 140, cursor: 'pointer' }}>
              <div style={{ width: 140, height: 160, borderRadius: 16, overflow: 'hidden', marginBottom: 8, background: 'var(--sakura-light)' }}>
                <img src={m.image} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{m.title}</p>
              <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>{m.date}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 12 }}>Sắp tới</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.map(ev => {
              const d = new Date(ev.date);
              const mon = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <div key={ev.id} onClick={() => navigate('calendar')} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 12px', background: 'var(--bg)', borderRadius: 12, transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--sakura-light)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                >
                  <div style={{ background: 'var(--sakura-light)', borderRadius: 10, padding: '6px 10px', textAlign: 'center', minWidth: 48 }}>
                    <div style={{ fontSize: 11, color: 'var(--sakura-deep)', fontWeight: 700 }}>{mon.split(' ')[0].toUpperCase()}</div>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--sakura-deep)', lineHeight: 1 }}>{mon.split(' ')[1]}</div>
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

      {/* Mood picker sheet */}
      {showMoodPicker && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.4)', backdropFilter: 'blur(4px)', zIndex: 50 }} onClick={() => setShowMoodPicker(false)} />
          <div className="bottom-sheet" style={{ zIndex: 51, paddingBottom: 32 }}>
            <div className="sheet-handle" />
            <div style={{ padding: '0 20px 16px' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Hôm nay cảm thấy thế nào?</p>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>Đang cập nhật cho <strong>{currentUser}</strong></p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {MOODS_LIST.map(m => (
                  <button key={m.emoji} onClick={() => { setMood(currentUser, m); setShowMoodPicker(false); }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '14px 8px', borderRadius: 14, background: state.moods[currentUser]?.emoji === m.emoji ? 'var(--sakura-light)' : 'var(--bg)', border: state.moods[currentUser]?.emoji === m.emoji ? '1.5px solid var(--sakura)' : '1.5px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 28 }}>{m.emoji}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-2)', textAlign: 'center', lineHeight: 1.2, fontWeight: 500 }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Countdown modal */}
      {showAddCountdown && <AddCountdownModal onClose={() => setShowAddCountdown(false)} onAdd={addCountdown} />}
    </div>
  );
}

function AddCountdownModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: { title: string; emoji: string; date: string; color: string }) => void }) {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎉');
  const [date, setDate] = useState('');
  const [color, setColor] = useState('#E67F9A');
  const COLORS = ['#E67F9A', '#8B6FD4', '#4A8AE8', '#5AC26A', '#E8844A', '#C48A52'];
  const EMOJIS = ['🎉', '✈️', '🎂', '💕', '🎆', '🏖️', '🌸', '🎓', '🏡', '💍'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'var(--white)', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 430 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)' }}>Thêm đếm ngược</p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {EMOJIS.map(e => <button key={e} onClick={() => setEmoji(e)} style={{ width: 36, height: 36, border: emoji === e ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', borderRadius: 10, background: emoji === e ? 'var(--sakura-light)' : 'var(--bg)', fontSize: 18, cursor: 'pointer' }}>{e}</button>)}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {COLORS.map(c => <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--ink)' : 'none', cursor: 'pointer' }} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="input-field" placeholder="Tên sự kiện" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <button onClick={() => { if (title && date) { onAdd({ title, emoji, date, color }); onClose(); } }} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15 }}>Thêm</button>
        </div>
      </div>
    </div>
  );
}
