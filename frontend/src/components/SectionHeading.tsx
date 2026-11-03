import Icon from './Icon';

// Small uppercase card title that can fold its card's content away. The whole title row is
// the button, so the tap target is large and the state is announced (aria-expanded).
export default function SectionHeading({ title, collapsed, onToggle, style }: {
  title: string; collapsed: boolean; onToggle: () => void; style?: React.CSSProperties;
}) {
  return (
    <button onClick={onToggle} aria-expanded={!collapsed} aria-label={`${title}, ${collapsed ? 'show' : 'hide'}`}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-2)', ...style }}>
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
      <span aria-hidden="true" style={{ display: 'inline-flex', transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'none' }}>
        <Icon emoji="⌄" size={16} />
      </span>
    </button>
  );
}
