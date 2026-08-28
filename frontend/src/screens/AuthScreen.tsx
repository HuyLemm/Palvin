import { useState } from 'react';
import { register, login } from '../auth';

type Flow = 'welcome' | 'login' | 'register' | 'check-email';

/* ── Petal decoration ── */
function Petals() {
  const petals = [
    { size: 10, left: '8%', delay: '0s', dur: '7s', opacity: 0.5 },
    { size: 7, left: '20%', delay: '1.2s', dur: '9s', opacity: 0.35 },
    { size: 13, left: '38%', delay: '0.4s', dur: '8s', opacity: 0.45 },
    { size: 8, left: '55%', delay: '2.1s', dur: '6.5s', opacity: 0.4 },
    { size: 11, left: '72%', delay: '0.8s', dur: '10s', opacity: 0.3 },
    { size: 6, left: '85%', delay: '3s', dur: '7.5s', opacity: 0.5 },
    { size: 9, left: '93%', delay: '1.6s', dur: '8.5s', opacity: 0.35 },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.8; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        @keyframes logoBreath {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,95,124,0.25), 0 16px 40px rgba(201,95,124,0.35); }
          50% { box-shadow: 0 0 0 12px rgba(201,95,124,0.08), 0 16px 40px rgba(201,95,124,0.45); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heartBeat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.25); }
          30% { transform: scale(1); }
          45% { transform: scale(1.15); }
          60% { transform: scale(1); }
        }
        .auth-fade-up { animation: fadeUp 0.5s ease both; }
        .auth-slide { animation: slideIn 0.45s ease both; }
        .logo-pulse { animation: logoBreath 3s ease-in-out infinite; }
        .heart-beat { animation: heartBeat 2.4s ease-in-out infinite; }
        .auth-input {
          width: 100%;
          padding: 14px 16px;
          border: 1.5px solid #F0DDE4;
          border-radius: 14px;
          background: rgba(255,255,255,0.85);
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          color: #332A2D;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          -webkit-appearance: none;
        }
        .auth-input::placeholder { color: #C4ADB4; }
        .auth-input:focus {
          border-color: #E67F9A;
          box-shadow: 0 0 0 3px rgba(230,127,154,0.15);
          background: #fff;
        }
        .btn-sakura {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 16px;
          background: linear-gradient(135deg, #F3A6B9 0%, #C95F7C 100%);
          color: white;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.02em;
          box-shadow: 0 6px 20px rgba(201,95,124,0.35);
          transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
        }
        .btn-sakura:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-sakura:active:not(:disabled) { opacity: 0.9; transform: scale(0.98); box-shadow: 0 3px 12px rgba(201,95,124,0.3); }
        .btn-ghost {
          width: 100%;
          padding: 14px;
          border: 1.5px solid #F0DDE4;
          border-radius: 16px;
          background: rgba(255,255,255,0.6);
          color: #C95F7C;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .btn-ghost:active { background: rgba(243,166,185,0.15); }
      `}</style>
      {petals.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: '-20px',
          left: p.left,
          width: p.size,
          height: p.size * 1.3,
          borderRadius: '60% 40% 70% 30% / 50% 60% 40% 60%',
          background: `rgba(243,166,185,${p.opacity})`,
          animation: `fall ${p.dur} ${p.delay} linear infinite`,
        }} />
      ))}
    </div>
  );
}

/* ── Full-screen background shell ── */
function AuthBg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(160deg, #FFF0F5 0%, #FCE4EF 35%, #EDD5F0 70%, #F5E8F8 100%)',
      position: 'relative',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>
      <Petals />
      {children}
    </div>
  );
}

/* ── Glass card ── */
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 28,
      border: '1px solid rgba(255,255,255,0.9)',
      boxShadow: '0 8px 40px rgba(201,95,124,0.12), 0 1px 0 rgba(255,255,255,0.8) inset',
      padding: '32px 28px',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ── Field component ── */
function Field({ label, placeholder, value, onChange, type = 'text', delay = '0s' }: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string; delay?: string;
}) {
  return (
    <div className="auth-fade-up" style={{ marginBottom: 16, animationDelay: delay }}>
      <label style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 700,
        color: '#C95F7C',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 7,
      }}>{label}</label>
      <input
        className="auth-input"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoCapitalize="none"
      />
    </div>
  );
}

/* ── Back button ── */
function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', padding: '4px 0 4px',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      color: '#C95F7C', fontFamily: "'Outfit', sans-serif",
      fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 24,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
      Quay lại
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ background: 'rgba(220,38,38,0.07)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, marginTop: -4 }}>
      <p style={{ color: '#DC2626', fontSize: 13 }}>⚠ {message}</p>
    </div>
  );
}

export default function AuthScreen() {
  const [flow, setFlow] = useState<Flow>('welcome');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError('');
    if (!email.trim() || !email.includes('@')) return setError('Nhập email hợp lệ.');
    if (!name.trim()) return setError('Nhập tên của bạn.');
    if (password.length < 6) return setError('Mật khẩu tối thiểu 6 ký tự.');
    if (password !== confirmPass) return setError('Mật khẩu không khớp.');
    setLoading(true);
    const res = await register(email.trim(), password, name.trim());
    setLoading(false);
    if (!res.ok) return setError(res.error!);
    setFlow('check-email');
  }

  async function handleLogin() {
    setError('');
    if (!loginUsername.trim() || !password) return setError('Vui lòng điền đầy đủ.');
    setLoading(true);
    const res = await login(loginUsername.trim(), password);
    setLoading(false);
    // Đăng nhập thành công sẽ tự động vào app qua Supabase session listener,
    // không cần điều hướng thủ công ở đây.
    if (!res.ok) return setError(res.error!);
  }

  /* ── CHECK EMAIL SCREEN ── */
  if (flow === 'check-email') {
    return (
      <AuthBg>
        <div className="auth-slide" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 20px 40px', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div className="heart-beat" style={{ fontSize: 48, lineHeight: 1, marginBottom: 16 }}>📧</div>
            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#332A2D', marginBottom: 10 }}>
              Kiểm tra email của bạn
            </p>
            <p style={{ fontSize: 13, color: '#8C7A80', lineHeight: 1.7, maxWidth: 280, margin: '0 auto' }}>
              Chúng mình đã gửi link xác nhận tới <strong>{email}</strong>. Bấm vào link đó để hoàn tất đăng ký — app sẽ tự đăng nhập ngay sau đó.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn-ghost" onClick={() => { setFlow('welcome'); setError(''); }}>
              Về trang chính
            </button>
          </div>
        </div>
      </AuthBg>
    );
  }

  /* ── REGISTER SCREEN ── */
  if (flow === 'register') {
    return (
      <AuthBg>
        <div className="auth-slide" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 20px 40px' }}>
          <BackBtn onClick={() => { setFlow('welcome'); setError(''); }} />

          <div style={{ marginBottom: 28 }}>
            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#332A2D', marginBottom: 6 }}>
              Tạo tài khoản
            </p>
            <p style={{ fontSize: 13, color: '#8C7A80' }}>Điền thông tin để bắt đầu hành trình cùng nhau.</p>
          </div>

          <Card>
            <Field label="Email" placeholder="ban@email.com" value={email} onChange={v => { setEmail(v); setError(''); }} type="email" delay="0.03s" />
            <Field label="Tên đăng nhập" placeholder="Alvin hoặc Paoi..." value={name} onChange={v => { setName(v); setError(''); }} delay="0.06s" />
            <Field label="Mật khẩu" placeholder="Tối thiểu 6 ký tự" value={password} onChange={v => { setPassword(v); setError(''); }} type="password" delay="0.1s" />
            <Field label="Nhập lại mật khẩu" placeholder="Xác nhận mật khẩu" value={confirmPass} onChange={v => { setConfirmPass(v); setError(''); }} type="password" delay="0.15s" />

            {error && <ErrorBox message={error} />}
          </Card>

          <div style={{ marginTop: 20 }}>
            <button className="btn-sakura" onClick={handleRegister} disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </div>
        </div>
      </AuthBg>
    );
  }

  /* ── LOGIN SCREEN ── */
  if (flow === 'login') {
    return (
      <AuthBg>
        <div className="auth-slide" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 20px 40px' }}>
          <BackBtn onClick={() => { setFlow('welcome'); setError(''); }} />

          <div style={{ marginBottom: 28 }}>
            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#332A2D', marginBottom: 6 }}>
              Chào mừng trở lại
            </p>
            <p style={{ fontSize: 13, color: '#8C7A80' }}>Chúng mình nhớ bạn. 🌸</p>
          </div>

          <Card>
            <Field label="Tên đăng nhập" placeholder="Alvin hoặc Paoi..." value={loginUsername} onChange={v => { setLoginUsername(v); setError(''); }} delay="0.05s" />
            <Field label="Mật khẩu" placeholder="Mật khẩu" value={password} onChange={v => { setPassword(v); setError(''); }} type="password" delay="0.1s" />

            {error && <ErrorBox message={error} />}
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            <button className="btn-sakura" onClick={handleLogin} disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
            <button className="btn-ghost" onClick={() => { setFlow('register'); setError(''); }}>
              Chưa có tài khoản? Đăng ký
            </button>
          </div>
        </div>
      </AuthBg>
    );
  }

  /* ── WELCOME SCREEN ── */
  return (
    <AuthBg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '52px 24px 44px', position: 'relative', zIndex: 1 }}>

        {/* Logo area */}
        <div className="auth-fade-up" style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {/* Outer glow ring */}
          <div style={{
            width: 100, height: 100, borderRadius: 30,
            background: 'linear-gradient(135deg, #F9C4D3, #F3A6B9, #C95F7C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
            position: 'relative',
          }} className="logo-pulse">
            {/* Inner shine */}
            <div style={{
              position: 'absolute', top: 4, left: 4, right: 4, height: '45%',
              borderRadius: '24px 24px 50% 50%',
              background: 'rgba(255,255,255,0.25)',
            }} />
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 44, color: 'white', lineHeight: 1, position: 'relative', zIndex: 1 }}>P</span>
          </div>

          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, color: '#332A2D', letterSpacing: '0.04em', marginBottom: 8 }}>
            PALVIN
          </p>
          <p style={{ fontSize: 14, color: '#8C7A80', letterSpacing: '0.01em', lineHeight: 1.6, marginBottom: 8 }}>
            Không gian riêng của hai mình
          </p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 4 }}>
            {['🌸', '💕', '🌸'].map((e, i) => (
              <span key={i} style={{ fontSize: 16, opacity: 0.7 }}>{e}</span>
            ))}
          </div>
        </div>

        {/* CTA area */}
        <div className="auth-fade-up" style={{ width: '100%', animationDelay: '0.15s' }}>
          <Card style={{ padding: '24px 22px', marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-sakura" onClick={() => { setFlow('login'); setError(''); }}>
                ✦ Đăng nhập
              </button>
              <button className="btn-ghost" onClick={() => { setFlow('register'); setError(''); }}>
                Tạo tài khoản mới
              </button>
            </div>
          </Card>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#B09AA0', lineHeight: 1.6 }}>
            🔒 Đăng ký cần xác nhận qua email trước khi đăng nhập
          </p>
        </div>
      </div>
    </AuthBg>
  );
}
