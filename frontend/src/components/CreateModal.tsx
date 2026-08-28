import { useState } from 'react';
import { useApp } from '../context';
import BottomSheet from './BottomSheet';
import AddPostForm from './forms/AddPostForm';
import AddMemoryForm from './forms/AddMemoryForm';
import AddLoveNoteForm from './forms/AddLoveNoteForm';
import AddExpenseForm from './forms/AddExpenseForm';
import AddEventForm from './forms/AddEventForm';
import AddGoalForm from './forms/AddGoalForm';

const OPTIONS = [
  { icon: '📸', label: 'Post', key: 'post' },
  { icon: '🌸', label: 'Memory', key: 'memory' },
  { icon: '💌', label: 'Love Note', key: 'note' },
  { icon: '💰', label: 'Expense', key: 'expense' },
  { icon: '📅', label: 'Event', key: 'event' },
  { icon: '✨', label: 'Goal', key: 'goal' },
];

export default function CreateModal() {
  const { closeCreate, createStep } = useApp();
  const [step, setStep] = useState<string | null>(createStep);

  const handleClose = () => { setStep(null); closeCreate(); };

  if (step === 'post')    return <AddPostForm onClose={handleClose} />;
  if (step === 'memory')  return <AddMemoryForm onClose={handleClose} />;
  if (step === 'note')    return <AddLoveNoteForm onClose={handleClose} />;
  if (step === 'expense') return <AddExpenseForm onClose={handleClose} />;
  if (step === 'event')   return <AddEventForm onClose={handleClose} />;
  if (step === 'goal')    return <AddGoalForm onClose={handleClose} />;

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
            <span style={{ fontSize: 28 }}>{opt.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{opt.label}</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
