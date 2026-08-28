import { useState } from 'react';
import { useApp } from '../context';
import Avatar from '../components/Avatar';

export default function PostDetail() {
  const { state, selectedId, goBack, toggleLike, toggleSave, addComment, currentUser } = useApp();
  const post = state.posts.find(p => p.id === selectedId);
  const [text, setText] = useState('');

  if (!post) return null;

  const handleComment = () => {
    if (!text.trim()) return;
    addComment(post.id, text);
    setText('');
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}>← Back</button>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={post.author} size={38} ring />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{post.author}</p>
            <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{post.date}{post.location ? ` · 📍 ${post.location}` : ''}</p>
          </div>
        </div>
        <div style={{ background: 'var(--sakura-light)' }}>
          <img src={post.image} alt={post.caption} style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'cover' }} />
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            <button onClick={() => toggleLike(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600, color: post.liked ? 'var(--sakura-accent)' : 'var(--ink-2)', padding: 0 }}>
              <span style={{ fontSize: 22 }}>{post.liked ? '❤️' : '🤍'}</span> {post.likes}
            </button>
            <button onClick={() => toggleSave(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: post.saved ? 'var(--sakura-accent)' : 'var(--ink-2)', padding: 0, marginLeft: 'auto' }}>
              {post.saved ? '🔖' : '🏷️'}
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
