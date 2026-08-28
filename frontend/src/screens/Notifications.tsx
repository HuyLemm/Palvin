import { useApp } from '../context';

export default function Notifications() {
  const { state, markNotifRead, markAllRead, pendingInvite, acceptInvite, rejectInvite } = useApp();
  const unread = state.notifications.filter(n => !n.read).length;

  return (
    <div style={{ paddingBottom: 32 }}>
      {pendingInvite && (
        <div style={{
          padding: '16px 18px', marginBottom: 14, borderRadius: 16,
          background: 'linear-gradient(135deg, #FFF0F4, white)', border: '1.5px solid var(--sakura-accent)',
        }}>
          <p style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 12 }}>
            💕 <strong>{pendingInvite.name}</strong> muốn liên kết với bạn
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => acceptInvite(pendingInvite.id)}
              style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              Đồng ý 💕
            </button>
            <button
              onClick={() => rejectInvite(pendingInvite.id)}
              style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'white', color: 'var(--ink-2)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              Từ chối
            </button>
          </div>
        </div>
      )}

      {unread > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Mark all read</button>
        </div>
      )}

      {state.notifications.length === 0 && !pendingInvite ? (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>No notifications</p>
          <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {state.notifications.map(n => (
            <div key={n.id}
              onClick={() => markNotifRead(n.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                background: !n.read ? 'linear-gradient(135deg, #FFF0F4, var(--white))' : 'var(--white)',
                border: '1px solid var(--border)',
                borderLeft: !n.read ? '3px solid var(--sakura-accent)' : '1px solid var(--border)',
                borderRadius: 14,
                cursor: 'pointer',
                transition: 'background 0.15s',
                opacity: n.read ? 0.7 : 1,
              }}
            >
              <div style={{ width: 44, height: 44, background: 'var(--sakura-light)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{n.emoji}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: n.read ? 400 : 600, color: 'var(--ink)', lineHeight: 1.4 }}>{n.message}</p>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{n.date}</p>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sakura-accent)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
