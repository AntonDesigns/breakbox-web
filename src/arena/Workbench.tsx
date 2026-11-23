// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchWorkbenchSource, observeWarden, runWorkbenchApp, runWorkbenchHack, runWorkbenchPatch, submitFlag,
  type AppRun, type HackKind, type HackResult, type PatchRun, type WardenView, type WorkbenchMethod,
} from '../api';
import type { EditorJump } from './MonacoEditor';
import { TargetApp } from './TargetApp';

// Monaco is heavy, so it is pulled in lazily: the chunk loads the first time the workbench renders (in the
// arena), never on the launcher. This is the one place that imports it.
const MonacoEditor = lazy(() => import('./MonacoEditor'));

// How long the player must pause typing before the warden is shown their edit, so he judges a thought, not every
// keystroke.
const EDIT_PAUSE_MS = 1200;

// The in-arena dnSpy-lite plus the level's REAL app. You read and patch the code on the left, then run the app
// with a key: patch IsValid and any key opens it (the showcase), or recover the real key and the app hands you
// the BR{...} flag to submit. The crack, the unlock and the flag are all decided on the server, and since Phase
// 4 so is the warden: every answer from the server carries his reaction, and the browser only reports what it
// alone sees (a method opened, an edit) for HIM to judge.
export function Workbench({ level, onWarden, onSolved }: Readonly<{
  level: number;
  onWarden: (w: WardenView) => void;
  onSolved?: (level: number) => void;
}>) {
  const [fileName, setFileName] = useState('');
  const [methods, setMethods] = useState<WorkbenchMethod[]>([]);
  const [source, setSource] = useState('');
  const [baseline, setBaseline] = useState('');          // the served source, to detect edits and offer a reset
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PatchRun | null>(null);

  // The in-arena app (step 1: the licence key) and the flag it earns (step 2).
  const [appKey, setAppKey] = useState('');
  const [app, setApp] = useState<AppRun | null>(null);
  const [appBusy, setAppBusy] = useState(false);
  const [flag, setFlag] = useState('');
  const [solved, setSolved] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Phase 4b, the honest hacks.
  const [hack, setHack] = useState<HackResult | null>(null);
  const [hacking, setHacking] = useState<HackKind | null>(null);

  const jumpRef = useRef<EditorJump | null>(null);        // reveal a line in the editor (set on editor mount)
  const lastShown = useRef('');                            // the last source the warden was shown

  // A reaction from the server, if it carried one, goes to the warden's rail.
  const report = useCallback((w: WardenView | null | undefined) => { if (w) onWarden(w); }, [onWarden]);

  // Fetch the level's real source on mount; opening it begins the fight, so his greeting comes with it. The
  // parent keys this component by level, so a new target remounts it fresh.
  useEffect(() => {
    let cancelled = false;
    fetchWorkbenchSource(level)
      .then((ws) => {
        if (cancelled) return;
        setFileName(ws.fileName);
        setMethods(ws.methods);
        setSource(ws.source);
        setBaseline(ws.source);
        lastShown.current = ws.source;
        setLoading(false);
        report(ws.warden);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(String(e));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [level, report]);

  // Show the warden the player's edit once they pause, and only if it changed since he last saw it: his
  // forensics on the server decide what the edit actually did.
  useEffect(() => {
    if (loading || source === lastShown.current) return;
    const timer = setTimeout(() => {
      lastShown.current = source;
      observeWarden(level, 'edit', undefined, source).then(report).catch(() => { /* he can miss a beat */ });
    }, EDIT_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [source, level, loading, report]);

  const openMethod = (m: WorkbenchMethod) => {
    jumpRef.current?.(m.line);
    observeWarden(level, 'read', m.name).then(report).catch(() => { /* he can miss a beat */ });
  };

  const run = async () => {
    setRunning(true);
    try {
      const r = await runWorkbenchPatch(level, source);
      lastShown.current = source;
      setResult(r);
      report(r.warden);
    } catch (e: unknown) {
      setResult({ compiled: false, cracked: false, output: [`run failed: ${String(e)}`], diagnostics: [] });
    } finally {
      setRunning(false);
    }
  };

  // Step 1: run the app against the typed key, on the CURRENT build. The server decides opened / genuine and only
  // hands back a flag on a genuine unlock.
  const launch = async () => {
    setAppBusy(true);
    setSubmitMsg(null);
    try {
      const r = await runWorkbenchApp(level, source, appKey);
      lastShown.current = source;
      setApp(r);
      if (r.genuine && r.flag) setFlag(r.flag);
      report(r.warden);
    } catch (e: unknown) {
      setApp({ compiled: false, opened: false, genuine: false, flag: null, output: [`app run failed: ${String(e)}`], diagnostics: [] });
    } finally {
      setAppBusy(false);
    }
  };

  // Step 2: submit the earned flag; the server verifies it and clears the level.
  const submit = async () => {
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await submitFlag(level, flag.trim());
      report(res.warden);
      if (res.correct) {
        setSolved(true);
        setSubmitMsg('Flag accepted. This level is cleared, the next rung is open.');
        onSolved?.(level);
      } else {
        setSubmitMsg('That flag is not right for this target.');
      }
    } catch (e: unknown) {
      setSubmitMsg(`submit failed: ${String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Phase 4b: try a hack against the live defence. The server decides whether it was strong enough.
  const tryHack = async (kind: HackKind) => {
    setHacking(kind);
    try {
      const r = await runWorkbenchHack(level, kind, source, appKey);
      setHack(r);
      report(r.warden);
      if (r.worked) onSolved?.(level);
    } catch (e: unknown) {
      setHack({ hack: kind, worked: false, lockOpened: null, defence: '', verdict: `hack failed: ${String(e)}`, lesson: '', warden: null });
    } finally {
      setHacking(null);
    }
  };

  const reset = () => { setSource(baseline); setResult(null); };

  if (loadError) {
    return (
      <div className="wb">
        <div className="wb-h"><span className="wb-file">in-arena workbench</span></div>
        <div className="banner banner-error">could not open the target source ({loadError})</div>
      </div>
    );
  }

  const edited = source !== baseline && !loading;
  const errors = result?.diagnostics.filter((d) => d.isError) ?? [];

  // The app's state, by what the server decided.
  let appState: 'idle' | 'locked' | 'bypass' | 'unlocked' | 'error' = 'idle';
  if (app) {
    if (!app.compiled) appState = 'error';
    else if (app.genuine) appState = 'unlocked';
    else if (app.opened) appState = 'bypass';
    else appState = 'locked';
  }
  const appOpen = appState === 'unlocked' || appState === 'bypass';

  // Each level's app wears its own field: Level 2 is Ledger with a serial, not NoteBox with a licence key.
  const meta = ({
    1: { name: 'NoteBox', field: 'licence key', placeholder: 'BR-XXXX-XXXX' },
    2: { name: 'Ledger', field: 'serial number', placeholder: '000000000' },
  } as Record<number, { name: string; field: string; placeholder: string }>)[level]
    ?? { name: 'Target app', field: 'licence key', placeholder: '' };

  return (
    <div className="wb-split">
      <div className="wb">
        <div className="wb-h">
          <span className="wb-title">
            <span className="wb-dots" aria-hidden="true"><i /><i /><i /></span>
            <span className="wb-file">{loading ? 'opening target...' : fileName}</span>
            <span className="wb-tag">dnSpy-lite</span>
          </span>
          <span className="wb-h-tools">
            {edited && <button type="button" className="wb-reset" onClick={reset}>reset</button>}
            <button type="button" className="wb-run" onClick={run} disabled={loading || running}>
              {running ? 'running...' : 'run my patch'}
            </button>
          </span>
        </div>

        <div className="wb-body">
          <aside className="wb-tree" aria-label="methods">
            <div className="wb-tree-h">methods</div>
            {methods.length === 0
              ? <div className="wb-tree-empty">{loading ? 'reading...' : 'no methods'}</div>
              : (
                <ul className="wb-tree-list">
                  {methods.map((m) => (
                    <li key={`${m.name}:${m.line}`}>
                      <button type="button" className="wb-method" onClick={() => openMethod(m)} title={m.signature}>
                        <span className="wb-method-name">{m.name}</span>
                        <span className="wb-method-line">L{m.line}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </aside>

          <div className="wb-editor">
            {loading
              ? <div className="wb-editor-loading">fetching the target source...</div>
              : (
                <Suspense fallback={<div className="wb-editor-loading">loading the editor...</div>}>
                  <MonacoEditor value={source} onChange={setSource} onReady={(j) => { jumpRef.current = j; }} />
                </Suspense>
              )}
          </div>
        </div>

        <div className="wb-term" aria-label="run output">
          {!result && (
            <div className="wb-term-idle">
              Find the key in IsValid, or patch the check to always pass, then run. The server compiles your edit and
              decides if the gate fell. The warden reads every edit you make.
            </div>
          )}
          {result?.output.map((line) => <div key={line} className="wb-term-line">{line}</div>)}
          {errors.length > 0 && (
            <div className="wb-diags">
              {errors.map((d) => (
                <div key={`${d.line}:${d.message}`} className="wb-diag">
                  <span className="wb-diag-line">line {d.line}</span> {d.message}
                </div>
              ))}
            </div>
          )}
          {result && (
            <div className={`wb-verdict ${result.cracked ? 'cracked' : 'held'}`}>
              {result.cracked ? 'CRACKED' : 'NOT CRACKED YET'}
            </div>
          )}
        </div>

        {/* Phase 4b: the honest hacks, tested on the server against the live defence. */}
        <div className="hk" aria-label="honest hacks">
          <div className="hk-h">
            <span className="hk-title">honest hacks</span>
            <span className="hk-sub">each one is tested on the server; it only wins if it is genuinely strong enough</span>
          </div>
          <div className="hk-row">
            <button type="button" className="hk-btn" disabled={loading || hacking !== null} onClick={() => tryHack('patch')}>
              {hacking === 'patch' ? 'patching...' : 'patch the check'}
            </button>
            <button type="button" className="hk-btn" disabled={loading || hacking !== null} onClick={() => tryHack('forge')}>
              {hacking === 'forge' ? 'forging...' : "forge the server's answer"}
            </button>
            <button type="button" className="hk-btn" disabled={loading || hacking !== null} onClick={() => tryHack('outage')}>
              {hacking === 'outage' ? 'cutting...' : 'cut the database line'}
            </button>
          </div>
          {hack && (
            <div className={`hk-res ${hack.worked ? 'won' : 'held'}`} role="status">
              <div className="hk-res-h">
                <b>{hack.worked ? 'IT WORKED' : 'THE DEFENCE HELD'}</b>
                {hack.defence && <span className="hk-def">verifier {hack.defence}</span>}
              </div>
              <div className="hk-verdict">{hack.verdict}</div>
              {hack.lesson && <div className="hk-lesson">{hack.lesson}</div>}
            </div>
          )}
        </div>
      </div>

      {/* The level's real app, run server-side against whatever key you type, on your current build. */}
      <div className={`nb nb-${appState}`}>
        <div className="nb-h">
          <span className="nb-title">
            <span className="wb-dots" aria-hidden="true"><i /><i /><i /></span>
            <span className="wb-file">{meta.name}</span>
          </span>
          <span className="nb-sub">runs your current build</span>
        </div>

        <div className="nb-body">
          <TargetApp level={level} open={appOpen} />

          <div className="nb-step">
            <div className="nb-step-h"><span className="nb-num">1</span> {meta.field} <span className="nb-step-sub">unlocks the app</span></div>
            <div className="nb-row">
              <input
                id="nb-key"
                className="nb-key"
                aria-label={`${meta.field}, unlocks the app`}
                placeholder={meta.placeholder}
                value={appKey}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => setAppKey(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !appBusy && !loading) void launch(); }}
              />
              <button type="button" className="nb-go" onClick={launch} disabled={appBusy || loading}>
                {appBusy ? 'checking...' : 'Activate'}
              </button>
            </div>
            <div className="nb-hint">The real {meta.field} is hidden in the code. The grey text only shows its format, not the key.</div>
            <div className={`nb-status nb-status-${appState}`}>
              {appState === 'idle' && `The app is locked. Enter a ${meta.field} to activate it.`}
              {appState === 'locked' && `Invalid ${meta.field}. The app stayed shut.`}
              {appState === 'bypass' && `Opened by a patch: any ${meta.field} works now. A patch earns no flag, though; only the real ${meta.field} does.`}
              {appState === 'unlocked' && `Unlocked with the real ${meta.field}. Step 2 is yours.`}
              {appState === 'error' && 'Your build would not compile, so the app never ran.'}
            </div>
          </div>

          {appState === 'unlocked' && (
            <div className="nb-step br">
              <div className="nb-step-h"><span className="nb-num">2</span> flag BR&#123;...&#125; <span className="nb-step-sub">submit it to clear the level</span></div>
              <code className="br-flag">{app?.flag}</code>
              {!solved && (
                <div className="nb-row">
                  <input
                    className="nb-key"
                    aria-label="flag to submit"
                    value={flag}
                    spellCheck={false}
                    onChange={(e) => setFlag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !submitting) void submit(); }}
                  />
                  <button type="button" className="nb-go br-submit" onClick={submit} disabled={submitting || !flag.trim()}>
                    {submitting ? 'submitting...' : 'Submit flag'}
                  </button>
                </div>
              )}
              {solved && <div className="br-solved">Level {level} cleared.</div>}
              {submitMsg && <div className="br-msg">{submitMsg}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
