// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useEffect, useState, type ReactNode } from 'react';
import { fetchLevels, generateUrl, type Level } from './api';

// The .NET 9 Desktop Runtime, which the level apps need to run. Installed once, then every level runs.
const RUNTIME_URL = 'https://dotnet.microsoft.com/download/dotnet/9.0/runtime';

// Show the level number as an address, like a row in a disassembler (0x01, 0x02, ...).
const addr = (n: number) => '0x' + n.toString(16).toUpperCase().padStart(2, '0');

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

function LevelCard({ lvl, active, onSelect }: { lvl: Level; active: boolean; onSelect: (n: number) => void }) {
  const className = ['target', lvl.available ? '' : 'is-locked', active ? 'is-active' : '']
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
        <span className="spacer" />
        <span className="pick">{active ? 'selected' : lvl.available ? 'open ▸' : 'preview ▸'}</span>
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

function Guide({ level, prereqDone, setPrereqDone }: {
  level: Level | null;
  prereqDone: boolean;
  setPrereqDone: (v: boolean) => void;
}) {
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
          </div>
          <p className="guide-obj">{level.summary}</p>

          {level.available ? (
            <ol className="steps">
              <li>
                <div className="step-body">
                  Download the target.
                  <div>
                    <a className="btn btn-dl" href={generateUrl(level.number)}>
                      download {level.name} (.zip)
                    </a>
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

  return (
    <div className="app">
      <header className="titlebar">
        <div className="brand">
          <span className="brand-name">BreakBox</span>
          <span className="brand-sub">// reverse-engineering lab</span>
        </div>
        <span className="sig" title="author signature (MAH6)">0x4D414836</span>
      </header>

      <div className="meta">
        <span>ladder: {levels ? levels.length : 0} levels</span>
        <span className="sep">/</span>
        <span>engine: roslyn (fresh .exe per download)</span>
        <span className="sep">/</span>
        <span>targets: my own only</span>
        <span className="spacer" />
        <span>pick a level, install the runtime once, take it apart</span>
      </div>

      <main className="content">
        {error && (
          <div className="banner banner-error">
            api unreachable at http://localhost:5080. is the backend running? ({error})
          </div>
        )}
        {!levels && !error && <div className="banner">loading levels...</div>}

        {levels && (
          <div className="workspace">
            <div className="ladder">
              <h2 className="section">core</h2>
              <ol className="targets">
                {core.map((l) => (
                  <LevelCard key={l.number} lvl={l} active={l.number === selected} onSelect={setSelected} />
                ))}
              </ol>

              <h2 className="section">advanced <span className="dim">later sprints</span></h2>
              <ol className="targets">
                {advanced.map((l) => (
                  <LevelCard key={l.number} lvl={l} active={l.number === selected} onSelect={setSelected} />
                ))}
              </ol>
            </div>

            <Guide level={selectedLevel} prereqDone={prereqDone} setPrereqDone={setPrereqDone} />
          </div>
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
    </div>
  );
}
