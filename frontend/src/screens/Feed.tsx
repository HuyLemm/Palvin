import { useState } from 'react';
import { useApp } from '../context';
import Avatar from '../components/Avatar';

const REACTION_EMOJIS = ['❤️', '🔥', '😍', '🥺', '😂', '💕'];

export default function Feed() {
  const { state, toggleLike, toggleSave, addComment, addReaction, navigate, currentUser, openCreate } = useApp();
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [likedAnim, setLikedAnim] = useState<string | null>(null);
  const [reactionPickerId, setReactionPickerId] = useState<string | null>(null);

  const handleLike = (id: string, wasLiked: boolean) => {
    toggleLike(id);
    if (!wasLiked) { setLikedAnim(id); setTimeout(() => setLikedAnim(null), 400); }
  };

  const handleComment = (postId: string) => {
    if (!commentText.trim()) return;
    addComment(postId, commentText);
    setCommentText('');
    setCommentingId(null);
  };

  const handleReaction = (postId: string, emoji: string) => {
    addReaction(postId, emoji);
    setReactionPickerId(null);
  };

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
      <div style={{ display: 'flex', gap: 16, padding: '4px 0 16px', overflowX: 'auto' }}>
        {(['Alvin', 'Paoi'] as const).map(u => (
          <div
            key={u}
            onClick={() => openCreate('post')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}
          >
            <div style={{ position: 'relative' }}>
              <Avatar user={u} size={56} story />
              <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--sakura-accent)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', border: '2px solid white', fontWeight: 700 }}>+</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{u}</span>
          </div>
        ))}
      </div>

      {/* Posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {state.posts.map(post => {
          const reactions = state.postReactions[post.id] ?? {};
          const totalReactions = Object.values(reactions).reduce((s, r) => s + r.count, 0);
          const topReactions = Object.entries(reactions).filter(([, r]) => r.count > 0).slice(0, 3);

          return (
            <div key={post.id} className="card" style={{ overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar user={post.author} size={38} ring />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{post.author}</p>
                  <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{post.date}{post.location ? ` · 📍 ${post.location}` : ''}</p>
                </div>
                <span style={{ fontSize: 18, cursor: 'pointer', color: 'var(--ink-2)' }}>···</span>
              </div>

              {/* Image */}
              <div style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => navigate('post-detail', post.id)}
                onDoubleClick={() => handleLike(post.id, post.liked)}>
                <div style={{ background: 'var(--sakura-light)', aspectRatio: '1', overflow: 'hidden' }}>
                  <img src={post.image} alt={post.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                {likedAnim === post.id && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: 72, animation: 'heartPop 0.4s ease-out forwards' }}>❤️</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ padding: '10px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8, position: 'relative' }}>
                  {/* Like */}
                  <button onClick={() => handleLike(post.id, post.liked)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 600, color: post.liked ? 'var(--sakura-accent)' : 'var(--ink-2)', transition: 'color 0.15s', padding: 0 }}>
                    <span style={{ fontSize: 20, transition: 'transform 0.15s', transform: post.liked ? 'scale(1.1)' : 'scale(1)' }}>{post.liked ? '❤️' : '🤍'}</span>
                    {post.likes}
                  </button>

                  {/* Comment */}
                  <button onClick={() => setCommentingId(commentingId === post.id ? null : post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', padding: 0 }}>
                    <span style={{ fontSize: 18 }}>💬</span> {post.comments.length}
                  </button>

                  {/* Reaction button */}
                  <button onClick={() => setReactionPickerId(reactionPickerId === post.id ? null : post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', padding: 0 }}>
                    <span style={{ fontSize: 18 }}>😊</span>
                    {totalReactions > 0 && <span style={{ fontSize: 12 }}>{totalReactions}</span>}
                  </button>

                  {/* Save */}
                  <button onClick={() => toggleSave(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, marginLeft: 'auto', color: post.saved ? 'var(--sakura-accent)' : 'var(--ink-2)', padding: 0 }}>
                    {post.saved ? '🔖' : '🏷️'}
                  </button>

                  {/* Reaction picker */}
                  {reactionPickerId === post.id && (
                    <div className="reaction-picker" style={{ position: 'absolute', bottom: '100%', left: 60, background: 'white', borderRadius: 24, padding: '8px 12px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', display: 'flex', gap: 6, zIndex: 10, border: '1px solid var(--border)' }}>
                      {REACTION_EMOJIS.map(emoji => {
                        const r = reactions[emoji];
                        const reacted = r?.reacted;
                        return (
                          <button key={emoji} onClick={() => handleReaction(post.id, emoji)} style={{ background: reacted ? 'var(--sakura-light)' : 'none', border: 'none', borderRadius: 12, padding: '6px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'transform 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.3)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                            <span style={{ fontSize: 24 }}>{emoji}</span>
                            {r?.count > 0 && <span style={{ fontSize: 10, color: 'var(--sakura-deep)', fontWeight: 700 }}>{r.count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Reactions display */}
                {topReactions.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    {topReactions.map(([emoji, r]) => (
                      <span key={emoji} style={{ fontSize: 13, background: 'var(--sakura-light)', borderRadius: 20, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        {emoji} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sakura-deep)' }}>{r.count}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Caption */}
                <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>
                  <strong style={{ marginRight: 4 }}>{post.author}</strong>{post.caption}
                </p>

                {/* Comments */}
                {post.comments.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {post.comments.map(c => (
                      <p key={c.id} style={{ fontSize: 13, color: 'var(--ink)' }}>
                        <strong style={{ marginRight: 4 }}>{c.author}</strong>
                        <span style={{ color: 'var(--ink-2)' }}>{c.text}</span>
                      </p>
                    ))}
                  </div>
                )}

                {/* Comment input */}
                {commentingId === post.id && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Avatar user={currentUser} size={28} />
                    <input
                      className="input-field"
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleComment(post.id); }}
                      autoFocus
                      style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
                    />
                    <button onClick={() => handleComment(post.id)} style={{ background: 'var(--sakura-accent)', color: 'white', border: 'none', borderRadius: 99, padding: '6px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Post</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
