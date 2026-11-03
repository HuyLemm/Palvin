import type { ReactNode } from 'react';
import Icon from './Icon';

// Shared empty state: the little bunny from the loading screen plus a warm
// one-liner, so "nothing here yet" feels like an invitation, not a dead end.
export default function EmptyState({ icon, title, sub, action }: {
  icon?: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '44px 24px' }}>
      <div style={{ position: 'relative', width: 84, height: 84, margin: '0 auto 14px' }}>
        <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: 'var(--pink-glow)', border: '1px solid var(--border)' }} />
        <img src="/Firefly.png" alt="" aria-hidden="true" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', animation: 'bunnyBob 3s ease-in-out infinite' }} />
        {icon && (
          <span style={{ position: 'absolute', right: -2, bottom: 2, width: 28, height: 28, borderRadius: '50%', background: 'var(--white)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon emoji={icon} size={15} />
          </span>
        )}
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{title}</p>
      {sub && <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: action ? 18 : 0 }}>{sub}</p>}
      {action}
    </div>
  );
}
