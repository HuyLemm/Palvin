import { useEffect, type JSX } from 'react';
import { useApp } from './context';
import Toast from './components/Toast';
import CreateModal from './components/CreateModal';
import AuthScreen from './screens/AuthScreen';
import CoupleLocked from './components/CoupleLocked';
import Avatar from './components/Avatar';

import Home from './screens/Home';
import Feed from './screens/Feed';
import Money from './screens/Money';
import Us from './screens/Us';
import Memories from './screens/Memories';
import LoveNotes from './screens/LoveNotes';
import Calendar from './screens/Calendar';
import FutureUs from './screens/FutureUs';
import Search from './screens/Search';
import Notifications from './screens/Notifications';
import Settings from './screens/Settings';
import PostDetail from './screens/PostDetail';
import SavedPosts from './screens/SavedPosts';
import MemoryDetail from './screens/MemoryDetail';

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
  home: 'PALVIN', feed: 'Feed', money: 'Our Money 💰', us: 'Us 🌸',
  memories: 'Memories 🌸', 'love-notes': 'For You 💌', calendar: 'Our Calendar',
  'future-us': 'Future Us', search: 'Search', notifications: 'Notifications',
  settings: 'Settings', stats: 'Chi tiêu 📊',
  'post-detail': 'Post', 'memory-detail': 'Memory', 'saved-posts': 'Đã lưu',
};

// Stay open even before the couple is linked: Settings hosts the invite/accept
// flow, and Notifications is where an incoming invite also surfaces.
const UNLOCKED_BEFORE_LINK = ['settings', 'notifications'];

function ScreenRouter() {
  const { screen, isLinked } = useApp();

  if (!isLinked && !UNLOCKED_BEFORE_LINK.includes(screen)) return <CoupleLocked />;

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
    case 'stats':         return <Money />;
    case 'post-detail':   return <PostDetail />;
    case 'saved-posts':   return <SavedPosts />;
    case 'memory-detail': return <MemoryDetail />;
    default:              return <Home />;
  }
}

const MAIN_TABS: Tab[] = ['home', 'feed', 'stats', 'us', 'settings'];

export default function App() {
  const { screen, navigate, goBack, state, createModal, openCreate, currentUser, profilePhotos, authed, authLoading, profileLoaded, isLinked, pendingInvite, toast } = useApp();
  const stillResolvingSession = authLoading || (authed && !profileLoaded);
  // iOS Safari doesn't support the interactive-widget viewport meta property
  // (Chrome/Firefox only), so it always shrinks the visual viewport when the
  // keyboard opens — which our height:100%/dvh chain then follows, making
  // the whole app visibly reflow. Snapshot the real height once (before any
  // keyboard can open) into a CSS variable, and never update it in response
  // to a resize — only true device rotation should ever change it — so the
  // layout stays put and the keyboard simply overlaps the bottom instead.
  useEffect(() => {
    const setAppHeight = () => {
      document.documentElement.style.setProperty('--app-vh', `${window.innerHeight}px`);
    };
    setAppHeight();
    window.addEventListener('orientationchange', setAppHeight);
    return () => window.removeEventListener('orientationchange', setAppHeight);
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
            {stillResolvingSession && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 200, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: '3px solid var(--sakura-light)', borderTopColor: 'var(--sakura-accent)',
                  animation: 'palvin-spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes palvin-spin { to { transform: rotate(360deg); } }`}</style>
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
              background: 'rgba(255,248,250,0.92)',
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
                    <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)', lineHeight: 1 }}>PALVIN</p>
                    <p style={{ fontSize: 10, color: 'var(--ink-2)' }}>Alvin ❤️ Paoi</p>
                  </div>
                ) : (
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{title}</p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => handleTabClick('search')} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </button>
                <button onClick={() => handleTabClick('notifications')} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)', position: 'relative' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
                  {unreadNotifs > 0 && <div style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, background: 'var(--sakura-accent)', borderRadius: '50%' }} />}
                </button>
              </div>
            </header>

            {/* Scroll area */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 80px' }}>
              {/* key={screen} remounts this on every navigation so the
                  fade/slide-in animation replays each time. */}
              <div key={screen} className="screen-transition">
                <ScreenRouter />
              </div>
            </main>

            {/* Bottom Nav */}
            <nav className="app-bottom-nav" style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'rgba(255,248,250,0.96)',
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
                    if (!isLinked) { toast('Hãy liên kết với nửa kia trước 💕', '🔒'); return; }
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
                  <Avatar user={currentUser} size={26} photoUrl={profilePhotos[currentUser]} />
                  {activeTab === 'settings' && (
                    <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--sakura-deep)' }} />
                  )}
                </div>
              </button>
            </nav>
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
