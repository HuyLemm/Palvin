import { useState } from 'react';
import { useApp } from '../../context';
import BottomSheet from '../BottomSheet';
import Icon from '../Icon';

const IMAGES = [
  'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=600&h=800&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1447933863590-8f90f5893571?w=600&h=500&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&h=700&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=600&h=600&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=800&fit=crop&auto=format',
];

export default function AddMemoryForm({ onClose }: { onClose: () => void }) {
  const { addMemory, currentUser } = useApp();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!title.trim())  { setError('Please add a title.'); return; }
    if (!date)          { setError('Please select a date.'); return; }
    if (!selectedImage) { setError('Please choose a photo.'); return; }
    const d = new Date(date);
    const formatted = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    addMemory({
      title, date: formatted, year: d.getFullYear(),
      location: location || 'Unknown', description, image: selectedImage,
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
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Choose a photo</p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {IMAGES.map(img => (
              <div key={img} onClick={() => setSelectedImage(img)} style={{ width: 80, height: 80, flexShrink: 0, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', border: selectedImage === img ? '2.5px solid var(--sakura-deep)' : '2.5px solid transparent' }}>
                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>
        {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} style={{ flex: 2 }}>Save Memory</button>
        </div>
      </div>
    </BottomSheet>
  );
}
