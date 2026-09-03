import { useState } from 'react';
import { useApp } from '../../context';
import type { Post } from '../../types';
import Icon from '../Icon';
import FadeImage from '../FadeImage';

export default function EditPostForm({ post, onClose }: { post: Post; onClose: () => void }) {
  const { editPost } = useApp();
  const [caption, setCaption] = useState(post.caption);
  const [location, setLocation] = useState(post.location ?? '');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!caption.trim()) { setError('Please write a caption.'); return; }
    editPost(post.id, { caption, location: location || undefined });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: '80vh', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Edit Post</p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {post.images.map((img, i) => (
              <div key={i} style={{ width: 70, height: 70, flexShrink: 0, borderRadius: 12, overflow: 'hidden' }}>
                <FadeImage src={img} alt="" style={{ width: '100%', height: '100%' }} />
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: -10 }}>Photos can't be edited — just the caption and location.</p>

          <textarea
            className="input-field"
            placeholder="Write a caption..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={3}
          />

          <input
            className="input-field"
            placeholder="Add location (optional)"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />

          {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} style={{ flex: 2 }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
