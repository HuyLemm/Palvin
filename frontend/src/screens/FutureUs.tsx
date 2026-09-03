import { useState } from 'react';
import { useApp } from '../context';
import Icon from '../components/Icon';
import AmountInput from '../components/AmountInput';
import type { Goal } from '../types';

const VND = (n: number) => `${Math.round(n).toLocaleString('en-US')} VND`;
const EMOJIS = ['💍', '🏠', '✈️', '🚗', '🎓', '👶', '💻', '🎉', '💰', '🐶'];

// A goal's deadline is set as a rough "in N months/years" duration, not a
// specific calendar date — big life plans rarely have an exact due date.
// The chosen duration is still resolved to a real date under the hood (so
// existing sort/compare logic keeps working) and re-expressed as a live
// countdown whenever it's displayed, the same way the rest of the app shows
// relative time instead of raw dates.
function addDuration(amount: number, unit: 'month' | 'year'): string {
  const d = new Date();
  if (unit === 'month') d.setMonth(d.getMonth() + amount);
  else d.setFullYear(d.getFullYear() + amount);
  return d.toISOString().slice(0, 10);
}

// Best-effort reverse of addDuration, for prefilling the edit form — the
// exact original "N months/years" typed isn't stored, only the resolved
// date, so this re-derives a close approximation from today.
function remainingAsDuration(deadline: string): { amount: number; unit: 'month' | 'year' } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadline + 'T00:00:00');
  const days = Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
  if (days >= 330) return { amount: Math.max(1, Math.round(days / 365.25)), unit: 'year' };
  return { amount: Math.max(1, Math.round(days / 30.44)), unit: 'month' };
}

function formatRemaining(deadline: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadline + 'T00:00:00');
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (days <= 0) return 'Past due';
  // Days-based, not a calendar month/year-field diff — a duration like
  // "8 năm" is really ~2922 days, and diffing by month/year fields first
  // then re-deriving loses precision (rounds to "7.9 năm" instead of 8).
  if (days >= 330) {
    const years = Math.round((days / 365.25) * 10) / 10;
    return `~${years % 1 === 0 ? years.toFixed(0) : years} years left`;
  }
  const months = Math.round(days / 30.44);
  return `~${months} months left`;
}

export default function FutureUs() {
  const { state, currentUser, partnerProfile, toggleGoal, deleteGoal, contributeToGoal, addGoal, updateGoal, celebration } = useApp();
  const partnerName = partnerProfile?.displayName;
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<string>('both');

  const filtered = state.goals.filter(g => g.owner === filter);
  const pending   = filtered.filter(g => !g.completed);
  const completed = filtered.filter(g => g.completed);

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
              animation: `confettiFall 1.5s ease-out ${i * 0.1}s forwards`,
            }}>
              <Icon emoji={['🌸', '❤️', '✨', '🎉'][i % 4]} size={20} />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 23, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>Future Us <Icon emoji="✨" size={18} /></p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>{completed.length}/{filtered.length} dreams achieved</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ padding: '9px 16px', fontSize: 13 }}>+ Add Goal</button>
      </div>

      {/* Filter — whose dreams to show */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['both', currentUser, ...(partnerName ? [partnerName] : [])].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: filter === f ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', background: filter === f ? 'var(--sakura-light)' : 'var(--bg)', color: filter === f ? 'var(--sakura-deep)' : 'var(--ink-2)', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Icon emoji={f === 'both' ? '💑' : f === currentUser ? '💙' : '💗'} size={14} /> {f === 'both' ? 'Both' : f}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Dreams progress</span>
          <span style={{ fontSize: 13, color: 'var(--sakura-deep)', fontWeight: 700 }}>{filtered.length > 0 ? Math.round((completed.length / filtered.length) * 100) : 0}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${filtered.length > 0 ? (completed.length / filtered.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Pending goals */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 12 }}>Dreams to achieve</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(g => <GoalItem key={g.id} goal={g} onToggle={toggleGoal} onDelete={deleteGoal} onContribute={contributeToGoal} onEdit={setEditing} />)}
          </div>
        </div>
      )}

      {/* Completed goals */}
      {completed.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>Achieved <Icon emoji="✅" size={12} /></p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {completed.map(g => <GoalItem key={g.id} goal={g} onToggle={toggleGoal} onDelete={deleteGoal} onContribute={contributeToGoal} onEdit={setEditing} />)}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ marginBottom: 12 }}><Icon emoji="✨" size={40} /></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No goals yet</p>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>What do you dream of doing together?</p>
        </div>
      )}

      {showAdd && <AddFutureGoalForm onClose={() => setShowAdd(false)} onAdd={addGoal} defaultOwner={filter} />}
      {editing && (
        <AddFutureGoalForm
          onClose={() => setEditing(null)}
          onAdd={data => updateGoal(editing.id, data)}
          defaultOwner={editing.owner}
          existing={editing}
        />
      )}
    </div>
  );
}

function GoalItem({ goal: g, onToggle, onDelete, onContribute, onEdit }: {
  goal: Goal;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onContribute: (id: string, amount: number) => void;
  onEdit: (goal: Goal) => void;
}) {
  const [showContribute, setShowContribute] = useState(false);
  const [amount, setAmount] = useState('');
  const hasTarget = g.target != null;
  const pct = hasTarget && g.target! > 0 ? Math.min(((g.current ?? 0) / g.target!) * 100, 100) : 0;

  const submitContribute = () => {
    const n = +amount;
    if (!n || n <= 0) return;
    onContribute(g.id, n);
    setAmount('');
    setShowContribute(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 16px', background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', transition: 'box-shadow 0.15s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => onToggle(g.id)} style={{ width: 24, height: 24, borderRadius: 8, border: `2px solid ${g.completed ? 'var(--sakura-accent)' : 'var(--border)'}`, background: g.completed ? 'var(--sakura-accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}>
          {g.completed && <Icon emoji="✓" size={13} />}
        </button>
        <Icon emoji={g.emoji} size={20} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', textDecoration: g.completed ? 'line-through' : 'none', opacity: g.completed ? 0.5 : 1 }}>{g.title}</p>
          {g.completed && g.completedDate && <p style={{ fontSize: 11, color: 'var(--sakura-accent)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>Achieved {g.completedDate} <Icon emoji="✨" size={11} /></p>}
          {!g.completed && hasTarget && g.deadline && <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>{formatRemaining(g.deadline)}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => onEdit(g)} title="Edit" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 28, height: 28, color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✏️" size={13} /></button>
          <button onClick={() => onDelete(g.id)} title="Delete" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 28, height: 28, color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={13} /></button>
        </div>
      </div>

      {hasTarget && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{VND(g.current ?? 0)} / {VND(g.target!)}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sakura-deep)' }}>{Math.round(pct)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          {!g.completed && !showContribute && (
            <button onClick={() => setShowContribute(true)} style={{ marginTop: 8, background: 'none', border: '1.5px dashed var(--sakura-accent)', borderRadius: 8, padding: '6px 10px', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>+ Add funds</button>
          )}
          {showContribute && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <AmountInput placeholder="Contribution amount (VND)" value={amount} onChange={setAmount} style={{ flex: 1, padding: '8px 12px', fontSize: 13 }} />
              <button onClick={submitContribute} style={{ background: 'var(--sakura-accent)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Add</button>
              <button onClick={() => { setShowContribute(false); setAmount(''); }} style={{ background: 'var(--bg)', color: 'var(--ink-2)', border: 'none', borderRadius: 10, padding: '8px 12px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddFutureGoalForm({ onClose, onAdd, defaultOwner, existing }: {
  onClose: () => void;
  onAdd: (g: Omit<Goal, 'id' | 'completed' | 'current'>) => void;
  defaultOwner: string;
  existing?: Goal;
}) {
  const { currentUser, partnerProfile } = useApp();
  const partnerName = partnerProfile?.displayName;
  const isEdit = !!existing;
  const [kind, setKind] = useState<'simple' | 'savings'>(existing?.target != null ? 'savings' : 'simple');
  const [owner, setOwner] = useState<string>(defaultOwner);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji || EMOJIS[0]);
  const [target, setTarget] = useState(existing?.target != null ? String(existing.target) : '');
  const initialDuration = existing?.deadline ? remainingAsDuration(existing.deadline) : { amount: 6, unit: 'month' as const };
  const [deadlineAmount, setDeadlineAmount] = useState(String(initialDuration.amount));
  const [deadlineUnit, setDeadlineUnit] = useState<'month' | 'year'>(initialDuration.unit);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) { setError('Enter a goal name.'); return; }
    if (kind === 'savings' && (!target || isNaN(+target) || +target <= 0)) { setError('Enter a valid target amount.'); return; }
    const n = parseInt(deadlineAmount, 10);
    onAdd({
      title: title.trim(), emoji, owner,
      target: kind === 'savings' ? +target : undefined,
      deadline: kind === 'savings' && n > 0 ? addDuration(n, deadlineUnit) : undefined,
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 400, maxHeight: '80vh', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 23, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon emoji="✨" size={20} /> {isEdit ? 'Edit Goal' : 'Add Goal'}</p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setKind('simple')} style={{ flex: 1, padding: '8px', borderRadius: 10, border: kind === 'simple' ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', background: kind === 'simple' ? 'var(--sakura-light)' : 'var(--bg)', color: 'var(--ink)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>To-do</button>
            <button type="button" onClick={() => setKind('savings')} style={{ flex: 1, padding: '8px', borderRadius: 10, border: kind === 'savings' ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', background: kind === 'savings' ? 'var(--sakura-light)' : 'var(--bg)', color: 'var(--ink)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Savings goal</button>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>WHOSE GOAL</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['both', currentUser, ...(partnerName ? [partnerName] : [])].map(o => (
                <button key={o} type="button" onClick={() => setOwner(o)} style={{ flex: 1, padding: '8px', border: owner === o ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', borderRadius: 10, background: owner === o ? 'var(--sakura-light)' : 'var(--bg)', color: owner === o ? 'var(--sakura-deep)' : 'var(--ink-2)', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <Icon emoji={o === 'both' ? '💑' : o === currentUser ? '💙' : '💗'} size={14} /> {o === 'both' ? 'Both' : o}
                </button>
              ))}
            </div>
          </div>
          <input className="input-field" placeholder={kind === 'savings' ? 'e.g. Wedding' : 'e.g. Trip to Japan'} value={title} onChange={e => setTitle(e.target.value)} />
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Icon</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)} style={{ width: 38, height: 38, border: emoji === e ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', borderRadius: 10, background: emoji === e ? 'var(--sakura-light)' : 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji={e} size={18} /></button>
              ))}
            </div>
          </div>
          {kind === 'savings' && (
            <>
              <AmountInput placeholder="Savings target (VND)" value={target} onChange={setTarget} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>DEADLINE — ROUGHLY (optional, leave at 0 if none)</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input-field" type="number" min={0} value={deadlineAmount} onChange={e => setDeadlineAmount(e.target.value)} style={{ width: 80, flexShrink: 0 }} />
                  <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                    {(['month', 'year'] as const).map(u => (
                      <button key={u} type="button" onClick={() => setDeadlineUnit(u)} style={{ flex: 1, padding: '8px', border: deadlineUnit === u ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', borderRadius: 10, background: deadlineUnit === u ? 'var(--sakura-light)' : 'var(--bg)', color: deadlineUnit === u ? 'var(--sakura-deep)' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{u === 'month' ? 'Months' : 'Years'}</button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
          {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
          <button onClick={handleSubmit} style={{ padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15 }}>{isEdit ? 'Save changes' : 'Add Goal'}</button>
        </div>
      </div>
    </div>
  );
}
