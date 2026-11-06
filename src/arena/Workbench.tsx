// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchWorkbenchSource, runWorkbenchApp, runWorkbenchPatch, submitFlag,
  type AppRun, type PatchRun, type WorkbenchMethod,
} from '../api';
import type { EditorJump } from './MonacoEditor';

// Monaco is heavy, so it is pulled in lazily: the chunk loads the first time the workbench renders (in the
// arena), never on the launcher. This is the one place that imports it.
const MonacoEditor = lazy(() => import('./MonacoEditor'));

// What the player did, for the warden to react to. The warden state and the activity feed live in the parent;
// the workbench just reports the move. The Phase 3 app adds launch / bypass / unlocked / solved on top of the
// Phase 2 read / edit / run moves, so the warden can get suspicious about the actual crack, not just typing.
export type ActivityKind =
  'open' | 'read' | 'edit' | 'run' | 'held' | 'cracked' | 'error'
  | 'launch' | 'bypass' | 'unlocked' | 'solved';
export interface WorkbenchActivity { kind: ActivityKind; text: string; focus?: string; }

// The in-arena dnSpy-lite plus the level's REAL app. You read/patch the code on the left, then LAUNCH the app
// and type a key: patch IsValid and any key opens it (the showcase), or recover the real key and the app hands
// you the BR{...} flag to submit. The crack, the unlock and the flag are all decided on the server.
export function Workbench({ level, onActivity, onSolved }: Readonly<{
  level: number;
  onActivity: (a: WorkbenchActivity) => void;
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

  // The in-arena app (the licence dialog) and the flag it earns.
  const [appKey, setAppKey] = useState('');
  const [app, setApp] = useState<AppRun | null>(null);
  const [appBusy, setAppBusy] = useState(false);
  const [flag, setFlag] = useState('');                  // the earned flag, to submit for progression
  const [solved, setSolved] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const jumpRef = useRef<EditorJump | null>(null);        // reveal a line in the editor (set on editor mount)
  const editedOnce = useRef(false);                        // so only the FIRST edit is reported as activity

  // Fetch the level's real source on mount. The parent keys this component by level, so a new target remounts
  // it fresh. onActivity is stable (useCallback in the parent), so this stays a one-shot fetch, not a loop.
  useEffect(() => {
    let cancelled = false;
    fetchWorkbenchSource(level)
      .then((ws) => {
        if (cancelled) return;
        setFileName(ws.fileName);
        setMethods(ws.methods);
        setSource(ws.source);
        setBaseline(ws.source);
        setLoading(false);
        onActivity({ kind: 'open', text: `opened ${ws.fileName}` });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(String(e));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [level, onActivity]);

  const onEditorChange = useCallback((next: string) => {
    setSource(next);
    if (!editedOnce.current && next !== baseline) {
      editedOnce.current = true;
      onActivity({ kind: 'edit', text: 'edited the source' });
    }
  }, [baseline, onActivity]);

  const openMethod = (m: WorkbenchMethod) => {
    jumpRef.current?.(m.line);
    onActivity({ kind: 'read', text: `read ${m.name}`, focus: m.name });
  };

  const run = async () => {
    setRunning(true);
    onActivity({ kind: 'run', text: 'ran a patch' });
    try {
      const r = await runWorkbenchPatch(level, source);
      setResult(r);
      if (!r.compiled) onActivity({ kind: 'error', text: 'build failed' });
      else if (r.cracked) onActivity({ kind: 'cracked', text: 'the gate fell' });
      else onActivity({ kind: 'held', text: 'the check held' });
    } catch (e: unknown) {
      setResult({ compiled: false, cracked: false, output: [`run failed: ${String(e)}`], diagnostics: [] });
    } finally {
      setRunning(false);
    }
  };

  // Launch the app against the typed key, on the CURRENT build. The server decides opened/genuine and only
  // hands back a flag on a genuine unlock. We report the honest move to the warden: a bypass-open is still a
  // win for the lock-is-dead showcase, but the warden knows you never found the key.
  const launch = async () => {
    setAppBusy(true);
    setSubmitMsg(null);
    try {
      const r = await runWorkbenchApp(level, source, appKey);
      setApp(r);
      if (!r.compiled) onActivity({ kind: 'error', text: 'the app would not build' });
      else if (r.genuine && r.flag) { setFlag(r.flag); onActivity({ kind: 'unlocked', text: 'unlocked with the real key' }); }
      else if (r.opened) onActivity({ kind: 'bypass', text: 'forced the app open with a junk key' });
      else onActivity({ kind: 'launch', text: 'the app rejected the key' });
    } catch (e: unknown) {
      setApp({ compiled: false, opened: false, genuine: false, flag: null, output: [`app run failed: ${String(e)}`], diagnostics: [] });
    } finally {
      setAppBusy(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await submitFlag(level, flag.trim());
      if (res.correct) {
        setSolved(true);
        setSubmitMsg('Flag accepted. This level is cleared - the next rung is open.');
        onActivity({ kind: 'solved', text: 'submitted the flag and cleared the level' });
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

  // The app's one-line status, by what the server decided.
  let appState: 'idle' | 'locked' | 'bypass' | 'unlocked' | 'error' = 'idle';
  if (app) {
    if (!app.compiled) appState = 'error';
    else if (app.genuine) appState = 'unlocked';
    else if (app.opened) appState = 'bypass';
    else appState = 'locked';
  }

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
                  <MonacoEditor value={source} onChange={onEditorChange} onReady={(j) => { jumpRef.current = j; }} />
                </Suspense>
              )}
          </div>
        </div>

        <div className="wb-term" aria-label="run output">
          {!result && (
            <div className="wb-term-idle">
              Read the key out of IsValid, or patch the check to always pass, then run. The server compiles your
              edit and decides if the gate fell. The warden is watching.
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
      </div>

      {/* The level's real app, run server-side against whatever key you type on your current build. */}
      <div className={`nb nb-${appState}`}>
        <div className="nb-h">
          <span className="nb-title">
            <span className="wb-dots" aria-hidden="true"><i /><i /><i /></span>
            <span className="wb-file">NoteBox &middot; Activate Premium</span>
          </span>
          <span className="nb-sub">runs your current build</span>
        </div>

        <div className="nb-body">
          <label className="nb-label" htmlFor="nb-key">Licence key</label>
          <div className="nb-row">
            <input
              id="nb-key"
              className="nb-key"
              placeholder="BR-XXXX-XXXX"
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

          <div className={`nb-status nb-status-${appState}`}>
            {appState === 'idle' && 'Premium is locked. Enter a licence key to activate.'}
            {appState === 'locked' && 'Invalid licence key. The app stayed shut.'}
            {appState === 'bypass' && 'Premium unlocked - the lock is bypassed, any key opens it now. But you never recovered the real key, so the warden kept the flag.'}
            {appState === 'unlocked' && 'Premium unlocked with the real licence key. The flag is yours.'}
            {appState === 'error' && 'Your build would not compile, so the app never ran.'}
          </div>

          {appState === 'unlocked' && (
            <div className="br">
              <div className="br-h">Flag earned</div>
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
