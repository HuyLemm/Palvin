import { useState } from 'react';
import { useApp } from '../context';
import Icon from '../components/Icon';

interface Props { onBack: () => void; }

type Idea = { id: string; emoji: string; text: string };
type EditableIdea = Idea & { source: 'preset' | 'custom' };

export default function DateIdeaJar({ onBack }: Props) {
  const { state, addDateIdea, updateDateIdea, removeDateIdea, updateDateIdeaPreset, removeDateIdeaPreset, drawDateIdea } = useApp();
  const [picked, setPicked] = useState<{ emoji: string; text: string } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [newIdea, setNewIdea] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingIdea, setEditingIdea] = useState<EditableIdea | null>(null);
  const [editIdeaText, setEditIdeaText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; source: 'preset' | 'custom' } | null>(null);
  const [adding, setAdding] = useState(false);

  const presetIdeas = state.dateIdeaPresets;
  const customIdeas = state.dateIdeas;
  const history = state.dateIdeaHistory;
  const allIdeas = [...presetIdeas, ...customIdeas];
  // Same list, tagged with where each idea came from — presets and your own
  // added ideas are both editable/deletable the same way, just via different
  // tables under the hood (see 0032_date_idea_presets.sql).
  const editableIdeas: EditableIdea[] = [
    ...presetIdeas.map(i => ({ ...i, source: 'preset' as const })),
    ...customIdeas.map(i => ({ ...i, source: 'custom' as const })),
  ];

  function spin() {
    if (spinning || allIdeas.length === 0) return;
    setSpinning(true);
    setPicked(null);
    let count = 0;
    const max = 10 + Math.floor(Math.random() * 8);
    const interval = setInterval(() => {
      const rand = allIdeas[Math.floor(Math.random() * allIdeas.length)];
      setPicked(rand);
      count++;
      if (count >= max) {
        clearInterval(interval);
        const final = allIdeas[Math.floor(Math.random() * allIdeas.length)];
        setPicked(final);
        drawDateIdea(final);
        setSpinning(false);
      }
    }, 120);
  }

  async function addCustom() {
    if (!newIdea.trim()) return;
    setAdding(true);
    await addDateIdea({ emoji: '✨', text: newIdea.trim() });
    setNewIdea('');
    setShowAdd(false);
    setAdding(false);
  }

  function saveEditIdea() {
    if (!editingIdea || !editIdeaText.trim()) return;
    const payload = { emoji: editingIdea.emoji, text: editIdeaText.trim() };
    if (editingIdea.source === 'preset') updateDateIdeaPreset(editingIdea.id, payload);
    else updateDateIdea(editingIdea.id, payload);
    setEditingIdea(null);
  }

  function confirmDeleteNow() {
    if (!confirmDelete) return;
    if (confirmDelete.source === 'preset') removeDateIdeaPreset(confirmDelete.id);
    else removeDateIdea(confirmDelete.id);
    setConfirmDelete(null);
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      <style>{`
        @keyframes jarSpin {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-8deg) scale(1.05); }
          50% { transform: rotate(8deg) scale(1.08); }
          75% { transform: rotate(-4deg) scale(1.05); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes ideaReveal {
          0% { opacity: 0; transform: scale(0.8) translateY(10px); }
          60% { transform: scale(1.05) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .jar-anim { animation: jarSpin 0.3s ease infinite; }
        .idea-reveal { animation: ideaReveal 0.4s ease both; }
      `}</style>

      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={15} /> Back</button>

      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>Date Idea Jar <Icon emoji="🫙" size={20} /></p>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 24 }}>Shake the jar to draw a random date idea</p>

      {/* Jar + result */}
      <div className="card" style={{ padding: '32px 24px', textAlign: 'center', marginBottom: 20, background: 'linear-gradient(135deg, var(--pink-glow), var(--sakura-light))' }}>
        <button onClick={spin} disabled={spinning} style={{ background: 'none', border: 'none', cursor: spinning ? 'default' : 'pointer', display: 'inline-block' }}>
          <div className={spinning ? 'jar-anim' : ''} style={{ lineHeight: 1, marginBottom: 16, display: 'inline-block' }}><Icon emoji="🫙" size={72} /></div>
        </button>

        {picked ? (
          <div className={spinning ? '' : 'idea-reveal'} key={picked.text}>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><Icon emoji={picked.emoji} size={36} /></div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)', lineHeight: 1.4, marginBottom: 16 }}>{picked.text}</p>
          </div>
        ) : (
          <p style={{ fontSize: 15, color: 'var(--ink-2)', marginBottom: 16 }}>Tap the jar to draw an idea!</p>
        )}

        <button onClick={spin} disabled={spinning} style={{ margin: '0 auto', padding: '13px 28px', background: spinning ? 'var(--border)' : 'linear-gradient(135deg, var(--sakura), var(--sakura-deep))', border: 'none', borderRadius: 16, color: spinning ? 'var(--ink-2)' : 'white', fontWeight: 700, fontSize: 15, cursor: spinning ? 'default' : 'pointer', boxShadow: spinning ? 'none' : '0 4px 16px rgba(201,95,124,0.3)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {spinning ? <><Icon emoji="🫙" size={16} /> Shaking...</> : picked ? <><Icon emoji="🔀" size={16} /> Draw again</> : <><Icon emoji="🫙" size={16} /> Shake the jar</>}
        </button>
      </div>

      {/* Add custom */}
      <div className="card" style={{ padding: '16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showAdd ? 12 : 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="✏️" size={14} /> Add your own idea</p>
          <button onClick={() => setShowAdd(v => !v)} style={{ background: 'var(--sakura-light)', border: 'none', borderRadius: 10, padding: '6px 14px', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {showAdd ? 'Cancel' : '+ Add'}
          </button>
        </div>
        {showAdd && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input-field"
              placeholder="e.g. Visit an art exhibition..."
              value={newIdea}
              onChange={e => setNewIdea(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              style={{ flex: 1, padding: '10px 14px', fontSize: 14 }}
              autoFocus
              disabled={adding}
            />
            <button onClick={addCustom} disabled={adding} style={{ padding: '10px 16px', background: 'var(--sakura-deep)', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: adding ? 0.7 : 1 }}><Icon emoji={adding ? '…' : '✓'} size={16} /></button>
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 10 }}>Recently drawn</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((idea, i) => (
              <div key={idea.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: 1 - i * 0.08 }}>
                <Icon emoji={idea.emoji} size={22} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 14, color: 'var(--ink)' }}>{idea.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All ideas list — editable, whether preset or your own */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 10 }}>All ideas ({editableIdeas.length})</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {editableIdeas.map(idea => (
            <div key={`${idea.source}-${idea.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <Icon emoji={idea.emoji} size={20} />
              <p style={{ fontSize: 13, color: 'var(--ink)', flex: 1 }}>{idea.text}</p>
              <button
                onClick={() => { setEditingIdea(idea); setEditIdeaText(idea.text); }}
                style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 24, height: 24, cursor: 'pointer', color: 'var(--ink-2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              ><Icon emoji="✏️" size={11} /></button>
              <button
                onClick={() => setConfirmDelete({ id: idea.id, source: idea.source })}
                style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 24, height: 24, cursor: 'pointer', color: '#E8524A', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              ><Icon emoji="🗑️" size={11} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit idea (preset or custom) */}
      {editingIdea && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setEditingIdea(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Edit idea <Icon emoji="✏️" size={15} /></p>
              <button onClick={() => setEditingIdea(null)} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
            </div>
            <input
              className="input-field"
              value={editIdeaText}
              onChange={e => setEditIdeaText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveEditIdea()}
              autoFocus
              style={{ marginBottom: 14 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditingIdea(null)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={saveEditIdea} disabled={!editIdeaText.trim()} style={{ flex: 2, padding: '13px', background: editIdeaText.trim() ? 'linear-gradient(135deg, var(--sakura), var(--sakura-deep))' : 'var(--border)', border: 'none', borderRadius: 14, color: editIdeaText.trim() ? 'white' : 'var(--ink-2)', fontWeight: 700, fontSize: 15, cursor: editIdeaText.trim() ? 'pointer' : 'default' }}>Save changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete idea */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDelete(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Delete this idea?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>This can't be undone.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDeleteNow} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
