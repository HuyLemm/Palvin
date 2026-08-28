import { useState } from 'react';
import { useApp } from '../context';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';

export default function Feed() {
  const { state, navigate, currentUser, openCreate } = useApp();
  const [showPartnerInfo, setShowPartnerInfo] = useState<string | null>(null);
  const partnerUser = currentUser === 'Alvin' ? 'Paoi' : 'Alvin';

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
        {(['Alvin', 'Paoi'] as const).map(u => (
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
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>Đã lưu</span>
        </button>
      </div>

      {/* Posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {state.posts.map(post => (
          <PostCard key={post.id} post={post} reactions={state.postReactions[post.id] ?? {}} />
        ))}
      </div>

      {/* Partner info modal */}
      {showPartnerInfo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setShowPartnerInfo(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <Avatar user={partnerUser} size={56} ring />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginTop: 12, marginBottom: 6 }}>Đây là nơi {partnerUser} đăng bài 💕</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>Bạn không thể tạo bài viết thay cho {partnerUser} — hãy đợi {partnerUser} tự đăng nhé!</p>
            <button onClick={() => setShowPartnerInfo(null)} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: 'var(--sakura-accent)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Đã hiểu</button>
          </div>
        </div>
      )}
    </div>
  );
}
