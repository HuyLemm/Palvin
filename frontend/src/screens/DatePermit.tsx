import { useState } from 'react';
import { useApp } from '../context';
import Icon from '../components/Icon';
import EditDateRequestForm from '../components/forms/EditDateRequestForm';
import type { DateRequest } from '../types';

const CATEGORIES = [
  { emoji: '🎱', label: 'Shoot pool' },
  { emoji: '🍺', label: 'Drinks out' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '👥', label: 'Hang with friends' },
  { emoji: '🎯', label: 'Going out' },
  { emoji: '💼', label: 'Overtime work' },
  { emoji: '🏋️', label: 'Gym' },
  { emoji: '🛒', label: 'Shopping' },
  { emoji: '🎤', label: 'Karaoke' },
  { emoji: '🌙', label: 'Home late' },
  { emoji: '✈️', label: 'Out of town' },
  { emoji: '🎲', label: 'Other' },
];

const STATUS_CONFIG = {
  pending:  { label: 'PENDING', bg: '#FEF9C3', border: '#FDE047', color: '#A16207', stamp: '#CA8A04' },
  approved: { label: 'APPROVED',  bg: '#F0FDF4', border: '#86EFAC', color: '#166534', stamp: '#16A34A' },
  rejected: { label: 'REJECTED',  bg: '#FEF2F2', border: '#FCA5A5', color: '#7F1D1D', stamp: '#DC2626' },
};

interface Props { onBack: () => void; initialRequestId?: string; }

export default function DatePermit({ onBack, initialRequestId }: Props) {
  const { state, currentUser, partnerProfile, submitDateRequest, respondToRequest, toast } = useApp();
  const partnerUser = partnerProfile?.displayName ?? currentUser;

  // Coming from a notification tap: land on whichever tab actually holds that
  // request — "inbox" if I'm the one who needs to approve it, "mine" if I'm
  // the one who submitted it and I'm seeing the response.
  const [tab, setTab] = useState<'submit' | 'inbox' | 'mine'>(() => {
    const req = initialRequestId ? state.dateRequests.find(r => r.id === initialRequestId) : null;
    if (req) return req.to === currentUser ? 'inbox' : 'mine';
    return 'submit';
  });

  // Form state
  const [category, setCategory] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('');
  const [activity, setActivity] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Response state
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState('');

  // Editing my own still-pending request (once approved/rejected, it's locked)
  const [editingRequest, setEditingRequest] = useState<DateRequest | null>(null);

  const myRequests = state.dateRequests.filter(r => r.from === currentUser);
  const pendingForMe = state.dateRequests.filter(r => r.to === currentUser && r.status === 'pending');
  const allForMe = state.dateRequests.filter(r => r.to === currentUser);

  function handleSubmit() {
    if (!category || !activity.trim() || !date || !time) {
      toast('Fill in all the details, please!', '⚠️');
      return;
    }
    submitDateRequest({
      from: currentUser,
      to: partnerUser,
      category,
      categoryEmoji,
      activity: activity.trim(),
      location: location.trim() || 'Not decided yet',
      date,
      time,
      reason: reason.trim() || 'I really want to go 🥺',
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setCategory(''); setCategoryEmoji(''); setActivity('');
      setLocation(''); setDate(''); setTime(''); setReason('');
      setTab('mine');
    }, 2000);
  }

  function handleRespond(id: string, status: 'approved' | 'rejected') {
    respondToRequest(id, status, responseNote);
    setRespondingId(null);
    setResponseNote('');
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function formatCreated(isoStr: string) {
    const d = new Date(isoStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  // Groups by the day the request was created — same "ngày X tháng Y" header
  // style as the Thu chi tab. Relies on state.dateRequests already coming
  // sorted newest-first, so same-day items stay contiguous.
  function groupByDay(requests: DateRequest[]): { label: string; items: DateRequest[] }[] {
    const groups: { label: string; items: DateRequest[] }[] = [];
    for (const r of requests) {
      const label = new Date(r.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(r);
      else groups.push({ label, items: [r] });
    }
    return groups;
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <style>{`
        @keyframes stampIn {
          0% { transform: scale(3) rotate(-15deg); opacity: 0; }
          40% { transform: scale(0.9) rotate(3deg); opacity: 1; }
          60% { transform: scale(1.05) rotate(-1deg); }
          100% { transform: scale(1) rotate(-8deg); opacity: 1; }
        }
        @keyframes permitSlide {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes successPop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .stamp-anim { animation: stampIn 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
        .permit-slide { animation: permitSlide 0.35s ease both; }
        .success-pop { animation: successPop 0.4s ease both; }
        .permit-input {
          width: 100%; padding: 11px 14px;
          border: 1.5px solid var(--border); border-radius: 12px;
          background: var(--white); font-family: 'Nunito', sans-serif;
          font-size: 14px; color: var(--ink); outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .permit-input:focus { border-color: var(--sakura-accent); box-shadow: 0 0 0 3px rgba(230,127,154,0.12); }
        .permit-input::placeholder { color: var(--ink-2); }
        .permit-input[type="date"]::-webkit-calendar-picker-indicator,
        .permit-input[type="time"]::-webkit-calendar-picker-indicator { transform: scale(0.8); }
      `}</style>

      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={15} /> Back</button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 27, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>Permission Slip <Icon emoji="📋" size={22} /></p>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>Submit a request to go out — your partner approves it <Icon emoji="💕" size={13} /></p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--sakura-light)', borderRadius: 14, padding: 4, marginBottom: 20 }}>
        {[
          { key: 'submit', emoji: '📝', label: 'Submit', count: 0 },
          { key: 'inbox', emoji: '📥', label: 'To Review', count: pendingForMe.length },
          { key: 'mine', emoji: '📁', label: 'My Requests', count: 0 },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)} style={{ flex: 1, padding: '9px 4px', borderRadius: 11, border: 'none', background: tab === t.key ? 'white' : 'transparent', color: tab === t.key ? 'var(--sakura-deep)' : 'var(--ink-2)', fontWeight: tab === t.key ? 700 : 500, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', boxShadow: tab === t.key ? '0 1px 6px rgba(201,95,124,0.12)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Icon emoji={t.emoji} size={13} /> {t.label}
            {t.count > 0 && <span key={t.count} className="animate-heart-pop" style={{ display: 'inline-block', color: '#DC2626', fontWeight: 800 }}>({t.count})</span>}
          </button>
        ))}
      </div>

      <div key={tab} className="screen-transition">
      {/* ── SUBMIT TAB ── */}
      {tab === 'submit' && (
        <div>
          {submitted ? (
            <div className="success-pop" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <p style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><Icon emoji="📬" size={64} /></p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 23, color: 'var(--ink)', marginBottom: 6 }}>Request submitted!</p>
              <p style={{ fontSize: 14, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>Waiting for {partnerUser} to approve <Icon emoji="🥺" size={14} /></p>
            </div>
          ) : (
            <div>
              {/* Permit form — styled like a document */}
              <div style={{ background: 'var(--white)', borderRadius: 20, border: '2px dashed var(--sakura)', padding: '24px 20px', marginBottom: 16 }}>
                {/* Document header */}
                <div style={{ textAlign: 'center', borderBottom: '2px solid var(--sakura-light)', paddingBottom: 16, marginBottom: 20 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--ink-2)', textTransform: 'uppercase' }}>REPUBLIC OF LOVE</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--sakura-deep)', marginTop: 2 }}>REQUEST FOR PERMISSION TO GO OUT</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>Applicant: <strong>{currentUser}</strong> → Approver: <strong>{partnerUser}</strong></p>
                </div>

                {/* Category picker */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    Activity Type *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {CATEGORIES.map(c => (
                      <button key={c.label} onClick={() => { setCategory(c.label); setCategoryEmoji(c.emoji); setActivity(c.label); }} style={{ padding: '10px 4px', border: `2px solid ${category === c.label ? 'var(--sakura-accent)' : 'var(--border)'}`, borderRadius: 12, background: category === c.label ? 'var(--sakura-light)' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 0.15s' }}>
                        <Icon emoji={c.emoji} size={22} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: category === c.label ? 'var(--sakura-deep)' : 'var(--ink-2)', lineHeight: 1.2, textAlign: 'center' }}>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activity detail */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Specific Activity *</label>
                  <input className="permit-input" placeholder="e.g. Pool with Minh, Tuan..." value={activity} onChange={e => setActivity(e.target.value)} />
                </div>

                {/* Location */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Location</label>
                  <input className="permit-input" placeholder="e.g. Binh Thanh District, Saigon..." value={location} onChange={e => setLocation(e.target.value)} />
                </div>

                {/* Date + Time — stacked, not side-by-side: a native date
                    input renders its value in the device's own locale
                    format (e.g. Vietnamese "ngày 4 thg 9, 2026"), which is
                    OS chrome no amount of font-size/padding can shrink or
                    truncate. Splitting the row in half left it with too
                    little room and overflowing into the Time field next to
                    it; full-width stacked fields have enough room for any
                    locale's formatting regardless of length. */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Date *</label>
                    <input type="date" className="permit-input" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Time *</label>
                    <input type="time" className="permit-input" value={time} onChange={e => setTime(e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>

                {/* Reason */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Reason / Promise <Icon emoji="🥺" size={12} /></label>
                  <textarea
                    className="permit-input"
                    placeholder="e.g. I promise to be home before 10pm and bring you dessert~"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    style={{ resize: 'none', lineHeight: 1.6 }}
                  />
                </div>

                {/* Signature area */}
                <div style={{ borderTop: '1.5px dashed var(--sakura-light)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--ink-2)', marginBottom: 2 }}>Applicant</p>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--sakura-deep)', fontStyle: 'italic' }}>{currentUser}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 10, color: 'var(--ink-2)', marginBottom: 2 }}>Signature</p>
                    <p style={{ display: 'flex', justifyContent: 'flex-end' }}><Icon emoji="❤️" size={16} /></p>
                  </div>
                </div>
              </div>

              <button onClick={handleSubmit} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, var(--sakura), var(--sakura-deep))', border: 'none', borderRadius: 16, color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 6px 20px rgba(201,95,124,0.3)', transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon emoji="📋" size={16} /> Submit to {partnerUser}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── INBOX TAB (đơn cần tôi duyệt) ── */}
      {tab === 'inbox' && (
        <div>
          {allForMe.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <p style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><Icon emoji="📭" size={48} /></p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--ink)', marginBottom: 4 }}>No requests yet</p>
              <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>{partnerUser} hasn't submitted any requests yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {groupByDay(allForMe).map(group => (
                <div key={group.label}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 10, padding: '0 2px' }}>{group.label}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {group.items.map((req, i) => (
                      <PermitCard key={req.id} req={req} showActions={req.status === 'pending'} formatDate={formatDate} formatCreated={formatCreated}
                        onApprove={() => { setRespondingId(req.id); setResponseNote(''); }}
                        onReject={() => { setRespondingId(req.id); setResponseNote(''); }}
                        respondingId={respondingId}
                        responseNote={responseNote}
                        setResponseNote={setResponseNote}
                        handleRespond={handleRespond}
                        animIndex={i}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MY REQUESTS TAB ── */}
      {tab === 'mine' && (
        <div>
          {myRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <p style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><Icon emoji="📝" size={48} /></p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--ink)', marginBottom: 4 }}>No requests yet</p>
              <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Submit your first request!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {groupByDay(myRequests).map(group => (
                <div key={group.label}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 10, padding: '0 2px' }}>{group.label}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {group.items.map((req, i) => (
                      <PermitCard key={req.id} req={req} showActions={false} formatDate={formatDate} formatCreated={formatCreated}
                        onApprove={() => {}} onReject={() => {}}
                        respondingId={null} responseNote="" setResponseNote={() => {}} handleRespond={() => {}}
                        onEdit={req.status === 'pending' ? () => setEditingRequest(req) : undefined}
                        animIndex={i}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>

      {editingRequest && <EditDateRequestForm req={editingRequest} onClose={() => setEditingRequest(null)} />}
    </div>
  );
}

/* ── Permit card component ── */
function PermitCard({ req, showActions, formatDate, formatCreated, onApprove, onReject, respondingId, responseNote, setResponseNote, handleRespond, onEdit, animIndex }: {
  req: DateRequest;
  showActions: boolean;
  formatDate: (s: string) => string;
  formatCreated: (s: string) => string;
  onApprove: () => void;
  onReject: () => void;
  respondingId: string | null;
  responseNote: string;
  setResponseNote: (s: string) => void;
  handleRespond: (id: string, status: 'approved' | 'rejected') => void;
  onEdit?: () => void;
  animIndex: number;
}) {
  const cfg = STATUS_CONFIG[req.status];
  const isResponding = respondingId === req.id;

  return (
    <div className="permit-slide" style={{ animationDelay: `${animIndex * 0.05}s`, background: 'var(--white)', borderRadius: 20, overflow: 'hidden', border: `1.5px solid ${cfg.border}`, boxShadow: '0 2px 16px rgba(201,95,124,0.08)' }}>
      {/* Card top banner */}
      <div style={{ background: cfg.bg, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon emoji={req.categoryEmoji} size={22} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{req.from} → {req.to}</p>
            <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>{formatCreated(req.createdAt)}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Stamp */}
          <div className={req.status !== 'pending' ? 'stamp-anim' : ''} style={{ padding: '4px 10px', border: `2.5px solid ${cfg.stamp}`, borderRadius: 8, transform: req.status !== 'pending' ? 'rotate(-8deg)' : 'none', opacity: req.status === 'pending' ? 0.6 : 1 }}>
            <p style={{ fontSize: 11, fontWeight: 900, color: cfg.stamp, letterSpacing: '0.06em', fontFamily: 'monospace' }}>{cfg.label}</p>
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              style={{ background: 'var(--white)', border: 'none', borderRadius: 99, width: 26, height: 26, cursor: 'pointer', color: 'var(--ink-2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            ><Icon emoji="✏️" size={12} /></button>
          )}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '16px 18px' }}>
        {/* Activity + location */}
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--ink)', marginBottom: 4 }}>{req.activity}</p>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Icon emoji="📍" size={13} /> {req.location}</p>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <InfoCell icon="📅" label="Date" value={formatDate(req.date)} />
          <InfoCell icon="⏰" label="Time" value={req.time} />
        </div>

        {/* Reason */}
        {req.reason && (
          <div style={{ background: 'var(--sakura-light)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--sakura-deep)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Icon emoji="🥺" size={12} /> REASON / PROMISE</p>
            <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, fontStyle: 'italic' }}>"{req.reason}"</p>
          </div>
        )}

        {/* Response note */}
        {req.responseNote && (
          <div style={{ background: req.status === 'approved' ? '#F0FDF4' : '#FEF2F2', borderRadius: 12, padding: '10px 14px', marginBottom: 12, border: `1px solid ${req.status === 'approved' ? '#86EFAC' : '#FCA5A5'}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: req.status === 'approved' ? '#16A34A' : '#DC2626', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon emoji={req.status === 'approved' ? '✅' : '❌'} size={12} /> {req.status === 'approved' ? 'APPROVAL NOTE' : 'REJECTION REASON'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink)', fontStyle: 'italic' }}>"{req.responseNote}"</p>
          </div>
        )}

        {/* Action buttons */}
        {showActions && !isResponding && (
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onApprove} style={{ flex: 1, padding: '11px', background: '#16A34A', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon emoji="✅" size={14} /> Approve
            </button>
            <button onClick={onReject} style={{ flex: 1, padding: '11px', background: '#DC2626', border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon emoji="❌" size={14} /> Reject
            </button>
          </div>
        )}

        {/* Response form */}
        {isResponding && (
          <div style={{ marginTop: 8, background: '#FAFAFA', borderRadius: 14, padding: '14px', border: '1.5px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Add a note (optional)</p>
            <input
              className="permit-input"
              placeholder="e.g. Sure, but be home by 11!"
              value={responseNote}
              onChange={e => setResponseNote(e.target.value)}
              autoFocus
              style={{ marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleRespond(req.id, 'approved')} style={{ flex: 1, padding: '10px', background: '#16A34A', border: 'none', borderRadius: 11, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon emoji="✅" size={14} /> Approve</button>
              <button onClick={() => handleRespond(req.id, 'rejected')} style={{ flex: 1, padding: '10px', background: '#DC2626', border: 'none', borderRadius: 11, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon emoji="❌" size={14} /> Reject</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCell({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ background: '#FAFAFA', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: 10, color: 'var(--ink-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}><Icon emoji={icon} size={11} /> {label}</p>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{value || '—'}</p>
    </div>
  );
}
