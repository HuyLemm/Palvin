import { useApp } from '../context';
import Avatar from '../components/Avatar';
import SwipeToDelete from '../components/SwipeToDelete';
import type { AppNotification } from '../types';

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return 'Hôm nay';
  if (sameDay(d, yesterday)) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', {
    day: 'numeric', month: 'long',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function groupByDay(notifications: AppNotification[]): { label: string; items: AppNotification[] }[] {
  const groups: { label: string; items: AppNotification[] }[] = [];
  for (const n of notifications) {
    const label = dayLabel(n.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }
  return groups;
}

export default function Notifications() {
  const { state, markNotifRead, markAllRead, deleteNotification, navigate, pendingInvite, acceptInvite, rejectInvite } = useApp();
  const unread = state.notifications.filter(n => !n.read).length;
  const groups = groupByDay(state.notifications);

  const handleOpen = (n: AppNotification) => {
    markNotifRead(n.id);
    if (n.targetScreen) navigate(n.targetScreen, n.targetId);
  };

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {groups.map(group => (
            <div key={group.label}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-2)', marginBottom: 8, padding: '0 4px' }}>{group.label}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.items.map(n => (
                  <SwipeToDelete key={n.id} onDelete={() => deleteNotification(n.id)}>
                  <div
                    onClick={() => handleOpen(n)}
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
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {n.actor ? (
                        <Avatar user={n.actor} size={44} ring />
                      ) : (
                        <div style={{ width: 44, height: 44, background: 'var(--sakura-light)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{n.emoji}</div>
                      )}
                      {n.actor && (
                        <div style={{ position: 'absolute', bottom: -3, right: -3, width: 20, height: 20, borderRadius: '50%', background: 'var(--white)', border: '1.5px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>{n.emoji}</div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: n.read ? 400 : 600, color: 'var(--ink)', lineHeight: 1.4 }}>{n.message}</p>
                      {n.previewText && (
                        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          "{n.previewText}"
                        </p>
                      )}
                      <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{n.date}</p>
                    </div>
                    {n.previewImageUrl && (
                      <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                        <img src={n.previewImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sakura-accent)', flexShrink: 0 }} />}
                  </div>
                  </SwipeToDelete>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
