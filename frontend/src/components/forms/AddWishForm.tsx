import { useRef, useState } from 'react';
import { useApp } from '../../context';
import { uploadWishImage } from '../../wishes';
import AmountInput from '../AmountInput';
import BottomSheet from '../BottomSheet';
import Icon from '../Icon';

// Manual-entry mode only (name/price/link/photo, no link-preview fetch) —
// Gift Wishlist's own "Paste a link" mode auto-scrapes a product page via a
// backend edge function, which isn't worth replicating here; "Enter
// manually" has always been the other fully-supported way to add a wish,
// so this quick-add reuses that exact path via the same addWish() call.
export default function AddWishForm({ onClose }: { onClose: () => void }) {
  const { addWish, currentUser, myProfile } = useApp();
  const [wish, setWish] = useState('');
  const [price, setPrice] = useState('');
  const [link, setLink] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !myProfile?.coupleId) return;
    setPreviewUrl(URL.createObjectURL(file));
    setRemoteUrl('');
    setUploading(true);
    uploadWishImage(myProfile.coupleId, file).then(url => {
      setUploading(false);
      if (url) setRemoteUrl(url);
    });
  };

  const handleSubmit = async () => {
    if (!wish.trim()) { setError("Enter what you'd like to receive."); return; }
    setSaving(true);
    await addWish({
      from: currentUser,
      wish: wish.trim(),
      date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      ...(price ? { price } : {}),
      ...(link.trim() ? { link: link.trim() } : {}),
      ...(remoteUrl ? { linkImage: remoteUrl } : {}),
    });
    onClose();
  };

  return (
    <BottomSheet onClose={onClose} title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Gift Wishlist <Icon emoji="🎁" size={16} /></span>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
        <input className="input-field" placeholder="Item you'd like to receive..." value={wish} onChange={e => setWish(e.target.value)} autoFocus />
        <AmountInput placeholder="Estimated price (VND, optional)" value={price} onChange={setPrice} />
        <input className="input-field" placeholder="Product link (optional)" value={link} onChange={e => setLink(e.target.value)} />
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Photo (optional)</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {previewUrl && (
              <div style={{ position: 'relative', width: 70, height: 70, flexShrink: 0, borderRadius: 12, overflow: 'hidden', border: '2px solid var(--sakura-deep)' }}>
                <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: uploading ? 0.5 : 1 }} />
                {uploading && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.5)', borderTopColor: 'white', animation: 'palvin-spin 0.7s linear infinite' }} />
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ width: 70, height: 70, flexShrink: 0, borderRadius: 12, border: '2px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >{previewUrl ? '↻' : '+'}</button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={e => { handleFile(e.target.files); e.target.value = ''; }} style={{ display: 'none' }} />
          </div>
          <style>{`@keyframes palvin-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
        {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose} disabled={saving} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={uploading || saving} style={{ flex: 2, opacity: (uploading || saving) ? 0.6 : 1 }}>{uploading ? 'Uploading...' : saving ? 'Adding...' : 'Add to Wishlist'}</button>
        </div>
      </div>
    </BottomSheet>
  );
}
