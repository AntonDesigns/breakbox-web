// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useEffect, useMemo, useState } from 'react';
import { fetchEvents } from '../auth';
import { useLoad } from '../useLoad';
import { kindOf } from './threats';

// The Purple team tab: one event, read from both sides. For a picked audit event it shows what the red
// team was doing, how the blue team actually handled it (the real server control and where it lives in
// the code), and the OWASP category it maps to. The breakdown is a fixed map over the action, so it names
// a defence that genuinely exists in the code, not a guess. Monochrome blueprint: the attack side wears
// the muted stamp tone and the defence side the cyan ink, so the two readings are told apart without a
// literal red and blue.

type Verdict = 'blocked' | 'allowed' | 'benign';
interface Lens { verdict: Verdict; attack: string; defence: string; codePath: string; owasp: string; }

// First matching keyword wins, so the specific attacks are listed before the generic ones.
const RULES: ReadonlyArray<readonly [RegExp, Lens]> = [
  [/brute/, { verdict: 'blocked', attack: 'Automated credential guessing: many passwords against one account in a burst.', defence: 'Failures are counted per source and the login is throttled once they spike, so guessing cannot scale.', codePath: 'LoginThrottle -> AuthController.Login', owasp: 'A07 Identification & Authentication Failures' }],
  [/inject/, { verdict: 'blocked', attack: "SQL injection through the query editor (e.g. ' OR 1=1 --).", defence: 'The editor takes a single SELECT/WITH only, runs it in a rolled-back transaction, admin-only; the residual risk is reviewed and accepted in the scanner.', codePath: 'ConsoleController.Query -> ReadRowsAsync', owasp: 'A03 Injection' }],
  [/idor/, { verdict: 'blocked', attack: "Asking for another user's row by guessing its id (IDOR).", defence: 'Identity is resolved server-side once per request and a normal user is scoped to their own rows, so the id in the request cannot widen access.', codePath: 'SessionAuthMiddleware -> CurrentUser -> row-scoped repository', owasp: 'A01 Broken Access Control' }],
  [/fail/, { verdict: 'blocked', attack: 'A wrong password against a real or guessed account.', defence: 'The password is checked against a PBKDF2 hash, never a plaintext compare, and the failure is throttled and logged.', codePath: 'Pbkdf2PasswordHasher + LoginThrottle', owasp: 'A07 Identification & Authentication Failures' }],
  [/denied|block/, { verdict: 'blocked', attack: "An action outside the caller's permission.", defence: 'Every authorization decision runs on the server (401 signed-out, 403 non-admin), never a client-trusted flag.', codePath: 'RequireAdmin() / CurrentUser', owasp: 'A01 Broken Access Control' }],
  [/attack/, { verdict: 'blocked', attack: 'A probing attempt against the API.', defence: 'The attempt is refused by the matching server control and written to this append-only log, so it is never silent.', codePath: 'the controller guard + IAuditService', owasp: 'A09 Security Logging & Monitoring Failures' }],
];
const LOGIN: Lens = { verdict: 'allowed', attack: 'A successful sign-in (the control working, not an attack).', defence: 'Credentials verified against the PBKDF2 hash, then an HttpOnly server-side session cookie is issued; the token never reaches JavaScript.', codePath: 'AuthController.Login -> SessionService', owasp: 'A07 Identification & Authentication Failures' };
const LOGOUT: Lens = { verdict: 'benign', attack: 'The user ended their session.', defence: 'The session row is revoked server-side so its token cannot be replayed.', codePath: 'SessionService (revoke)', owasp: 'A07 Identification & Authentication Failures' };
const REGISTER: Lens = { verdict: 'allowed', attack: 'A new account was created.', defence: 'Validated like sign-up, the password hashed server-side, and a duplicate username or email rejected.', codePath: 'AuthController.Register', owasp: 'A07 Identification & Authentication Failures' };
const CONSOLE: Lens = { verdict: 'allowed', attack: 'An admin wrote to the database from the Console.', defence: 'Admin-only on the server, and every write is audited into this feed, so a privileged action is never silent.', codePath: 'ConsoleController (RequireAdmin + IAuditService)', owasp: 'A09 Security Logging & Monitoring Failures' };
const BENIGN: Lens = { verdict: 'benign', attack: 'Ordinary use of the platform.', defence: 'Served within the caller’s scope, and a fresh target is generated per download so nothing shared leaks.', codePath: 'ChallengesController + generator', owasp: '—' };

function lensFor(action: string): Lens {
  const a = action.toLowerCase();
  for (const [re, lens] of RULES) if (re.test(a)) return lens;
  if (a === 'login') return LOGIN;
  if (a === 'logout') return LOGOUT;
  if (a === 'register') return REGISTER;
  if (a.startsWith('console.')) return CONSOLE;
  return BENIGN;
}

const VERDICT_LABEL: Record<Verdict, string> = { blocked: 'blocked', allowed: 'allowed', benign: 'benign' };

export function PurpleTeam() {
  const { data, error, reload } = useLoad(fetchEvents);

  useEffect(() => {
    const timer = setInterval(reload, 4000);
    return () => clearInterval(timer);
  }, [reload]);

  const events = useMemo(() => data?.events ?? [], [data]);
  const [sel, setSel] = useState<number | null>(null);

  // Open on the most recent threat (the interesting case), or the newest event; follow the admin's pick.
  const chosenId = useMemo(() => {
    if (sel !== null && events.some((e) => e.id === sel)) return sel;
    const threat = events.find((e) => kindOf(e.action) === 'threat');
    return (threat ?? events[0])?.id ?? null;
  }, [sel, events]);
  const chosen = events.find((e) => e.id === chosenId) ?? null;
  const lens = chosen ? lensFor(chosen.action) : null;

  const owaspCount = useMemo(() => new Set(events.map((e) => lensFor(e.action).owasp).filter((o) => o !== '—')).size, [events]);
  const blocked = useMemo(() => events.filter((e) => kindOf(e.action) === 'threat').length, [events]);
  const fmt = (t: string) => new Date(t).toLocaleTimeString();

  return (
    <div className="purple">
      {error && <div className="banner banner-error">{error}</div>}

      <div className="tstrip">
        <div className="tstat"><span className="tstat-k">events analysed</span><span className="tstat-v data">{events.length}</span><span className="tstat-sub">from the live feed</span></div>
        <div className="tstat"><span className="tstat-k">attacks blocked</span><span className="tstat-v">{blocked}</span><span className="tstat-sub">refused and logged</span></div>
        <div className="tstat"><span className="tstat-k">OWASP categories</span><span className="tstat-v data">{owaspCount}</span><span className="tstat-sub">seen in window</span></div>
      </div>

      <div className="pp-grid">
        <ul className="pp-rail">
          {events.length === 0 && !error && <li className="event-empty">No events yet.</li>}
          {events.map((e) => {
            const k = kindOf(e.action);
            return (
              <li key={e.id}>
                <button type="button" className={`pp-rail-item ${e.id === chosenId ? 'on' : ''}`} onClick={() => setSel(e.id)}>
                  <span className={`tl-dot kind-${k}`} />
                  <span className="pp-rail-action">{e.action}</span>
                  <span className="pp-rail-time">{fmt(e.at)}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="pp-dossier">
          {chosen && lens
            ? (
              <>
                <div className="pp-head">
                  <div className="pp-head-l">
                    <span className="pp-action">{chosen.action}</span>
                    <span className="pp-meta">{chosen.username ?? chosen.ip ?? '—'} · {fmt(chosen.at)}</span>
                  </div>
                  <span className={`pp-verdict v-${lens.verdict}`}>{VERDICT_LABEL[lens.verdict]}</span>
                </div>
                {chosen.detail && <p className="pp-detail">{chosen.detail}</p>}
                <div className="pp-sides">
                  <div className="pp-side red">
                    <div className="pp-side-h">red team · the attack</div>
                    <p>{lens.attack}</p>
                  </div>
                  <div className="pp-side blue">
                    <div className="pp-side-h">blue team · the defence</div>
                    <p>{lens.defence}</p>
                  </div>
                </div>
                <div className="pp-foot">
                  <div className="pp-fact"><span className="pp-fact-k">code path</span><span className="pp-fact-v">{lens.codePath}</span></div>
                  <div className="pp-fact"><span className="pp-fact-k">OWASP</span><span className="pp-fact-v">{lens.owasp}</span></div>
                </div>
              </>
            )
            : <div className="event-empty">Pick an event on the left to see it from both sides.</div>}
        </div>
      </div>

      <p className="con-note">Every event here is read from the same audit feed the Threats tab shows; the breakdown names the real server control that handled it and where it lives in the code.</p>
    </div>
  );
}
