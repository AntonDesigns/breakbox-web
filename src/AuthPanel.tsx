// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useState } from 'react';
import { login, register, type Me } from './auth';

// Sign in or register. The form only collects the credentials and shows the server's own error; the
// real decision (and the password hashing) happens on the server, never here.
export function AuthPanel({ onAuthed, onCancel }: Readonly<{ onAuthed: (me: Me) => void; onCancel: () => void }>) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const me = mode === 'login'
        ? await login(username.trim(), password)
        : await register(username.trim(), email.trim(), password);
      onAuthed(me);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'request failed');
    } finally {
      setBusy(false);
    }
  };

  // The submit label, as a plain statement rather than a nested ternary.
  let submitLabel = mode === 'login' ? 'Sign in' : 'Create account';
  if (busy) submitLabel = '...';

  return (
    <section className="authpanel">
      <div className="auth-card">
        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Sign in</button>
          <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>Register</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <label><span>username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </label>
          {mode === 'register' && (
            <label><span>email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
          )}
          <label><span>password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                   autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <div className="auth-actions">
            <button type="button" className="ghost" onClick={onCancel}>back</button>
            <button type="submit" className="primary" disabled={busy}>{submitLabel}</button>
          </div>
        </form>
        <p className="auth-note">The first account becomes the admin, which is the monitor's see-everything view.</p>
      </div>
    </section>
  );
}
