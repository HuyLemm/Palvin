import { lazy, Suspense, useEffect, useState, type JSX } from 'react';
import { useApp } from './context';
import Toast from './components/Toast';
import CreateModal from './components/CreateModal';
import AuthScreen, { ResetPasswordScreen } from './screens/AuthScreen';
import CoupleLocked from './components/CoupleLocked';
import Avatar from './components/Avatar';
import Icon from './components/Icon';

// Home (the very first thing a linked user sees on cold boot) loads eagerly,
// same as AuthScreen (the very first thing a logged-out user sees) above —
// lazy-loading either would just trade an already-loaded main chunk for a
// guaranteed extra network round trip on the one screen everyone always
// hits first. Every other screen is fetched on first visit instead of
// upfront, shrinking the initial bundle (see main chunk size warning from
// `vite build`) — by the time any of them actually renders, dataReady/
// imagesReady have already finished, so the only wait left is this small
// JS chunk, not data or images.
import Home from './screens/Home';
const Feed = lazy(() => import('./screens/Feed'));
const Money = lazy(() => import('./screens/Money'));
const Us = lazy(() => import('./screens/Us'));
const Memories = lazy(() => import('./screens/Memories'));
const LoveNotes = lazy(() => import('./screens/LoveNotes'));
const Calendar = lazy(() => import('./screens/Calendar'));
const FutureUs = lazy(() => import('./screens/FutureUs'));
const Search = lazy(() => import('./screens/Search'));
const Notifications = lazy(() => import('./screens/Notifications'));
const Settings = lazy(() => import('./screens/Settings'));
const PostDetail = lazy(() => import('./screens/PostDetail'));
const SavedPosts = lazy(() => import('./screens/SavedPosts'));
const MemoryDetail = lazy(() => import('./screens/MemoryDetail'));
const Chat = lazy(() => import('./screens/Chat'));

type Tab = 'home' | 'feed' | 'stats' | 'us' | 'settings';

function IconHome({ active }: { active: boolean }) {
  return active ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/>
    </svg>
  );
}

function IconFeed({ active }: { active: boolean }) {
  return active ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}

function IconStats({ active }: { active: boolean }) {
  return active ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="12" width="4" height="9" rx="1"/>
      <rect x="10" y="7" width="4" height="14" rx="1"/>
      <rect x="17" y="3" width="4" height="18" rx="1"/>
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="12" width="4" height="9" rx="1"/>
      <rect x="10" y="7" width="4" height="14" rx="1"/>
      <rect x="17" y="3" width="4" height="18" rx="1"/>
    </svg>
  );
}

function IconUs({ active }: { active: boolean }) {
  return active ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  );
}

function IconSettings({ active }: { active: boolean }) {
  return active ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 3a3 3 0 110 6 3 3 0 010-6zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 01-6 3.22z"/>
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3"/>
      <path d="M20 21a8 8 0 10-16 0"/>
    </svg>
  );
}

const NAV_TABS = [
  { key: 'home',     Icon: IconHome },
  { key: 'feed',     Icon: IconFeed },
  { key: 'stats',    Icon: IconStats },
  { key: 'us',       Icon: IconUs },
  { key: 'settings', Icon: IconSettings },
];


const SCREEN_TITLES: Record<string, string> = {
  home: 'PALVIN', feed: 'Feed', money: 'Our Money', us: 'Us',
  memories: 'Memories', 'love-notes': 'For You', calendar: 'Our Calendar',
  'future-us': 'Future Us', search: 'Search', notifications: 'Notifications',
  settings: 'Settings', stats: 'Spending', bills: 'Bills', goals: 'Savings Goals',
  wishlist: 'Gift Wishlist',
  'post-detail': 'Post', 'memory-detail': 'Memory', 'saved-posts': 'Saved',
};

// Decorative emoji that used to be embedded inline in a few of the titles
// above — kept separate so SCREEN_TITLES stays plain text and the icon is
// rendered explicitly next to it.
const SCREEN_TITLE_EMOJI: Record<string, string> = {
  money: '💰', us: '🌸', memories: '🌸', 'love-notes': '💌', stats: '📊',
  bills: '🧾', goals: '💰', wishlist: '🎁',
};

// Stay open even before the couple is linked: Settings hosts the invite/accept
// flow, and Notifications is where an incoming invite also surfaces.
const UNLOCKED_BEFORE_LINK = ['settings', 'notifications'];

// Screens with no per-instance id — one shared, always-current view driven
// entirely by the live global `screen`/`selectedId` from context, so keeping
// them all mounted forever (just hidden via CSS) after their first visit is
// risk-free: revisiting one shows it exactly as it was, images and scroll
// position intact, instead of re-mounting from scratch and re-loading every
// image again. Bounded by construction — this is a fixed list, it can't grow.
const KEEP_ALIVE_SCREENS = new Set([
  'home', 'feed', 'money', 'us', 'settings',
  'memories', 'love-notes', 'calendar', 'future-us', 'search', 'notifications', 'saved-posts',
]);
// post-detail/memory-detail carry a per-instance id (which post/memory), so
// each distinct id needs its own frozen `id` prop rather than reading the
// live global selectedId — otherwise every kept-alive instance would jump to
// whatever post is *currently* selected. Bounded to the last few distinct
// ones visited so browsing many different posts in one session can't leak.
const MAX_DETAIL_INSTANCES = 4;

// Shown for the brief moment a lazy-loaded screen's chunk is still being
// fetched (first visit only — every later visit hits the module cache and
// resolves synchronously) so navigating there never shows a blank screen.
function ScreenLoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--sakura-accent)', animation: 'palvin-spin 0.7s linear infinite' }} />
      <style>{`@keyframes palvin-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function renderScreen(screen: string, id: string | undefined): JSX.Element {
  switch (screen) {
    case 'home':          return <Home />;
    case 'feed':          return <Feed />;
    case 'money':         return <Money />;
    case 'us':            return <Us />;
    case 'memories':      return <Memories />;
    case 'love-notes':    return <LoveNotes />;
    case 'calendar':      return <Calendar />;
    case 'future-us':     return <FutureUs />;
    case 'search':        return <Search />;
    case 'notifications': return <Notifications />;
    case 'settings':      return <Settings />;
    case 'post-detail':   return <PostDetail id={id} />;
    case 'saved-posts':   return <SavedPosts />;
    case 'memory-detail': return <MemoryDetail id={id} />;
    default:              return <Home />;
  }
}

function ScreenRouter() {
  const { screen, selectedId, isLinked } = useApp();
  // Chat is its own always-mounted overlay in App.tsx, entirely separate
  // from this router — while it's open, `key` is null so nothing here
  // matches for display, leaving whatever screen was showing underneath
  // exactly as it was (hidden behind the opaque overlay) instead of
  // ScreenRouter trying to track/mount a 'chat' entry of its own (which
  // has no case in renderScreen and would fall through to a second, wasted
  // <Home/> instance, plus wrongly occupy one of the bounded detail slots).
  // 'stats'/'bills'/'goals' are just alternate entry points into the Money
  // screen (same component, different starting tab) — normalized to the same
  // key as 'money' so they share one kept-alive instance instead of each
  // minting a second, independent <Money/> that always opens on the
  // Expenses tab regardless of which entry point was used. 'wishlist' is the
  // same trick for Us's internal Gift Wishlist sub-screen (see Us.tsx's own
  // `sub` state, which reads the live `screen`/`selectedId` to land on the
  // right sub-screen and highlight the specific wish a notification pointed at).
  const normalizedScreen = (screen === 'stats' || screen === 'bills' || screen === 'goals') ? 'money'
    : screen === 'wishlist' ? 'us'
    : screen;
  const key = screen === 'chat' ? null : (selectedId ? `${normalizedScreen}:${selectedId}` : normalizedScreen);

  const [keptKeys, setKeptKeys] = useState<string[]>(key ? [key] : []);
  useEffect(() => {
    if (key === null) return;
    setKeptKeys(prev => {
      if (prev.includes(key)) return prev;
      let next = [...prev, key];
      const detailKeys = next.filter(k => !KEEP_ALIVE_SCREENS.has(k.split(':')[0]));
      if (detailKeys.length > MAX_DETAIL_INSTANCES) {
        const drop = new Set(detailKeys.slice(0, detailKeys.length - MAX_DETAIL_INSTANCES));
        next = next.filter(k => !drop.has(k));
      }
      return next;
    });
  }, [key]);

  if (!isLinked && !UNLOCKED_BEFORE_LINK.includes(screen)) return <CoupleLocked />;

  return (
    <>
      {keptKeys.map(k => {
        const sepIdx = k.indexOf(':');
        const scr = sepIdx === -1 ? k : k.slice(0, sepIdx);
        const id = sepIdx === -1 ? undefined : k.slice(sepIdx + 1);
        // className lives on this per-key div (never remounted once created)
        // rather than a key={screen} wrapper in App.tsx — that would defeat
        // the whole point by forcing a fresh ScreenRouter (and everything
        // kept alive inside it) on every single navigation. The fade/slide-in
        // still plays the first time a screen is ever visited (a real mount),
        // it just doesn't replay on later revisits — same tradeoff a native
        // tab bar makes.
        return (
          <div key={k} className="screen-transition" style={{ display: k === key ? 'block' : 'none' }}>
            <Suspense fallback={<ScreenLoadingFallback />}>{renderScreen(scr, id)}</Suspense>
          </div>
        );
      })}
    </>
  );
}

const MAIN_TABS: Tab[] = ['home', 'feed', 'stats', 'us', 'settings'];

export default function App() {
  const { screen, navigate, goBack, state, createModal, openCreate, currentUser, partnerProfile, authed, authLoading, profileLoaded, isLinked, isLinkedSettled, dataReady, imagesReady, hydratedFromCache, passwordRecovery, pendingInvite, toast } = useApp();
  // Also holds the loading screen up until the couple's own data — and every
  // image that data references — has actually loaded, so navigating
  // anywhere right after the loading screen shows real content and real
  // images immediately, with zero shimmer/placeholder flicker. Skipped
  // entirely on a warm reopen (hydratedFromCache) — last session's snapshot
  // renders immediately (images almost certainly still in the browser's own
  // HTTP cache) while the same fetches quietly refresh it in the background,
  // so re-launching the home-screen icon after the OS killed the tab no
  // longer means sitting through the full boot sequence again every reopen.
  const stillResolvingSession = !hydratedFromCache && (authLoading || (authed && !profileLoaded) || (authed && !isLinkedSettled) || (authed && isLinked && (!dataReady || !imagesReady)));

  // Keeps Chat mounted (just hidden) once opened, same reasoning as
  // ScreenRouter's KEEP_ALIVE_SCREENS — reopening it shouldn't re-fetch or
  // re-fade-in every image in the thread from scratch.
  const [hasOpenedChat, setHasOpenedChat] = useState(false);
  useEffect(() => { if (screen === 'chat') setHasOpenedChat(true); }, [screen]);

  // A simulated fill (no real multi-step progress exists to measure) that
  // eases toward ~90% while we wait, then snaps to 100% and holds briefly
  // the moment the session/profile actually resolves — never lies about
  // being done, just makes the short wait feel less like a bare spinner.
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadingVisible, setLoadingVisible] = useState(stillResolvingSession);
  useEffect(() => {
    if (!stillResolvingSession) {
      setLoadProgress(100);
      const t = setTimeout(() => setLoadingVisible(false), 400);
      return () => clearTimeout(t);
    }
    setLoadingVisible(true);
    setLoadProgress(0);
    const interval = setInterval(() => {
      setLoadProgress(p => p >= 90 ? p : p + (90 - p) * 0.15 + 1.5);
    }, 180);
    return () => clearInterval(interval);
  }, [stillResolvingSession]);
  // iOS Safari doesn't support the interactive-widget viewport meta property
  // (Chrome/Firefox only), so it always shrinks the visual viewport when the
  // keyboard opens — which our height:100%/dvh chain then follows, making
  // the whole app visibly reflow. Track the LARGEST innerHeight ever seen
  // (never shrink --app-vh in response to a resize) instead of a one-shot
  // snapshot: a single read taken before Safari's chrome finishes settling
  // right after launch can be too small and gets stuck that way for the
  // whole session (leaving a gap at the bottom showing html's background),
  // whereas the keyboard only ever shrinks the viewport, never grows it
  // past the true full height — so "keep the max" naturally ignores it
  // while still self-correcting a bad initial read.
  useEffect(() => {
    let maxHeight = 0;
    const setAppHeight = () => {
      if (window.innerHeight > maxHeight) {
        maxHeight = window.innerHeight;
        document.documentElement.style.setProperty('--app-vh', `${maxHeight}px`);
      }
    };
    setAppHeight();
    // A few delayed re-checks catch Safari's chrome settling shortly after
    // launch, without needing a live resize listener (which would also
    // fire — harmlessly, since it only grows — on the keyboard opening).
    const timers = [100, 400, 1000].map(ms => setTimeout(setAppHeight, ms));
    const onOrientationChange = () => { maxHeight = 0; setAppHeight(); };
    window.addEventListener('orientationchange', onOrientationChange);
    window.addEventListener('resize', setAppHeight);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('orientationchange', onOrientationChange);
      window.removeEventListener('resize', setAppHeight);
    };
  }, []);

  // iOS Safari only auto-scrolls a focused input into view if it's visible
  // at the moment it receives focus — hiding it for a single tick makes
  // Safari skip that scroll decision entirely, avoiding the jerk from
  // reactively correcting a scroll that already happened (below).
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
      const prevOpacity = el.style.opacity;
      el.style.opacity = '0';
      // Two frames (not setTimeout(…, 0)) — gives Safari's own layout/paint
      // pass, where it decides whether to scroll, more room to land inside
      // the hidden window instead of racing a macrotask against it.
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = prevOpacity; }));
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);

  // Backup safety net in case the opacity trick above doesn't fully suppress
  // the scroll on some iOS version — nothing here is meant to scroll (the
  // only real scroll area is <main>'s own inner overflow), so snap any
  // window-level scroll straight back to 0 whenever it happens. iOS animates
  // its scroll-into-view over several frames as the keyboard slides up, so a
  // one-off correction lets that animation become briefly visible (a jerk up,
  // then a jerk back) — instead, correct on every animation frame for as
  // long as the keyboard's show animation could still be running.
  useEffect(() => {
    const resetScroll = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo({ left: 0, top: 0, behavior: 'instant' as ScrollBehavior });
    };
    let rafId = 0;
    const onFocusIn = () => {
      cancelAnimationFrame(rafId);
      const start = performance.now();
      const loop = () => {
        resetScroll();
        if (performance.now() - start < 500) rafId = requestAnimationFrame(loop);
      };
      loop();
    };
    document.addEventListener('focusin', onFocusIn);
    window.addEventListener('scroll', resetScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('scroll', resetScroll);
    };
  }, []);

  const activeTab = MAIN_TABS.includes(screen as Tab) ? screen as Tab : null;
  const unreadNotifs = state.notifications.filter(n => !n.read).length + (pendingInvite ? 1 : 0);

  const handleTabClick = (key: string) => {
    navigate(key);
  };

  const title = SCREEN_TITLES[screen] || 'PALVIN';
  const isSubScreen = !MAIN_TABS.includes(screen as Tab) && screen !== 'home';

  // A "forgot password" email link lands here with a temporary recovery
  // session — show the reset form instead of dropping straight into the
  // app (or the normal login screen) until a new password is set.
  if (passwordRecovery) {
    return (
      <div className="app-viewport" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="phone-shell">
          <div className="phone-screen" style={{ display: 'flex', flexDirection: 'column' }}>
            <ResetPasswordScreen />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-viewport" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* iPhone Frame — a device mockup for wide (desktop/preview) viewports;
          collapses to a real edge-to-edge layout on phone-width viewports
          (see the "Real device" media query in index.css). */}
      <div className="phone-shell">
        {/* Side buttons — decorative, mockup only */}
        <div className="phone-bezel-decor">
          <div style={{ position: 'absolute', left: -3, top: 140, width: 3, height: 36, background: '#444', borderRadius: '2px 0 0 2px' }} />
          <div style={{ position: 'absolute', left: -3, top: 190, width: 3, height: 64, background: '#444', borderRadius: '2px 0 0 2px' }} />
          <div style={{ position: 'absolute', left: -3, top: 264, width: 3, height: 64, background: '#444', borderRadius: '2px 0 0 2px' }} />
          <div style={{ position: 'absolute', right: -3, top: 200, width: 3, height: 80, background: '#444', borderRadius: '0 2px 2px 0' }} />
        </div>

        {/* Screen */}
        <div className="phone-screen" style={{
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Status Bar — decorative mockup clock/signal/battery, hidden on a
              real device (which shows its own, or none in standalone mode) */}
          <div className="status-bar-mock" style={{
            height: 56,
            background: 'rgba(255,248,250,0.95)',
            padding: '0 28px 8px',
            flexShrink: 0,
            position: 'relative',
            zIndex: 10,
          }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.3px' }}>
              {new Date().getHours().toString().padStart(2,'0')}:{new Date().getMinutes().toString().padStart(2,'0')}
            </span>
            {/* Dynamic Island */}
            <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 120, height: 34, background: '#000', borderRadius: 20 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="17" height="12" viewBox="0 0 17 12" fill="var(--ink)"><rect x="0" y="4" width="3" height="8" rx="1"/><rect x="4.5" y="2.5" width="3" height="9.5" rx="1"/><rect x="9" y="1" width="3" height="11" rx="1"/><rect x="13.5" y="0" width="3" height="12" rx="1"/></svg>
              <svg width="15" height="12" viewBox="0 0 15 12" fill="none" stroke="var(--ink)" strokeWidth="1.5"><path d="M7.5 2.5C9.8 2.5 11.8 3.5 13.2 5.1M1.8 5.1C3.2 3.5 5.2 2.5 7.5 2.5"/><path d="M7.5 5.5C8.8 5.5 10 6 10.9 6.9M4.1 6.9C5 6 6.2 5.5 7.5 5.5"/><circle cx="7.5" cy="10" r="1.2" fill="var(--ink)"/></svg>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 22, height: 11, border: '1.5px solid var(--ink)', borderRadius: 3, position: 'relative', display: 'flex', alignItems: 'center', padding: '1px' }}>
                  <div style={{ width: '80%', height: '100%', background: 'var(--ink)', borderRadius: 1.5 }} />
                </div>
                <div style={{ width: 2, height: 5, background: 'var(--ink)', borderRadius: 1, marginLeft: 1 }} />
              </div>
            </div>
          </div>

          {/* App Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

            {/* Loading — covers the brief gap while we check the session + fetch the
                profile/link state, so the UI never flashes the wrong screen (e.g.
                "locked" before we actually know isLinked) while that resolves. */}
            {loadingVisible && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 200, background: 'var(--bg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', opacity: loadProgress >= 100 ? 0 : 1, transition: 'opacity 0.35s ease',
              }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0, pointerEvents: 'none' }}>
                  {[
                    { emoji: '🌸', delay: '0s', dur: '4.5s' },
                    { emoji: '🐶', delay: '0.6s', dur: '5.5s' },
                    { emoji: '💕', delay: '1.2s', dur: '5s' },
                    { emoji: '✨', delay: '1.8s', dur: '6s' },
                    { emoji: '🐱', delay: '0.3s', dur: '5.2s' },
                    { emoji: '🐾', delay: '0.9s', dur: '4.8s' },
                    { emoji: '🎀', delay: '1.5s', dur: '5.8s' },
                  ].map((p, i, arr) => {
                    const size = 28;
                    const radius = 150;
                    // Evenly spaced around the circle by index, so with N items no two
                    // can ever land on the same angle (fixed angles previously repeated
                    // at -90°/270°, which is the same point — that's why two icons sat
                    // on top of each other).
                    const angle = -90 + i * (360 / arr.length);
                    const rad = (angle * Math.PI) / 180;
                    const x = Math.cos(rad) * radius;
                    const y = Math.sin(rad) * radius;
                    return (
                      <div key={i} style={{
                        position: 'absolute', top: y, left: x,
                        animation: `floatBob ${p.dur} ease-in-out ${p.delay} infinite`,
                      }}>
                        <Icon emoji={p.emoji} size={size} />
                      </div>
                    );
                  })}
                </div>
                <div className="heart-beat" style={{ marginBottom: 18, position: 'relative', zIndex: 1 }}>
                  <Icon emoji="🌸" size={44} style={{ color: 'var(--sakura-accent)' }} />
                </div>
                <div style={{ width: 130, height: 7, background: 'var(--sakura-light)', borderRadius: 99, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: `${loadProgress}%`, height: '100%', borderRadius: 99,
                    background: 'linear-gradient(90deg, var(--sakura-accent), var(--sakura-deep))',
                    transition: 'width 0.2s ease',
                  }} />
                </div>
                <p style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: 'var(--sakura-deep)', letterSpacing: '0.02em', position: 'relative', zIndex: 1 }}>{Math.round(loadProgress)}%</p>
                <p style={{ marginTop: 4, fontSize: 12, color: 'var(--ink-2)', position: 'relative', zIndex: 1 }}>Loading...</p>
                <style>{`
                  @keyframes floatBob {
                    0%, 100% { transform: translate(-50%, -50%) translateY(0) scale(1); opacity: 0.5; }
                    50% { transform: translate(-50%, -50%) translateY(-16px) scale(1.1); opacity: 0.85; }
                  }
                `}</style>
              </div>
            )}

            {/* Auth guard */}
            {!stillResolvingSession && !authed && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
                <AuthScreen />
              </div>
            )}

            {/* App Header */}
            <header className="app-header" style={{
              background: 'var(--header-bg)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid var(--border)',
              padding: '10px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
              zIndex: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isSubScreen && (
                  <button onClick={goBack} style={{ background: 'var(--sakura-light)', border: 'none', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sakura-deep)', marginRight: 2 }}>‹</button>
                )}
                {screen === 'home' ? (
                  <div>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)', lineHeight: 1 }}>PALVIN</p>
                    <p style={{ fontSize: 10, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4 }}>{currentUser}{partnerProfile && <><Icon emoji="❤️" size={10} /> {partnerProfile.displayName}</>}</p>
                  </div>
                ) : (
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {title}
                    {SCREEN_TITLE_EMOJI[screen] && <Icon emoji={SCREEN_TITLE_EMOJI[screen]} size={15} />}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => handleTabClick('search')} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </button>
                <button onClick={() => handleTabClick('notifications')} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', position: 'relative' }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
                  {unreadNotifs > 0 && (
                    <div key={unreadNotifs} className="animate-heart-pop" style={{
                      position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, padding: '0 3px',
                      background: '#DC2626', borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1.5px solid var(--white)',
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: 'white', lineHeight: 1 }}>{unreadNotifs > 99 ? '99+' : unreadNotifs}</span>
                    </div>
                  )}
                </button>
                <button onClick={() => handleTabClick('chat')} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', position: 'relative' }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                  {state.unreadChatCount > 0 && (
                    <div key={state.unreadChatCount} className="animate-heart-pop" style={{
                      position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, padding: '0 3px',
                      background: '#DC2626', borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1.5px solid var(--white)',
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: 'white', lineHeight: 1 }}>{state.unreadChatCount > 99 ? '99+' : state.unreadChatCount}</span>
                    </div>
                  )}
                </button>
              </div>
            </header>

            {/* Scroll area */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 80px' }}>
              {/* ScreenRouter keeps every visited screen mounted (just
                  hidden) internally — see its own per-key .screen-transition
                  wrapper — so this can't have a key={screen} of its own
                  without unmounting that whole kept-alive tree on every nav. */}
              <ScreenRouter />
            </main>

            {/* Bottom Nav */}
            <nav className="app-bottom-nav" style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'var(--navbar-bg)',
              backdropFilter: 'blur(16px)',
              borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center',
              padding: '8px 4px 20px',
              zIndex: 20,
            }}>
              {NAV_TABS.slice(0, 2).map(tab => (
                <NavItem key={tab.key} Icon={tab.Icon} active={activeTab === tab.key} onClick={() => handleTabClick(tab.key)} />
              ))}

              {/* Center + Create */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    if (!isLinked) { toast('Link with your partner first 💕', '🔒', { passive: true }); return; }
                    openCreate();
                  }}
                  style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: isLinked ? 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))' : 'var(--border)',
                    border: 'none', color: isLinked ? 'white' : 'var(--ink-2)', cursor: 'pointer',
                    boxShadow: isLinked ? '0 3px 12px rgba(201,95,124,0.35)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                  }}>
                  {isLinked ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>
                  )}
                </button>
              </div>

              {NAV_TABS.slice(2, 4).map(tab => (
                <NavItem key={tab.key} Icon={tab.Icon} active={activeTab === tab.key} onClick={() => handleTabClick(tab.key)} />
              ))}

              {/* Settings = user avatar */}
              <button onClick={() => handleTabClick('settings')} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                transition: 'transform 0.15s',
                transform: activeTab === 'settings' ? 'scale(1.12)' : 'scale(1)',
              }}>
                <div style={{ position: 'relative' }}>
                  <Avatar user={currentUser} size={26} />
                  {activeTab === 'settings' && (
                    <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--sakura-deep)' }} />
                  )}
                </div>
              </button>
            </nav>

            {/* Chat — full-screen overlay (own header + input bar), like an
                Instagram DM thread replacing the tab bar while it's open.
                Stays mounted after the first open (see hasOpenedChat above)
                so leaving and coming back doesn't reload every photo/voice
                message in the thread again. */}
            {hasOpenedChat && (
              // Always technically "displayed" (never display:none) once
              // opened once — transform/opacity animate it in and out
              // instead, which display:none can't do, while pointerEvents
              // keeps it non-interactive and out of the way when hidden.
              // Chat itself never unmounts either way, so this is purely
              // the entrance/exit motion, not what keeps images from
              // reloading (that's the persistent mount itself).
              <div style={{
                position: 'absolute', inset: 0, zIndex: 50, background: 'var(--bg)',
                transform: screen === 'chat' ? 'translateY(0)' : 'translateY(100%)',
                opacity: screen === 'chat' ? 1 : 0,
                transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1), opacity 0.22s ease',
                pointerEvents: screen === 'chat' ? 'auto' : 'none',
              }}>
                <Suspense fallback={<ScreenLoadingFallback />}>
                  <Chat onBack={goBack} />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {createModal && <CreateModal />}
      <Toast />
    </div>
  );
}

function NavItem({ Icon, active, onClick }: { Icon: (p: { active: boolean }) => JSX.Element; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'none', border: 'none', cursor: 'pointer',
      color: active ? 'var(--sakura-deep)' : 'var(--ink-2)',
      padding: '4px 0',
      transition: 'transform 0.15s, color 0.15s',
      transform: active ? 'scale(1.12)' : 'scale(1)',
    }}>
      <Icon active={active} />
    </button>
  );
}
