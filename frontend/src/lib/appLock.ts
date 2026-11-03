// App lock: a PIN (always available) and, where the phone supports it, Face ID /
// fingerprint through WebAuthn. This is a *device* gate for casual privacy (someone
// picking up the unlocked phone) — nothing is sent to the server, and it is not a
// substitute for the phone's own passcode.
const KEY = 'palvin:lock:v1';
const FAIL_KEY = 'palvin:lock:fails';

export interface LockConfig {
  enabled: boolean;
  pin?: { salt: string; hash: string; length: number };
  credId?: string;          // base64url id of the platform credential, when biometrics are on
  relockSeconds: number;    // 0 = lock whenever the app goes to the background
}

const DEFAULT: LockConfig = { enabled: false, relockSeconds: 60 };

export function getLockConfig(): LockConfig {
  try { return { ...DEFAULT, ...(JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<LockConfig>) }; } catch { return { ...DEFAULT }; }
}

export function saveLockConfig(c: LockConfig) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* storage unavailable */ }
}

export function clearLock() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(FAIL_KEY); } catch { /* ignore */ }
}

const b64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64 = (s: string) => {
  const p = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(p), c => c.charCodeAt(0));
};

async function derive(pin: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations: 120_000, hash: 'SHA-256' }, key, 256);
  return b64(bits);
}

export const isValidPin = (pin: string) => /^\d{4,6}$/.test(pin);

export async function setPin(pin: string): Promise<LockConfig['pin']> {
  if (!isValidPin(pin)) throw new Error('PIN must be 4 to 6 digits.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: b64(salt), hash: await derive(pin, salt), length: pin.length };
}

export async function checkPin(pin: string, stored: NonNullable<LockConfig['pin']>): Promise<boolean> {
  const h = await derive(pin, unb64(stored.salt));
  // constant-time-ish comparison
  let diff = h.length ^ stored.hash.length;
  for (let i = 0; i < Math.min(h.length, stored.hash.length); i++) diff |= h.charCodeAt(i) ^ stored.hash.charCodeAt(i);
  return diff === 0;
}

// ---- wrong-PIN throttle: 5 misses -> 30 s pause, doubling each further round
interface Fails { n: number; until: number }
const readFails = (): Fails => { try { return JSON.parse(localStorage.getItem(FAIL_KEY) || '{"n":0,"until":0}'); } catch { return { n: 0, until: 0 }; } };
export function lockoutRemainingMs(now = Date.now()): number { return Math.max(0, readFails().until - now); }
export function recordFailure(now = Date.now()) {
  const f = readFails(); const n = f.n + 1;
  const until = n % 5 === 0 ? now + 30_000 * 2 ** (Math.floor(n / 5) - 1) : f.until;
  try { localStorage.setItem(FAIL_KEY, JSON.stringify({ n, until })); } catch { /* ignore */ }
}
export function clearFailures() { try { localStorage.removeItem(FAIL_KEY); } catch { /* ignore */ } }

// ---- biometrics (WebAuthn platform authenticator)
export async function biometricsAvailable(): Promise<boolean> {
  try {
    return !!window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

const challenge = () => crypto.getRandomValues(new Uint8Array(32));

export async function enrollBiometrics(userName: string): Promise<string> {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: challenge(),
      rp: { name: 'PALVIN', id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: userName, displayName: userName },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60_000,
    },
  }) as PublicKeyCredential | null;
  if (!cred) throw new Error('Biometric setup was cancelled.');
  return b64(cred.rawId);
}

export async function unlockWithBiometrics(credId: string): Promise<boolean> {
  try {
    const res = await navigator.credentials.get({
      publicKey: {
        challenge: challenge(),
        rpId: location.hostname,
        allowCredentials: [{ type: 'public-key', id: unb64(credId) as BufferSource, transports: ['internal'] }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return !!res;
  } catch { return false; }
}
