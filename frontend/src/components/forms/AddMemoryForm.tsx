import { useRef, useState } from 'react';
import { useApp } from '../../context';
import { uploadMemoryImage } from '../../memories';
import Icon from '../Icon';

export default function AddMemoryForm({ onClose }: { onClose: () => void }) {
  const { addMemory, currentUser, myProfile, partnerProfile } = useApp();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
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
      else setError('Upload failed, please try again.');
    });
  };

  const handleSubmit = async () => {
    if (!title.trim())  { setError('Please add a title.'); return; }
    if (!date)          { setError('Please select a date.'); return; }
    if (!remoteUrl)     { setError(uploading ? 'Please wait for the photo to finish uploading.' : 'Please choose a photo.'); return; }
    const d = new Date(date);
    const formatted = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    setSaving(true);
    await addMemory({
      title, date: formatted, year: d.getFullYear(),
      location: location || 'Unknown', description, image: remoteUrl,
      people: partnerProfile ? [currentUser, partnerProfile.displayName] : [currentUser]
    });
    onClose();
  };

  return (
    <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>New Memory <Icon emoji="🌸" size={16} /></p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input className="input-field" placeholder="Memory title..." value={title} onChange={e => setTitle(e.target.value)} />
          <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
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
                style={{ width: 80, height: 80, flexShrink: 0, borderRadius: 12, border: '2px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontSize: 27, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
            <button className="btn-ghost" onClick={onClose} disabled={saving} style={{ flex: 1 }}>Cancel</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={uploading || saving} style={{ flex: 2, opacity: (uploading || saving) ? 0.6 : 1 }}>{uploading ? 'Uploading...' : saving ? 'Saving...' : 'Save Memory'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
