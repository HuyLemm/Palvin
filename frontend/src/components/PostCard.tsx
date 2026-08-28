import { useState } from 'react';
import { useApp } from '../context';
import Avatar from './Avatar';
import EditPostForm from './forms/EditPostForm';
import type { Post } from '../types';

const REACTION_EMOJIS = ['❤️', '🔥', '😍', '🥺', '😂', '💕'];

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

export default function PostCard({ post, reactions }: { post: Post; reactions: Record<string, { count: number; reacted: boolean }> }) {
  const { toggleLike, toggleSave, addComment, addReaction, navigate, currentUser, deletePost } = useApp();
  const [commentingId, setCommentingId] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [likedAnim, setLikedAnim] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isMine = post.author === currentUser;
  const totalReactions = Object.values(reactions).reduce((s, r) => s + r.count, 0);
  const topReactions = Object.entries(reactions).filter(([, r]) => r.count > 0).slice(0, 3);

  const handleLike = () => {
    toggleLike(post.id);
    if (!post.liked) { setLikedAnim(true); setTimeout(() => setLikedAnim(false), 400); }
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    addComment(post.id, commentText);
    setCommentText('');
    setCommentingId(false);
  };

  const handleReaction = (emoji: string) => {
    addReaction(post.id, emoji);
    setReactionPickerOpen(false);
  };

  const onImageScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== imgIndex) setImgIndex(i);
  };

  return (
    <>
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar user={post.author} size={38} ring />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{post.author}</p>
          <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{post.date}{post.location ? ` · 📍 ${post.location}` : ''}</p>
        </div>
        {isMine && (
          <button onClick={() => setShowOptions(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', padding: 4, display: 'flex' }}><MoreIcon /></button>
        )}
      </div>

      {/* Image(s) */}
      <div style={{ position: 'relative' }}>
        <div
          onScroll={post.images.length > 1 ? onImageScroll : undefined}
          onDoubleClick={handleLike}
          style={{
            display: 'flex', overflowX: post.images.length > 1 ? 'auto' : 'hidden', scrollSnapType: 'x mandatory',
            background: 'var(--sakura-light)', cursor: 'pointer',
          }}
        >
          {post.images.map((img, i) => (
            <div key={i} onClick={() => navigate('post-detail', post.id)} style={{ flex: '0 0 100%', scrollSnapAlign: 'start', aspectRatio: '1', overflow: 'hidden' }}>
              <img src={img} alt={post.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
        {post.images.length > 1 && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(51,42,45,0.6)', color: 'white', fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '2px 8px' }}>
            {imgIndex + 1}/{post.images.length}
          </div>
        )}
        {post.images.length > 1 && (
          <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
            {post.images.map((_, i) => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i === imgIndex ? 'white' : 'rgba(255,255,255,0.5)' }} />
            ))}
          </div>
        )}
        {likedAnim && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: 72, animation: 'heartPop 0.4s ease-out forwards' }}>❤️</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8, position: 'relative' }}>
          {/* Like */}
          <button onClick={handleLike} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 600, color: post.liked ? 'var(--sakura-accent)' : 'var(--ink-2)', transition: 'color 0.15s', padding: 0 }}>
            <span style={{ fontSize: 20, transition: 'transform 0.15s', transform: post.liked ? 'scale(1.1)' : 'scale(1)' }}>{post.liked ? '❤️' : '🤍'}</span>
            {post.likes}
          </button>

          {/* Comment */}
          <button onClick={() => setCommentingId(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', padding: 0 }}>
            <span style={{ fontSize: 18 }}>💬</span> {post.comments.length}
          </button>

          {/* Reaction button */}
          <button onClick={() => setReactionPickerOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', padding: 0 }}>
            <span style={{ fontSize: 18 }}>😊</span>
            {totalReactions > 0 && <span style={{ fontSize: 12 }}>{totalReactions}</span>}
          </button>

          {/* Save */}
          <button onClick={() => toggleSave(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', color: post.saved ? 'var(--sakura-accent)' : 'var(--ink-2)', padding: 0, display: 'flex' }}>
            <BookmarkIcon filled={post.saved} />
          </button>

          {/* Reaction picker */}
          {reactionPickerOpen && (
            <div className="reaction-picker" style={{ position: 'absolute', bottom: '100%', left: 60, background: 'white', borderRadius: 24, padding: '8px 12px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', display: 'flex', gap: 6, zIndex: 10, border: '1px solid var(--border)' }}>
              {REACTION_EMOJIS.map(emoji => {
                const r = reactions[emoji];
                const reacted = r?.reacted;
                return (
                  <button key={emoji} onClick={() => handleReaction(emoji)} style={{ background: reacted ? 'var(--sakura-light)' : 'none', border: 'none', borderRadius: 12, padding: '6px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'transform 0.1s' }}
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
        {commentingId && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Avatar user={currentUser} size={28} />
            <input
              className="input-field"
              placeholder="Write a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleComment(); }}
              autoFocus
              style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
            />
            <button onClick={handleComment} style={{ background: 'var(--sakura-accent)', color: 'white', border: 'none', borderRadius: 99, padding: '6px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Post</button>
          </div>
        )}
      </div>
    </div>

    {/* Rendered as siblings of .card, not inside it — that div has
        overflow:hidden, and WebKit clips position:fixed descendants of an
        overflow:hidden ancestor (a real WebKit quirk, not spec-correct
        behavior), which made these overlays render as an invisible sliver
        confined to the card's own small box instead of covering the screen. */}
    {/* Options menu */}
    {showOptions && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setShowOptions(false)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 8, width: '100%', maxWidth: 300, overflow: 'hidden', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setShowEdit(true); setShowOptions(false); }} style={{ width: '100%', textAlign: 'center', padding: '14px 8px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}>✏️ Chỉnh sửa bài viết</button>
            <button onClick={() => { setConfirmDelete(true); setShowOptions(false); }} style={{ width: '100%', textAlign: 'center', padding: '14px 8px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 600, color: '#DC2626', cursor: 'pointer' }}>🗑️ Xóa bài viết</button>
            <button onClick={() => setShowOptions(false)} style={{ width: '100%', textAlign: 'center', padding: '14px 8px', background: 'none', border: 'none', fontSize: 15, fontWeight: 500, color: 'var(--ink-2)', cursor: 'pointer' }}>Hủy</button>
          </div>
        </div>
      )}

      {showEdit && <EditPostForm post={post} onClose={() => setShowEdit(false)} />}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Xóa bài viết này?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>Không thể hoàn tác sau khi xóa.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Hủy</button>
              <button onClick={() => { deletePost(post.id); setConfirmDelete(false); }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
