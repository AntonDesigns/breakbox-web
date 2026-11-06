// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { fetchWorkbenchSource, runWorkbenchPatch, type PatchRun, type WorkbenchMethod } from '../api';
import type { EditorJump } from './MonacoEditor';

// Monaco is heavy, so it is pulled in lazily: the chunk loads the first time the workbench renders (in the
// arena), never on the launcher. This is the one place that imports it.
const MonacoEditor = lazy(() => import('./MonacoEditor'));

// What the player did, for the warden to react to (Phase 2, step 4). The warden state and the activity feed
// live in the parent; the workbench just reports the move.
export type ActivityKind = 'open' | 'read' | 'edit' | 'run' | 'held' | 'cracked' | 'error';
export interface WorkbenchActivity { kind: ActivityKind; text: string; focus?: string; }

// The in-arena dnSpy-lite: the level's REAL source in Monaco, a method tree to navigate it, and a server-side
// "run my patch" that decides on the server whether the gate fell. For Level 1 the crack is reading the key
// out of IsValid, or patching IsValid to always pass; run it and the warden sees what you did.
export function Workbench({ level, onActivity }: Readonly<{
  level: number;
  onActivity: (a: WorkbenchActivity) => void;
}>) {
  const [fileName, setFileName] = useState('');
  const [methods, setMethods] = useState<WorkbenchMethod[]>([]);
  const [source, setSource] = useState('');
  const [baseline, setBaseline] = useState('');          // the served source, to detect edits and offer a reset
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PatchRun | null>(null);
  const jumpRef = useRef<EditorJump | null>(null);        // reveal a line in the editor (set on editor mount)
  const editedOnce = useRef(false);                        // so only the FIRST edit is reported as activity

  // Fetch the level's real source on mount. The parent keys this component by level, so a new target remounts
  // it fresh (initial state already is the "loading, nothing run" state); this effect only reaches out to the
  // server and sets state from the async result, never synchronously. onActivity is stable (useCallback in the
  // parent), so this stays a one-shot fetch, not a render loop.
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

  return (
    <div className="wb">
      <div className="wb-h">
        <span className="wb-file">{loading ? 'opening target...' : fileName}</span>
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
  );
}
