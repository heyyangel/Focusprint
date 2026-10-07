import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/services';
import { Spinner } from '../components/common';
import { toast } from '../utils/ui';

const HIGHLIGHTS = [
  { icon: 'fa-diagram-project', title: 'Delegation', text: 'Assign work, track approvals and revisions end to end.' },
  { icon: 'fa-list-check', title: 'Checklist', text: 'Generate recurring routines and verify them as they land.' },
  { icon: 'fa-clipboard-check', title: 'Task Center', text: 'One queue for everything due, with proof and remarks.' },
];

export default function Login() {
  const { isAuthenticated, checking, login, landing } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [usernames, setUsernames] = useState([]);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetUser, setResetUser] = useState('');
  const [otp, setOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [resetMsg, setResetMsg] = useState(null);
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    authApi.usernames().then(setUsernames).catch(() => setUsernames([]));
  }, []);

  if (checking) return <Spinner label="Loading…" className="min-h-screen" />;
  if (isAuthenticated) return <Navigate to={`/${landing}`} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const user = await login(username.trim(), password);
      toast(`Welcome back, ${user.name}`);
      navigate('/overview', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async () => {
    if (!resetUser.trim()) {
      setResetMsg({ tone: 'error', text: 'Please enter your username.' });
      return;
    }
    setResetBusy(true);
    try {
      const res = await authApi.forgotPassword(resetUser.trim());
      setResetMsg({ tone: 'ok', text: res.message });
      setResetStep(2);
    } catch (err) {
      setResetMsg({ tone: 'error', text: err.message });
    } finally {
      setResetBusy(false);
    }
  };

  const confirmReset = async () => {
    if (!otp.trim() || !newPass) {
      setResetMsg({ tone: 'error', text: 'Please fill both fields.' });
      return;
    }
    setResetBusy(true);
    try {
      const res = await authApi.resetPassword(resetUser.trim(), otp.trim(), newPass);
      setResetMsg({ tone: 'ok', text: res.message });
      setTimeout(() => {
        setResetOpen(false);
        setResetStep(1);
        setOtp('');
        setNewPass('');
        setResetMsg(null);
      }, 1800);
    } catch (err) {
      setResetMsg({ tone: 'error', text: err.message });
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between bg-brand-950 text-white p-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 15%, #b0693a 0, transparent 45%), radial-gradient(circle at 85% 80%, #904a20 0, transparent 50%)',
          }}
        />
        <div className="relative">
          <span className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-white shadow-raised">
            <img src="/logo.png" alt="Focus Prints LLP" className="w-12 h-auto object-contain" />
          </span>
          <h1 className="mt-8 font-display text-4xl font-extrabold leading-tight max-w-md">
            Everything your team owes,
            <span className="text-brand-300"> in one place.</span>
          </h1>
          <p className="mt-4 text-brand-200/80 text-sm max-w-md leading-relaxed">
            Focus Prints ERP brings delegation, recurring checklists and daily task
            verification together, so nothing slips between departments.
          </p>
        </div>

        <ul className="relative space-y-4 max-w-md">
          {HIGHLIGHTS.map((h) => (
            <li key={h.title} className="flex gap-3.5">
              <span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-white/10 text-brand-200">
                <i className={`fas ${h.icon}`} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{h.title}</span>
                <span className="block text-xs text-brand-200/70 leading-relaxed">{h.text}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="relative text-[11px] tracking-[0.16em] uppercase text-brand-300/60">
          Garment Labels · Hangtags · Plastic Seals · Heat Transfers
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-5 py-12 bg-sand-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex justify-center mb-8">
            <img src="/logo.png" alt="Focus Prints LLP" className="h-14 w-auto object-contain" />
          </div>

          <h2 className="font-display text-2xl font-bold text-sand-900">Sign in</h2>
          <p className="text-sand-500 text-sm mt-1 mb-7">Use your Focus Prints ERP credentials.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="fp-label">Username</label>
              <div className="relative">
                <i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-sand-400 text-sm" />
                <input
                  id="login-username"
                  list="fp-usernames"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Select or type your name"
                  className="fp-input pl-10 py-2.5"
                />
                <datalist id="fp-usernames">
                  {usernames.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="fp-label">Password</label>
              <div className="relative">
                <i className="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-sand-400 text-sm" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="fp-input pl-10 pr-10 py-2.5"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-400 hover:text-sand-600"
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={busy} className="fp-btn-primary w-full py-2.5">
              {busy ? (
                <>
                  <i className="fas fa-circle-notch fa-spin" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <i className="fas fa-arrow-right text-xs" />
                </>
              )}
            </button>

            {error && (
              <p className="text-red-700 text-sm text-center bg-red-50 border border-red-100 rounded-xl py-2.5 px-3">
                <i className="fas fa-circle-exclamation mr-1.5" />
                {error}
              </p>
            )}

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setResetOpen(true);
                  setResetStep(1);
                  setResetUser(username);
                  setResetMsg(null);
                }}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
              >
                Forgot your password?
              </button>
            </div>
          </form>

          <p className="text-center text-[11px] text-sand-400 mt-10">
            © {new Date().getFullYear()} Focus Prints LLP
          </p>
        </div>
      </div>

      {resetOpen && (
        <div
          className="fixed inset-0 bg-brand-950/50 backdrop-blur-sm z-50 flex items-center justify-center px-4 animate-fade-in"
          onMouseDown={(e) => e.target === e.currentTarget && setResetOpen(false)}
          role="presentation"
        >
          <div className="bg-white rounded-2xl shadow-panel w-full max-w-sm overflow-hidden animate-pop-in" role="dialog" aria-modal="true">
            <div className="px-5 py-4 bg-brand-950 text-white flex items-center gap-3">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/10 text-brand-200">
                <i className="fas fa-key" />
              </span>
              <div>
                <h3 className="font-bold text-base leading-tight">Reset password</h3>
                <p className="text-[11px] text-brand-300">
                  {resetStep === 1 ? 'We will email you a one-time code' : 'Enter the code from your inbox'}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {resetStep === 1 ? (
                <>
                  <div>
                    <label htmlFor="reset-username" className="fp-label">Username</label>
                    <input
                      id="reset-username"
                      value={resetUser}
                      onChange={(e) => setResetUser(e.target.value)}
                      placeholder="Your username"
                      className="fp-input"
                    />
                  </div>
                  <button type="button" disabled={resetBusy} onClick={sendOtp} className="fp-btn-primary w-full">
                    {resetBusy ? 'Sending…' : 'Send OTP'}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="reset-otp" className="fp-label">OTP from email</label>
                    <input
                      id="reset-otp"
                      maxLength={6}
                      inputMode="numeric"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="fp-input font-mono text-center text-lg tracking-[0.5em]"
                    />
                  </div>
                  <div>
                    <label htmlFor="reset-newpass" className="fp-label">New password</label>
                    <input
                      id="reset-newpass"
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="At least 6 characters"
                      className="fp-input"
                    />
                  </div>
                  <button type="button" disabled={resetBusy} onClick={confirmReset} className="fp-btn-primary w-full">
                    {resetBusy ? 'Resetting…' : 'Reset password'}
                  </button>
                </>
              )}

              {resetMsg && (
                <p className={`text-sm text-center rounded-lg py-2 px-3 ${
                  resetMsg.tone === 'ok' ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                }`}>
                  {resetMsg.text}
                </p>
              )}

              <button
                type="button"
                onClick={() => setResetOpen(false)}
                className="w-full text-sand-400 hover:text-sand-600 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
