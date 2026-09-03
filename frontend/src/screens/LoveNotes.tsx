import { useState } from 'react';
import { useApp } from '../context';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import AddLoveNoteForm from '../components/forms/AddLoveNoteForm';
import type { SecretNote, LoveLetter } from '../types';

type Tab = 'notes' | 'letters' | 'secret';

const STATIONERY: Record<string, { bg: string; border: string; accent: string; pattern?: string }> = {
  rose:     { bg: 'linear-gradient(145deg, #FFF5F8 0%, var(--pink-glow) 100%)', border: 'var(--sakura)', accent: '#C9507C' },
  sakura:   { bg: 'linear-gradient(145deg, var(--bg) 0%, #FFE8F0 100%)', border: 'var(--sakura)', accent: 'var(--sakura-accent)' },
  midnight: { bg: 'linear-gradient(145deg, #1A1228 0%, #241636 100%)', border: '#5B3F8C', accent: '#A080D8' },
  cream:    { bg: 'linear-gradient(145deg, #FFFDF5 0%, #FFF8E8 100%)', border: '#E8D0A0', accent: '#B8860B' },
  mint:     { bg: 'linear-gradient(145deg, #F0FFF8 0%, #E0FFF0 100%)', border: '#80D0A8', accent: '#2A8A5C' },
};

const STATIONERY_NAMES: Record<string, { emoji: string; label: string }> = {
  rose: { emoji: '🌹', label: 'Rose' }, sakura: { emoji: '🌸', label: 'Sakura' }, midnight: { emoji: '🌙', label: 'Midnight' }, cream: { emoji: '🍂', label: 'Cream' }, mint: { emoji: '🌿', label: 'Mint' },
};

const FONTS: Record<string, string> = {
  serif:  "'Playfair Display', serif",
  script: "'Playfair Display', serif",
  sans:   "'DM Sans', sans-serif",
};

const FONT_NAMES: Record<string, { emoji: string; label: string }> = {
  serif: { emoji: '📜', label: 'Serif' }, sans: { emoji: '✦', label: 'Modern' },
};

export default function LoveNotes() {
  const { state, currentUser, markNoteRead, addLoveLetter, deleteLoveLetter } = useApp();
  const [tab, setTab] = useState<Tab>('notes');
  const [showAdd, setShowAdd] = useState(false);
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [openLetter, setOpenLetter] = useState<LoveLetter | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showAddSecret, setShowAddSecret] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const isUnlocked = (note: SecretNote) => note.unlockDate <= today;

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 14, padding: 4, marginBottom: 20, border: '1px solid var(--border)' }}>
        {[{ key: 'notes' as Tab, emoji: '💌', label: 'Notes' }, { key: 'letters' as Tab, emoji: '✉️', label: 'Letters' }, { key: 'secret' as Tab, emoji: '🔐', label: 'Secret' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t.key ? 'var(--white)' : 'transparent', color: tab === t.key ? 'var(--sakura-deep)' : 'var(--ink-2)', boxShadow: tab === t.key ? '0 1px 4px rgba(51,42,45,0.08)' : 'none', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Icon emoji={t.emoji} size={13} /> {t.label}</button>
        ))}
      </div>

      <div key={tab} className="screen-transition">
      {/* Notes tab */}
      {tab === 'notes' && (
        <div>
          {state.loveNotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ marginBottom: 12 }}><Icon emoji="💌" size={40} /></div>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No love notes yet</p>
              <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>Write your first note.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {state.loveNotes.map(note => {
                const isExpanded = openNote === note.id;
                const isMine = note.from === currentUser;
                return (
                  <div key={note.id}
                    onClick={() => { setOpenNote(isExpanded ? null : note.id); if (!note.read) markNoteRead(note.id); }}
                    style={{
                      background: !note.read && !isMine ? 'linear-gradient(135deg, var(--pink-glow), var(--white))' : 'var(--white)',
                      border: '1px solid var(--border)',
                      borderLeft: !note.read && !isMine ? '3px solid var(--sakura-accent)' : '1px solid var(--border)',
                      borderRadius: 16,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isExpanded ? 12 : 0 }}>
                      <Avatar user={note.from} size={36} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{note.from}</p>
                          <Icon emoji="→" size={13} />
                          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--sakura-deep)' }}>{note.to}</p>
                          {!note.read && !isMine && <span style={{ background: 'var(--sakura-accent)', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '2px 6px' }}>NEW</span>}
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{note.date}</p>
                      </div>
                      <Icon emoji={note.mood} size={20} />
                    </div>
                    {isExpanded && (
                      <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '14px 16px', animation: 'fadeIn 0.2s ease-out' }}>
                        <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-line', fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>{note.message}</p>
                      </div>
                    )}
                    {!isExpanded && (
                      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.message.split('\n')[0]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Letters tab */}
      {tab === 'letters' && (
        <div>
          {openLetter ? (
            <LetterReader letter={openLetter} onClose={() => setOpenLetter(null)} onDelete={() => { deleteLoveLetter(openLetter.id); setOpenLetter(null); }} />
          ) : (
            <>
              {state.loveLetters.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                  <div style={{ marginBottom: 12 }}><Icon emoji="✉️" size={40} /></div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No love letters yet</p>
                  <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>Write your first letter to the one you love.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  {state.loveLetters.map(l => {
                    const st = STATIONERY[l.stationery] || STATIONERY.rose;
                    const isDark = l.stationery === 'midnight';
                    return (
                      <div key={l.id} onClick={() => setOpenLetter(l)} style={{ background: st.bg, border: `1.5px solid ${st.border}`, borderRadius: 20, padding: '18px 18px 14px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.10)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
                      >
                        <Icon emoji="✉️" size={60} style={{ position: 'absolute', top: -16, right: -16, opacity: 0.06 }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <p style={{ fontSize: 16, fontWeight: 700, color: isDark ? '#E0D0FF' : 'var(--ink)', marginBottom: 2, fontFamily: FONTS[l.font] }}>{l.title}</p>
                            <p style={{ fontSize: 12, color: isDark ? st.accent : 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>{l.from} <Icon emoji="→" size={12} /> {l.to} · {l.date}</p>
                          </div>
                          <Icon emoji="💌" size={20} />
                        </div>
                        <p style={{ fontSize: 13, color: isDark ? '#C0A0E8' : 'var(--ink-2)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, fontStyle: 'italic' }}>
                          {l.body.replace(/\n/g, ' ').slice(0, 120)}...
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
              <button onClick={() => setShowCompose(true)} style={{ width: '100%', padding: '14px', borderRadius: 14, border: '1.5px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon emoji="✍️" size={16} /> Write a new love letter
              </button>
            </>
          )}
        </div>
      )}

      {/* Secret tab */}
      {tab === 'secret' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {state.secretNotes.map(note => {
            const unlocked = isUnlocked(note);
            const isOpen = openNote === note.id;
            return (
              <div key={note.id}
                onClick={() => unlocked && setOpenNote(isOpen ? null : note.id)}
                style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px', cursor: unlocked ? 'pointer' : 'default' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: unlocked ? 'var(--sakura-light)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {unlocked ? <Icon emoji="💌" size={22} /> : <Icon emoji="🔒" size={22} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>From {note.from}</p>
                    <p style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {unlocked ? <>Open your message <Icon emoji="✨" size={12} /></> : `Unlocks on ${new Date(note.unlockDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                    </p>
                  </div>
                  {!unlocked && <span style={{ fontSize: 12, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 99, padding: '4px 10px', color: 'var(--ink-2)', fontWeight: 500 }}>Locked</span>}
                </div>
                {unlocked && isOpen && (
                  <div style={{ marginTop: 14, background: 'var(--bg)', borderRadius: 12, padding: '14px 16px', animation: 'fadeIn 0.2s ease-out' }}>
                    <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-line', fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>{note.message}</p>
                  </div>
                )}
              </div>
            );
          })}
          {showAddSecret ? (
            <SecretNoteComposer onClose={() => setShowAddSecret(false)} />
          ) : (
            <button onClick={() => setShowAddSecret(true)} style={{ width: '100%', padding: '14px', borderRadius: 14, border: '1.5px dashed var(--sakura-accent)', background: 'var(--sakura-light)', color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon emoji="🔐" size={16} /> Write a new secret note
            </button>
          )}
        </div>
      )}
      </div>

      {/* FAB */}
      {tab === 'notes' && (
        <button
          onClick={() => setShowAdd(true)}
          style={{ position: 'fixed', bottom: 96, right: 20, width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', border: 'none', fontSize: 23, cursor: 'pointer', boxShadow: '0 4px 16px rgba(201,95,124,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
        >+</button>
      )}

      {showAdd && <AddLoveNoteForm onClose={() => setShowAdd(false)} />}
      {showCompose && <LetterComposer onClose={() => setShowCompose(false)} />}
    </div>
  );
}

/* ─── Letter Reader ───────────────────────────────── */
function LetterReader({ letter, onClose, onDelete }: { letter: LoveLetter; onClose: () => void; onDelete: () => void }) {
  const st = STATIONERY[letter.stationery] || STATIONERY.rose;
  const isDark = letter.stationery === 'midnight';
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}><Icon emoji="←" size={15} /> Letters</button>
        <button onClick={() => setConfirmDelete(true)} style={{ background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="🗑️" size={16} /></button>
      </div>

      {/* Paper */}
      <div style={{ background: st.bg, border: `2px solid ${st.border}`, borderRadius: 20, padding: '28px 24px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative lines */}
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: 50 + i * 34, height: 1, background: isDark ? 'rgba(160,128,220,0.12)' : `${st.border}20` }} />
        ))}

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: `1.5px solid ${st.border}40` }}>
            <p style={{ fontSize: 11, color: isDark ? '#A080D8' : st.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{letter.date}</p>
            <p style={{ fontFamily: FONTS[letter.font], fontSize: 23, color: isDark ? '#F0E8FF' : 'var(--ink)', lineHeight: 1.3, marginBottom: 6 }}>{letter.title}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: isDark ? '#A080D8' : st.accent }}>From {letter.from} · To {letter.to}</span>
            </div>
          </div>

          {/* Body */}
          <p style={{
            fontFamily: letter.font === 'sans' ? FONTS.sans : FONTS.serif,
            fontSize: 16,
            color: isDark ? '#E8D8FF' : 'var(--ink)',
            lineHeight: 1.9,
            whiteSpace: 'pre-line',
            fontStyle: letter.font !== 'sans' ? 'italic' : 'normal',
          }}>{letter.body}</p>

          {/* Signature flourish */}
          <div style={{ marginTop: 28, paddingTop: 16, borderTop: `1.5px solid ${st.border}40`, textAlign: 'right' }}>
            <p style={{ fontFamily: FONTS.serif, fontSize: 18, color: isDark ? '#C0A0E8' : st.accent, fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>— {letter.from} <Icon emoji="💕" size={16} /></p>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Delete this letter?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>This can't be undone once deleted.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={onDelete} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: '#E74C3C', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Letter Composer ─────────────────────────────── */
function LetterComposer({ onClose }: { onClose: () => void }) {
  const { currentUser, partnerProfile, addLoveLetter } = useApp();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [stationery, setStationery] = useState('rose');
  const [font, setFont] = useState('serif');
  const [sending, setSending] = useState(false);
  const to = partnerProfile?.displayName ?? currentUser;

  const st = STATIONERY[stationery];
  const isDark = stationery === 'midnight';

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    await addLoveLetter({
      from: currentUser,
      to,
      title: title.trim(),
      body: body.trim(),
      date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
      stationery,
      font,
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,10,28,0.6)', backdropFilter: 'blur(6px)', zIndex: 200, overflowY: 'auto' }}>
      <div style={{ minHeight: '100%', padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button onClick={onClose} disabled={sending} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '8px 14px', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="✕" size={14} /> Cancel</button>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="✉️" size={18} /> Write Letter</p>
          <button onClick={handleSend} disabled={sending} style={{ background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', border: 'none', borderRadius: 10, padding: '8px 14px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14, opacity: (title && body && !sending) ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>{sending ? 'Sending...' : <>Send <Icon emoji="💌" size={14} /></>}</button>
        </div>

        {/* Stationery picker */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 8 }}>Choose stationery</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.keys(STATIONERY).map(k => (
              <button key={k} onClick={() => setStationery(k)} style={{ padding: '6px 12px', borderRadius: 99, border: stationery === k ? '2px solid white' : '1.5px solid rgba(255,255,255,0.2)', background: stationery === k ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Icon emoji={STATIONERY_NAMES[k].emoji} size={12} /> {STATIONERY_NAMES[k].label}</button>
            ))}
          </div>
        </div>

        {/* Font picker */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 8 }}>Font style</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.keys(FONT_NAMES).map(k => (
              <button key={k} onClick={() => setFont(k)} style={{ padding: '6px 14px', borderRadius: 99, border: font === k ? '2px solid white' : '1.5px solid rgba(255,255,255,0.2)', background: font === k ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: FONTS[k], display: 'flex', alignItems: 'center', gap: 4 }}><Icon emoji={FONT_NAMES[k].emoji} size={12} /> {FONT_NAMES[k].label}</button>
            ))}
          </div>
        </div>

        {/* Letter paper */}
        <div style={{ flex: 1, background: st.bg, border: `2px solid ${st.border}`, borderRadius: 20, padding: '24px 20px', boxShadow: '0 8px 40px rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden' }}>
          {[1,2,3,4,5,6,7,8,9,10].map(i => (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: 46 + i * 34, height: 1, background: isDark ? 'rgba(160,128,220,0.10)' : `${st.border}18` }} />
          ))}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 11, color: isDark ? '#A080D8' : st.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
              To {to} — {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Letter title..."
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: FONTS[font], fontSize: 21, fontWeight: 700, color: isDark ? '#F0E8FF' : 'var(--ink)', marginBottom: 18, padding: 0, fontStyle: font !== 'sans' ? 'italic' : 'normal' }}
            />
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={"Start writing your letter...\n\nWrite from the heart, it doesn't need to be perfect. Every word matters."}
              rows={12}
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: font !== 'sans' ? FONTS.serif : FONTS.sans, fontSize: 15, color: isDark ? '#E8D8FF' : 'var(--ink)', lineHeight: 1.9, resize: 'none', padding: 0, fontStyle: font !== 'sans' ? 'italic' : 'normal' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Secret Note Composer ─────────────────────────── */
function SecretNoteComposer({ onClose }: { onClose: () => void }) {
  const { addSecretNote, currentUser } = useApp();
  const [message, setMessage] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return setError('Write your note first.');
    if (!unlockDate) return setError('Choose an unlock date.');
    setSaving(true);
    await addSecretNote({ from: currentUser, message: message.trim(), unlockDate });
    onClose();
  };

  return (
    <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="🔐" size={14} /> New secret note</p>
      <textarea
        className="input-field"
        placeholder="Write something to unlock later..."
        value={message}
        onChange={e => { setMessage(e.target.value); setError(''); }}
        rows={3}
        style={{ marginBottom: 10 }}
      />
      <input
        className="input-field"
        type="date"
        value={unlockDate}
        onChange={e => { setUnlockDate(e.target.value); setError(''); }}
        style={{ marginBottom: 10, width: 'auto', maxWidth: 170 }}
      />
      {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 12, marginBottom: 10 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-ghost" onClick={onClose} disabled={saving} style={{ flex: 1 }}>Cancel</button>
        <button className="btn-primary" onClick={handleSubmit} disabled={saving} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>{saving ? 'Sealing...' : <>Seal it <Icon emoji="🔒" size={14} /></>}</button>
      </div>
    </div>
  );
}
