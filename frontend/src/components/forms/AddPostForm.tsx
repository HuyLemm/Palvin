import { useState } from 'react';
import { useApp } from '../../context';
import BottomSheet from '../BottomSheet';
import Avatar from '../Avatar';

const MOODS = ['😊', '🥰', '😍', '🌸', '✨', '🎉', '😌', '🥺'];
const IMAGES = [
  'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&h=600&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1522383225753-aa61820f8dc6?w=600&h=600&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=600&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=600&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1447933863590-8f90f5893571?w=600&h=600&fit=crop&auto=format',
];

export default function AddPostForm({ onClose }: { onClose: () => void }) {
  const { addPost, currentUser } = useApp();
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!caption.trim()) { setError('Please write a caption.'); return; }
    if (!selectedImage)  { setError('Please select a photo.'); return; }
    const now = new Date();
    addPost({
      author: currentUser,
      date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      image: selectedImage,
      caption,
      location: location || undefined,
      likes: 0,
    });
    onClose();
  };

  return (
    <BottomSheet onClose={onClose} title="New Post">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={currentUser} size={36} />
          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{currentUser}</span>
        </div>

        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Choose a photo</p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {IMAGES.map(img => (
              <div
                key={img}
                onClick={() => setSelectedImage(img)}
                style={{
                  width: 80, height: 80, flexShrink: 0,
                  borderRadius: 12,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: selectedImage === img ? '2.5px solid var(--sakura-deep)' : '2.5px solid transparent',
                  transition: 'border 0.15s',
                }}
              >
                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>

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
          <button className="btn-primary" onClick={handleSubmit} style={{ flex: 2 }}>Post</button>
        </div>
      </div>
    </BottomSheet>
  );
}
