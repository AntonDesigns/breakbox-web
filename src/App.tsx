// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useEffect, useState } from 'react';
import { fetchLevels, generateUrl, type Level } from './api';

// Show the level number as an address, like a row in a disassembler (0x01, 0x02, ...).
const addr = (n: number) => '0x' + n.toString(16).toUpperCase().padStart(2, '0');

function LevelCard({ lvl }: { lvl: Level }) {
  return (
    <li className={lvl.available ? 'target' : 'target is-locked'}>
      <div className="target-top">
        <span className="addr">{addr(lvl.number)}</span>
        <span className="target-name">{lvl.name}</span>
        <span className={`tag tag-${lvl.difficulty.toLowerCase()}`}>{lvl.difficulty}</span>
        {!lvl.available && <span className="tag tag-locked">LOCKED</span>}
        <span className="spacer" />
        {lvl.available ? (
          <a className="btn" href={generateUrl(lvl.number)}>download</a>
        ) : (
          <span className="btn btn-disabled">n/a</span>
        )}
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

export default function App() {
  const [levels, setLevels] = useState<Level[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLevels()
      .then(setLevels)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  const core = levels?.filter((l) => l.tier === 'core') ?? [];
  const advanced = levels?.filter((l) => l.tier === 'advanced') ?? [];

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
        <span>engine: fixed (sprint 1)</span>
        <span className="sep">/</span>
        <span>targets: my own only</span>
        <span className="spacer" />
        <span>pick one, download it, take it apart</span>
      </div>

      <main className="content">
        {error && (
          <div className="banner banner-error">
            api unreachable at http://localhost:5080. is the backend running? ({error})
          </div>
        )}
        {!levels && !error && <div className="banner">loading levels...</div>}

        {levels && (
          <>
            <h2 className="section">core</h2>
            <ol className="targets">
              {core.map((l) => <LevelCard key={l.number} lvl={l} />)}
            </ol>

            <h2 className="section">advanced <span className="dim">later sprints</span></h2>
            <ol className="targets">
              {advanced.map((l) => <LevelCard key={l.number} lvl={l} />)}
            </ol>
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
        <span className="scope">own generated targets only / authorized use</span>
      </footer>
    </div>
  );
}
