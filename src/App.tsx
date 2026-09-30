// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { downloadTarget, fetchLevels, fetchXray, sha256Hex, type Level, type Xray } from './api';

// Which levels I have solved, kept per browser so the ladder remembers between visits.
function useSolved(): { solved: Set<number>; markSolved: (n: number) => void } {
  const [solved, setSolved] = useState<Set<number>>(() => {
    try { return new Set<number>(JSON.parse(localStorage.getItem('bb_solved') || '[]')); } catch { return new Set(); }
  });
  const markSolved = (n: number) => setSolved((prev) => {
    const next = new Set(prev); next.add(n);
    try { localStorage.setItem('bb_solved', JSON.stringify([...next])); } catch { /* storage unavailable */ }
    return next;
  });
  return { solved, markSolved };
}

// The flag hash the server sent with the most recent download of a level, kept so the arcade can
// still check a flag after a reload. It is a hash, so it never reveals the flag.
const flagHashKey = (n: number) => `bb_flaghash_${n}`;
const getFlagHash = (n: number): string | null => {
  try { return localStorage.getItem(flagHashKey(n)); } catch { return null; }
};
const setFlagHash = (n: number, h: string | null) => {
  try { if (h) localStorage.setItem(flagHashKey(n), h); } catch { /* storage unavailable */ }
};

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

function LevelCard({ lvl, active, solved, onSelect }: { lvl: Level; active: boolean; solved: boolean; onSelect: (n: number) => void }) {
  const className = ['target', lvl.available ? '' : 'is-locked', active ? 'is-active' : '', solved ? 'is-solved' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <li
      className={className}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={() => onSelect(lvl.number)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(lvl.number); }
      }}
    >
      <div className="target-top">
        <span className="addr">{addr(lvl.number)}</span>
        <span className="target-name">{lvl.name}</span>
        <span className={`tag tag-${lvl.difficulty.toLowerCase()}`}>{lvl.difficulty}</span>
        {!lvl.available && <span className="tag tag-locked">LOCKED</span>}
        {solved && <span className="tag tag-solved" title="you solved this">&#10003; solved</span>}
        <span className="spacer" />
        <span className="pick">{active ? 'selected' : lvl.available ? 'open ›' : 'preview ›'}</span>
      </div>
      <p className="target-summary">{lvl.summary}</p>
      <p className="target-learn"><span className="label">learn</span>{lvl.learn}</p>
      <div className="target-tools">
        <span className="label">tools</span>
        {lvl.tools.map((t) => <span key={t} className="tool">{t}</span>)}
      </div>
    </li>
  );
}

// The "look inside" X-ray: a live view of what a decompiler sees in a freshly generated target. It
// teaches the level before you even download it. Level 1 shows a hidden key string; Level 2 shows no
// answer at all, because the serial is computed, which is the whole point of the jump between them.
function XrayModal({ level, onClose }: { level: Level; onClose: () => void }) {
  const [xray, setXray] = useState<Xray | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let alive = true;
    setXray(null); setErr(null); setRevealed(false);
    fetchXray(level.number).then((x) => alive && setXray(x)).catch((e: unknown) => alive && setErr(String(e)));
    return () => { alive = false; };
  }, [level.number]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hasSensitive = !!xray?.strings.some((s) => s.sensitive);

  return (
    <div className="xray-backdrop" onClick={onClose}>
      <div className="xray" role="dialog" aria-modal="true" aria-label={`inside ${level.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="xray-head">
          <div className="xray-headline">
            <span className="addr">{addr(level.number)}</span>
            <span className="xray-title">inside {xray?.assembly ?? `Level${level.number}.dll`}</span>
          </div>
          <button className="xray-close" onClick={onClose} aria-label="close">&#10005;</button>
        </div>

        {!xray && !err && <div className="xray-msg">reading the binary...</div>}
        {err && <div className="xray-msg xray-err">could not read the target. is the backend on? ({err})</div>}

        {xray && (
          <>
            <p className="xray-note">{xray.note}</p>
            <div className="xray-grid">
              <div className="xray-col">
                <h4 className="xray-h">methods<span className="xray-count">{xray.methods.length}</span></h4>
                <ul className="xray-methods">
                  {xray.methods.map((m, i) => (
                    <li key={i} className={m.likelyCheck ? 'is-check' : ''}>
                      <span className="m-type">{m.type}</span><span className="m-dot">.</span>
                      <span className="m-name">{m.name}</span>
                      {m.likelyCheck && <span className="m-flag">check</span>}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="xray-col">
                <h4 className="xray-h">
                  strings<span className="xray-count">{xray.strings.length}</span>
                  {hasSensitive && (
                    <button className="xray-reveal" onClick={() => setRevealed((r) => !r)}>
                      {revealed ? 'hide answer' : 'reveal answer'}
                    </button>
                  )}
                </h4>
                <ul className="xray-strings">
                  {xray.strings.map((s, i) => (
                    <li key={i} className={s.sensitive ? 'is-sensitive' : ''}>
                      <span className={`s-val${s.sensitive && !revealed ? ' blurred' : ''}`}>{s.value}</span>
                      <span className="s-in">{s.method}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="xray-foot">read only, generated fresh. this is what a decompiler shows before you run it.</div>
          </>
        )}
      </div>
    </div>
  );
}

function Guide({ level, prereqDone, setPrereqDone, onXray, solved, onSolved }: {
  level: Level | null;
  prereqDone: boolean;
  setPrereqDone: (v: boolean) => void;
  onXray: (n: number) => void;
  solved: Set<number>;
  onSolved: (n: number) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [flag, setFlag] = useState('');
  const [wrong, setWrong] = useState<string | null>(null);

  // Reset the arcade whenever the selected level changes; remember if this level was downloaded before.
  useEffect(() => {
    setDownloading(false); setFlag(''); setWrong(null);
    setDownloaded(level ? !!getFlagHash(level.number) : false);
  }, [level?.number]);

  const isSolved = !!level && solved.has(level.number);

  const download = async () => {
    if (!level) return;
    setDownloading(true);
    try {
      const hash = await downloadTarget(level.number);
      setFlagHash(level.number, hash);
      setDownloaded(true);
    } catch { setWrong('download failed. is the backend running?'); }
    finally { setDownloading(false); }
  };

  const submitFlag = async (e: FormEvent) => {
    e.preventDefault();
    if (!level) return;
    const stored = getFlagHash(level.number);
    if (!stored) { setWrong('download the target first, then crack it.'); return; }
    const typed = await sha256Hex(flag.trim());
    if (typed === stored) { onSolved(level.number); setWrong(null); }
    else { setWrong('not the flag for your download. keep going.'); }
  };

  return (
    <aside className="guide" aria-label="run guide">
      <div className="guide-title">
        {level && <span className="addr">{addr(level.number)}</span>}
        <span>run guide</span>
      </div>

      {/* Step 0: the one-time prerequisite. The apps are Windows programs and need the runtime. */}
      <div className={`prereq${prereqDone ? ' is-done' : ''}`}>
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
          I have installed it
        </label>
      </div>

      {!level && <p className="guide-obj">Pick a level on the left to see how to run and crack it.</p>}

      {level && (
        <>
          <div className="guide-level">
            <span className="name">{level.name}</span>
            <span className={`tag tag-${level.difficulty.toLowerCase()}`}>{level.difficulty}</span>
            {isSolved && <span className="tag tag-solved">&#10003; solved</span>}
          </div>
          <p className="guide-obj">{level.summary}</p>

          {level.available && (
            <button className="btn-xray" onClick={() => onXray(level.number)}>
              <span className="xray-icon" aria-hidden="true">&#9906;</span> look inside the binary
            </button>
          )}

          {level.available ? (
            <>
              <ol className="steps">
                <li>
                  <div className="step-body">
                    Download the target.
                    <div>
                      <button className="btn btn-dl" onClick={download} disabled={downloading}>
                        {downloading ? 'downloading...' : downloaded ? `download ${level.name} again` : `download ${level.name} (.zip)`}
                      </button>
                    </div>
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
                    Enter it in the app. The feature unlocks and it shows the flag <code>{'BR{…}'}</code>.
                  </div>
                </li>
              </ol>

              {isSolved ? (
                <div className="arcade-done"><span className="arcade-check">&#10003;</span> solved. flag accepted for your download.</div>
              ) : (
                <form className="arcade" onSubmit={submitFlag}>
                  <div className="arcade-label">found the flag? claim it</div>
                  <div className="arcade-row">
                    <input
                      className="arcade-input"
                      value={flag}
                      spellCheck={false}
                      placeholder={'BR{....}'}
                      aria-label="flag"
                      onChange={(e) => { setFlag(e.target.value); setWrong(null); }}
                    />
                    <button className="btn arcade-submit" type="submit" disabled={!flag.trim()}>check</button>
                  </div>
                  {wrong && <div className="arcade-wrong">{wrong}</div>}
                </form>
              )}
            </>
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
  const [xrayLevel, setXrayLevel] = useState<number | null>(null);
  const [prereqDone, setPrereqDone] = usePersistentBool('bb_prereq_done');
  const { solved, markSolved } = useSolved();

  useEffect(() => {
    fetchLevels()
      .then(setLevels)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  // Open on the first level you can actually download, so the guide is populated at rest.
  useEffect(() => {
    if (levels && selected === null) {
      const first = levels.find((l) => l.available) ?? levels[0];
      if (first) setSelected(first.number);
    }
  }, [levels, selected]);

  const core = levels?.filter((l) => l.tier === 'core') ?? [];
  const advanced = levels?.filter((l) => l.tier === 'advanced') ?? [];
  const selectedLevel = levels?.find((l) => l.number === selected) ?? null;
  const xrayLevelObj = levels?.find((l) => l.number === xrayLevel) ?? null;
  const available = levels?.filter((l) => l.available).length ?? 0;

  const status = error ? 'offline' : levels ? 'online' : 'connecting';
  const statusLabel = error ? 'api offline' : levels ? 'api online' : 'connecting';

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
          <span className="sig" title="author signature (MAH6)">0x4D414836</span>
        </div>
      </header>

      <div className="meta">
        <span><b>{levels ? levels.length : 9}</b> levels</span>
        <span className="sep">/</span>
        <span><b>{levels ? available : 2}</b> playable now</span>
        {solved.size > 0 && (<><span className="sep">/</span><span><b>{solved.size}</b> solved</span></>)}
        <span className="sep">/</span>
        <span>roslyn builds a fresh target each download</span>
        <span className="sep">/</span>
        <span>my own targets only</span>
      </div>
      <p className="tagline">
        Pick a level, install the runtime once, and take the target apart. Every one is generated just
        for you, and legal to break.
      </p>

      <main className="content">
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
                    <LevelCard key={l.number} lvl={l} active={l.number === selected} solved={solved.has(l.number)} onSelect={setSelected} />
                  ))}
                </ol>
              </section>

              <Guide level={selectedLevel} prereqDone={prereqDone} setPrereqDone={setPrereqDone} onXray={setXrayLevel} solved={solved} onSolved={markSolved} />
            </div>

            <section className="ladder-adv">
              <h2 className="section">advanced <span className="dim">later sprints</span></h2>
              <ol className="targets targets-adv">
                {advanced.map((l) => (
                  <LevelCard key={l.number} lvl={l} active={l.number === selected} solved={solved.has(l.number)} onSelect={setSelected} />
                ))}
              </ol>
            </section>
          </>
        )}
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

      {xrayLevelObj && <XrayModal level={xrayLevelObj} onClose={() => setXrayLevel(null)} />}
    </div>
  );
}
