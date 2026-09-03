import { useState } from 'react';
import { register, login, requestPasswordReset } from '../auth';
import { useApp } from '../context';
import Icon from '../components/Icon';

type Flow = 'welcome' | 'login' | 'register' | 'check-email' | 'forgot' | 'reset-sent';

const REMEMBERED_USERNAME_KEY = 'palvin_remembered_username';

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
        .auth-slide { animation: slideIn 0.45s ease; }
        .logo-pulse { animation: logoBreath 3s ease-in-out infinite; }
        .heart-beat { animation: heartBeat 2.4s ease-in-out infinite; }
        .auth-input {
          width: 100%;
          padding: 14px 16px;
          border: 1.5px solid #F0DDE4;
          border-radius: 14px;
          background: rgba(255,255,255,0.85);
          font-family: 'Nunito', sans-serif;
          font-size: 15px;
          color: var(--ink);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          -webkit-appearance: none;
        }
        .auth-input::placeholder { color: #C4ADB4; }
        .auth-input:focus {
          border-color: var(--sakura-accent);
          box-shadow: 0 0 0 3px rgba(230,127,154,0.15);
          background: #fff;
        }
        .btn-sakura {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--sakura) 0%, var(--sakura-deep) 100%);
          color: white;
          font-family: 'Nunito', sans-serif;
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
          color: var(--sakura-deep);
          font-family: 'Nunito', sans-serif;
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
      // Not scrollable: with html/body locked (overflow:hidden), this was
      // the only scrollable ancestor left, so Safari auto-scrolled it to
      // reveal the focused input above the keyboard, visibly shifting the
      // whole form. Content already fits without scrolling.
      overflowY: 'hidden',
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
function Field({ label, placeholder, value, onChange, type = 'text', delay = '0s', autoComplete }: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string; delay?: string; autoComplete?: string;
}) {
  return (
    <div className="auth-fade-up" style={{ marginBottom: 16, animationDelay: delay }}>
      <label style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--sakura-deep)',
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
        autoComplete={autoComplete}
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
      color: 'var(--sakura-deep)', fontFamily: "'Nunito', sans-serif",
      fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 24,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
      Back
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ background: 'rgba(220,38,38,0.07)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, marginTop: -4 }}>
      <p style={{ color: '#DC2626', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Icon emoji="⚠" size={13} /> {message}</p>
    </div>
  );
}

export default function AuthScreen() {
  const [flow, setFlow] = useState<Flow>('welcome');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loginUsername, setLoginUsername] = useState(() => localStorage.getItem(REMEMBERED_USERNAME_KEY) ?? '');
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(REMEMBERED_USERNAME_KEY));
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [forgotUsername, setForgotUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login and register share this one component instance (switching flow
  // never unmounts it), so without this, a password typed on one screen was
  // still sitting in state — and still shown in the field — after switching
  // to the other.
  function changeFlow(next: Flow) {
    setFlow(next);
    setPassword('');
    setConfirmPass('');
    setError('');
  }

  async function handleRegister() {
    setError('');
    if (!email.trim() || !email.includes('@')) return setError('Enter a valid email.');
    if (!name.trim()) return setError('Enter your name.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPass) return setError("Passwords don't match.");
    setLoading(true);
    const res = await register(email.trim(), password, name.trim());
    setLoading(false);
    if (!res.ok) return setError(res.error!);
    setPassword('');
    setConfirmPass('');
    setFlow('check-email');
  }

  async function handleLogin() {
    setError('');
    if (!loginUsername.trim() || !password) return setError('Please fill in all fields.');
    setLoading(true);
    const res = await login(loginUsername.trim(), password);
    setLoading(false);
    // Đăng nhập thành công sẽ tự động vào app qua Supabase session listener,
    // không cần điều hướng thủ công ở đây.
    if (!res.ok) return setError(res.error!);
    if (rememberMe) localStorage.setItem(REMEMBERED_USERNAME_KEY, loginUsername.trim());
    else localStorage.removeItem(REMEMBERED_USERNAME_KEY);
  }

  async function handleForgotPassword() {
    setError('');
    if (!forgotUsername.trim()) return setError('Enter your username.');
    setLoading(true);
    const res = await requestPasswordReset(forgotUsername.trim());
    setLoading(false);
    if (!res.ok) return setError(res.error!);
    setFlow('reset-sent');
  }

  /* ── CHECK EMAIL SCREEN ── */
  if (flow === 'check-email') {
    return (
      <AuthBg>
        <div className="auth-slide" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 20px 100px', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div className="heart-beat" style={{ lineHeight: 1, marginBottom: 16, display: 'flex', justifyContent: 'center' }}><Icon emoji="📧" size={48} /></div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, color: 'var(--ink)', marginBottom: 10 }}>
              Check your email
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7, maxWidth: 280, margin: '0 auto' }}>
              We've sent a confirmation link to <strong>{email}</strong>. Tap it to finish signing up — you'll be logged in automatically right after.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn-ghost" onClick={() => { changeFlow('welcome'); }}>
              Back to home
            </button>
          </div>
        </div>
      </AuthBg>
    );
  }

  /* ── RESET LINK SENT SCREEN ── */
  if (flow === 'reset-sent') {
    return (
      <AuthBg>
        <div className="auth-slide" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 20px 100px', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div className="heart-beat" style={{ lineHeight: 1, marginBottom: 16, display: 'flex', justifyContent: 'center' }}><Icon emoji="📧" size={48} /></div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, color: 'var(--ink)', marginBottom: 10 }}>
              Check your email
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7, maxWidth: 280, margin: '0 auto' }}>
              We've sent a password reset link to your inbox. Tap it to choose a new password.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn-ghost" onClick={() => { changeFlow('login'); }}>
              Back to log in
            </button>
          </div>
        </div>
      </AuthBg>
    );
  }

  /* ── FORGOT PASSWORD SCREEN ── */
  if (flow === 'forgot') {
    return (
      <AuthBg>
        <div className="auth-slide" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '50px 20px 100px' }}>
          <BackBtn onClick={() => { changeFlow('login'); }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 27, color: 'var(--ink)', marginBottom: 6 }}>
                Forgot password?
              </p>
              <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Enter your username and we'll email you a reset link.</p>
            </div>

            <Card>
              <Field label="Username" placeholder="Your username" value={forgotUsername} onChange={v => { setForgotUsername(v); setError(''); }} delay="0.05s" autoComplete="username" />
              {error && <ErrorBox message={error} />}
            </Card>

            <div style={{ marginTop: 20 }}>
              <button className="btn-sakura" onClick={handleForgotPassword} disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </div>
          </div>
        </div>
      </AuthBg>
    );
  }

  /* ── REGISTER SCREEN ── */
  if (flow === 'register') {
    return (
      <AuthBg>
        <div className="auth-slide" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 20px 100px' }}>
          <BackBtn onClick={() => { changeFlow('welcome'); }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 27, color: 'var(--ink)', marginBottom: 6 }}>
                Create account
              </p>
              <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Fill in your details to start your journey together.</p>
            </div>

            <Card>
              <Field label="Email" placeholder="you@email.com" value={email} onChange={v => { setEmail(v); setError(''); }} type="email" delay="0.03s" autoComplete="email" />
              <Field label="Username" placeholder="Your username" value={name} onChange={v => { setName(v); setError(''); }} delay="0.06s" autoComplete="username" />
              <Field label="Password" placeholder="At least 6 characters" value={password} onChange={v => { setPassword(v); setError(''); }} type="password" delay="0.1s" autoComplete="new-password" />
              <Field label="Confirm password" placeholder="Confirm your password" value={confirmPass} onChange={v => { setConfirmPass(v); setError(''); }} type="password" delay="0.15s" autoComplete="new-password" />

              {error && <ErrorBox message={error} />}
            </Card>

            <div style={{ marginTop: 20 }}>
              <button className="btn-sakura" onClick={handleRegister} disabled={loading}>
                {loading ? 'Processing...' : 'Sign up'}
              </button>
            </div>
          </div>
        </div>
      </AuthBg>
    );
  }

  /* ── LOGIN SCREEN ── */
  if (flow === 'login') {
    return (
      <AuthBg>
        <div className="auth-slide" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '50px 20px 100px' }}>
          <BackBtn onClick={() => { changeFlow('welcome'); }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 27, color: 'var(--ink)', marginBottom: 6 }}>
                Welcome back
              </p>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6 }}>We've missed you. <Icon emoji="🌸" size={13} /></p>
            </div>

            <Card>
              <Field label="Username" placeholder="Your username" value={loginUsername} onChange={v => { setLoginUsername(v); setError(''); }} delay="0.05s" autoComplete="username" />
              <Field label="Password" placeholder="Password" value={password} onChange={v => { setPassword(v); setError(''); }} type="password" delay="0.1s" autoComplete="current-password" />

              <div className="auth-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: error ? 12 : 0, animationDelay: '0.12s' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--sakura-deep)', cursor: 'pointer' }} />
                  Remember me
                </label>
                <button onClick={() => { setForgotUsername(loginUsername); changeFlow('forgot'); }} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Forgot password?
                </button>
              </div>

              {error && <ErrorBox message={error} />}
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              <button className="btn-sakura" onClick={handleLogin} disabled={loading}>
                {loading ? 'Processing...' : 'Log in'}
              </button>
              <button className="btn-ghost" onClick={() => { changeFlow('register'); }}>
                Don't have an account? Sign up
              </button>
            </div>
          </div>
        </div>
      </AuthBg>
    );
  }

  /* ── WELCOME SCREEN ── */
  return (
    <AuthBg>
      <div className="auth-slide" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40, padding: '50px 20px', position: 'relative', zIndex: 1 }}>

        {/* Logo area */}
        <div className="auth-fade-up" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {/* Outer glow ring */}
          <div style={{
            width: 100, height: 100, borderRadius: 30,
            background: 'linear-gradient(135deg, #F9C4D3, var(--sakura), var(--sakura-deep))',
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
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 47, color: 'white', lineHeight: 1, position: 'relative', zIndex: 1 }}>P</span>
          </div>

          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, color: 'var(--ink)', letterSpacing: '0.04em', marginBottom: 8 }}>
            PALVIN
          </p>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', letterSpacing: '0.01em', lineHeight: 1.6, marginBottom: 8 }}>
            Your own little space, just for two
          </p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 4 }}>
            {['🌸', '💕', '🌸'].map((e, i) => (
              <Icon key={i} emoji={e} size={16} style={{ opacity: 0.7 }} />
            ))}
          </div>
        </div>

        {/* CTA area */}
        <div className="auth-fade-up" style={{ width: '100%', animationDelay: '0.15s' }}>
          <Card style={{ padding: '24px 22px', marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-sakura" onClick={() => { changeFlow('login'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon emoji="✦" size={16} /> Log in
              </button>
              <button className="btn-ghost" onClick={() => { changeFlow('register'); }}>
                Create new account
              </button>
            </div>
          </Card>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#B09AA0', lineHeight: 1.6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon emoji="🔒" size={11} /> Signing up requires email confirmation before you can log in
          </p>
        </div>
      </div>
    </AuthBg>
  );
}

/* ── Reset Password screen (shown after tapping the "forgot password" email link) ── */
export function ResetPasswordScreen() {
  const { completePasswordRecovery } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setError("Passwords don't match.");
    setLoading(true);
    const res = await completePasswordRecovery(newPassword);
    setLoading(false);
    if (!res.ok) return setError(res.error!);
  }

  return (
    <AuthBg>
      <div className="auth-slide" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '50px 20px 100px', justifyContent: 'center' }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 27, color: 'var(--ink)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon emoji="🔐" size={22} /> Set a new password
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Choose a new password for your account.</p>
        </div>

        <Card>
          <Field label="New password" placeholder="At least 6 characters" value={newPassword} onChange={v => { setNewPassword(v); setError(''); }} type="password" delay="0.05s" autoComplete="new-password" />
          <Field label="Confirm new password" placeholder="Confirm your password" value={confirmPassword} onChange={v => { setConfirmPassword(v); setError(''); }} type="password" delay="0.1s" autoComplete="new-password" />
          {error && <ErrorBox message={error} />}
        </Card>

        <div style={{ marginTop: 20 }}>
          <button className="btn-sakura" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save new password'}
          </button>
        </div>
      </div>
    </AuthBg>
  );
}
