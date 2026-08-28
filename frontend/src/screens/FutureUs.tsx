import { useState } from 'react';
import { useApp } from '../context';
import AddGoalForm from '../components/forms/AddGoalForm';

export default function FutureUs() {
  const { state, toggleGoal, deleteGoal, celebration } = useApp();
  const [showAdd, setShowAdd] = useState(false);

  const pending   = state.goals.filter(g => !g.completed);
  const completed = state.goals.filter(g => g.completed);

  return (
    <div style={{ paddingBottom: 32, position: 'relative' }}>
      {/* Celebration confetti */}
      {celebration && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: '30%',
              left: `${10 + i * 7}%`,
              fontSize: 20,
              animation: `confettiFall 1.5s ease-out ${i * 0.1}s forwards`,
            }}>
              {['🌸', '❤️', '✨', '🎉'][i % 4]}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)' }}>Future Us ✨</p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>{completed.length}/{state.goals.length} dreams achieved</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ padding: '9px 16px', fontSize: 13 }}>+ Add Goal</button>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Dreams progress</span>
          <span style={{ fontSize: 13, color: 'var(--sakura-deep)', fontWeight: 700 }}>{state.goals.length > 0 ? Math.round((completed.length / state.goals.length) * 100) : 0}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${state.goals.length > 0 ? (completed.length / state.goals.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Pending goals */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 12 }}>Dreams to achieve</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(g => <GoalItem key={g.id} goal={g} onToggle={toggleGoal} onDelete={deleteGoal} />)}
          </div>
        </div>
      )}

      {/* Completed goals */}
      {completed.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 12 }}>Achieved ✅</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {completed.map(g => <GoalItem key={g.id} goal={g} onToggle={toggleGoal} onDelete={deleteGoal} />)}
          </div>
        </div>
      )}

      {state.goals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No goals yet</p>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>What do you dream of doing together?</p>
        </div>
      )}

      {showAdd && <AddGoalForm onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function GoalItem({ goal: g, onToggle, onDelete }: { goal: any; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', transition: 'box-shadow 0.15s' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button onClick={() => onToggle(g.id)} style={{ width: 24, height: 24, borderRadius: 8, border: `2px solid ${g.completed ? 'var(--sakura-accent)' : 'var(--border)'}`, background: g.completed ? 'var(--sakura-accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s', fontSize: 13 }}>
        {g.completed && '✓'}
      </button>
      <span style={{ fontSize: 20 }}>{g.emoji}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', textDecoration: g.completed ? 'line-through' : 'none', opacity: g.completed ? 0.5 : 1 }}>{g.title}</p>
        {g.completed && g.completedDate && <p style={{ fontSize: 11, color: 'var(--sakura-accent)', fontWeight: 500 }}>Achieved {g.completedDate} ✨</p>}
      </div>
      {hovered && <button onClick={() => onDelete(g.id)} style={{ background: 'none', border: 'none', color: 'var(--ink-2)', opacity: 0.4, cursor: 'pointer', fontSize: 15 }}>✕</button>}
    </div>
  );
}
