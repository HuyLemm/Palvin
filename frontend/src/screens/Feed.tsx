import { useState } from 'react';
import { useApp } from '../context';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import Icon from '../components/Icon';

function monthLabel(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function Feed() {
  const { state, navigate, currentUser, partnerProfile, openCreate } = useApp();
  const [showPartnerInfo, setShowPartnerInfo] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const partnerUser = partnerProfile?.displayName;

  // Posts already arrive newest-first (post_date desc, then created_at desc)
  // — the months list below just needs to preserve that same order, not
  // re-sort anything.
  const months: string[] = [];
  for (const p of state.posts) {
    const m = p.postDate.slice(0, 7);
    if (!months.includes(m)) months.push(m);
  }
  const visiblePosts = monthFilter === 'all' ? state.posts : state.posts.filter(p => p.postDate.slice(0, 7) === monthFilter);

  return (
    <div style={{ paddingBottom: 24 }}>
      <style>{`
        @keyframes reactionPickerIn {
          from { opacity: 0; transform: scale(0.8) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .reaction-picker { animation: reactionPickerIn 0.2s ease both; }
        @keyframes reactionBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        .reaction-bounce { animation: reactionBounce 0.25s ease; }
      `}</style>

      {/* Stories */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 0 16px', overflowX: 'auto' }}>
        {[currentUser, ...(partnerUser ? [partnerUser] : [])].map(u => (
          <div
            key={u}
            onClick={() => u === currentUser ? openCreate('post') : setShowPartnerInfo(u)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}
          >
            <div style={{ position: 'relative' }}>
              <Avatar user={u} size={56} story />
              {u === currentUser && (
                <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--sakura-accent)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', border: '2px solid white', fontWeight: 700 }}>+</div>
              )}
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{u}</span>
          </div>
        ))}

        {/* Saved posts archive */}
        <button
          onClick={() => navigate('saved-posts')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}
        >
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--sakura-light)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--sakura-deep)" strokeWidth="2" strokeLinejoin="round">
              <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1z" />
            </svg>
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>Saved</span>
        </button>
      </div>

      {/* Month filter */}
      {months.length > 1 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
          <button onClick={() => setMonthFilter('all')} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 99, border: monthFilter === 'all' ? 'none' : '1.5px solid var(--border)', background: monthFilter === 'all' ? 'var(--sakura-accent)' : 'var(--white)', color: monthFilter === 'all' ? 'white' : 'var(--ink-2)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>All</button>
          {months.map(m => (
            <button key={m} onClick={() => setMonthFilter(m)} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 99, border: monthFilter === m ? 'none' : '1.5px solid var(--border)', background: monthFilter === m ? 'var(--sakura-accent)' : 'var(--white)', color: monthFilter === m ? 'white' : 'var(--ink-2)', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{monthLabel(m)}</button>
          ))}
        </div>
      )}

      {/* Posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {visiblePosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-2)', fontSize: 14 }}>No posts this month.</div>
        ) : visiblePosts.map(post => (
          <PostCard key={post.id} post={post} reactions={state.postReactions[post.id] ?? {}} />
        ))}
      </div>

      {/* Partner info modal */}
      {showPartnerInfo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setShowPartnerInfo(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <Avatar user={partnerUser ?? showPartnerInfo} size={56} ring />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginTop: 12, marginBottom: 6 }}>This is where {partnerUser} posts <Icon emoji="💕" size={14} style={{ verticalAlign: -2 }} /></p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>You can't create posts on {partnerUser}'s behalf — just wait for {partnerUser} to share one!</p>
            <button onClick={() => setShowPartnerInfo(null)} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: 'var(--sakura-accent)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
