import { useEffect } from 'react';
import Icon from './Icon';

interface Props {
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
}

export default function BottomSheet({ onClose, children, title }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        <div className="sheet-handle" />
        {title && (
          <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{title}</span>
            <button onClick={onClose} style={{ background: 'var(--sakura-light)', border: 'none', borderRadius: 99, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ink-2)' }}><Icon emoji="✕" size={16} /></button>
          </div>
        )}
        <div style={{ padding: '0 20px 8px' }}>
          {children}
        </div>
      </div>
    </>
  );
}
