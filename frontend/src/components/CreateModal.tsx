import { useState } from 'react';
import { useApp } from '../context';
import BottomSheet from './BottomSheet';
import Icon from './Icon';
import AddPostForm from './forms/AddPostForm';
import AddGratitudeForm from './forms/AddGratitudeForm';
import AddTodoForm from './forms/AddTodoForm';
import AddWishForm from './forms/AddWishForm';
import AddTripForm from './forms/AddTripForm';
import AddCapsuleForm from './forms/AddCapsuleForm';
import AddEventForm from './forms/AddEventForm';

// Kept to the 6 most commonly used Us-tab sections only — each opens the
// exact same mutation that section's own screen uses (addTodo, addWish,
// addTrip, addCapsule, addEvent), just reachable from anywhere via the
// bottom navbar instead of having to first navigate into Us. Post, Memory,
// Love Note, Expense, and Goal aren't Us-tab features (Feed/Money/their own
// top-level screens) and each already has its own dedicated add button on
// its own screen, so they're deliberately left out of this menu.
const OPTIONS = [
  { icon: '📅', label: 'Event', key: 'event' },
  { icon: '🌷', label: 'Gratitude', key: 'gratitude' },
  { icon: '✅', label: 'To Do', key: 'todo' },
  { icon: '🎁', label: 'Wish', key: 'wish' },
  { icon: '✈️', label: 'Trip', key: 'trip' },
  { icon: '⏳', label: 'Time Capsule', key: 'capsule' },
];

export default function CreateModal() {
  const { closeCreate, createStep, addTrip } = useApp();
  const [step, setStep] = useState<string | null>(createStep);

  const handleClose = () => { setStep(null); closeCreate(); };

  // 'post' isn't in the grid above (Feed has its own dedicated "+" for it)
  // but still needs handling here — Feed's post button calls
  // openCreate('post'), which routes through this same shared modal.
  if (step === 'post')      return <AddPostForm onClose={handleClose} />;
  if (step === 'gratitude') return <AddGratitudeForm onClose={handleClose} />;
  if (step === 'todo')      return <AddTodoForm onClose={handleClose} />;
  if (step === 'wish')      return <AddWishForm onClose={handleClose} />;
  if (step === 'trip')      return <AddTripForm onClose={handleClose} onAdd={addTrip} />;
  if (step === 'capsule')   return <AddCapsuleForm onClose={handleClose} />;
  if (step === 'event')     return <AddEventForm onClose={handleClose} />;

  return (
    <BottomSheet onClose={handleClose} title="What do you want to add?">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, paddingBottom: 16 }}>
        {OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setStep(opt.key)}
            style={{
              background: 'var(--bg)',
              border: '1.5px solid var(--border)',
              borderRadius: 16,
              padding: '20px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sakura-light)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--sakura)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
          >
            <Icon emoji={opt.icon} size={28} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{opt.label}</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
