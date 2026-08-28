import { useRef, useState } from 'react';
import { useApp } from '../../context';
import { uploadPostImage } from '../../feed';
import BottomSheet from '../BottomSheet';
import Avatar from '../Avatar';

interface PendingImage {
  id: string;
  previewUrl: string;
  remoteUrl?: string;
  uploading: boolean;
  failed: boolean;
}

export default function AddPostForm({ onClose }: { onClose: () => void }) {
  const { addPost, currentUser, myProfile } = useApp();
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<PendingImage[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploading = images.some(im => im.uploading);
  const readyUrls = images.filter(im => im.remoteUrl).map(im => im.remoteUrl!);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !myProfile?.coupleId) return;
    const coupleId = myProfile.coupleId;
    setError('');
    const files = Array.from(fileList);
    const pending: PendingImage[] = files.map(f => ({ id: crypto.randomUUID(), previewUrl: URL.createObjectURL(f), uploading: true, failed: false }));
    setImages(prev => [...prev, ...pending]);
    files.forEach(async (file, i) => {
      const item = pending[i];
      const url = await uploadPostImage(coupleId, file);
      setImages(prev => prev.map(im => im.id === item.id ? { ...im, remoteUrl: url ?? undefined, uploading: false, failed: !url } : im));
    });
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(im => im.id !== id));
  };

  const handleSubmit = () => {
    if (!caption.trim()) { setError('Please write a caption.'); return; }
    if (readyUrls.length === 0) { setError('Please add at least one photo.'); return; }
    const now = new Date();
    addPost({
      author: currentUser,
      date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      images: readyUrls,
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
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Photos</p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {images.map(im => (
              <div key={im.id} style={{ position: 'relative', width: 80, height: 80, flexShrink: 0, borderRadius: 12, overflow: 'hidden', border: '2.5px solid var(--sakura-deep)' }}>
                <img src={im.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: im.uploading ? 0.5 : 1 }} />
                {im.uploading && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.5)', borderTopColor: 'white', animation: 'palvin-spin 0.7s linear infinite' }} />
                  </div>
                )}
                {im.failed && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', textAlign: 'center', padding: 4 }}>Lỗi tải ảnh</div>
                )}
                <button onClick={() => removeImage(im.id)} style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: 'white', border: 'none', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ width: 80, height: 80, flexShrink: 0, borderRadius: 12, border: '2px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontSize: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >+</button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
              style={{ display: 'none' }}
            />
          </div>
          <style>{`@keyframes palvin-spin { to { transform: rotate(360deg); } }`}</style>
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
          <button className="btn-primary" onClick={handleSubmit} disabled={isUploading} style={{ flex: 2, opacity: isUploading ? 0.6 : 1 }}>{isUploading ? 'Uploading...' : 'Post'}</button>
        </div>
      </div>
    </BottomSheet>
  );
}
