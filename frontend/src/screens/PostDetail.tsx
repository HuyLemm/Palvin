import { useState } from 'react';
import { useApp } from '../context';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

export default function PostDetail() {
  const { state, selectedId, goBack, toggleLike, toggleSave, addComment, currentUser } = useApp();
  const post = state.posts.find(p => p.id === selectedId);
  const [text, setText] = useState('');
  const [imgIndex, setImgIndex] = useState(0);

  if (!post) return null;

  const handleComment = () => {
    if (!text.trim()) return;
    addComment(post.id, text);
    setText('');
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={post.author} size={38} ring />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{post.author}</p>
            <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{post.date}{post.location ? <> · <Icon emoji="📍" size={12} style={{ verticalAlign: -2 }} /> {post.location}</> : ''}</p>
          </div>
        </div>
        <div style={{ position: 'relative', background: 'var(--sakura-light)' }}>
          <div
            onScroll={post.images.length > 1 ? (e => { const el = e.currentTarget; setImgIndex(Math.round(el.scrollLeft / el.clientWidth)); }) : undefined}
            style={{ display: 'flex', overflowX: post.images.length > 1 ? 'auto' : 'hidden', scrollSnapType: 'x mandatory' }}
          >
            {post.images.map((img, i) => (
              <img key={i} src={img} alt={post.caption} style={{ flex: '0 0 100%', scrollSnapAlign: 'start', width: '100%', display: 'block', maxHeight: 400, objectFit: 'cover' }} />
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
            <button onClick={() => toggleSave(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: post.saved ? 'var(--sakura-accent)' : 'var(--ink-2)', padding: 0, marginLeft: 'auto', display: 'flex' }}>
              <BookmarkIcon filled={post.saved} />
            </button>
          </div>
          <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 16 }}>
            <strong style={{ marginRight: 6 }}>{post.author}</strong>{post.caption}
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
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Avatar user={currentUser} size={30} />
              <input className="input-field" placeholder="Write a comment..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleComment(); }} style={{ flex: 1, padding: '8px 12px', fontSize: 14 }} />
              <button onClick={handleComment} style={{ background: 'var(--sakura-accent)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Post</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
