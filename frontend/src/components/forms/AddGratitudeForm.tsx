import { useRef, useState } from 'react';
import { useApp } from '../../context';
import { uploadGratitudeImage } from '../../gratitude';
import BottomSheet from '../BottomSheet';
import Icon from '../Icon';

export default function AddGratitudeForm({ onClose }: { onClose: () => void }) {
  const { addGratitude, currentUser, myProfile } = useApp();
  const [text, setText] = useState('');
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
    uploadGratitudeImage(myProfile.coupleId, file).then(url => {
      setUploading(false);
      if (url) setRemoteUrl(url);
      else setError('Upload failed, please try again.');
    });
  };

  const handleSubmit = async () => {
    if (!text.trim()) { setError("Write what you're grateful for."); return; }
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    await addGratitude({ from: currentUser, text: text.trim(), date: today, image: remoteUrl || undefined });
    onClose();
  };

  return (
    <BottomSheet onClose={onClose} title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Gratitude Entry <Icon emoji="🌸" size={16} /></span>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
        <textarea className="input-field" placeholder="Write what you're grateful for today..." value={text} onChange={e => setText(e.target.value)} rows={4} />
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Photo (optional)</p>
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
          <button className="btn-primary" onClick={handleSubmit} disabled={uploading || saving} style={{ flex: 2, opacity: (uploading || saving) ? 0.6 : 1 }}>{uploading ? 'Uploading...' : saving ? 'Saving...' : 'Save Entry'}</button>
        </div>
      </div>
    </BottomSheet>
  );
}
