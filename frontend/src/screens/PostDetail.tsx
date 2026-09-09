import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context';
import { usePortalPanel } from '../hooks/usePortalPanel';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import FadeImage from '../components/FadeImage';

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

export default function PostDetail({ id }: { id?: string } = {}) {
  const { state, screen, selectedId, goBack, toggleLike, toggleSave, addComment, currentUser } = useApp();
  const post = state.posts.find(p => p.id === (id ?? selectedId));
  const [text, setText] = useState('');
  const [imgIndex, setImgIndex] = useState(0);
  // This instance stays mounted (display:none) once visited — see
  // ScreenRouter's keep-alive — but the comment bar below is portaled
  // straight to document.body, which ignores that. usePortalPanel force-
  // closes it the moment `screen`/`selectedId` no longer point at this
  // exact post (tab switch, back, or moving on to a different post).
  const { open: commenting, closing: commentClosing, show: openComment, hide: closeComment } = usePortalPanel(`${screen}:${selectedId}`);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const pendingScrollRef = useRef(false);
  const prevCommentsLenRef = useRef(post?.comments.length ?? 0);

  // Scrolls the new comment into view once it actually lands — addComment
  // awaits a network round trip and refetches before post.comments grows,
  // so this can't happen synchronously right after calling it. Gated on
  // pendingScrollRef so a partner's comment arriving via a notification
  // refetch doesn't yank your scroll position too.
  useEffect(() => {
    const len = post?.comments.length ?? 0;
    if (len > prevCommentsLenRef.current && pendingScrollRef.current) {
      pendingScrollRef.current = false;
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    prevCommentsLenRef.current = len;
  }, [post?.comments.length]);

  if (!post) return null;

  const handleComment = () => {
    if (!text.trim()) return;
    pendingScrollRef.current = true;
    addComment(post.id, text);
    setText('');
    closeComment(200);
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={post.author} size={38} ring />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{post.author}</p>
            <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{post.date}</p>
            {post.location && <p style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}><Icon emoji="📍" size={12} />{post.location}</p>}
          </div>
        </div>
        <div style={{ position: 'relative', background: 'var(--sakura-light)' }}>
          <div
            onScroll={post.images.length > 1 ? (e => { const el = e.currentTarget; setImgIndex(Math.round(el.scrollLeft / el.clientWidth)); }) : undefined}
            style={{ display: 'flex', overflowX: post.images.length > 1 ? 'auto' : 'hidden', scrollSnapType: 'x mandatory' }}
          >
            {post.images.map((img, i) => (
              <div key={i} style={{ flex: '0 0 100%', scrollSnapAlign: 'start', height: 400 }}>
                <FadeImage src={img} alt={post.caption} style={{ width: '100%', height: '100%' }} />
              </div>
            ))}
          </div>
          {post.images.length > 1 && (
            <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(51,42,45,0.6)', color: 'white', fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '2px 8px' }}>
              {imgIndex + 1}/{post.images.length}
            </div>
          )}
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <button onClick={() => toggleLike(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600, color: post.liked ? 'var(--sakura-accent)' : 'var(--ink-2)', padding: 0 }}>
              <Icon emoji={post.liked ? '❤️' : '🤍'} size={22} /> {post.likes}
            </button>
            <button onClick={openComment} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600, color: 'var(--ink-2)', padding: 0 }}>
              <Icon emoji="💬" size={20} /> {post.comments.length}
            </button>
            <button onClick={() => toggleSave(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: post.saved ? 'var(--sakura-accent)' : 'var(--ink-2)', padding: 0, marginLeft: 'auto', display: 'flex' }}>
              <BookmarkIcon filled={post.saved} />
            </button>
          </div>
          <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 16 }}>
            <strong style={{ display: 'block', marginBottom: 2 }}>{post.author}</strong>{post.caption}
          </p>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Comments ({post.comments.length})</p>
            {post.comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <Avatar user={c.author} size={30} />
                <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 12, padding: '8px 12px' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{c.author}</p>
                  <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 }}>{c.text}</p>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
            <div onClick={openComment} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
              <Avatar user={currentUser} size={30} />
              <div className="input-field" style={{ flex: 1, padding: '8px 12px', fontSize: 14, color: 'var(--ink-2)' }}>Write a comment...</div>
            </div>
          </div>
        </div>
      </div>

      {/* Comment input — portaled to a fixed bar riding just above the
          keyboard, Facebook-style, same pattern as PostCard's. */}
      {commenting && createPortal(
        <div style={{
          position: 'fixed', left: 0, right: 0, top: 'var(--kb-vh, 100dvh)',
          zIndex: 250, background: 'var(--card)', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          animation: commentClosing
            ? 'commentBarOut 0.2s cubic-bezier(0.32,0.72,0,1) forwards'
            : 'commentBarIn 0.25s cubic-bezier(0.32,0.72,0,1) forwards',
        }}>
          <Avatar user={currentUser} size={28} />
          <input
            className="input-field"
            placeholder="Write a comment..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleComment(); }}
            autoFocus
            style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
          />
          <button onClick={handleComment} style={{ background: 'var(--sakura-accent)', color: 'white', border: 'none', borderRadius: 99, padding: '6px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>Post</button>
          <button onClick={() => closeComment(200)} style={{ background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}><Icon emoji="✕" size={16} /></button>
        </div>,
        document.body
      )}
    </div>
  );
}
