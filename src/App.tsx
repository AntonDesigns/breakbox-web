// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { downloadTarget, fetchLevels, fetchProgress, submitFlag, type Level } from './api';
import { getMe, logout, type Me } from './auth';
import { AuthPanel } from './AuthPanel';
import { Monitor } from './Monitor';
import { Console } from './console/Console';

// The .NET 9 Desktop Runtime, which the level apps need to run. Installed once, then every level runs.
const RUNTIME_URL = 'https://dotnet.microsoft.com/download/dotnet/9.0/runtime';

// Show the level number as an address, like a row in a disassembler (0x01, 0x02, ...).
const addr = (n: number) => '0x' + n.toString(16).toUpperCase().padStart(2, '0');

// A small "break box" mark: a box outline with a bolt through it.
function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4.5" y="4.5" width="23" height="23" rx="6" fill="none" stroke="#375c82" strokeWidth="2" />
      <path d="M18 5.5 L10 17.5 L15.5 16 L14 26.5 L22 14 L16.5 15.5 Z" fill="#77b8d1" />
    </svg>
  );
}

// The one decisive step per built level: how you actually find the key. Kept short and specific to
// the real app, so the guide teaches the move rather than just saying "reverse it". Only the built
// levels have a target; the rest are on the ladder as a preview of later sprints.
const findStep: Record<number, ReactNode> = {
  1: (
    <>
      Open <code>Level1.dll</code> in dnSpy and find <code>IsValid</code>. The licence key is a
      constant it compares against, so read it straight out. It is different in every download.
    </>
  ),
  2: (
    <>
      Open <code>Level2.dll</code> in dnSpy and find <code>IsValid</code>. The serial is not stored,
      it is computed as <code>Seed * 31 + 1337</code>. Read <code>Seed</code>, compute the serial, or
      run the keygen in breakbox-security.
    </>
  ),
  3: (
    <>
      Open <code>Level3.dll</code> in dnSpy or my Studio. There is no key: the premium gate{' '}
      <code>IsPremium()</code> just returns false. Patch it to return true, or run my <strong>Flip</strong>{' '}
      tool, and save the patched assembly.
    </>
  ),
};

// Remember whether the runtime is installed, so the prompt calms down on later visits. Per-browser
// only, and every access is guarded: a private window or blocked storage just falls back to false.
function usePersistentBool(key: string): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try { return localStorage.getItem(key) === '1'; } catch { return false; }
  });
  const set = (next: boolean) => {
    setValue(next);
    try { localStorage.setItem(key, next ? '1' : '0'); } catch { /* storage unavailable */ }
  };
  return [value, set];
}

function LevelCard({ lvl, active, solved, onSelect }: Readonly<{ lvl: Level; active: boolean; solved: boolean; onSelect: (n: number) => void }>) {
  const className = ['target', lvl.available ? '' : 'is-locked', active ? 'is-active' : '']
    .filter(Boolean)
    .join(' ');

  // The pick label, as a plain statement rather than a nested ternary.
  let pick = 'preview ›';
  if (active) pick = 'selected';
  else if (lvl.available) pick = 'open ›';

  // A native button, so keyboard and screen-reader support are built in (no role/tabindex needed).
  return (
    <li className="target-item">
      <button type="button" className={className} aria-pressed={active} onClick={() => onSelect(lvl.number)}>
        <div className="target-top">
          <span className="addr">{addr(lvl.number)}</span>
          <span className="target-name">{lvl.name}</span>
          <span className={`tag tag-${lvl.difficulty.toLowerCase()}`}>{lvl.difficulty}</span>
          {!lvl.available && <span className="tag tag-locked">LOCKED</span>}
          {solved && <span className="tag tag-solved">solved</span>}
          <span className="spacer" />
          <span className="pick">{pick}</span>
        </div>
        <p className="target-summary">{lvl.summary}</p>
        <p className="target-learn"><span className="label">learn</span>{lvl.learn}</p>
        <div className="target-tools">
          <span className="label">tools</span>
          {lvl.tools.map((t) => <span key={t} className="tool">{t}</span>)}
        </div>
      </button>
    </li>
  );
}

function Guide({ level, prereqDone, setPrereqDone, signedIn, solved, onSolved }: Readonly<{
  level: Level | null;
  prereqDone: boolean;
  setPrereqDone: (v: boolean) => void;
  signedIn: boolean;
  solved: boolean;
  onSolved: () => void;
}>) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [flag, setFlag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'correct' | 'wrong' | 'error' | null>(null);
  // The download state resets when the selected level changes because App keys this component by the
  // level number, so it remounts fresh. That is cleaner than an effect that writes state on prop change.

  const download = async () => {
    if (!level) return;
    setDownloading(true); setFailed(false);
    try {
      await downloadTarget(level.number);
      setDownloaded(true);
    } catch { setFailed(true); }
    finally { setDownloading(false); }
  };

  // Submit the flag to the server, which verifies it against the exact target it issued and records the
  // result. A correct flag tells App to refresh the solved badges.
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!level) return;
    setSubmitting(true); setResult(null);
    try {
      const r = await submitFlag(level.number, flag.trim());
      setResult(r.correct ? 'correct' : 'wrong');
      if (r.correct) onSolved();
    } catch { setResult('error'); }
    finally { setSubmitting(false); }
  };

  // The download button label, as a plain statement rather than a nested ternary.
  const name = level?.name ?? '';
  let dlLabel = `download ${name} (.zip)`;
  if (downloading) dlLabel = 'downloading...';
  else if (downloaded) dlLabel = `download ${name} again`;

  return (
    <aside className="guide" aria-label="run guide">
      <div className="guide-title">
        {level && <span className="addr">{addr(level.number)}</span>}
        <span>run guide</span>
      </div>

      {/* Step 0: the one-time prerequisite. Once you tick "installed", it collapses to a one-liner
          and stays that way (remembered per browser), so it is out of the way on every later visit. */}
      {prereqDone ? (
        <div className="prereq-done-line">
          <span>&#10003; .NET&nbsp;9 Desktop Runtime installed</span>
          <button type="button" className="prereq-reset" onClick={() => setPrereqDone(false)}>change</button>
        </div>
      ) : (
        <div className="prereq">
          <h4>Before you start</h4>
          <p>
            The level apps are Windows programs. Install the .NET&nbsp;9 Desktop Runtime once
            (Windows x64) and every level will run.
          </p>
          <a className="link-btn" href={RUNTIME_URL} target="_blank" rel="noreferrer">get the runtime &#8599;</a>
          <label className="prereq-done-row">
            <input
              type="checkbox"
              checked={prereqDone}
              onChange={(e) => setPrereqDone(e.target.checked)}
            />
            <span>I have installed it</span>
          </label>
        </div>
      )}

      {!level && <p className="guide-obj">Pick a level on the left to download it and see how to run it.</p>}

      {level && (
        <>
          <div className="guide-level">
            <span className="name">{level.name}</span>
            <span className={`tag tag-${level.difficulty.toLowerCase()}`}>{level.difficulty}</span>
            {(solved || result === 'correct') && <span className="tag tag-solved">solved</span>}
          </div>
          <p className="guide-obj">{level.summary}</p>

          {level.available ? (
            <ol className="steps">
              <li>
                <div className="step-body">
                  Download the target.
                  <div>
                    <button type="button" className="btn btn-dl" onClick={download} disabled={downloading}>
                      {dlLabel}
                    </button>
                  </div>
                  {failed && <div className="step-fail">download failed. is the backend running on localhost:5080?</div>}
                </div>
              </li>
              <li><div className="step-body">Unzip it to its own folder.</div></li>
              <li>
                <div className="step-body">
                  Double-click <code>Level{level.number}.exe</code> to run it.{' '}
                  <span className="step-note">(needs the runtime above)</span>
                </div>
              </li>
              <li><div className="step-body">{findStep[level.number]}</div></li>
              <li>
                <div className="step-body">
                  {level.number === 3
                    ? <>Relaunch it and use a premium feature; it unlocks and shows the flag <code>{'BR{…}'}</code>.</>
                    : <>Enter it in the app. The feature unlocks and it shows the flag <code>{'BR{…}'}</code>.</>}
                </div>
              </li>
              <li>
                <div className="step-body">
                  Submit the flag to record your solve.
                  {signedIn ? (
                    <form className="flag-form" onSubmit={submit}>
                      <input className="flag-input" value={flag} onChange={(e) => setFlag(e.target.value)} placeholder="BR{...}" aria-label="flag" spellCheck={false} />
                      <button type="submit" className="btn btn-dl" disabled={submitting || flag.trim() === ''}>{submitting ? 'checking...' : 'submit'}</button>
                    </form>
                  ) : (
                    <div className="step-note">Sign in to submit and track your progress.</div>
                  )}
                  {result === 'correct' && <div className="step-ok">Correct. Level solved and recorded.</div>}
                  {result === 'wrong' && <div className="step-fail">Not the flag for this target. Try again.</div>}
                  {result === 'error' && <div className="step-fail">Submit failed. Is the backend running?</div>}
                </div>
              </li>
            </ol>
          ) : (
            <p className="guide-obj">
              Planned for a later sprint. It is on the ladder so you can see where this is going, but
              the API does not build it yet.
            </p>
          )}
        </>
      )}
    </aside>
  );
}

export default function App() {
  const [levels, setLevels] = useState<Level[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [prereqDone, setPrereqDone] = usePersistentBool('bb_prereq_done');
  // me: undefined while the session check is in flight, null when signed out, the user when signed in.
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [view, setView] = useState<'launcher' | 'auth' | 'monitor' | 'console'>('launcher');
  const [solved, setSolved] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchLevels()
      .then(setLevels)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  // Resolve the current session once on load (the server answers from the HttpOnly cookie).
  useEffect(() => {
    getMe().then(setMe).catch(() => setMe(null));
  }, []);

  // The signed-in player's solved levels, for the badges on the ladder and in the guide. Re-fetched
  // after a solve so the badge appears straight away.
  const reloadProgress = useCallback(() => {
    fetchProgress()
      .then((rows) => setSolved(new Set(rows.filter((r) => r.status === 'solved').map((r) => r.number))))
      .catch(() => setSolved(new Set()));   // signed out or offline: clear the badges
  }, []);
  // Re-read progress whenever the signed-in user changes. The set is only updated from inside the async
  // call, never synchronously here, so this stays a real synchronisation effect.
  useEffect(() => { reloadProgress(); }, [me, reloadProgress]);

  const signOut = async () => {
    await logout();
    setMe(null);
    setView('launcher');
  };

  const core = levels?.filter((l) => l.tier === 'core') ?? [];
  const advanced = levels?.filter((l) => l.tier === 'advanced') ?? [];
  // Open on the first level you can actually download, so the guide is populated at rest. Derived from the
  // click (if any) or the default, rather than an effect that writes selection state once levels arrive.
  const firstAvailable = levels?.find((l) => l.available)?.number ?? levels?.[0]?.number ?? null;
  const activeNumber = selected ?? firstAvailable;
  const selectedLevel = levels?.find((l) => l.number === activeNumber) ?? null;
  const available = levels?.filter((l) => l.available).length ?? 0;

  // The connection state, as plain statements rather than nested ternaries.
  let status = 'connecting';
  let statusLabel = 'connecting';
  if (error) { status = 'offline'; statusLabel = 'api offline'; }
  else if (levels) { status = 'online'; statusLabel = 'api online'; }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span className="brand-text">
            <span className="brand-name">BreakBox</span>
            <span className="brand-sub">reverse-engineering lab</span>
          </span>
        </div>
        <div className="topbar-right">
          <span className={`status status-${status}`}><span className="dot" />{statusLabel}</span>
          {me === null && (
            <button type="button" className="authbtn" onClick={() => setView('auth')}>sign in</button>
          )}
          {me && (
            <span className="whoami">
              {me.role === 'admin' && (
                <button type="button" className="authbtn" onClick={() => setView('console')}>console</button>
              )}
              <button type="button" className="authbtn" onClick={() => setView('monitor')}>monitor</button>
              <span className="user">{me.username} <span className="role">{me.role}</span></span>
              <button type="button" className="authbtn ghost" onClick={signOut}>sign out</button>
            </span>
          )}
          <span className="sig" title="author signature (MAH6)">0x4D414836</span>
        </div>
      </header>

      <div className="meta">
        <span><b>{levels ? levels.length : 9}</b> levels</span>
        <span className="sep">/</span>
        <span><b>{levels ? available : 2}</b> playable now</span>
        <span className="sep">/</span>
        <span>roslyn builds a fresh target each download</span>
        <span className="sep">/</span>
        <span>my own targets only</span>
      </div>
      <p className="tagline">
        Pick a level, install the runtime once, and download the target to take apart in your own tools.
        Every one is generated just for you, and legal to break.
      </p>

      <main className="content">
        {view === 'auth' && (
          <AuthPanel onAuthed={(m) => { setMe(m); setView('monitor'); }} onCancel={() => setView('launcher')} />
        )}
        {view === 'monitor' && <Monitor onClose={() => setView('launcher')} />}
        {view === 'console' && <Console onClose={() => setView('launcher')} meId={me?.id ?? 0} />}

        {view === 'launcher' && (<>
        {error && (
          <div className="banner banner-error">
            api unreachable at http://localhost:5080. is the backend running? ({error})
          </div>
        )}
        {!levels && !error && <div className="banner">loading levels...</div>}

        {levels && (
          <>
            <div className="worktop">
              <section className="ladder-core">
                <h2 className="section">core</h2>
                <ol className="targets targets-core">
                  {core.map((l) => (
                    <LevelCard key={l.number} lvl={l} active={l.number === activeNumber} solved={solved.has(l.number)} onSelect={setSelected} />
                  ))}
                </ol>
              </section>

              <Guide key={activeNumber ?? 'none'} level={selectedLevel} prereqDone={prereqDone} setPrereqDone={setPrereqDone} signedIn={!!me} solved={activeNumber !== null && solved.has(activeNumber)} onSolved={reloadProgress} />
            </div>

            <section className="ladder-adv">
              <h2 className="section">advanced <span className="dim">later sprints</span></h2>
              <ol className="targets targets-adv">
                {advanced.map((l) => (
                  <LevelCard key={l.number} lvl={l} active={l.number === activeNumber} solved={solved.has(l.number)} onSelect={setSelected} />
                ))}
              </ol>
            </section>
          </>
        )}
        </>)}
      </main>

      <footer className="statusbar">
        <span>api: localhost:5080</span>
        <span className="sep">/</span>
        <span>{core.length} core</span>
        <span className="sep">/</span>
        <span>{advanced.length} advanced</span>
        <span className="spacer" />
        <span>own generated targets only / authorized use</span>
      </footer>
    </div>
  );
}
