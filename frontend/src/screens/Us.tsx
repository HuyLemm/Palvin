import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useApp } from '../context';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import AmountInput from '../components/AmountInput';
import { getDaysTogether, getDuration } from '../data';
import { uploadPlaceImage } from '../places';
import FutureUs from './FutureUs';
import Calendar from './Calendar';
import TripPlanner from './TripPlanner';
import TimeCapsule from './TimeCapsule';
import DateIdeaJar from './DateIdeaJar';
import GratitudeJournal from './GratitudeJournal';
import DatePermit from './DatePermit';
import type { FavCategory, FavPlace, WishItem } from '../types';

type SubScreen = 'main' | 'story' | 'favorites' | 'places' | 'future' | 'calendar' | 'trips' | 'capsule' | 'playlist' | 'collage' | 'wishjar' | 'dateidea' | 'gratitude' | 'permit';

const FAV_CATEGORY_CONFIG: { key: FavCategory; emoji: string; label: string; color: string; placeholder: string }[] = [
  { key: 'food',   emoji: '🍜', label: 'Ăn uống',  color: '#E8844A', placeholder: 'Tên quán ăn...' },
  { key: 'cafe',   emoji: '☕', label: 'Cafe',     color: '#C48A52', placeholder: 'Tên quán cafe...' },
  { key: 'bida',   emoji: '🎱', label: 'Bida',     color: '#4A8AE8', placeholder: 'Tên sân bida...' },
  { key: 'gaming', emoji: '🎮', label: 'Gaming',   color: '#8B6FD4', placeholder: 'Tên quán game / game...' },
];

export default function Us() {
  const { state, navigate, screen, selectedId, updateFavorite, currentUser, addToPlaylist, removeFromPlaylist, addWish, removeWish, addFavPlace, removeFavPlace } = useApp();
  // A tapped date-request notification lands on the "Us" screen with a real
  // dateRequests id attached (a plain tab click never carries one). Read it
  // straight into the initial state so the first render already shows the
  // permit sub-screen — no flash of the Us main menu first.
  const [sub, setSub] = useState<SubScreen>(() => (screen === 'us' && selectedId) ? 'permit' : 'main');
  const relationshipStart = state.relationshipStart ? new Date(state.relationshipStart + 'T00:00:00') : null;
  const days = relationshipStart ? getDaysTogether(relationshipStart) : 0;
  const dur  = relationshipStart ? getDuration(relationshipStart) : { years: 0, months: 0, days: 0 };

  // Covers the case where Us is already mounted (not remounted) and a new
  // notification tap arrives while the user is already sitting on this screen.
  useEffect(() => {
    if (screen === 'us' && selectedId) setSub('permit');
  }, [screen, selectedId]);

  const Back = () => (
    <button onClick={() => setSub('main')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
  );

  if (sub === 'wishjar')  return <GiftWishlistScreen onBack={() => setSub('main')} />;
  if (sub === 'dateidea') return <DateIdeaJar onBack={() => setSub('main')} />;
  if (sub === 'gratitude') return <GratitudeJournal onBack={() => setSub('main')} />;
  if (sub === 'permit')   return <DatePermit onBack={() => setSub('main')} initialRequestId={selectedId ?? undefined} />;

  if (sub === 'story') {
    const timeline = [...state.memories].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return (
      <div style={{ paddingBottom: 32 }}>
        <Back />
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--ink)', marginBottom: 24 }}>Our Story</p>
        {timeline.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Icon emoji="🌸" size={40} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Chưa có kỷ niệm nào</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Thêm kỷ niệm để bắt đầu câu chuyện của hai người.</p>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 20, top: 0, bottom: 0, width: 2, background: 'var(--sakura-light)' }} />
            {timeline.map(m => (
              <div key={m.id} onClick={() => navigate('memory-detail', m.id)} style={{ display: 'flex', gap: 16, marginBottom: 24, position: 'relative', cursor: 'pointer' }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--sakura)', flexShrink: 0, zIndex: 1, background: 'var(--sakura-light)' }}>
                  <img src={m.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ paddingTop: 8 }}>
                  <p style={{ fontSize: 12, color: 'var(--sakura-accent)', fontWeight: 600, marginBottom: 2 }}>{m.date}</p>
                  <p style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 600 }}>{m.title}</p>
                  {m.location && <p style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="📍" size={12} /> {m.location}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (sub === 'favorites') return <OurFavouritesScreen onBack={() => setSub('main')} />;

  if (sub === 'places') return <OurPlacesScreen onBack={() => setSub('main')} />;

  if (sub === 'future')   return <div style={{ paddingBottom: 0 }}><Back /><FutureUs /></div>;
  if (sub === 'calendar') return <div style={{ paddingBottom: 0 }}><Back /><Calendar /></div>;
  if (sub === 'trips')    return <div style={{ paddingBottom: 0 }}><Back /><TripPlanner /></div>;
  if (sub === 'capsule')  return <div style={{ paddingBottom: 0 }}><Back /><TimeCapsule /></div>;
  if (sub === 'playlist') return <PlaylistScreen onBack={() => setSub('main')} />;
  if (sub === 'collage')  return <PhotoCollage onBack={() => setSub('main')} />;

  // Main
  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Couple hero */}
      <div style={{ textAlign: 'center', padding: '24px 20px', background: 'linear-gradient(135deg, #FFF0F4, var(--bg))', borderRadius: 24, border: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <Avatar user="Alvin" size={60} ring />
          <Icon emoji="❤️" size={28} />
          <Avatar user="Paoi" size={60} ring />
        </div>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>Alvin <Icon emoji="❤️" size={18} /> Paoi</p>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 8 }}>
          {relationshipStart
            ? `Together since ${relationshipStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
            : <button onClick={() => navigate('settings')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', fontSize: 14, textDecoration: 'underline' }}><Icon emoji="💕" size={14} /> Đặt ngày bắt đầu yêu</button>}
        </p>
        <div style={{ display: 'inline-flex', gap: 12, background: 'var(--white)', borderRadius: 12, padding: '8px 16px', border: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--sakura-deep)' }}>{days.toLocaleString()}</p>
            <p style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 500 }}>Days</p>
          </div>
          <div style={{ width: 1, background: 'var(--border)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--sakura-deep)' }}>{dur.years}</p>
            <p style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 500 }}>Years</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        {[
          { val: state.memories.length.toString(), label: 'Memories' },
          { val: state.trips.length.toString(), label: 'Trips' },
          { val: state.loveNotes.length.toString(), label: 'Notes' },
          { val: state.playlist.length.toString(), label: 'Songs' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--sakura-deep)' }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Menu items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {([
          { label: 'Đơn Xin Phép', emoji: '📋', key: 'permit' as SubScreen,
            sub: (state.dateRequests.filter(r => r.to === currentUser && r.status === 'pending').length > 0
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon emoji="⚡" size={12} /> {state.dateRequests.filter(r => r.to === currentUser && r.status === 'pending').length} đơn chờ duyệt!</span>
              : `${state.dateRequests.length} đơn tổng cộng`) },
          { label: 'Nhật Ký Biết Ơn', emoji: '🌸', key: 'gratitude' as SubScreen, sub: `${state.gratitude.length} lần biết ơn` },
          { label: 'Hũ Hẹn Hò', emoji: '🫙', key: 'dateidea' as SubScreen, sub: 'Rút ý tưởng hẹn hò ngẫu nhiên' },
          { label: 'Gift Wishlist', labelIcon: '🎁', emoji: '🎁', key: 'wishjar' as SubScreen,
            sub: `${state.wishes.filter(w => !w.drawn).length} món đang chờ được mua` },
          { label: 'Our Story', emoji: '📖', key: 'story' as SubScreen, sub: 'Relationship timeline' },
          { label: 'Our Favourites', emoji: '💕', key: 'favorites' as SubScreen,
            sub: `${Object.values(state.favPlaces).flat().length} địa điểm yêu thích` },
          { label: 'Our Places', emoji: '📍', key: 'places' as SubScreen, sub: `${state.places.length} places visited` },
          { label: 'Playlist của mình', emoji: '🎵', key: 'playlist' as SubScreen, sub: `${state.playlist.length} bài hát` },
          { label: 'Trip Planner', labelIcon: '✈️', emoji: '🗺️', key: 'trips' as SubScreen, sub: `${state.trips.length} chuyến đi` },
          { label: 'Time Capsule', labelIcon: '💌', emoji: '⏳', key: 'capsule' as SubScreen, sub: `${state.capsules.length} thư` },
          { label: 'Photo Collage', emoji: '🖼️', key: 'collage' as SubScreen, sub: 'Tổng kết theo tháng từ memories' },
          { label: 'Future Us', emoji: '✨', key: 'future' as SubScreen, sub: `${state.goals.filter(g => !g.completed).length} dreams to achieve` },
          { label: 'Our Calendar', emoji: '📅', key: 'calendar' as SubScreen, sub: `${state.events.length} events` },
        ] as { label: string; labelIcon?: string; emoji: string; key: SubScreen; sub: ReactNode }[]).map(item => (
          <button key={item.key} onClick={() => setSub(item.key)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, cursor: 'pointer', transition: 'background 0.15s', textAlign: 'left', width: '100%' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--white)'}
          >
            <div style={{ width: 44, height: 44, background: 'var(--sakura-light)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji={item.emoji} size={22} /></div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>{item.label}{item.labelIcon && <Icon emoji={item.labelIcon} size={14} />}</p>
              <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{item.sub}</p>
            </div>
            <span style={{ color: 'var(--ink-2)', fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Our Favourites (multi-category) ─────────────── */
function OurPlacesScreen({ onBack }: { onBack: () => void }) {
  const { state, addPlace, deletePlace, myProfile } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [flag, setFlag] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [image, setImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [addError, setAddError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !myProfile?.coupleId) return;
    setAddError('');
    setPreviewUrl(URL.createObjectURL(file));
    setImage('');
    setUploading(true);
    uploadPlaceImage(myProfile.coupleId, file).then(url => {
      setUploading(false);
      if (url) setImage(url);
      else setAddError('Tải ảnh thất bại, thử lại nhé.');
    });
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    if (!image) { setAddError(uploading ? 'Đợi ảnh tải xong nhé.' : 'Chọn một ảnh trước đã.'); return; }
    addPlace({ name: name.trim(), flag: flag.trim() || undefined, image });
    setShowAdd(false);
    setName(''); setFlag(''); setImage(''); setPreviewUrl(''); setAddError('');
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
      <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--ink)', marginBottom: 20 }}>Our Places</p>

      <button onClick={() => setShowAdd(true)} style={{ width: '100%', padding: '13px', borderRadius: 14, border: '1.5px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>
        + Thêm địa điểm
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {state.places.map(pl => {
          const mems = state.memories.filter(m => pl.memoryIds.includes(m.id));
          return (
            <div key={pl.id} className="card" style={{ overflow: 'hidden', position: 'relative' }}>
              <button onClick={() => deletePlace(pl.id)} style={{ position: 'absolute', top: 10, right: 10, zIndex: 1, width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.4)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={13} /></button>
              <div style={{ height: 160, background: 'var(--sakura-light)', overflow: 'hidden' }}>
                <img src={pl.image} alt={pl.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: '14px 16px' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{pl.flag ? `${pl.flag} ` : ''}{pl.name}</p>
                <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>{mems.length} memor{mems.length === 1 ? 'y' : 'ies'}</p>
                {mems.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto' }}>
                    {mems.map(m => (
                      <div key={m.id} style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--sakura-light)' }}>
                        <img src={m.image} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {state.places.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-2)', fontSize: 14 }}>
            <Icon emoji="📍" size={36} style={{ display: 'block', marginBottom: 8 }} />
            Chưa có địa điểm nào.
          </div>
        )}
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: 'var(--white)', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 430, animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>Thêm địa điểm <Icon emoji="📍" size={18} /></p>
              <button onClick={() => setShowAdd(false)} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {previewUrl && (
                <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0, borderRadius: 12, overflow: 'hidden', border: '2.5px solid var(--sakura-deep)' }}>
                  <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: uploading ? 0.5 : 1 }} />
                  {uploading && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.5)', borderTopColor: 'white', animation: 'palvin-spin 0.7s linear infinite' }} />
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 12, border: '2px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >{previewUrl ? '↻' : '+'}</button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={e => { handleFile(e.target.files); e.target.value = ''; }}
                style={{ display: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="input-field" placeholder="Tên địa điểm (VD: Nhật Bản 🇯🇵)" value={name} onChange={e => setName(e.target.value)} />
              <input className="input-field" placeholder="Cờ/emoji (tuỳ chọn)" value={flag} onChange={e => setFlag(e.target.value)} maxLength={4} />
              {addError && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{addError}</p>}
            </div>
            <style>{`@keyframes palvin-spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn-ghost" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Huỷ</button>
              <button className="btn-primary" onClick={handleAdd} disabled={uploading} style={{ flex: 2, opacity: uploading ? 0.6 : 1 }}>{uploading ? 'Đang tải ảnh...' : 'Thêm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OurFavouritesScreen({ onBack }: { onBack: () => void }) {
  const { state, addFavPlace, removeFavPlace, updateFavorite } = useApp();
  const [activeTab, setActiveTab] = useState<FavCategory>('food');
  const [showAdd, setShowAdd] = useState(false);
  const [inputName, setInputName] = useState('');
  const [inputNote, setInputNote] = useState('');

  // Simple key-value favourites (song, movie kept)
  const [editingSong, setEditingSong] = useState(false);
  const [editingMovie, setEditingMovie] = useState(false);
  const [songInput, setSongInput] = useState('');
  const [movieInput, setMovieInput] = useState('');

  const cfg = FAV_CATEGORY_CONFIG.find(c => c.key === activeTab)!;
  const list = state.favPlaces[activeTab];

  const handleAdd = () => {
    if (!inputName.trim()) return;
    addFavPlace(activeTab, { name: inputName.trim(), note: inputNote.trim() || undefined });
    setInputName('');
    setInputNote('');
    setShowAdd(false);
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
      <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>Our Favourites <Icon emoji="💕" size={20} /></p>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 18 }}>Những nơi yêu thích của hai đứa mình.</p>

      {/* Simple favourites: Song + Movie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { key: 'song', emoji: '🎵', label: 'Our Song', editing: editingSong, val: state.favorites.song, onEdit: () => { setSongInput(state.favorites.song); setEditingSong(true); }, onSave: () => { updateFavorite('song', songInput); setEditingSong(false); }, input: songInput, setInput: setSongInput },
          { key: 'movie', emoji: '🎬', label: 'Fav Movie', editing: editingMovie, val: state.favorites.movie, onEdit: () => { setMovieInput(state.favorites.movie); setEditingMovie(true); }, onSave: () => { updateFavorite('movie', movieInput); setEditingMovie(false); }, input: movieInput, setInput: setMovieInput },
        ].map(f => (
          <div key={f.key} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Icon emoji={f.emoji} size={18} />
              <button onClick={f.editing ? f.onSave : f.onEdit} style={{ fontSize: 11, color: 'var(--sakura-deep)', background: 'var(--sakura-light)', border: 'none', borderRadius: 8, padding: '3px 8px', cursor: 'pointer', fontWeight: 600 }}>
                {f.editing ? 'Save' : 'Edit'}
              </button>
            </div>
            <p style={{ fontSize: 10, color: 'var(--ink-2)', fontWeight: 500, marginBottom: 4 }}>{f.label}</p>
            {f.editing
              ? <input className="input-field" value={f.input} onChange={e => f.setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && f.onSave()} autoFocus style={{ padding: '5px 8px', fontSize: 12 }} />
              : <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>{f.val || '—'}</p>
            }
          </div>
        ))}
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
        {FAV_CATEGORY_CONFIG.map(cat => (
          <button key={cat.key} onClick={() => { setActiveTab(cat.key); setShowAdd(false); }} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 99, border: 'none', background: activeTab === cat.key ? cat.color : 'var(--white)', color: activeTab === cat.key ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: activeTab === cat.key ? `0 4px 12px ${cat.color}40` : '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.2s' }}>
            <Icon emoji={cat.emoji} size={14} />
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Place list */}
      <div key={activeTab} className="screen-transition" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {list.map((pl, i) => (
          <div key={pl.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cfg.color}15`, border: `1.5px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 16, fontFamily: "'DM Serif Display', serif", color: cfg.color, fontWeight: 700 }}>{i + 1}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{pl.name}</p>
              {pl.note && <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{pl.note}</p>}
            </div>
            <button onClick={() => removeFavPlace(activeTab, pl.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', opacity: 0.35, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={14} /></button>
          </div>
        ))}
        {list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--ink-2)', fontSize: 14 }}>
            <Icon emoji={cfg.emoji} size={36} style={{ display: 'block', marginBottom: 8 }} />
            Chưa có địa điểm nào. Thêm vào nhé!
          </div>
        )}
      </div>

      {/* Add button */}
      {!showAdd ? (
        <button onClick={() => setShowAdd(true)} style={{ width: '100%', padding: '13px', borderRadius: 14, border: `1.5px dashed ${cfg.color}`, background: `${cfg.color}08`, color: cfg.color, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          + Thêm <Icon emoji={cfg.emoji} size={14} /> {cfg.label}
        </button>
      ) : (
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>Thêm <Icon emoji={cfg.emoji} size={14} /> {cfg.label} mới</p>
          <input className="input-field" placeholder={cfg.placeholder} value={inputName} onChange={e => setInputName(e.target.value)} style={{ marginBottom: 8 }} />
          <input className="input-field" placeholder="Ghi chú (tùy chọn)" value={inputNote} onChange={e => setInputNote(e.target.value)} style={{ marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowAdd(false); setInputName(''); setInputNote(''); }} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink-2)', fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
            <button onClick={handleAdd} style={{ flex: 2, padding: '11px', borderRadius: 12, border: 'none', background: cfg.color, color: 'white', fontWeight: 700, cursor: 'pointer' }}>Thêm</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Gift Wishlist ───────────────────────────────── */
type LinkPreview = { title?: string; image?: string; description?: string };

function GiftWishlistScreen({ onBack }: { onBack: () => void }) {
  const { state, currentUser, addWish, updateWish, removeWish, drawWish } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [wishText, setWishText] = useState('');
  const [wishLink, setWishLink] = useState('');
  const [wishPrice, setWishPrice] = useState('');
  const [filter, setFilter] = useState<'all' | 'Alvin' | 'Paoi' | 'bought'>('all');
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [editingWish, setEditingWish] = useState<WishItem | null>(null);
  const [editText, setEditText] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editOriginalLink, setEditOriginalLink] = useState('');
  const [editLinkPreview, setEditLinkPreview] = useState<LinkPreview | null>(null);
  const [editPreviewLoading, setEditPreviewLoading] = useState(false);
  const [confirmDeleteWish, setConfirmDeleteWish] = useState<string | null>(null);

  const other = currentUser === 'Alvin' ? 'Paoi' : 'Alvin';

  const filtered = state.wishes.filter(w => {
    if (filter === 'bought') return w.drawn;
    if (w.drawn) return false;
    if (filter === 'all') return true;
    return w.from === filter;
  });

  const closeAdd = () => {
    setShowAdd(false); setWishText(''); setWishLink(''); setWishPrice(''); setLinkPreview(null);
  };

  // Fetch a compact title/image/description preview for whatever link the
  // user pastes, via a client-side link-unfurling API — the app has no
  // backend of its own to do this CORS-safe fetch server-side, so it goes
  // straight from the browser. Debounced so it doesn't fire on every
  // keystroke. Note: it can't extract a price — that's rendered by JS on
  // most shop pages, not present in static page metadata — so price stays
  // a manual field.
  async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
    try {
      const apiKey = import.meta.env.VITE_MICROLINK_API_KEY as string | undefined;
      const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&palette=false${apiKey ? `&apiKey=${apiKey}` : ''}`);
      const json = await res.json();
      if (json.status === 'success') {
        return {
          title: json.data?.title ?? undefined,
          image: json.data?.image?.url ?? json.data?.logo?.url ?? undefined,
          description: json.data?.description ?? undefined,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const url = wishLink.trim();
    if (!/^https?:\/\/.+/i.test(url)) { setLinkPreview(null); setPreviewLoading(false); return; }
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      setLinkPreview(await fetchLinkPreview(url));
      setPreviewLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [wishLink]);

  function openEditWish(w: WishItem) {
    setEditingWish(w);
    setEditText(w.wish);
    setEditPrice(w.price ?? '');
    setEditLink(w.link ?? '');
    setEditOriginalLink(w.link ?? '');
    setEditLinkPreview((w.linkImage || w.linkTitle || w.linkDescription) ? { image: w.linkImage, title: w.linkTitle, description: w.linkDescription } : null);
  }
  function closeEditWish() {
    setEditingWish(null); setEditText(''); setEditPrice(''); setEditLink(''); setEditOriginalLink(''); setEditLinkPreview(null); setEditPreviewLoading(false);
  }

  // Re-fetch the preview only when the link actually changed, or when the
  // wish has a link but never had a preview stored (older items added
  // before this feature existed) — so opening edit on a legacy item
  // backfills it, but saving other fields on an already-previewed item
  // never wastes an API call.
  useEffect(() => {
    if (!editingWish) return;
    const url = editLink.trim();
    const unchanged = url === editOriginalLink.trim();
    if (unchanged && editLinkPreview) { setEditPreviewLoading(false); return; }
    if (!/^https?:\/\/.+/i.test(url)) { if (!unchanged) setEditLinkPreview(null); setEditPreviewLoading(false); return; }
    setEditPreviewLoading(true);
    const timer = setTimeout(async () => {
      setEditLinkPreview(await fetchLinkPreview(url));
      setEditPreviewLoading(false);
    }, unchanged ? 0 : 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editLink, editOriginalLink, editingWish]);

  function saveEditWish() {
    if (!editingWish || !editText.trim()) return;
    updateWish(editingWish.id, {
      wish: editText.trim(),
      price: editPrice || undefined,
      link: editLink || undefined,
      linkImage: editLink ? editLinkPreview?.image : undefined,
      linkTitle: editLink ? editLinkPreview?.title : undefined,
      linkDescription: editLink ? editLinkPreview?.description : undefined,
    });
    closeEditWish();
  }

  function renderWishCard(w: WishItem, index: number) {
    const isOwner = w.from === currentUser;
    const isBought = w.drawn;
    return (
      <div key={w.id} className="card wish-card" style={{ padding: '14px 16px', opacity: isBought ? 0.6 : 1, animation: `wishCardIn 0.3s cubic-bezier(0.32,0.72,0,1) both`, animationDelay: `${Math.min(index, 6) * 30}ms` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: isBought ? 'var(--bg)' : (w.from === 'Paoi' ? '#FFE4EC' : '#E4ECFF'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s ease' }}>
            <Icon emoji={isBought ? '✅' : (w.from === 'Paoi' ? '💗' : '💙')} size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', textDecoration: isBought ? 'line-through' : 'none', lineHeight: 1.3 }}>{w.wish}</p>
            <p style={{ fontSize: 11, color: 'var(--sakura-deep)', marginTop: 3, fontWeight: 600 }}>{w.from}'s wishlist · {w.date}</p>
            {w.price && <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="💰" size={12} /> {/^\d+$/.test(w.price) ? `${Number(w.price).toLocaleString('vi-VN')} VND` : w.price}</p>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {!isBought && (
              <button className="wish-action-btn" onClick={() => drawWish(w.id, true)} style={{ background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', border: 'none', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>Đã mua <Icon emoji="🎁" size={12} /></button>
            )}
            {isBought && (
              <button className="wish-action-btn" onClick={() => drawWish(w.id, false)} style={{ background: 'var(--bg)', color: 'var(--ink-2)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>Hoàn tác <Icon emoji="↩️" size={12} /></button>
            )}
            {isOwner && (
              <>
                <button className="wish-action-btn" onClick={() => openEditWish(w)} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 26, height: 26, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✏️" size={12} /></button>
                <button className="wish-action-btn" onClick={() => setConfirmDeleteWish(w.id)} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 26, height: 26, cursor: 'pointer', color: '#E8524A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="🗑️" size={12} /></button>
              </>
            )}
          </div>
        </div>
        {w.link && (
          <a href={w.link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: 8, background: 'var(--bg)', borderRadius: 10, textDecoration: 'none', minWidth: 0 }}>
            {w.linkImage
              ? <img src={w.linkImage} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji="🔗" size={16} /></div>}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, color: '#4A8AE8', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.linkTitle || w.link}</p>
              {w.linkDescription && <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{w.linkDescription}</p>}
            </div>
          </a>
        )}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      <style>{`
        @keyframes wishCardIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .wish-tab-btn { transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.12s ease; }
        .wish-tab-btn:active { transform: scale(0.95); }
        .wish-action-btn { transition: background 0.2s ease, color 0.2s ease, transform 0.12s ease, opacity 0.2s ease; }
        .wish-action-btn:active { transform: scale(0.94); }
        .wish-card { transition: opacity 0.25s ease; }
      `}</style>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
      <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>Gift Wishlist <Icon emoji="🎁" size={20} /></p>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>Những món đồ muốn mua — để bên kia biết mà tặng quà!</p>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { k: 'all', label: 'Tất cả', count: state.wishes.filter(w => !w.drawn).length },
          { k: 'Alvin', label: "Alvin's list", count: state.wishes.filter(w => !w.drawn && w.from === 'Alvin').length },
          { k: 'Paoi', label: "Paoi's list", count: state.wishes.filter(w => !w.drawn && w.from === 'Paoi').length },
          { k: 'bought', label: 'Đã mua', count: state.wishes.filter(w => w.drawn).length },
        ].map(f => (
          <button key={f.k} className="wish-tab-btn" onClick={() => setFilter(f.k as typeof filter)} style={{ padding: '6px 14px', borderRadius: 99, border: filter === f.k ? 'none' : '1.5px solid var(--border)', background: filter === f.k ? 'var(--sakura-accent)' : 'var(--white)', color: filter === f.k ? 'white' : 'var(--ink-2)', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {f.label}
            <span style={{
              minWidth: 17, height: 17, padding: '0 4px', borderRadius: 99, fontSize: 10, fontWeight: 800,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: filter === f.k ? 'rgba(255,255,255,0.3)' : 'var(--sakura-light)',
              color: filter === f.k ? 'white' : 'var(--sakura-deep)',
            }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Add button */}
      <button onClick={() => setShowAdd(true)} style={{ width: '100%', padding: '13px', borderRadius: 14, border: '1.5px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        + Thêm món đồ vào wishlist <Icon emoji="🎁" size={14} />
      </button>

      {/* List — key={filter} remounts the whole batch on tab switch so it replays the entrance animation together */}
      <div key={filter} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((w, i) => renderWishCard(w, i))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-2)', fontSize: 14 }}>
            <Icon emoji="🎁" size={36} style={{ display: 'block', marginBottom: 8 }} />
            Chưa có gì trong wishlist này cả!
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeAdd}>
          <div style={{ width: '100%', maxWidth: 380, maxHeight: '80vh', transform: 'translateY(-40px)' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', maxHeight: '80vh', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>Thêm vào wishlist <Icon emoji="🎁" size={18} /></p>
                <button onClick={closeAdd} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 14 }}>Đang thêm cho <strong>{currentUser}</strong> — {other} sẽ thấy và có thể mua tặng!</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input className="input-field" placeholder="Tên món đồ muốn mua..." value={wishText} onChange={e => setWishText(e.target.value)} />
                <AmountInput placeholder="Giá tham khảo (VND, tùy chọn)" value={wishPrice} onChange={setWishPrice} />
                <input className="input-field" placeholder="Link sản phẩm (tùy chọn)" value={wishLink} onChange={e => setWishLink(e.target.value)} />
                {previewLoading && <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>Đang lấy thông tin từ link...</p>}
                {!previewLoading && linkPreview && (linkPreview.image || linkPreview.title) && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    {linkPreview.image
                      ? <img src={linkPreview.image} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji="🔗" size={18} /></div>}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{linkPreview.title || 'Đã lấy được ảnh sản phẩm'}</p>
                      {linkPreview.description && <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{linkPreview.description}</p>}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (wishText.trim()) {
                      addWish({
                        from: currentUser,
                        wish: wishText.trim(),
                        date: new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }),
                        ...(wishPrice ? { price: wishPrice } : {}),
                        ...(wishLink ? { link: wishLink } : {}),
                        ...(linkPreview?.image ? { linkImage: linkPreview.image } : {}),
                        ...(linkPreview?.title ? { linkTitle: linkPreview.title } : {}),
                        ...(linkPreview?.description ? { linkDescription: linkPreview.description } : {}),
                      });
                      closeAdd();
                    }
                  }}
                  style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >Thêm vào wishlist <Icon emoji="🎁" size={15} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingWish && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeEditWish}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: '80vh', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>Sửa wishlist <Icon emoji="✏️" size={18} /></p>
              <button onClick={closeEditWish} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="input-field" placeholder="Tên món đồ muốn mua..." value={editText} onChange={e => setEditText(e.target.value)} />
              <AmountInput placeholder="Giá tham khảo (VND, tùy chọn)" value={editPrice} onChange={setEditPrice} />
              <input className="input-field" placeholder="Link sản phẩm (tùy chọn)" value={editLink} onChange={e => setEditLink(e.target.value)} />
              {editPreviewLoading && <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>Đang lấy thông tin từ link...</p>}
              {!editPreviewLoading && editLinkPreview && (editLinkPreview.image || editLinkPreview.title) && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  {editLinkPreview.image
                    ? <img src={editLinkPreview.image} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji="🔗" size={18} /></div>}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{editLinkPreview.title || 'Đã lấy được ảnh sản phẩm'}</p>
                    {editLinkPreview.description && <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{editLinkPreview.description}</p>}
                  </div>
                </div>
              )}
              <button
                onClick={saveEditWish}
                disabled={!editText.trim()}
                style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: editText.trim() ? 'pointer' : 'default', background: editText.trim() ? 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))' : 'var(--border)', color: editText.trim() ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >Lưu thay đổi <Icon emoji="✓" size={15} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete wish */}
      {confirmDeleteWish && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDeleteWish(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Xóa món này khỏi wishlist?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>Không thể hoàn tác sau khi xóa.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDeleteWish(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Hủy</button>
              <button onClick={() => { removeWish(confirmDeleteWish); setConfirmDeleteWish(null); }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Playlist screen ─────────────────────────────── */
function PlaylistScreen({ onBack }: { onBack: () => void }) {
  const { state, currentUser, addToPlaylist, removeFromPlaylist } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [note, setNote] = useState('');
  const [emoji, setEmoji] = useState('🎵');
  const EMOJIS = ['🎵', '🎶', '🎸', '🎹', '🎤', '🎼', '💿', '🎧', '✨', '💕'];

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>Playlist của mình <Icon emoji="🎵" size={20} /></p>
        <button onClick={() => setShowAdd(true)} style={{ background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', border: 'none', borderRadius: 12, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Thêm</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {state.playlist.map((p, i) => (
          <div key={p.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, background: 'var(--sakura-light)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji={p.emoji} size={22} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</p>
              <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{p.artist}</p>
              {p.note && <p style={{ fontSize: 11, color: 'var(--sakura-accent)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="💬" size={11} /> {p.note}</p>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 10, color: 'var(--ink-2)', marginBottom: 4 }}>by {p.addedBy}</p>
              <button onClick={() => removeFromPlaylist(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', opacity: 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={12} /></button>
            </div>
          </div>
        ))}
        {state.playlist.length === 0 && <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-2)', fontSize: 14 }}>Chưa có bài hát nào. Thêm bài hát đầu tiên!</div>}
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: 'var(--white)', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 430, animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)' }}>Thêm bài hát</p>
              <button onClick={() => setShowAdd(false)} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {EMOJIS.map(e => <button key={e} onClick={() => setEmoji(e)} style={{ width: 36, height: 36, border: emoji === e ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', borderRadius: 10, background: emoji === e ? 'var(--sakura-light)' : 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji={e} size={18} /></button>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="input-field" placeholder="Tên bài hát" value={title} onChange={e => setTitle(e.target.value)} />
              <input className="input-field" placeholder="Nghệ sĩ" value={artist} onChange={e => setArtist(e.target.value)} />
              <input className="input-field" placeholder="Ghi chú (tùy chọn)" value={note} onChange={e => setNote(e.target.value)} />
              <button onClick={() => { if (title && artist) { addToPlaylist({ title, artist, emoji, note, addedBy: currentUser }); setShowAdd(false); setTitle(''); setArtist(''); setNote(''); } }} style={{ padding: '12px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15 }}>Thêm vào playlist</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Photo Collage ───────────────────────────────── */
function PhotoCollage({ onBack }: { onBack: () => void }) {
  const { state } = useApp();

  const byMonth: Record<string, typeof state.memories> = {};
  for (const m of state.memories) {
    const d = new Date(m.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(m);
  }
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  const formatMonth = (key: string) => {
    const [y, m] = key.split('-');
    return new Date(+y, +m - 1).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
      <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>Photo Collage <Icon emoji="🖼️" size={20} /></p>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>Memories tổng hợp theo tháng.</p>

      {months.map(key => {
        const mems = byMonth[key];
        const grid4 = mems.slice(0, 4);
        const rest = mems.length - 4;
        return (
          <div key={key} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{formatMonth(key)}</p>
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{mems.length} memory</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {grid4.map((m, i) => (
                <div key={m.id} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', aspectRatio: '1', background: 'var(--sakura-light)' }}>
                  <img src={m.image} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {i === 3 && rest > 0 && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(51,42,45,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: 'white' }}>+{rest}</p>
                    </div>
                  )}
                </div>
              ))}
              {grid4.length < 2 && <div style={{ borderRadius: 14, background: 'var(--bg)', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="🌸" size={32} /></div>}
            </div>
          </div>
        );
      })}

      {months.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Icon emoji="🖼️" size={48} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>Chưa có memories nào. Thêm memories để tạo collage!</p>
        </div>
      )}
    </div>
  );
}
