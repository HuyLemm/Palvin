import { useState } from 'react';
import { useApp } from '../../context';
import BottomSheet from '../BottomSheet';
import Icon from '../Icon';

export default function AddPlaylistForm({ onClose }: { onClose: () => void }) {
  const { addToPlaylist, currentUser, partnerProfile } = useApp();
  const partnerName = partnerProfile?.displayName;
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [note, setNote] = useState('');
  const [addedBy, setAddedBy] = useState(currentUser);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Enter a song title.'); return; }
    setSaving(true);
    await addToPlaylist({ title: title.trim(), artist: artist.trim() || title.trim(), emoji: '🎵', note: note.trim(), addedBy });
    onClose();
  };

  return (
    <BottomSheet onClose={onClose} title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Add to Playlist <Icon emoji="🎵" size={16} /></span>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
        <input className="input-field" placeholder="Song title" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        <input className="input-field" placeholder="Artist (optional)" value={artist} onChange={e => setArtist(e.target.value)} />
        <input className="input-field" placeholder="Why this song? (optional)" value={note} onChange={e => setNote(e.target.value)} />
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Added by</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[currentUser, ...(partnerName ? [partnerName] : [])].map(u => (
              <button key={u} onClick={() => setAddedBy(u)} style={{ flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: addedBy === u ? 'var(--sakura-light)' : 'var(--bg)', border: addedBy === u ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: addedBy === u ? 'var(--sakura-deep)' : 'var(--ink-2)' }}>{u}</button>
            ))}
          </div>
        </div>
        {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose} disabled={saving} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving} style={{ flex: 2, opacity: saving ? 0.7 : 1 }}>{saving ? 'Adding...' : 'Add Song'}</button>
        </div>
      </div>
    </BottomSheet>
  );
}
