import { useApp } from '../context';
import Icon from './Icon';

export default function CoupleLocked() {
  const { navigate } = useApp();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 380, padding: '32px 24px',
    }}>
      <div style={{
        width: 76, height: 76, borderRadius: 24,
        background: 'linear-gradient(135deg, var(--sakura-light), var(--sakura-accent))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 10px 28px rgba(201,95,124,0.25)',
        marginBottom: 22,
      }}>
        <Icon emoji="🔒" size={32} />
      </div>

      <div style={{
        background: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 22,
        padding: '26px 24px',
        textAlign: 'center',
        maxWidth: 280,
        boxShadow: '0 4px 24px rgba(201,95,124,0.08)',
      }}>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 21, color: 'var(--ink)', marginBottom: 10 }}>
          Chưa liên kết với nửa kia
        </p>
        <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.7, marginBottom: 20 }}>
          Tính năng này chỉ mở khi hai người đã liên kết tài khoản. Mời nửa kia ngay trong Settings để bắt đầu <Icon emoji="💕" size={13} style={{ verticalAlign: -2 }} />
        </p>
        <button
          onClick={() => navigate('settings')}
          style={{
            width: '100%', padding: '12px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))',
            color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(201,95,124,0.3)',
          }}
        >
          Mời nửa kia trong Settings
        </button>
      </div>
    </div>
  );
}
