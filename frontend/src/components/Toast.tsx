import { useApp } from '../context';

export default function ToastContainer() {
  const { toasts } = useApp();

  return (
    <div style={{ position: 'fixed', top: 45, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none', maxWidth: 'calc(100vw - 48px)' }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            background: 'rgba(51,42,45,0.92)',
            backdropFilter: 'blur(12px)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 99,
            fontSize: 14,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            maxWidth: '100%',
            animation: t.leaving ? 'toastOut 0.2s ease forwards' : 'toastIn 0.3s cubic-bezier(0.32,0.72,0,1)',
            boxShadow: '0 4px 20px rgba(51,42,45,0.25)',
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>{t.emoji}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
