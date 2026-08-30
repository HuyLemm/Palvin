import { useRef, useState } from 'react';
import { useApp } from '../../context';
import { uploadMemoryImage } from '../../memories';
import BottomSheet from '../BottomSheet';
import Icon from '../Icon';

export default function AddMemoryForm({ onClose }: { onClose: () => void }) {
  const { addMemory, currentUser, myProfile } = useApp();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !myProfile?.coupleId) return;
    setError('');
    setPreviewUrl(URL.createObjectURL(file));
    setRemoteUrl('');
    setUploading(true);
    uploadMemoryImage(myProfile.coupleId, file).then(url => {
      setUploading(false);
      if (url) setRemoteUrl(url);
      else setError('Tải ảnh thất bại, thử lại nhé.');
    });
  };

  const handleSubmit = () => {
    if (!title.trim())  { setError('Please add a title.'); return; }
    if (!date)          { setError('Please select a date.'); return; }
    if (!remoteUrl)     { setError(uploading ? 'Đợi ảnh tải xong nhé.' : 'Please choose a photo.'); return; }
    const d = new Date(date);
    const formatted = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    addMemory({
      title, date: formatted, year: d.getFullYear(),
      location: location || 'Unknown', description, image: remoteUrl,
      people: ['Alvin', 'Paoi']
    });
    onClose();
  };

  return (
    <BottomSheet onClose={onClose} title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>New Memory <Icon emoji="🌸" size={16} /></span>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
        <input className="input-field" placeholder="Memory title..." value={title} onChange={e => setTitle(e.target.value)} />
        <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <input className="input-field" placeholder="Location (e.g. Tokyo, Japan)" value={location} onChange={e => setLocation(e.target.value)} />
        <textarea className="input-field" placeholder="Tell the story..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Photo</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {previewUrl && (
              <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0, borderRadius: 12, overflow: 'hidden', border: '2.5px solid var(--sakura-deep)' }}>
                <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: uploading ? 0.5 : 1 }} />
                {uploading && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.5)', borderTopColor: 'white', animation: 'palvin-spin 0.7s linear infinite' }} />
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ width: 80, height: 80, flexShrink: 0, borderRadius: 12, border: '2px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontSize: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >{previewUrl ? '↻' : '+'}</button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={e => { handleFile(e.target.files); e.target.value = ''; }}
              style={{ display: 'none' }}
            />
          </div>
          <style>{`@keyframes palvin-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
        {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={uploading} style={{ flex: 2, opacity: uploading ? 0.6 : 1 }}>{uploading ? 'Uploading...' : 'Save Memory'}</button>
        </div>
      </div>
    </BottomSheet>
  );
}
