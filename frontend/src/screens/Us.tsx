import { useState, useEffect, useLayoutEffect, useRef, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { useApp } from '../context';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import FadeImage from '../components/FadeImage';
import AmountInput from '../components/AmountInput';
import FilterCountBadge from '../components/FilterCountBadge';
import SwipeToReveal from '../components/SwipeToReveal';
import { getDaysTogether, getDuration } from '../data';
import { uploadFavPlaceImage } from '../favourites';
import { uploadPlaceImage } from '../places';
import { uploadWishImage } from '../wishes';
import type { FavCategory, FavCategoryItem, FavPlace, PlaylistItem, WishItem, StoryQuote, Debt, Place } from '../types';

// These sub-screens are only ever visited from within Us's own internal
// navigation (never all at once), so — same as App.tsx's top-level
// screens — they're lazy-loaded rather than statically bundled straight
// into Us's own chunk, which was otherwise the second-largest in the app
// (191KB) purely from sub-screens most sessions never open. Calendar and
// FutureUs are lazy() here for the same reason AND to match how App.tsx
// itself lazy-imports them for their own top-level routes — two static
// imports of the same module (one here, one there) risked Vite bundling
// the same code twice instead of sharing one async chunk.
const FutureUs = lazy(() => import('./FutureUs'));
const Calendar = lazy(() => import('./Calendar'));
const TripPlanner = lazy(() => import('./TripPlanner'));
const TimeCapsule = lazy(() => import('./TimeCapsule'));
const DateIdeaJar = lazy(() => import('./DateIdeaJar'));
const GratitudeJournal = lazy(() => import('./GratitudeJournal'));
const DatePermit = lazy(() => import('./DatePermit'));

function SubScreenLoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--sakura-accent)', animation: 'palvin-us-sub-spin 0.7s linear infinite' }} />
      <style>{`@keyframes palvin-us-sub-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

type SubScreen = 'main' | 'story' | 'favorites' | 'future' | 'calendar' | 'trips' | 'capsule' | 'playlist' | 'collage' | 'wishjar' | 'dateidea' | 'gratitude' | 'permit' | 'quotes' | 'debts' | 'places';

// Remembers which sub-screen was showing when the user drilled into a
// separate top-level screen (e.g. a memory's detail page) from within Us —
// so coming back via that screen's own Back button (goBack/pop) restores
// it, while a fresh tap on the Us tab in the bottom nav (navigate/push)
// still resets to 'main'. Module-level so it survives Us unmounting.
let lastUsSub: SubScreen = 'main';

// Picker choices offered when creating/editing a favourites category —
// categories themselves are user-defined and stored in fav_categories now,
// not a fixed set, so these are just reasonable starting options.
const CATEGORY_EMOJI_CHOICES = ['📍', '🍜', '☕', '🎱', '🎮', '🎬', '🎵', '✈️', '🏋️', '📚', '🛍️', '🎨', '🍕', '🍺'];
const CATEGORY_COLOR_CHOICES = ['var(--sakura-deep)', '#E8844A', '#C48A52', '#4A8AE8', '#8B6FD4', '#5AC26A', '#DC2626', '#E85C97'];

// A place's photos gallery — natural aspect ratio (not cropped to a fixed
// box like FadeImage assumes), so this fades in on load instead of reusing
// that component directly.
function ViewingImage({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  useLayoutEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [src]);
  return (
    <img
      ref={imgRef}
      src={src}
      alt=""
      onLoad={() => setLoaded(true)}
      style={{ width: '100%', borderRadius: 12, objectFit: 'cover', display: 'block', background: 'var(--bg)', opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
    />
  );
}

export default function Us() {
  const { state, navigate, screen, selectedId, navSeq, lastNavWasPop, currentUser, partnerProfile, addToPlaylist, removeFromPlaylist, addWish, removeWish, addFavPlace, removeFavPlace, openCreate } = useApp();
  // A tapped date-request notification lands on the "Us" screen with a real
  // dateRequests id attached (a plain tab click never carries one) — go
  // straight to 'permit'. Otherwise, if we're remounting because the user
  // came back via a deeper screen's own Back button (a goBack/pop), restore
  // whatever sub-screen they were on before drilling in. A fresh bottom-nav
  // tap on the Us tab is always a push, so it falls through to 'main'.
  const [sub, setSub] = useState<SubScreen>(() => {
    if (screen === 'us' && selectedId) return 'permit';
    // Unlike 'us' (the generic hub, reached many ways — selectedId is what
    // disambiguates a date-permit notification tap from a plain tab visit),
    // 'wishlist' is ONLY ever set by a wish notification, so the screen
    // value alone is enough — a "wish deleted" notification, or any old one
    // from before target_id existed, still has no selectedId at all.
    if (screen === 'wishlist') return 'wishjar';
    // Same idea, for the dashboard's Gratitude stat tile.
    if (screen === 'gratitude') return 'gratitude';
    if (screen === 'us' && lastNavWasPop) return lastUsSub;
    return 'main';
  });
  // Captured once at mount. React 18 StrictMode double-invokes effects right
  // after mount (mount → cleanup → mount again) without changing navSeq in
  // between, so comparing against this snapshot — rather than a "first run"
  // flag that gets consumed by the very first (synthetic) invocation — is
  // what actually survives that double-invoke unscathed.
  const mountNavSeq = useRef(navSeq);
  const relationshipStart = state.relationshipStart ? new Date(state.relationshipStart + 'T00:00:00') : null;
  const days = relationshipStart ? getDaysTogether(relationshipStart) : 0;
  const dur  = relationshipStart ? getDuration(relationshipStart) : { years: 0, months: 0, days: 0 };

  // Covers the case where Us is already mounted (not remounted) and a new
  // notification tap arrives while the user is already sitting on this screen.
  useEffect(() => {
    if (screen === 'us' && selectedId) setSub('permit');
    if (screen === 'wishlist') setSub('wishjar');
    if (screen === 'gratitude') setSub('gratitude');
  }, [screen, selectedId]);

  // Re-tapping the Us tab while already sitting inside it doesn't remount
  // this component (the screen value doesn't change), so this is the only
  // way to catch it: navSeq bumps on every navigate() push, and resets us
  // back to the main menu — but only once it's actually moved past the
  // value captured at mount, so it doesn't undo the restore above.
  useEffect(() => {
    if (navSeq === mountNavSeq.current) return;
    if (screen === 'us' && !selectedId) setSub('main');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navSeq]);

  useEffect(() => { lastUsSub = sub; }, [sub]);

  // Remembers how far the user had scrolled the main menu before drilling
  // into a sub-screen, so coming back (via that screen's own Back button)
  // lands them right back where they were instead of snapping to the top.
  // Us itself stays mounted across this whole round trip (it's local `sub`
  // state, not a `screen` change), so a plain ref survives it fine.
  const mainScrollRef = useRef(0);
  const goToSub = (key: SubScreen) => {
    const el = document.querySelector('main');
    if (el) mainScrollRef.current = el.scrollTop;
    setSub(key);
  };
  useEffect(() => {
    if (sub !== 'main') return;
    const el = document.querySelector('main');
    if (el) el.scrollTop = mainScrollRef.current;
  }, [sub]);

  const Back = () => (
    <button onClick={() => setSub('main')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
  );

  // The whole sub-screen tree is keyed on `sub` and wrapped in the same
  // .screen-transition fade used app-wide for top-level screen changes
  // (see App.tsx) — Us's own internal navigation never touched that
  // mechanism before since it's local state, not a `screen` change.
  let content: ReactNode;

  if (sub === 'wishjar')  content = <GiftWishlistScreen onBack={() => setSub('main')} initialWishId={selectedId ?? undefined} />;
  else if (sub === 'dateidea') content = <DateIdeaJar onBack={() => setSub('main')} />;
  else if (sub === 'gratitude') content = <GratitudeJournal onBack={() => setSub('main')} />;
  else if (sub === 'permit')   content = <DatePermit onBack={() => setSub('main')} initialRequestId={selectedId ?? undefined} />;
  else if (sub === 'story') {
    const timeline = [...state.memories].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    content = (
      <div style={{ paddingBottom: 32 }}>
        <Back />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, color: 'var(--ink)' }}>Our Story</p>
          <button onClick={() => openCreate('memory')} style={{ background: 'var(--sakura-light)', border: 'none', borderRadius: 12, padding: '8px 14px', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            + Add memory <Icon emoji="🌸" size={14} />
          </button>
        </div>
        {timeline.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Icon emoji="🌸" size={40} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>No memories yet</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Add a memory to start your story together.</p>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 29, top: 0, bottom: 0, width: 3, background: 'var(--sakura-light)' }} />
            {timeline.map(m => (
              <div key={m.id} onClick={() => navigate('memory-detail', m.id)} style={{ display: 'flex', gap: 18, marginBottom: 28, position: 'relative', cursor: 'pointer' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--sakura)', flexShrink: 0, zIndex: 1, background: 'var(--sakura-light)' }}>
                  <FadeImage src={m.image} alt="" style={{ width: '100%', height: '100%' }} />
                </div>
                <div style={{ paddingTop: 10 }}>
                  <p style={{ fontSize: 13, color: 'var(--sakura-accent)', fontWeight: 600, marginBottom: 3 }}>{m.date}</p>
                  <p style={{ fontSize: 17, color: 'var(--ink)', fontWeight: 700 }}>{m.title}</p>
                  {m.location && <p style={{ fontSize: 13, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}><Icon emoji="📍" size={13} /> {m.location}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  else if (sub === 'favorites') content = <OurFavouritesScreen onBack={() => setSub('main')} />;
  else if (sub === 'future')   content = <div style={{ paddingBottom: 0 }}><Back /><FutureUs /></div>;
  else if (sub === 'calendar') content = <div style={{ paddingBottom: 0 }}><Back /><Calendar /></div>;
  else if (sub === 'trips')    content = <TripPlanner onBack={() => setSub('main')} />;
  else if (sub === 'capsule')  content = <div style={{ paddingBottom: 0 }}><Back /><TimeCapsule /></div>;
  else if (sub === 'playlist') content = <PlaylistScreen onBack={() => setSub('main')} />;
  else if (sub === 'collage')  content = <PhotoCollage onBack={() => setSub('main')} />;
  else if (sub === 'quotes')   content = <StoryQuotesScreen onBack={() => setSub('main')} />;
  else if (sub === 'debts')    content = <DebtScreen onBack={() => setSub('main')} />;
  else if (sub === 'places')   content = <OurPlacesScreen onBack={() => setSub('main')} />;
  else {

  // Main
  content = (
    <div style={{ paddingBottom: 32 }}>
      {/* Couple hero */}
      <div style={{ textAlign: 'center', padding: '24px 20px', background: 'linear-gradient(135deg, var(--pink-glow), var(--bg))', borderRadius: 24, border: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <Avatar user={currentUser} size={60} ring />
          <Icon emoji="❤️" size={28} />
          <Avatar user={partnerProfile?.displayName ?? currentUser} size={60} ring />
        </div>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 23, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{currentUser}{partnerProfile && <><Icon emoji="❤️" size={18} /> {partnerProfile.displayName}</>}</p>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 8 }}>
          {relationshipStart
            ? `Together since ${relationshipStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
            : <button onClick={() => navigate('settings')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', fontSize: 14, textDecoration: 'underline' }}><Icon emoji="💕" size={14} /> Set your relationship start date</button>}
        </p>
        <div style={{ display: 'inline-flex', gap: 12, background: 'var(--white)', borderRadius: 12, padding: '8px 16px', border: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, fontWeight: 700, color: 'var(--sakura-deep)' }}>{days.toLocaleString()}</p>
            <p style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 500 }}>Days</p>
          </div>
          <div style={{ width: 1, background: 'var(--border)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, color: 'var(--sakura-deep)' }}>{dur.years}</p>
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
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 23, color: 'var(--sakura-deep)' }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Menu items — grouped from most forward-facing/frequent (planning
          together, daily rituals) down to reflective/archival (memories,
          keepsakes), instead of the old accretion order (newest feature
          tacked onto the bottom regardless of how it relates to the rest). */}
      {([
        {
          title: 'Plan together',
          items: [
            { label: 'Our Calendar', emoji: '📅', key: 'calendar' as SubScreen, sub: `${state.events.length} events` },
            { label: 'Future Us', emoji: '✨', key: 'future' as SubScreen, sub: `${state.goals.filter(g => !g.completed).length} dreams to achieve` },
            { label: 'Date Permit', emoji: '📋', key: 'permit' as SubScreen,
              sub: (state.dateRequests.filter(r => r.to === currentUser && r.status === 'pending').length > 0
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon emoji="⚡" size={12} /> {state.dateRequests.filter(r => r.to === currentUser && r.status === 'pending').length} request(s) awaiting approval!</span>
                : `${state.dateRequests.length} requests total`) },
            { label: 'Date Idea Jar', emoji: '🫙', key: 'dateidea' as SubScreen, sub: 'Draw a random date idea' },
            { label: 'Trip Planner', labelIcon: '✈️', emoji: '🗺️', key: 'trips' as SubScreen, sub: `${state.trips.length} trips` },
          ],
        },
        {
          title: 'Daily rituals',
          items: [
            { label: 'Gratitude Journal', emoji: '🌸', key: 'gratitude' as SubScreen, sub: `${state.gratitude.length} things you're grateful for` },
            { label: 'Quote of the Day', emoji: '💬', key: 'quotes' as SubScreen, sub: `${state.storyQuotes.length} quotes — changes daily on the Dashboard` },
            { label: 'Our Playlist', emoji: '🎵', key: 'playlist' as SubScreen, sub: `${state.playlist.length} songs` },
          ],
        },
        {
          title: 'Gifts & extras',
          items: [
            { label: 'Gift Wishlist', labelIcon: '🎁', emoji: '🎁', key: 'wishjar' as SubScreen,
              sub: `${state.wishes.filter(w => !w.drawn).length} item(s) waiting to be bought` },
            { label: 'Our Favourites', emoji: '💕', key: 'favorites' as SubScreen,
              sub: `${Object.values(state.favPlaces).flat().length} favourite spots` },
            { label: 'Debt Tracker', emoji: '📒', key: 'debts' as SubScreen,
              sub: (() => {
                const unpaid = state.debts.filter(d => !d.paid);
                return unpaid.length > 0 ? `${unpaid.length} people owe you` : 'No one owes you yet';
              })() },
          ],
        },
        {
          title: 'Memories & keepsakes',
          items: [
            { label: 'Time Capsule', labelIcon: '💌', emoji: '⏳', key: 'capsule' as SubScreen, sub: `${state.capsules.length} letters` },
            { label: 'Our Story', emoji: '📖', key: 'story' as SubScreen, sub: 'Relationship timeline' },
            { label: 'Photo Collage', emoji: '🖼️', key: 'collage' as SubScreen, sub: 'A month-by-month recap from your memories' },
            { label: "Places We've Been", emoji: '🗺️', key: 'places' as SubScreen, sub: `${state.places.length} saved places` },
          ],
        },
      ] as { title: string; items: { label: string; labelIcon?: string; emoji: string; key: SubScreen; sub: ReactNode }[] }[]).map(group => (
        <div key={group.title} style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 8, padding: '0 4px' }}>{group.title}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.items.map(item => (
              <button key={item.key} onClick={() => goToSub(item.key)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, cursor: 'pointer', transition: 'background 0.15s', textAlign: 'left', width: '100%' }}
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
      ))}
    </div>
  );
  }

  return (
    <div key={sub} className="screen-transition">
      <Suspense fallback={<SubScreenLoadingFallback />}>{content}</Suspense>
    </div>
  );
}

function OurFavouritesScreen({ onBack }: { onBack: () => void }) {
  const { state, myProfile, addFavPlace, updateFavPlace, removeFavPlace, addFavCategory, updateFavCategory, removeFavCategory } = useApp();
  const [activeTab, setActiveTab] = useState<FavCategory>('');
  const [showAdd, setShowAdd] = useState(false);
  const [inputName, setInputName] = useState('');
  const [inputNote, setInputNote] = useState('');
  const [inputPreview, setInputPreview] = useState('');
  const [inputImage, setInputImage] = useState('');
  const [inputUploading, setInputUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingPlace, setEditingPlace] = useState<FavPlace | null>(null);
  const [editPlaceName, setEditPlaceName] = useState('');
  const [editPlaceNote, setEditPlaceNote] = useState('');
  const [editPlacePreview, setEditPlacePreview] = useState('');
  const [editPlaceImage, setEditPlaceImage] = useState('');
  const [editPlaceUploading, setEditPlaceUploading] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeletePlace, setConfirmDeletePlace] = useState<FavPlace | null>(null);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState(CATEGORY_EMOJI_CHOICES[0]);
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLOR_CHOICES[0]);

  const [editingCategory, setEditingCategory] = useState<FavCategoryItem | null>(null);
  const [editCatLabel, setEditCatLabel] = useState('');
  const [editCatEmoji, setEditCatEmoji] = useState('');
  const [editCatColor, setEditCatColor] = useState('');
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<FavCategoryItem | null>(null);

  // Keep a valid tab selected as categories load in or get deleted out from
  // under the current selection.
  useEffect(() => {
    if (state.favCategories.length === 0) { if (activeTab) setActiveTab(''); return; }
    if (!state.favCategories.some(c => c.id === activeTab)) setActiveTab(state.favCategories[0].id);
  }, [state.favCategories, activeTab]);

  const cfg = state.favCategories.find(c => c.id === activeTab);
  const list = cfg ? (state.favPlaces[activeTab] ?? []) : [];

  const [addingPlace, setAddingPlace] = useState(false);
  const closeAdd = () => { setShowAdd(false); setInputName(''); setInputNote(''); setInputPreview(''); setInputImage(''); };
  const handleAddFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !myProfile?.coupleId) return;
    setInputPreview(URL.createObjectURL(file));
    setInputImage('');
    setInputUploading(true);
    uploadFavPlaceImage(myProfile.coupleId, file).then(url => {
      setInputUploading(false);
      if (url) setInputImage(url);
    });
  };
  const handleAdd = async () => {
    if (!inputName.trim() || !cfg) return;
    setAddingPlace(true);
    await addFavPlace(activeTab, { name: inputName.trim(), note: inputNote.trim() || undefined, image: inputImage || undefined });
    setAddingPlace(false);
    closeAdd();
  };

  const openEditPlace = (pl: FavPlace) => {
    setEditingPlace(pl); setEditPlaceName(pl.name); setEditPlaceNote(pl.note ?? ''); setEditPlacePreview(pl.image ?? ''); setEditPlaceImage(pl.image ?? '');
  };
  const closeEditPlace = () => { setEditingPlace(null); setEditPlaceName(''); setEditPlaceNote(''); setEditPlacePreview(''); setEditPlaceImage(''); };
  const handleEditFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !myProfile?.coupleId) return;
    setEditPlacePreview(URL.createObjectURL(file));
    setEditPlaceImage('');
    setEditPlaceUploading(true);
    uploadFavPlaceImage(myProfile.coupleId, file).then(url => {
      setEditPlaceUploading(false);
      if (url) setEditPlaceImage(url);
    });
  };
  const handleSavePlace = () => {
    if (!editingPlace || !editPlaceName.trim()) return;
    updateFavPlace(activeTab, editingPlace.id, { name: editPlaceName.trim(), note: editPlaceNote.trim() || undefined, image: editPlaceImage || undefined });
    closeEditPlace();
  };

  const closeAddCategory = () => { setShowAddCategory(false); setNewCatLabel(''); setNewCatEmoji(CATEGORY_EMOJI_CHOICES[0]); setNewCatColor(CATEGORY_COLOR_CHOICES[0]); };
  const handleAddCategory = () => {
    if (!newCatLabel.trim()) return;
    addFavCategory({ label: newCatLabel.trim(), emoji: newCatEmoji, color: newCatColor });
    closeAddCategory();
  };

  const openEditCategory = (cat: FavCategoryItem) => {
    setEditingCategory(cat); setEditCatLabel(cat.label); setEditCatEmoji(cat.emoji); setEditCatColor(cat.color);
  };
  const closeEditCategory = () => setEditingCategory(null);
  const handleSaveCategory = () => {
    if (!editingCategory || !editCatLabel.trim()) return;
    updateFavCategory(editingCategory.id, { label: editCatLabel.trim(), emoji: editCatEmoji, color: editCatColor });
    closeEditCategory();
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>Our Favourites <Icon emoji="💕" size={20} /></p>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 18 }}>Your favourite places together.</p>

      {/* Category tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {state.favCategories.map(cat => (
          <button key={cat.id} onClick={() => { setActiveTab(cat.id); setShowAdd(false); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 99, border: 'none', background: activeTab === cat.id ? cat.color : 'var(--white)', color: activeTab === cat.id ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: activeTab === cat.id ? `0 4px 12px ${cat.color}40` : '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.2s' }}>
            <Icon emoji={cat.emoji} size={14} />
            <span>{cat.label}</span>
          </button>
        ))}
        <button onClick={() => setShowAddCategory(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 99, border: '1.5px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          + New
        </button>
      </div>

      {cfg && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginBottom: 16 }}>
          <button onClick={() => openEditCategory(cfg)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}><Icon emoji="✏️" size={12} /> Edit category</button>
          <button onClick={() => setConfirmDeleteCategory(cfg)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E8524A', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}><Icon emoji="🗑️" size={12} /> Delete category</button>
        </div>
      )}

      {/* Place list */}
      <div key={activeTab} className="screen-transition" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {list.map((pl, i) => (
          <SwipeToReveal
            key={pl.id}
            actions={
              <>
                <button onClick={() => openEditPlace(pl)} style={{ width: 64, border: 'none', background: '#4A8AE8', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer' }}>
                  <Icon emoji="✏️" size={16} /><span style={{ fontSize: 10, fontWeight: 700 }}>Edit</span>
                </button>
                <button onClick={() => setConfirmDeletePlace(pl)} style={{ width: 64, border: 'none', background: '#DC2626', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer' }}>
                  <Icon emoji="🗑️" size={16} /><span style={{ fontSize: 10, fontWeight: 700 }}>Delete</span>
                </button>
              </>
            }
          >
            <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              {pl.image
                ? <FadeImage src={pl.image} alt="" style={{ width: 68, height: 68, borderRadius: 14, flexShrink: 0 }} />
                : (
                  <div style={{ width: 68, height: 68, borderRadius: 14, background: `${cfg?.color}15`, border: `1.5px solid ${cfg?.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 25, fontFamily: "'Playfair Display', serif", color: cfg?.color, fontWeight: 700 }}>{i + 1}</span>
                  </div>
                )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{pl.name}</p>
                {pl.note && <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 3 }}>{pl.note}</p>}
              </div>
            </div>
          </SwipeToReveal>
        ))}
        {cfg && list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--ink-2)', fontSize: 14 }}>
            <Icon emoji={cfg.emoji} size={36} style={{ display: 'block', marginBottom: 8 }} />
            No places here yet. Add one!
          </div>
        )}
        {!cfg && (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--ink-2)', fontSize: 14 }}>
            <Icon emoji="💕" size={36} style={{ display: 'block', marginBottom: 8 }} />
            No categories yet. Tap "+ New" to create one!
          </div>
        )}
      </div>

      {/* Add place button */}
      {cfg && (
        <button onClick={() => setShowAdd(true)} style={{ width: '100%', padding: '13px', borderRadius: 14, border: `1.5px dashed ${cfg.color}`, background: `${cfg.color}08`, color: cfg.color, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          + Add <Icon emoji={cfg.emoji} size={14} /> {cfg.label}
        </button>
      )}

      {/* Add place modal */}
      {showAdd && cfg && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeAdd}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>Add a new <Icon emoji={cfg.emoji} size={18} /> {cfg.label}</p>
              <button onClick={closeAdd} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="input-field" placeholder="Place name..." value={inputName} onChange={e => setInputName(e.target.value)} autoFocus />
              <input className="input-field" placeholder="Note (optional)" value={inputNote} onChange={e => setInputNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
              <div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Photo (optional)</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {inputPreview && (
                    <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0, borderRadius: 12, overflow: 'hidden', border: `2px solid ${cfg.color}` }}>
                      <img src={inputPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: inputUploading ? 0.5 : 1 }} />
                      {inputUploading && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.5)', borderTopColor: 'white', animation: 'palvin-spin 0.7s linear infinite' }} />
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={() => fileInputRef.current?.click()} style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 12, border: `2px dashed ${cfg.color}`, background: `${cfg.color}08`, color: cfg.color, fontSize: 23, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inputPreview ? '↻' : '+'}</button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={e => { handleAddFile(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
                </div>
                <style>{`@keyframes palvin-spin { to { transform: rotate(360deg); } }`}</style>
              </div>
              <button onClick={handleAdd} disabled={!inputName.trim() || addingPlace} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: (inputName.trim() && !addingPlace) ? 'pointer' : 'default', background: (inputName.trim() && !addingPlace) ? cfg.color : 'var(--border)', color: (inputName.trim() && !addingPlace) ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 15 }}>{addingPlace ? 'Adding...' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit place modal */}
      {editingPlace && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeEditPlace}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>Edit place <Icon emoji="✏️" size={18} /></p>
              <button onClick={closeEditPlace} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="input-field" placeholder="Place name..." value={editPlaceName} onChange={e => setEditPlaceName(e.target.value)} autoFocus />
              <input className="input-field" placeholder="Note (optional)" value={editPlaceNote} onChange={e => setEditPlaceNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSavePlace()} />
              <div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Photo (optional)</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {editPlacePreview && (
                    <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0, borderRadius: 12, overflow: 'hidden', border: '2px solid var(--sakura-deep)' }}>
                      <img src={editPlacePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: editPlaceUploading ? 0.5 : 1 }} />
                      {editPlaceUploading && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.5)', borderTopColor: 'white', animation: 'palvin-spin 0.7s linear infinite' }} />
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={() => editFileInputRef.current?.click()} style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 12, border: '2px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontSize: 23, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{editPlacePreview ? '↻' : '+'}</button>
                  <input ref={editFileInputRef} type="file" accept="image/*" onChange={e => { handleEditFile(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
                </div>
              </div>
              <button onClick={handleSavePlace} disabled={!editPlaceName.trim()} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: editPlaceName.trim() ? 'pointer' : 'default', background: editPlaceName.trim() ? 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))' : 'var(--border)', color: editPlaceName.trim() ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 15 }}>Save changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete place */}
      {confirmDeletePlace && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDeletePlace(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Delete "{confirmDeletePlace.name}"?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>This can't be undone.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDeletePlace(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { removeFavPlace(activeTab, confirmDeletePlace.id); setConfirmDeletePlace(null); }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add category modal */}
      {showAddCategory && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeAddCategory}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)' }}>New category</p>
              <button onClick={closeAddCategory} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input-field" placeholder="Category name (e.g. Books, Travel...)" value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} autoFocus />
              <div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Icon</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CATEGORY_EMOJI_CHOICES.map(e => (
                    <button key={e} onClick={() => setNewCatEmoji(e)} style={{ width: 36, height: 36, border: newCatEmoji === e ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', borderRadius: 10, background: newCatEmoji === e ? 'var(--sakura-light)' : 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji={e} size={16} /></button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Color</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CATEGORY_COLOR_CHOICES.map(c => (
                    <button key={c} onClick={() => setNewCatColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: newCatColor === c ? '3px solid var(--ink)' : '3px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <button onClick={handleAddCategory} disabled={!newCatLabel.trim()} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: newCatLabel.trim() ? 'pointer' : 'default', background: newCatLabel.trim() ? newCatColor : 'var(--border)', color: newCatLabel.trim() ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 15 }}>Create category</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit category modal */}
      {editingCategory && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeEditCategory}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)' }}>Edit category</p>
              <button onClick={closeEditCategory} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input-field" value={editCatLabel} onChange={e => setEditCatLabel(e.target.value)} autoFocus />
              <div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Icon</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CATEGORY_EMOJI_CHOICES.map(e => (
                    <button key={e} onClick={() => setEditCatEmoji(e)} style={{ width: 36, height: 36, border: editCatEmoji === e ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', borderRadius: 10, background: editCatEmoji === e ? 'var(--sakura-light)' : 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji={e} size={16} /></button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Color</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CATEGORY_COLOR_CHOICES.map(c => (
                    <button key={c} onClick={() => setEditCatColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: editCatColor === c ? '3px solid var(--ink)' : '3px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <button onClick={handleSaveCategory} disabled={!editCatLabel.trim()} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: editCatLabel.trim() ? 'pointer' : 'default', background: editCatLabel.trim() ? editCatColor : 'var(--border)', color: editCatLabel.trim() ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 15 }}>Save changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete category */}
      {confirmDeleteCategory && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDeleteCategory(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 300, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Delete category "{confirmDeleteCategory.label}"?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>All places in this category ({(state.favPlaces[confirmDeleteCategory.id] ?? []).length}) will be deleted too. This can't be undone.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDeleteCategory(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { removeFavCategory(confirmDeleteCategory.id); setConfirmDeleteCategory(null); }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Gift Wishlist ───────────────────────────────── */
type LinkPreview = { title?: string; image?: string; description?: string; price?: string };

function GiftWishlistScreen({ onBack, initialWishId }: { onBack: () => void; initialWishId?: string }) {
  const { myProfile, state, currentUser, isAdmin, partnerProfile, addWish, updateWish, removeWish, drawWish } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  // "link" fetches image/name/price automatically from a pasted product
  // link; "manual" is for anything with no shareable link (or one that
  // won't fetch, e.g. Shopee) — name/price/picture are all entered by hand.
  const [wishMode, setWishMode] = useState<'link' | 'manual'>('link');
  const [wishText, setWishText] = useState('');
  const [wishLink, setWishLink] = useState('');
  const [wishPrice, setWishPrice] = useState('');
  const [wishImagePreview, setWishImagePreview] = useState('');
  const [wishImageUrl, setWishImageUrl] = useState('');
  const [wishImageUploading, setWishImageUploading] = useState(false);
  // A wishlist notification tap lands on whichever filter tab actually shows
  // that wish — "bought" if it's already been marked bought, otherwise
  // whichever person's list it's actually on. No target (a plain visit)
  // defaults to the viewer's own list.
  const [filter, setFilter] = useState<string>(() => {
    const target = initialWishId ? state.wishes.find(w => w.id === initialWishId) : null;
    if (target) return target.drawn ? 'bought' : target.from;
    return currentUser;
  });
  const [highlightId, setHighlightId] = useState(initialWishId);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  const [editingWish, setEditingWish] = useState<WishItem | null>(null);
  const [editMode, setEditMode] = useState<'link' | 'manual'>('link');
  const [editText, setEditText] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editOriginalLink, setEditOriginalLink] = useState('');
  const [editLinkPreview, setEditLinkPreview] = useState<LinkPreview | null>(null);
  const [editPreviewLoading, setEditPreviewLoading] = useState(false);
  const [editPreviewFailed, setEditPreviewFailed] = useState(false);
  const [editImagePreview, setEditImagePreview] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImageUploading, setEditImageUploading] = useState(false);
  const [confirmDeleteWish, setConfirmDeleteWish] = useState<string | null>(null);
  const [addingWish, setAddingWish] = useState(false);
  const wishImageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const other = partnerProfile?.displayName ?? currentUser;

  const filtered = state.wishes.filter(w => {
    if (filter === 'bought') return w.drawn;
    if (w.drawn) return false;
    return w.from === filter;
  });

  // Scrolls to and briefly glows the wish a notification tap pointed at,
  // once it's actually rendered in the (now correctly filtered) list.
  useEffect(() => {
    if (!highlightId) return;
    const el = document.querySelector(`[data-wish-id="${highlightId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => setHighlightId(undefined), 2400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, filtered.length]);

  const closeAdd = () => {
    setShowAdd(false); setWishMode('link'); setWishText(''); setWishLink(''); setWishPrice(''); setLinkPreview(null);
    setWishImagePreview(''); setWishImageUrl(''); setWishImageUploading(false);
  };

  const handleWishImageFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !myProfile?.coupleId) return;
    setWishImagePreview(URL.createObjectURL(file));
    setWishImageUrl('');
    setWishImageUploading(true);
    uploadWishImage(myProfile.coupleId, file).then(url => {
      setWishImageUploading(false);
      if (url) setWishImageUrl(url);
    });
  };

  // Fetch a compact title/image/description(/price, where findable) preview
  // for whatever link the user pastes. Debounced so it doesn't fire on
  // every keystroke. A fetched price only ever fills the Amount field when
  // it's still empty — never overwrites a price the user typed themselves.
  //
  // Goes straight to Apify's apify/web-scraper actor (real browser
  // automation through backend/supabase/functions/link-preview-apify),
  // routed through a residential proxy — the only approach that actually
  // gets real data off JS-heavy storefronts like Shopee, whose anti-bot
  // blocks both a plain server-side fetch (no JS execution at all) and
  // Microlink's own free-tier headless render (unreliable against it, and
  // separately capped at 25 requests/day shared across every wish either
  // partner adds). A real actor run can take ~10-60+ seconds, so the
  // "Fetching info..." state in the form can sit for a while — the button
  // to save doesn't wait on it either way, see the background-patch calls
  // below for the case where it resolves after the wish is already saved.
  //
  // Shopee's own generic app-shell title (not the product's, but a
  // legitimate well-formed "success" as far as the API is concerned) can
  // still come back if the real per-product data hadn't finished hydrating
  // in when the actor read the page — matched here so that shows an honest
  // "couldn't fetch a preview" instead of Shopee's own branding under the
  // wrong wish.
  const GENERIC_SHELL_TITLE = /^shopee việt nam\s*[|-]/i;

  function looksBlockedPreview(title: string | undefined, image: string | undefined): boolean {
    if (title && GENERIC_SHELL_TITLE.test(title)) return true;
    return !image && (!title || /page (not found|unavailable)/i.test(title));
  }

  async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!supabaseUrl) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/link-preview-apify?url=${encodeURIComponent(url)}`, { signal: controller.signal });
      const json = await res.json();
      if (json.status !== 'success') return null;
      const title: string | undefined = json.data?.title ?? undefined;
      const image: string | undefined = json.data?.image ?? undefined;
      const description: string | undefined = json.data?.description ?? undefined;
      const price: string | undefined = json.data?.price ?? undefined;
      if (looksBlockedPreview(title, image)) return null;
      return { title, image, description, price };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // Tracks whichever fetch the debounce below currently has in flight, so
  // hitting "Add to wishlist" before it resolves can hand the SAME promise
  // to the background-patch logic instead of starting a second fetch for
  // the identical URL.
  const pendingPreviewRef = useRef<{ url: string; promise: Promise<LinkPreview | null> } | null>(null);

  useEffect(() => {
    // Manual mode can still carry a link (so the wish stays clickable) but
    // never triggers a fetch for it — the whole point of manual mode is not
    // depending on that.
    if (wishMode !== 'link') { setLinkPreview(null); setPreviewLoading(false); setPreviewFailed(false); pendingPreviewRef.current = null; return; }
    const url = wishLink.trim();
    if (!/^https?:\/\/.+/i.test(url)) { setLinkPreview(null); setPreviewLoading(false); setPreviewFailed(false); pendingPreviewRef.current = null; return; }
    setPreviewLoading(true);
    setPreviewFailed(false);
    const timer = setTimeout(() => {
      const promise = fetchLinkPreview(url);
      pendingPreviewRef.current = { url, promise };
      promise.then(preview => {
        setLinkPreview(preview);
        setPreviewFailed(!preview);
        setPreviewLoading(false);
        // Only fills in a price/name the user hasn't already typed
        // themselves — never overwrites a manually-entered value.
        if (preview?.price) setWishPrice(current => current || preview.price!);
        if (preview?.title) setWishText(current => current || preview.title!);
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [wishLink, wishMode]);

  function openEditWish(w: WishItem) {
    setEditingWish(w);
    // A wish with no link at all was necessarily added manually — anything
    // with a link defaults to "link" mode, whether or not the fetch ever
    // actually succeeded for it.
    setEditMode(w.link ? 'link' : 'manual');
    setEditText(w.wish);
    setEditPrice(w.price ?? '');
    setEditLink(w.link ?? '');
    setEditOriginalLink(w.link ?? '');
    setEditLinkPreview((w.linkImage || w.linkTitle || w.linkDescription) ? { image: w.linkImage, title: w.linkTitle, description: w.linkDescription } : null);
    setEditImagePreview(w.linkImage ?? '');
    setEditImageUrl(w.linkImage ?? '');
  }
  function closeEditWish() {
    setEditingWish(null); setEditMode('link'); setEditText(''); setEditPrice(''); setEditLink(''); setEditOriginalLink(''); setEditLinkPreview(null); setEditPreviewLoading(false); setEditPreviewFailed(false);
    setEditImagePreview(''); setEditImageUrl(''); setEditImageUploading(false);
  }

  const handleEditImageFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !myProfile?.coupleId) return;
    setEditImagePreview(URL.createObjectURL(file));
    setEditImageUrl('');
    setEditImageUploading(true);
    uploadWishImage(myProfile.coupleId, file).then(url => {
      setEditImageUploading(false);
      if (url) setEditImageUrl(url);
    });
  };

  // Re-fetch the preview only when the link actually changed, or when the
  // wish has a link but never had a preview stored (older items added
  // before this feature existed) — so opening edit on a legacy item
  // backfills it, but saving other fields on an already-previewed item
  // never wastes an API call. Manual mode never fetches, same as Add.
  const editPendingPreviewRef = useRef<{ url: string; promise: Promise<LinkPreview | null> } | null>(null);

  useEffect(() => {
    if (!editingWish || editMode !== 'link') return;
    const url = editLink.trim();
    const unchanged = url === editOriginalLink.trim();
    if (unchanged && editLinkPreview) { setEditPreviewLoading(false); return; }
    if (!/^https?:\/\/.+/i.test(url)) { if (!unchanged) setEditLinkPreview(null); setEditPreviewLoading(false); setEditPreviewFailed(false); editPendingPreviewRef.current = null; return; }
    setEditPreviewLoading(true);
    setEditPreviewFailed(false);
    const timer = setTimeout(() => {
      const promise = fetchLinkPreview(url);
      editPendingPreviewRef.current = { url, promise };
      promise.then(preview => {
        setEditLinkPreview(preview);
        setEditPreviewFailed(!preview);
        setEditPreviewLoading(false);
        if (preview?.price) setEditPrice(current => current || preview.price!);
        if (preview?.title) setEditText(current => current || preview.title!);
      });
    }, unchanged ? 0 : 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editLink, editOriginalLink, editingWish, editMode]);

  function saveEditWish() {
    if (!editingWish || !editText.trim()) return;
    const id = editingWish.id;
    const savedText = editText.trim();
    const savedPrice = editPrice;
    const linkArg = editLink.trim() || undefined;

    if (editMode === 'manual') {
      updateWish(id, { wish: savedText, price: savedPrice || undefined, link: linkArg, linkImage: editImageUrl || undefined });
      closeEditWish();
      return;
    }

    updateWish(id, {
      wish: savedText,
      price: savedPrice || undefined,
      link: linkArg,
      linkImage: linkArg ? editLinkPreview?.image : undefined,
      linkTitle: linkArg ? editLinkPreview?.title : undefined,
      linkDescription: linkArg ? editLinkPreview?.description : undefined,
    });
    // Same as Add: if the link changed and its preview wasn't ready yet,
    // patch it in once/if it resolves instead of losing it.
    if (linkArg && !editLinkPreview) {
      const pending = editPendingPreviewRef.current?.url === linkArg ? editPendingPreviewRef.current.promise : fetchLinkPreview(linkArg);
      pending.then(preview => {
        if (preview) updateWish(id, { wish: savedText, price: savedPrice || preview.price || undefined, link: linkArg, linkImage: preview.image, linkTitle: preview.title, linkDescription: preview.description });
      });
    }
    closeEditWish();
  }

  function renderWishCard(w: WishItem, index: number) {
    const isOwner = w.from === currentUser;
    const canEdit = isOwner || isAdmin;
    const isBought = w.drawn;
    const isHighlighted = w.id === highlightId;
    return (
      <div key={w.id} data-wish-id={w.id} className="card wish-card" style={{
        padding: '14px 16px', opacity: isBought ? 0.6 : 1,
        animation: `wishCardIn 0.3s cubic-bezier(0.32,0.72,0,1) both${isHighlighted ? ', wishHighlight 1.2s ease 2' : ''}`,
        animationDelay: isHighlighted ? '0s, 0s' : `${Math.min(index, 6) * 30}ms`,
        boxShadow: isHighlighted ? '0 0 0 2.5px var(--sakura-accent)' : undefined,
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {/* Picture on the left — from a fetched or manually-uploaded
              image alike, both just live in linkImage. Falls back to a
              plain owner-colored block when there's no picture at all. */}
          {w.linkImage ? (
            <div style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
              <FadeImage src={w.linkImage} alt="" style={{ width: '100%', height: '100%' }} />
            </div>
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 12, background: isOwner ? '#E4ECFF' : '#FFE4EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon emoji={isBought ? '✅' : (isOwner ? '💙' : '💗')} size={26} />
            </div>
          )}

          {/* Everything else on the right — name, description, price, link */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', textDecoration: isBought ? 'line-through' : 'none', lineHeight: 1.3 }}>{w.wish}</p>
            {w.linkDescription && <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{w.linkDescription}</p>}
            {w.price && <p style={{ fontSize: 12, color: 'var(--sakura-deep)', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}><Icon emoji="💰" size={12} /> {/^\d+$/.test(w.price) ? `${Number(w.price).toLocaleString('en-US')} VND` : w.price}</p>}
            {w.link && (
              <a href={w.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#4A8AE8', fontWeight: 600, marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                <Icon emoji="🔗" size={10} /> View product
              </a>
            )}
          </div>
        </div>

        {/* Whose wishlist + date — pulled down, de-emphasized */}
        <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon emoji={isOwner ? '💙' : '💗'} size={10} /> {w.from}'s wishlist · {w.date}
        </p>

        {/* Bought/Undo gets its own full-width row */}
        <div style={{ marginTop: 10 }}>
          {!isBought ? (
            <button className="wish-action-btn" onClick={() => drawWish(w.id, true)} style={{ width: '100%', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', border: 'none', borderRadius: 10, padding: '9px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>Bought <Icon emoji="🎁" size={13} /></button>
          ) : (
            <button className="wish-action-btn" onClick={() => drawWish(w.id, false)} style={{ width: '100%', background: 'var(--bg)', color: 'var(--ink-2)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '9px', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>Undo <Icon emoji="↩️" size={13} /></button>
          )}
        </div>

        {/* Edit/Delete on their own separate row below, so a mis-tap
            reaching for Bought/Undo can't land on either by accident */}
        {canEdit && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="wish-action-btn" onClick={() => openEditWish(w)} style={{ flex: 1, background: 'var(--bg)', border: 'none', borderRadius: 10, padding: '7px', cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}><Icon emoji="✏️" size={12} /> Edit</button>
            <button className="wish-action-btn" onClick={() => setConfirmDeleteWish(w.id)} style={{ flex: 1, background: 'var(--bg)', border: 'none', borderRadius: 10, padding: '7px', cursor: 'pointer', color: '#E8524A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}><Icon emoji="🗑️" size={12} /> Delete</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      <style>{`
        @keyframes wishCardIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes wishHighlight { 0%, 100% { background: var(--white); } 50% { background: var(--sakura-light); } }
        .wish-tab-btn { transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.12s ease; }
        .wish-tab-btn:active { transform: scale(0.95); }
        .wish-action-btn { transition: background 0.2s ease, color 0.2s ease, transform 0.12s ease, opacity 0.2s ease; }
        .wish-action-btn:active { transform: scale(0.94); }
        .wish-card { transition: opacity 0.25s ease; }
      `}</style>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>Gift Wishlist <Icon emoji="🎁" size={20} /></p>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>Things you'd love to receive — so your partner knows what to get you!</p>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { k: currentUser, label: `${currentUser}'s list`, count: state.wishes.filter(w => !w.drawn && w.from === currentUser).length },
          ...(other !== currentUser ? [{ k: other, label: `${other}'s list`, count: state.wishes.filter(w => !w.drawn && w.from === other).length }] : []),
          { k: 'bought', label: 'Bought', count: state.wishes.filter(w => w.drawn).length },
        ].map(f => (
          <button key={f.k} className="wish-tab-btn" onClick={() => setFilter(f.k)} style={{ padding: '6px 14px', borderRadius: 99, border: filter === f.k ? 'none' : '1.5px solid var(--border)', background: filter === f.k ? 'var(--sakura-accent)' : 'var(--white)', color: filter === f.k ? 'white' : 'var(--ink-2)', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {f.label}
            <FilterCountBadge count={f.count} />
          </button>
        ))}
      </div>

      {/* Add button */}
      <button onClick={() => setShowAdd(true)} style={{ width: '100%', padding: '13px', borderRadius: 14, border: '1.5px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        + Add an item to your wishlist <Icon emoji="🎁" size={14} />
      </button>

      {/* List — key={filter} remounts the whole batch on tab switch so it replays the entrance animation together */}
      <div key={filter} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((w, i) => renderWishCard(w, i))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-2)', fontSize: 14 }}>
            <Icon emoji="🎁" size={36} style={{ display: 'block', marginBottom: 8 }} />
            Nothing in this wishlist yet!
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeAdd}>
          <div style={{ width: '100%', maxWidth: 380, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8 + 30px)', transform: 'translateY(-40px)' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', maxHeight: 'calc(var(--app-vh, 100vh) * 0.8 + 30px)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>Add to wishlist<Icon emoji="🎁" size={18} /></p>
                <button onClick={closeAdd} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 14 }}>Adding for <strong>{currentUser}</strong> — {other} will see it and can surprise you with it!</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setWishMode('link')} className="wish-tab-btn" style={{ flex: 1, padding: '9px', borderRadius: 12, border: wishMode === 'link' ? 'none' : '1.5px solid var(--border)', background: wishMode === 'link' ? 'var(--sakura-accent)' : 'var(--bg)', color: wishMode === 'link' ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Icon emoji="🔗" size={13} /> Paste a link</button>
                  <button onClick={() => setWishMode('manual')} className="wish-tab-btn" style={{ flex: 1, padding: '9px', borderRadius: 12, border: wishMode === 'manual' ? 'none' : '1.5px solid var(--border)', background: wishMode === 'manual' ? 'var(--sakura-accent)' : 'var(--bg)', color: wishMode === 'manual' ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Icon emoji="✏️" size={13} /> Enter manually</button>
                </div>

                <input className="input-field" placeholder="Item you'd like to receive..." value={wishText} onChange={e => setWishText(e.target.value)} />
                <AmountInput placeholder="Estimated price (VND, optional)" value={wishPrice} onChange={setWishPrice} />

                {wishMode === 'manual' && (
                  <div>
                    <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Photo (optional)</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {wishImagePreview && (
                        <div style={{ position: 'relative', width: 70, height: 70, flexShrink: 0, borderRadius: 12, overflow: 'hidden', border: '2px solid var(--sakura-deep)' }}>
                          <img src={wishImagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: wishImageUploading ? 0.5 : 1 }} />
                          {wishImageUploading && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.5)', borderTopColor: 'white', animation: 'palvin-spin 0.7s linear infinite' }} />
                            </div>
                          )}
                        </div>
                      )}
                      <button onClick={() => wishImageInputRef.current?.click()} style={{ width: 70, height: 70, flexShrink: 0, borderRadius: 12, border: '2px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{wishImagePreview ? '↻' : '+'}</button>
                      <input ref={wishImageInputRef} type="file" accept="image/*" onChange={e => { handleWishImageFile(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
                    </div>
                    <style>{`@keyframes palvin-spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}

                <input className="input-field" placeholder="Product link (optional)" value={wishLink} onChange={e => setWishLink(e.target.value)} />

                {wishMode === 'link' && previewLoading && <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>Fetching info from the link...</p>}
                {wishMode === 'link' && !previewLoading && previewFailed && (
                  <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>Couldn't fetch a preview — some sites (Shopee, Lazada, TikTok Shop...) block this automatically. You can still add the item without one, or switch to "Enter manually".</p>
                )}
                {wishMode === 'link' && !previewLoading && linkPreview && (linkPreview.image || linkPreview.title) && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    {linkPreview.image
                      ? <FadeImage src={linkPreview.image} alt="" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
                      : <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji="🔗" size={18} /></div>}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{linkPreview.title || 'Product image found'}</p>
                      {linkPreview.description && <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{linkPreview.description}</p>}
                    </div>
                  </div>
                )}
                <button
                  onClick={async () => {
                    if (!wishText.trim()) return;
                    setAddingWish(true);
                    const savedText = wishText.trim();
                    const savedPrice = wishPrice;
                    const linkArg = wishLink.trim() || undefined;

                    if (wishMode === 'manual') {
                      await addWish({
                        from: currentUser,
                        wish: savedText,
                        date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
                        ...(savedPrice ? { price: savedPrice } : {}),
                        ...(linkArg ? { link: linkArg } : {}),
                        ...(wishImageUrl ? { linkImage: wishImageUrl } : {}),
                      });
                      setAddingWish(false);
                      closeAdd();
                      return;
                    }

                    const newId = await addWish({
                      from: currentUser,
                      wish: savedText,
                      date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
                      ...(savedPrice ? { price: savedPrice } : {}),
                      ...(linkArg ? { link: linkArg } : {}),
                      ...(linkPreview?.image ? { linkImage: linkPreview.image } : {}),
                      ...(linkPreview?.title ? { linkTitle: linkPreview.title } : {}),
                      ...(linkPreview?.description ? { linkDescription: linkPreview.description } : {}),
                    });
                    setAddingWish(false);
                    closeAdd();
                    // Preview wasn't ready when Add was pressed — patch this
                    // same wish in place once/if it does resolve, instead of
                    // making the user wait for it (or losing it) just
                    // because they didn't wait around.
                    if (newId && linkArg && !linkPreview) {
                      const pending = pendingPreviewRef.current?.url === linkArg ? pendingPreviewRef.current.promise : fetchLinkPreview(linkArg);
                      pending.then(preview => {
                        if (preview) updateWish(newId, { wish: savedText, price: savedPrice || preview.price || undefined, link: linkArg, linkImage: preview.image, linkTitle: preview.title, linkDescription: preview.description });
                      });
                    }
                  }}
                  disabled={addingWish}
                  style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: addingWish ? 0.7 : 1 }}
                >{addingWish ? 'Adding...' : <>Add to wishlist<Icon emoji="🎁" size={15} /></>}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingWish && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeEditWish}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8 + 30px)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>Edit wish <Icon emoji="✏️" size={18} /></p>
              <button onClick={closeEditWish} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditMode('link')} className="wish-tab-btn" style={{ flex: 1, padding: '9px', borderRadius: 12, border: editMode === 'link' ? 'none' : '1.5px solid var(--border)', background: editMode === 'link' ? 'var(--sakura-accent)' : 'var(--bg)', color: editMode === 'link' ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Icon emoji="🔗" size={13} /> Paste a link</button>
                <button onClick={() => setEditMode('manual')} className="wish-tab-btn" style={{ flex: 1, padding: '9px', borderRadius: 12, border: editMode === 'manual' ? 'none' : '1.5px solid var(--border)', background: editMode === 'manual' ? 'var(--sakura-accent)' : 'var(--bg)', color: editMode === 'manual' ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><Icon emoji="✏️" size={13} /> Enter manually</button>
              </div>

              <input className="input-field" placeholder="Item you'd like to receive..." value={editText} onChange={e => setEditText(e.target.value)} />
              <AmountInput placeholder="Estimated price (VND, optional)" value={editPrice} onChange={setEditPrice} />

              {editMode === 'manual' && (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Photo (optional)</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {editImagePreview && (
                      <div style={{ position: 'relative', width: 70, height: 70, flexShrink: 0, borderRadius: 12, overflow: 'hidden', border: '2px solid var(--sakura-deep)' }}>
                        <img src={editImagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: editImageUploading ? 0.5 : 1 }} />
                        {editImageUploading && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.5)', borderTopColor: 'white', animation: 'palvin-spin 0.7s linear infinite' }} />
                          </div>
                        )}
                      </div>
                    )}
                    <button onClick={() => editImageInputRef.current?.click()} style={{ width: 70, height: 70, flexShrink: 0, borderRadius: 12, border: '2px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{editImagePreview ? '↻' : '+'}</button>
                    <input ref={editImageInputRef} type="file" accept="image/*" onChange={e => { handleEditImageFile(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
                  </div>
                  <style>{`@keyframes palvin-spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              <input className="input-field" placeholder="Product link (optional)" value={editLink} onChange={e => setEditLink(e.target.value)} />

              {editMode === 'link' && editPreviewLoading && <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>Fetching info from the link...</p>}
              {editMode === 'link' && !editPreviewLoading && editPreviewFailed && (
                <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>Couldn't fetch a preview — some sites (Shopee, Lazada, TikTok Shop...) block this automatically. You can still keep the link without one, or switch to "Enter manually".</p>
              )}
              {editMode === 'link' && !editPreviewLoading && editLinkPreview && (editLinkPreview.image || editLinkPreview.title) && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  {editLinkPreview.image
                    ? <FadeImage src={editLinkPreview.image} alt="" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
                    : <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji="🔗" size={18} /></div>}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{editLinkPreview.title || 'Product image found'}</p>
                    {editLinkPreview.description && <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{editLinkPreview.description}</p>}
                  </div>
                </div>
              )}
              <button
                onClick={saveEditWish}
                disabled={!editText.trim()}
                style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: editText.trim() ? 'pointer' : 'default', background: editText.trim() ? 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))' : 'var(--border)', color: editText.trim() ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >Save changes <Icon emoji="✓" size={15} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete wish */}
      {confirmDeleteWish && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDeleteWish(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Delete this item from the wishlist?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>This can't be undone.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDeleteWish(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { removeWish(confirmDeleteWish); setConfirmDeleteWish(null); }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Playlist screen ─────────────────────────────── */
interface SongResult { title: string; artist: string; image: string; durationSeconds?: number; releaseDate?: string; previewUrl?: string; }

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatReleaseDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

// iTunes Search — free, no key, CORS-enabled from the browser, so no need
// for a backend proxy the way the wishlist's link preview needs one (see
// fetchLinkPreview above). Returns real title/artist/cover art for whatever
// the user types.
//
// entity=song pins results to actual tracks — without it, media=music can
// rank artist/album entries above songs, which have no trackName and get
// filtered out below, silently leaving zero results.
function itunesSearchUrl(query: string): string {
  return `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=6`;
}

// Some networks block itunes.apple.com directly (seen with certain ISPs/wifi
// in Vietnam) — these are tried in order until one works. First choice is
// our own Supabase Edge Function (backend/supabase/functions/song-search),
// which calls iTunes from Supabase's servers so it's unaffected by whatever
// the user's own network blocks — reliable as long as it's deployed. The
// direct call and two free public CORS proxies are kept as fallbacks in
// case the function isn't deployed yet or Supabase itself is unreachable;
// free proxies are themselves flaky (both tried while building this were
// down at some point), so they're last-resort, not primary.
function songSearchAttemptUrls(query: string): string[] {
  const target = itunesSearchUrl(query);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const urls: string[] = [];
  if (supabaseUrl) urls.push(`${supabaseUrl}/functions/v1/song-search?term=${encodeURIComponent(query)}`);
  urls.push(target);
  urls.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`);
  urls.push(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`);
  return urls;
}

// A free proxy that's down doesn't necessarily fail fast — it can hang the
// connection with no response at all, and fetch() has no built-in timeout,
// so without this an unresponsive proxy would stall the whole fallback
// chain indefinitely instead of moving on to the next candidate.
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSongResults(url: string): Promise<SongResult[]> {
  const res = await fetchWithTimeout(url, 7000);
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  const json = await res.json();
  return (json.results ?? []).map((r: { trackName?: string; artistName?: string; artworkUrl100?: string; trackTimeMillis?: number; releaseDate?: string; previewUrl?: string }) => ({
    title: r.trackName ?? '',
    artist: r.artistName ?? '',
    image: r.artworkUrl100 ? r.artworkUrl100.replace('100x100', '300x300') : '',
    durationSeconds: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : undefined,
    releaseDate: r.releaseDate,
    previewUrl: r.previewUrl,
  })).filter((r: SongResult) => r.title);
}

// Races every candidate (Supabase edge function, direct iTunes, two public
// proxies) at once instead of trying them one at a time — whichever network
// path is actually open on this connection (5G, wifi, a restrictive ISP...)
// wins immediately, instead of first sitting through a timeout on whichever
// path happens to be blocked here. A path that's blocked usually fails fast
// anyway (connection reset, or a captive-portal page that isn't valid JSON),
// so this doesn't cost extra time on a fully-open connection. Implemented by
// hand (rather than Promise.any) since this project's TS lib target predates
// it — first settled success wins; if every candidate rejects, the last
// rejection to arrive is what's thrown.
async function searchSongs(query: string): Promise<SongResult[]> {
  const urls = songSearchAttemptUrls(query);
  return new Promise((resolve, reject) => {
    let remaining = urls.length;
    let lastError: unknown;
    urls.forEach(url => {
      fetchSongResults(url).then(resolve, err => {
        lastError = err;
        remaining--;
        if (remaining === 0) reject(lastError);
      });
    });
  });
}

// Shared by the Add and Edit modals — a title field with an explicit search
// button (only fires on click/Enter, never as-you-type) plus a results
// dropdown and a small "cover art found" preview once something is picked.
function SongSearchField({ title, onTitleChange, artist, image, durationSeconds, releaseDate, onPick }: {
  title: string;
  onTitleChange: (v: string) => void;
  artist: string;
  image: string;
  durationSeconds?: number;
  releaseDate?: string;
  onPick: (r: SongResult) => void;
}) {
  const [results, setResults] = useState<SongResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const runSearch = async () => {
    const q = title.trim();
    if (q.length < 2) return;
    const el = anchorRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setShowResults(true);
    setSearching(true);
    setHasSearched(false);
    setSearchError(false);
    try {
      setResults(await searchSongs(q));
    } catch {
      setResults([]);
      setSearchError(true);
    }
    setSearching(false);
    setHasSearched(true);
  };

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <div ref={anchorRef} style={{ display: 'flex', gap: 8 }}>
          <input
            className="input-field"
            placeholder="Song title"
            value={title}
            onChange={e => { onTitleChange(e.target.value); setShowResults(false); setHasSearched(false); setSearchError(false); }}
            onKeyDown={e => e.key === 'Enter' && runSearch()}
            style={{ flex: 1 }}
          />
          <button onClick={runSearch} style={{ width: 44, flexShrink: 0, borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--sakura-deep)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="🔍" size={16} /></button>
        </div>
        {/* Portaled to <body> with fixed positioning — the Add/Edit modal
            scrolls its own content (overflowY: auto), which clips any
            absolutely-positioned child that overflows it, so a dropdown
            nested inside would be cut off instead of floating over
            everything. React still bubbles its click events through the
            normal component tree despite the DOM move, so the modal's
            own stopPropagation keeps working. */}
        {showResults && dropdownRect && (searching || results.length > 0 || hasSearched) && createPortal(
          <div style={{ position: 'fixed', top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 500, maxHeight: 400, overflowY: 'auto' }}>
            {searching && <p style={{ fontSize: 12, color: 'var(--ink-2)', padding: '10px 12px' }}>Searching...</p>}
            {!searching && hasSearched && searchError && <p style={{ fontSize: 12, color: '#E8524A', padding: '10px 12px' }}>Couldn't connect to the song search service — check your network/wifi and try again.</p>}
            {!searching && hasSearched && !searchError && results.length === 0 && <p style={{ fontSize: 12, color: 'var(--ink-2)', padding: '10px 12px' }}>No songs found, try a different title.</p>}
            {!searching && results.map((r, i) => (
              <button key={i} onClick={() => { onPick(r); setShowResults(false); setResults([]); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', background: 'none', border: 'none', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
                {r.image
                  ? <FadeImage src={r.image} alt="" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }} />
                  : <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji="🎵" size={16} /></div>}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.artist}{r.releaseDate && ` · ${formatReleaseDate(r.releaseDate)}`}
                  </p>
                </div>
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>
      {image && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: 'var(--bg)', borderRadius: 12, marginTop: 10 }}>
          <FadeImage src={image} alt="" style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</p>
            <p style={{ fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist}</p>
            {(durationSeconds != null || releaseDate) && (
              <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 1 }}>
                {durationSeconds != null && formatDuration(durationSeconds)}
                {durationSeconds != null && releaseDate && ' · '}
                {releaseDate && formatReleaseDate(releaseDate)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlaylistScreen({ onBack }: { onBack: () => void }) {
  const { state, currentUser, partnerProfile, addToPlaylist, updatePlaylist, removeFromPlaylist } = useApp();
  const partnerName = partnerProfile?.displayName;
  const [filter, setFilter] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [note, setNote] = useState('');
  const [image, setImage] = useState('');
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [releaseDate, setReleaseDate] = useState<string | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [addedByChoice, setAddedByChoice] = useState(currentUser);

  const [editingSong, setEditingSong] = useState<PlaylistItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editDuration, setEditDuration] = useState<number | undefined>(undefined);
  const [editReleaseDate, setEditReleaseDate] = useState<string | undefined>(undefined);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | undefined>(undefined);
  const [editAddedBy, setEditAddedBy] = useState(currentUser);
  const [confirmDeleteSong, setConfirmDeleteSong] = useState<PlaylistItem | null>(null);
  const [addingSong, setAddingSong] = useState(false);

  const filtered = filter === 'all' ? state.playlist : state.playlist.filter(p => p.addedBy === filter);

  const closeAdd = () => { setShowAdd(false); setTitle(''); setArtist(''); setNote(''); setImage(''); setDuration(undefined); setReleaseDate(undefined); setPreviewUrl(undefined); setAddedByChoice(currentUser); };
  const pickAddResult = (r: SongResult) => { setTitle(r.title); setArtist(r.artist); setImage(r.image); setDuration(r.durationSeconds); setReleaseDate(r.releaseDate); setPreviewUrl(r.previewUrl); };
  const handleAdd = async () => {
    if (!title.trim()) return;
    setAddingSong(true);
    await addToPlaylist({ title: title.trim(), artist: artist || title.trim(), emoji: '🎵', image: image || undefined, durationSeconds: duration, releaseDate, previewUrl, note, addedBy: addedByChoice });
    setAddingSong(false);
    closeAdd();
  };

  const openEditSong = (p: PlaylistItem) => {
    setEditingSong(p); setEditTitle(p.title); setEditArtist(p.artist); setEditNote(p.note); setEditImage(p.image ?? ''); setEditDuration(p.durationSeconds); setEditReleaseDate(p.releaseDate); setEditPreviewUrl(p.previewUrl); setEditAddedBy(p.addedBy);
  };
  const closeEditSong = () => setEditingSong(null);
  const pickEditResult = (r: SongResult) => { setEditTitle(r.title); setEditArtist(r.artist); setEditImage(r.image); setEditDuration(r.durationSeconds); setEditReleaseDate(r.releaseDate); setEditPreviewUrl(r.previewUrl); };
  const handleSaveSong = () => {
    if (!editingSong || !editTitle.trim()) return;
    updatePlaylist(editingSong.id, { title: editTitle.trim(), artist: editArtist || editTitle.trim(), emoji: editingSong.emoji, image: editImage || undefined, durationSeconds: editDuration, releaseDate: editReleaseDate, previewUrl: editPreviewUrl, note: editNote, addedBy: editAddedBy });
    closeEditSong();
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>Our Playlist <Icon emoji="🎵" size={20} /></p>
        <button onClick={() => setShowAdd(true)} style={{ background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', border: 'none', borderRadius: 12, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Add</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { k: 'all', label: 'All', emoji: null as string | null, count: state.playlist.length },
          { k: currentUser, label: `Added by ${currentUser}`, emoji: '💙', count: state.playlist.filter(p => p.addedBy === currentUser).length },
          ...(partnerName ? [{ k: partnerName, label: `Added by ${partnerName}`, emoji: '💗', count: state.playlist.filter(p => p.addedBy === partnerName).length }] : []),
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{ padding: '6px 14px', borderRadius: 99, border: filter === f.k ? 'none' : '1.5px solid var(--border)', background: filter === f.k ? 'var(--sakura-accent)' : 'var(--white)', color: filter === f.k ? 'white' : 'var(--ink-2)', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {f.label}{f.emoji && <Icon emoji={f.emoji} size={12} />}
            <FilterCountBadge count={f.count} />
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((p, i) => (
          <SwipeToReveal
            key={p.id}
            actions={
              <>
                <button onClick={() => openEditSong(p)} style={{ width: 64, border: 'none', background: '#4A8AE8', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer' }}>
                  <Icon emoji="✏️" size={16} /><span style={{ fontSize: 10, fontWeight: 700 }}>Edit</span>
                </button>
                <button onClick={() => setConfirmDeleteSong(p)} style={{ width: 64, border: 'none', background: '#DC2626', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer' }}>
                  <Icon emoji="🗑️" size={16} /><span style={{ fontSize: 10, fontWeight: 700 }}>Delete</span>
                </button>
              </>
            }
          >
            <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              {p.image
                ? <FadeImage src={p.image} alt="" style={{ width: 60, height: 60, borderRadius: 14, flexShrink: 0 }} />
                : <div style={{ width: 60, height: 60, background: 'var(--sakura-light)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji={p.emoji} size={26} /></div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</p>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>{p.artist}{p.durationSeconds != null && ` · ${formatDuration(p.durationSeconds)}`}</p>
                {p.releaseDate && <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 1, opacity: 0.8 }}>Released {formatReleaseDate(p.releaseDate)}</p>}
                {p.note && <p style={{ fontSize: 12, color: 'var(--sakura-accent)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="💬" size={11} /> {p.note}</p>}
              </div>
              <p style={{ fontSize: 10, color: 'var(--ink-2)', flexShrink: 0 }}>by {p.addedBy}</p>
            </div>
          </SwipeToReveal>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-2)', fontSize: 14 }}>No songs yet. Add the first one!</div>}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeAdd}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)' }}>Add song</p>
              <button onClick={closeAdd} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SongSearchField title={title} onTitleChange={setTitle} artist={artist} image={image} durationSeconds={duration} releaseDate={releaseDate} onPick={pickAddResult} />
              <input className="input-field" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
              <div>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500 }}>Added by</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[currentUser, ...(partnerName ? [partnerName] : [])].map(u => (
                    <button key={u} onClick={() => setAddedByChoice(u)} style={{ flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: addedByChoice === u ? 'var(--sakura-light)' : 'var(--bg)', border: addedByChoice === u ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: addedByChoice === u ? 'var(--sakura-deep)' : 'var(--ink-2)' }}>{u}</button>
                  ))}
                </div>
              </div>
              <button onClick={handleAdd} disabled={!title.trim() || addingSong} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: (title.trim() && !addingSong) ? 'pointer' : 'default', background: (title.trim() && !addingSong) ? 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))' : 'var(--border)', color: (title.trim() && !addingSong) ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 15 }}>{addingSong ? 'Adding...' : 'Add to playlist'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingSong && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeEditSong}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>Edit song <Icon emoji="✏️" size={18} /></p>
              <button onClick={closeEditSong} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SongSearchField title={editTitle} onTitleChange={setEditTitle} artist={editArtist} image={editImage} durationSeconds={editDuration} releaseDate={editReleaseDate} onPick={pickEditResult} />
              <input className="input-field" placeholder="Note (optional)" value={editNote} onChange={e => setEditNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveSong()} />
              <div>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500 }}>Added by</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[currentUser, ...(partnerName ? [partnerName] : [])].map(u => (
                    <button key={u} onClick={() => setEditAddedBy(u)} style={{ flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: editAddedBy === u ? 'var(--sakura-light)' : 'var(--bg)', border: editAddedBy === u ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: editAddedBy === u ? 'var(--sakura-deep)' : 'var(--ink-2)' }}>{u}</button>
                  ))}
                </div>
              </div>
              <button onClick={handleSaveSong} disabled={!editTitle.trim()} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: editTitle.trim() ? 'pointer' : 'default', background: editTitle.trim() ? 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))' : 'var(--border)', color: editTitle.trim() ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 15 }}>Save changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete song */}
      {confirmDeleteSong && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDeleteSong(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Delete "{confirmDeleteSong.title}"?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>This can't be undone.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDeleteSong(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { removeFromPlaylist(confirmDeleteSong.id); setConfirmDeleteSong(null); }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Photo Collage ───────────────────────────────── */
// One grid cell per post — its first image stands in as the thumbnail so
// the collage stays a quick one-post-per-slot index instead of exploding
// into every photo of a multi-image post.
interface CollagePost {
  postId: string;
  image: string;
  count: number;
}

function PhotoCollage({ onBack }: { onBack: () => void }) {
  const { state, navigate } = useApp();

  const byMonth: Record<string, CollagePost[]> = {};
  for (const p of state.posts) {
    if (p.images.length === 0) continue;
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push({ postId: p.id, image: p.images[0], count: p.images.length });
  }
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  const formatMonth = (key: string) => {
    const [y, m] = key.split('-');
    return new Date(+y, +m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>Photo Collage <Icon emoji="🖼️" size={20} /></p>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>One cover photo per post, grouped by month — tap one to revisit that post.</p>

      {months.map(key => {
        const posts = byMonth[key];
        const grid4 = posts.slice(0, 4);
        const rest = posts.length - 4;
        return (
          <div key={key} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{formatMonth(key)}</p>
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{posts.length} posts</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {grid4.map((post, i) => (
                <button key={post.postId} onClick={() => navigate('post-detail', post.postId)} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '1', background: 'var(--sakura-light)', border: 'none', padding: 0, cursor: 'pointer' }}>
                  <FadeImage src={post.image} alt="" style={{ width: '100%', height: '100%' }} />
                  {post.count > 1 && (
                    <span style={{ position: 'absolute', top: 4, right: 4, fontSize: 9, fontWeight: 700, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '1px 5px', borderRadius: 99 }}>1/{post.count}</span>
                  )}
                  {i === 3 && rest > 0 && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(51,42,45,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'white' }}>+{rest}</p>
                    </div>
                  )}
                </button>
              ))}
              {Array.from({ length: Math.max(0, 4 - grid4.length) }).map((_, i) => (
                <div key={`ph-${i}`} style={{ borderRadius: 12, background: 'var(--bg)', aspectRatio: '1' }} />
              ))}
            </div>
          </div>
        );
      })}

      {months.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Icon emoji="🖼️" size={48} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>No photos yet. Post something with photos to build a collage!</p>
        </div>
      )}
    </div>
  );
}

// The line under the couple hero on Dashboard used to be a hardcoded
// "Our little story continues." — now it's picked from this list, one per
// day. Days-since-epoch mod the quote count keeps the choice stable for a
// whole calendar day and identical for both partners, with no need to
// store which quote was shown when.
function StoryQuotesScreen({ onBack }: { onBack: () => void }) {
  const { state, addStoryQuote, updateStoryQuote, deleteStoryQuote } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<StoryQuote | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setText(''); setShowAdd(true); };
  const openEdit = (q: StoryQuote) => { setText(q.text); setEditing(q); };
  const closeForm = () => { setShowAdd(false); setEditing(null); setText(''); };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    if (editing) await updateStoryQuote(editing.id, text.trim());
    else await addStoryQuote(text.trim());
    setSaving(false);
    closeForm();
  };

  const confirmingQuote = state.storyQuotes.find(q => q.id === confirmDeleteId);

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>Quote of the Day <Icon emoji="💬" size={20} /></p>
        <button onClick={openAdd} style={{ background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Add quote</button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>The Dashboard automatically switches to a different quote from this list each day.</p>

      {state.storyQuotes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ marginBottom: 12 }}><Icon emoji="💬" size={44} /></div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No quotes yet</p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Add a few quotes so the Dashboard changes daily, instead of always showing the same one.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {state.storyQuotes.map(q => (
            <div key={q.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Icon emoji="🌸" size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ flex: 1, fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 15, color: 'var(--ink)', lineHeight: 1.5 }}>"{q.text}"</p>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => openEdit(q)} title="Edit" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 28, height: 28, color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✏️" size={13} /></button>
                <button onClick={() => setConfirmDeleteId(q.id)} title="Delete" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 28, height: 28, color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editing) && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeForm}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon emoji="💬" size={18} /> {editing ? 'Edit quote' : 'Add a quote'}</p>
              <button onClick={closeForm} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <textarea className="input-field" placeholder="VD: Our little story continues." value={text} onChange={e => setText(e.target.value)} rows={3} style={{ resize: 'none', marginBottom: 14 }} autoFocus />
            <button onClick={handleSubmit} disabled={saving} style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : (editing ? 'Save changes' : 'Add quote')}</button>
          </div>
        </div>
      )}

      {confirmingQuote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDeleteId(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 300, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Delete this quote?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>"{confirmingQuote.text}"</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { deleteStoryQuote(confirmingQuote.id); setConfirmDeleteId(null); }} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: '#E8524A', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Debt tracker ("Sổ nợ") — who owes you money outside the couple ── */

function VND(n: number): string {
  return `${Math.round(n).toLocaleString('en-US')} VND`;
}

function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatShortDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

function DebtScreen({ onBack }: { onBack: () => void }) {
  const { state, currentUser, partnerProfile, addDebt, updateDebt, toggleDebtPaid, deleteDebt } = useApp();
  const partnerName = partnerProfile?.displayName;
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [debtorName, setDebtorName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState('');
  const [createdByChoice, setCreatedByChoice] = useState(currentUser);
  const [error, setError] = useState('');

  const openAdd = () => {
    setDebtorName(''); setAmount(''); setNote(''); setDate(todayISO()); setDueDate(''); setCreatedByChoice(currentUser); setError('');
    setShowForm(true);
  };
  const openEdit = (d: Debt) => {
    setDebtorName(d.debtorName); setAmount(String(Math.round(d.amount))); setNote(d.note ?? ''); setDate(d.date); setDueDate(d.dueDate ?? ''); setCreatedByChoice(d.createdBy); setError('');
    setEditing(d);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSubmit = () => {
    if (!debtorName.trim()) { setError("Enter the debtor's name."); return; }
    if (!amount || isNaN(+amount) || +amount <= 0) { setError('Enter a valid amount.'); return; }
    const data = { debtorName: debtorName.trim(), amount: +amount, note: note.trim() || undefined, date, dueDate: dueDate || undefined, createdBy: createdByChoice };
    if (editing) updateDebt(editing.id, data);
    else addDebt(data);
    closeForm();
  };

  const filteredDebts = filter === 'all' ? state.debts : state.debts.filter(d => d.createdBy === filter);
  const unpaid = filteredDebts.filter(d => !d.paid)
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  const paid = filteredDebts.filter(d => d.paid);
  const totalOwed = unpaid.reduce((s, d) => s + d.amount, 0);
  const confirmingDebt = state.debts.find(d => d.id === confirmDeleteId);
  const today = todayISO();

  function renderDebtCard(d: Debt) {
    const overdue = !d.paid && d.dueDate && d.dueDate < today;
    return (
      <SwipeToReveal
        key={d.id}
        actions={
          <>
            <button onClick={() => openEdit(d)} style={{ width: 64, border: 'none', background: '#4A8AE8', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer' }}>
              <Icon emoji="✏️" size={16} /><span style={{ fontSize: 10, fontWeight: 700 }}>Edit</span>
            </button>
            <button onClick={() => setConfirmDeleteId(d.id)} style={{ width: 64, border: 'none', background: '#DC2626', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer' }}>
              <Icon emoji="✕" size={16} /><span style={{ fontSize: 10, fontWeight: 700 }}>Delete</span>
            </button>
          </>
        }
      >
        <div className="card" style={{ padding: '14px 16px', opacity: d.paid ? 0.6 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: d.paid ? 'var(--bg)' : overdue ? '#FEE2E2' : 'var(--sakura-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon emoji={d.paid ? '✅' : overdue ? '⏰' : '📒'} size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', textDecoration: d.paid ? 'line-through' : 'none' }}>{d.debtorName}</p>
              {d.note && <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{d.note}</p>}
              <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 3 }}>Lent on: {formatShortDate(d.date)}{filter === 'all' && ` · ${d.createdBy === 'Both' ? 'Both' : d.createdBy}`}</p>
              {d.dueDate && !d.paid && (
                <p style={{ fontSize: 11, color: overdue ? '#DC2626' : 'var(--ink-2)', fontWeight: overdue ? 700 : 400, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {overdue && <Icon emoji="⚠️" size={11} />} Due: {formatShortDate(d.dueDate)}{overdue ? ' — overdue' : ''}
                </p>
              )}
              {d.paid && d.paidDate && <p style={{ fontSize: 11, color: '#5AC26A', fontWeight: 600, marginTop: 1 }}>Paid on {formatShortDate(d.paidDate)}</p>}
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: d.paid ? 'var(--ink-2)' : 'var(--sakura-deep)', flexShrink: 0 }}>{VND(d.amount)}</p>
          </div>
          <button onClick={() => toggleDebtPaid(d.id)} style={{ width: '100%', marginTop: 10, padding: '8px', borderRadius: 10, border: d.paid ? '1.5px solid var(--border)' : 'none', background: d.paid ? 'var(--bg)' : 'linear-gradient(135deg, #5AC26A, #3D8A4E)', color: d.paid ? 'var(--ink-2)' : 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            {d.paid ? 'Mark as unpaid' : <>Mark as paid <Icon emoji="🎉" size={12} /></>}
          </button>
        </div>
      </SwipeToReveal>
    );
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>Debt Tracker <Icon emoji="📒" size={20} /></p>
        <button onClick={openAdd} style={{ background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Log debt</button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>Keep track of who owes you, so you never forget to ask for it back.</p>

      {/* Filter — who logged this debt */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['all', currentUser, ...(partnerName ? [partnerName] : [])].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: filter === f ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', background: filter === f ? 'var(--sakura-light)' : 'var(--bg)', color: filter === f ? 'var(--sakura-deep)' : 'var(--ink-2)', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {f === 'all' ? 'All' : f}
            <FilterCountBadge count={f === 'all' ? state.debts.length : state.debts.filter(d => d.createdBy === f).length} />
          </button>
        ))}
      </div>

      <div style={{ background: 'linear-gradient(135deg, var(--sakura-deep), #a8436a)', borderRadius: 20, padding: '20px', marginBottom: 20, color: 'white' }}>
        <p style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Total owed to you</p>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 31 }}>{VND(totalOwed)}</p>
        <p style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{unpaid.length} unpaid debt(s)</p>
      </div>

      {filteredDebts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ marginBottom: 12 }}><Icon emoji="📒" size={44} /></div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{state.debts.length === 0 ? 'No debts logged yet' : 'No debts found'}</p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Tap "+ Log debt" whenever you lend someone money.</p>
        </div>
      ) : (
        <>
          {unpaid.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 10 }}>Unpaid · {unpaid.length}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {unpaid.map(renderDebtCard)}
              </div>
            </div>
          )}
          {paid.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 10 }}>Paid · {paid.length}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {paid.map(renderDebtCard)}
              </div>
            </div>
          )}
        </>
      )}

      {(showForm || editing) && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeForm}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon emoji="📒" size={18} /> {editing ? 'Edit debt' : 'Log a new debt'}</p>
              <button onClick={closeForm} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input-field" placeholder="Debtor's name" value={debtorName} onChange={e => setDebtorName(e.target.value)} autoFocus />
              <AmountInput placeholder="Amount (VND)" value={amount} onChange={setAmount} />
              <input className="input-field" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
              <div>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500 }}>Logged by</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[currentUser, ...(partnerName ? [partnerName] : []), 'Both'].map(u => (
                    <button key={u} onClick={() => setCreatedByChoice(u)} style={{ flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: createdByChoice === u ? 'var(--sakura-light)' : 'var(--bg)', border: createdByChoice === u ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: createdByChoice === u ? 'var(--sakura-deep)' : 'var(--ink-2)' }}>{u === 'Both' ? 'Both' : u}</button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500 }}>Date lent</p>
                <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500 }}>Due date (optional)</p>
                <input className="input-field" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
              </div>
              {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
              <button onClick={handleSubmit} style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15 }}>{editing ? 'Save changes' : 'Log debt'}</button>
            </div>
          </div>
        </div>
      )}

      {confirmingDebt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDeleteId(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 300, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Delete this debt?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>{confirmingDebt.debtorName} — {VND(confirmingDebt.amount)}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { deleteDebt(confirmingDebt.id); setConfirmDeleteId(null); }} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: '#E8524A', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Our Places — "Places We've Been" ── */

const PLACE_FLAG_CHOICES = ['🇻🇳', '🇯🇵', '🇰🇷', '🇹🇭', '🇸🇬', '🇲🇾', '🇹🇼', '🇭🇰', '🇨🇳', '🇺🇸', '🇫🇷', '🇬🇧', '🇦🇺', '🏳️'];

function OurPlacesScreen({ onBack }: { onBack: () => void }) {
  const { state, myProfile, addPlace, updatePlace, deletePlace } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Place | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Place | null>(null);

  const [name, setName] = useState('');
  const [flag, setFlag] = useState('🏳️');
  const [images, setImages] = useState<string[]>([]);
  const [visitedDate, setVisitedDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAdd = () => {
    setName(''); setFlag('🏳️'); setImages([]); setVisitedDate(''); setError('');
    setShowForm(true);
  };
  const openEdit = (p: Place) => {
    setName(p.name); setFlag(p.flag || '🏳️'); setImages(p.images); setVisitedDate(p.visitedDate ?? ''); setError('');
    setEditing(p);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleFiles = (fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];
    const coupleId = myProfile?.coupleId;
    if (files.length === 0 || !coupleId) return;
    setError('');
    setUploading(true);
    Promise.all(files.map(f => uploadPlaceImage(coupleId, f))).then(urls => {
      setUploading(false);
      const ok = urls.filter((u): u is string => !!u);
      if (ok.length < files.length) setError('A few photos failed to upload, try again.');
      setImages(prev => [...prev, ...ok]);
    });
  };

  const removeImage = (url: string) => setImages(prev => prev.filter(u => u !== url));

  const handleSubmit = () => {
    if (!name.trim()) { setError('Enter a place name.'); return; }
    if (images.length === 0) { setError(uploading ? 'Wait for the photos to finish uploading.' : 'Choose at least one photo.'); return; }
    const data = { name: name.trim(), flag, images, visitedDate: visitedDate || undefined };
    if (editing) updatePlace(editing.id, data);
    else addPlace(data);
    closeForm();
  };

  const confirmingPlace = state.places.find(p => p.id === confirmDeleteId);

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>Places We've Been <Icon emoji="🗺️" size={20} /></p>
        <button onClick={openAdd} style={{ background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Add place</button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>Save the places you've visited together.</p>

      {state.places.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ marginBottom: 12 }}><Icon emoji="🗺️" size={44} /></div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No places saved yet</p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Tap "+ Add place" to mark the first place you've been together.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {state.places.map(p => (
            <div key={p.id} className="card" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => setViewing(p)}>
              <div style={{ position: 'relative', width: '100%', paddingTop: '75%', background: 'var(--bg)' }}>
                {p.images[0] && <FadeImage src={p.images[0]} alt={p.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />}
                {p.images.length > 1 && (
                  <span style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>1/{p.images.length}</span>
                )}
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                  <button onClick={e => { e.stopPropagation(); openEdit(p); }} title="Edit" style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 99, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✏️" size={12} /></button>
                  <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(p.id); }} title="Delete" style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 99, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={12} /></button>
                </div>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>{p.flag} {p.name}</p>
                {p.visitedDate && <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>{formatShortDate(p.visitedDate)}</p>}
                {p.memoryIds.length > 0 && <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>{p.memoryIds.length} memories</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {(showForm || editing) && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeForm}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon emoji="🗺️" size={18} /> {editing ? 'Edit place' : "Add a place you've been"}</p>
              <button onClick={closeForm} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input-field" placeholder="Place name (e.g. Da Lat)" value={name} onChange={e => setName(e.target.value)} autoFocus />
              <div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Country flag</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PLACE_FLAG_CHOICES.map(f => (
                    <button key={f} onClick={() => setFlag(f)} style={{ width: 38, height: 38, borderRadius: 10, fontSize: 18, cursor: 'pointer', background: flag === f ? 'var(--sakura-light)' : 'var(--bg)', border: flag === f ? '2px solid var(--sakura-accent)' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{f}</button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Visit date (optional)</p>
                <input className="input-field" type="date" value={visitedDate} onChange={e => setVisitedDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
              </div>
              <div>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Photos {images.length > 0 && `(${images.length})`}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {images.map(url => (
                    <div key={url} style={{ position: 'relative', width: 72, height: 72, flexShrink: 0, borderRadius: 12, overflow: 'hidden', border: '2px solid var(--border)' }}>
                      <FadeImage src={url} alt="" style={{ width: '100%', height: '100%' }} />
                      <button onClick={() => removeImage(url)} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 99, width: 18, height: 18, color: 'white', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 12, border: '2px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontSize: 25, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >{uploading ? <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid rgba(201,95,124,0.3)', borderTopColor: 'var(--sakura-deep)', animation: 'palvin-spin 0.7s linear infinite' }} /> : '+'}</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
                    style={{ display: 'none' }}
                  />
                </div>
                <style>{`@keyframes palvin-spin { to { transform: rotate(360deg); } }`}</style>
              </div>
              {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
              <button onClick={handleSubmit} disabled={uploading} style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15, opacity: uploading ? 0.6 : 1 }}>{editing ? 'Save changes' : 'Add place'}</button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setViewing(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 16, width: '100%', maxWidth: 420, maxHeight: '85vh', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>{viewing.flag} {viewing.name}</p>
              <button onClick={() => setViewing(null)} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji="✕" size={16} /></button>
            </div>
            {viewing.visitedDate && <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 12 }}>Visited on {formatShortDate(viewing.visitedDate)}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {viewing.images.map((url, i) => <ViewingImage key={i} src={url} />)}
            </div>
          </div>
        </div>
      )}

      {confirmingPlace && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDeleteId(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 300, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Delete this place?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>{confirmingPlace.flag} {confirmingPlace.name}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { deletePlace(confirmingPlace.id); setConfirmDeleteId(null); }} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: '#E8524A', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
