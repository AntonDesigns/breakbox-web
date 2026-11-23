// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  continueGauntlet, currentGauntlet, gauntletApp, gauntletRun, observeGauntlet, startGauntlet, stopGauntlet, submitGauntlet,
  type GauntletState, type GauntletTarget, type WardenView,
} from '../api';
import type { Target, WorkbenchPort } from './ports';
import { Workbench } from './Workbench';
import './phase6.css';

// The gauntlet (Phase 6), the warden's rematch. He chooses every rung from his belief in the player's skills and
// says why; the workbench morphs into each new target in place; three misses and he eases off; a cycle's last rung
// is fought against his server form and its flag is his fall; then the player goes on (every rung re-arms, the
// streak keeps counting) or stops (he remembers the run). This component only shows what the server decided: the
// run, his reason, his belief bars, and the target he issued.
export function GauntletArena({ onWarden }: Readonly<{ onWarden: (w: WardenView) => void }>) {
  const [run, setRun] = useState<GauntletState | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stopped, setStopped] = useState<{ cleared: number; best: number } | null>(null);
  const seq = useRef(0);

  // Every answer carries the run, and a target when the fight moved to another rung.
  const take = useCallback((a: { gauntlet: GauntletState; target: GauntletTarget | null }) => {
    setRun(a.gauntlet);
    if (a.target) {
      seq.current += 1;
      setTarget({ key: `g${seq.current}`, ...a.target });
    }
  }, []);

  // Resume a run in progress (a reload), or start the rematch. The server decides whether this player may. State
  // is only set once the server has answered.
  useEffect(() => {
    let cancelled = false;
    // Deliberately not awaited (an effect cannot be async); every failure is caught inside, so nothing is lost.
    void (async () => {
      try {
        const a = (await currentGauntlet()) ?? await startGauntlet();
        if (cancelled) return;
        take(a);
        onWarden(a.warden);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [take, onWarden]);

  // After a stopped run: a fresh rematch, from the player's click.
  const again = async () => {
    setBusy(true);
    try {
      const a = await startGauntlet();
      setStopped(null);
      take(a);
      onWarden(a.warden);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const port = useMemo<WorkbenchPort>(() => ({
    observe: (kind, member, source) => observeGauntlet(kind, member, source),
    run: (source) => gauntletRun(source),
    app: async (source, key) => {
      const r = await gauntletApp(source, key);
      take(r);
      return r;
    },
    submit: async (flag) => {
      const r = await submitGauntlet(flag);
      take(r);
      if (!r.correct) {
        return { correct: false, warden: r.warden, message: r.gauntlet.relented ? 'Wrong. He eased off to another rung.' : 'That flag is not right for this rung.' };
      }
      return r.gauntlet.cycleWon
        ? { correct: true, warden: r.warden, message: 'Every rung is broken.', solved: `Cycle ${r.gauntlet.cycle} won.` }
        : { correct: true, warden: r.warden, message: 'Broken.', solved: 'Rung broken.' };
    },
  }), [take]);

  const goOn = async () => {
    setBusy(true);
    try {
      const a = await continueGauntlet();
      take(a);
      onWarden(a.warden);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      setStopped(await stopGauntlet());
      setRun(null);
      setTarget(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="gt">
        <output className="gt-locked">
          <span className="gt-title">The gauntlet</span>
          <span className="gt-msg">{error}</span>
        </output>
      </div>
    );
  }

  if (stopped) {
    return (
      <div className="gt">
        <output className="gt-locked">
          <span className="gt-title">Run over</span>
          <span className="gt-msg">You broke {stopped.cleared} {stopped.cleared === 1 ? 'rung' : 'rungs'}. Your best run against him is {stopped.best}.</span>
          <button type="button" className="gt-btn" disabled={busy} onClick={() => void again()}>start another rematch</button>
        </output>
      </div>
    );
  }

  if (!run || !target) return <div className="gt"><div className="gt-locked">He is choosing...</div></div>;

  return (
    <div className="gt">
      <GauntletHeader run={run} busy={busy} onContinue={goOn} onStop={stop} />
      <Workbench port={port} target={target} onWarden={onWarden} />
    </div>
  );
}

// The run at a glance: the score, every rung of the cycle, why he chose this one, and what he believes about each
// of the player's skills (the mean as a bar, the spread as a band around its end).
function GauntletHeader({ run, busy, onContinue, onStop }: Readonly<{
  run: GauntletState;
  busy: boolean;
  onContinue: () => void;
  onStop: () => void;
}>) {
  const rungClass = (name: string, broken: boolean) =>
    ['gt-rung', broken ? 'broken' : '', name === run.current.rung && !run.cycleWon ? 'here' : '',
      name === run.current.rung && run.final ? 'last' : ''].filter(Boolean).join(' ');

  return (
    <section className="gt-head" aria-label="the gauntlet">
      <div className="gt-top">
        <div className="gt-title">The gauntlet <span className="gt-cycle">cycle {run.cycle}</span></div>
        <div className="gt-score">
          <span><b>{run.cleared}</b> broken</span>
          <span>best <b>{run.best}</b></span>
          <button type="button" className="gt-btn gt-stop" disabled={busy} onClick={onStop}>stop</button>
        </div>
      </div>

      <ol className="gt-rungs">
        {run.rungs.map((r) => (
          <li key={r.name} className={rungClass(r.name, r.broken)} title={`${r.technique}, tier ${r.tier}`}>
            <span className="gt-rung-name">{r.name}</span>
            <span className="gt-rung-sub">{r.technique} {r.tier === 1 ? 'easy' : 'hard'}</span>
          </li>
        ))}
      </ol>

      {run.cycleWon
        ? (
          <output className="gt-won">
            <span>Every rung of cycle {run.cycle} is broken. Go on and he re-arms everything; stop and he remembers {run.cleared}.</span>
            <button type="button" className="gt-btn" disabled={busy} onClick={onContinue}>go on</button>
          </output>
        )
        : (
          <div className="gt-why">
            <span className="gt-why-h">{run.relented ? 'he eased off' : 'his choice'}</span>
            <span className="gt-why-text">{run.reason}{run.final ? ' (the last rung: he is the server)' : ''}</span>
          </div>
        )}

      <div className="gt-mastery" aria-label="what he believes about your skills">
        {run.mastery.map((m) => (
          <div key={m.technique} className="gt-skill">
            <span className="gt-skill-name">{m.technique}</span>
            <span className="gt-bar" aria-label={`${m.technique}: ${Math.round(m.mean * 100)} percent, give or take ${Math.round(m.spread * 100)}`}>
              <i className="gt-bar-fill" style={{ width: `${m.mean * 100}%` }} />
              <i className="gt-bar-band" style={{ left: `${Math.max(0, m.mean - m.spread) * 100}%`, width: `${Math.min(1, 2 * m.spread) * 100}%` }} />
            </span>
            <span className="gt-skill-pct">{Math.round(m.mean * 100)}% &plusmn;{Math.round(m.spread * 100)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
