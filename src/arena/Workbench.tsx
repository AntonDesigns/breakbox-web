// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { AppRun, HackKind, HackResult, PatchRun, WardenView, WorkbenchMethod } from '../api';
import type { EditorJump } from './MonacoEditor';
import type { Target, WorkbenchPort } from './ports';
import { TargetApp } from './TargetApp';

// Monaco is heavy, so it is pulled in lazily: the chunk loads the first time the workbench renders (in the
// arena), never on the launcher. This is the one place that imports it.
const MonacoEditor = lazy(() => import('./MonacoEditor'));

// How long the player must pause typing before the warden is shown their edit, so he judges a thought, not every
// keystroke.
const EDIT_PAUSE_MS = 1200;

// How long the morph between two gauntlet targets shows.
const MORPH_MS = 900;

type Report = (w: WardenView | null | undefined) => void;
type AppState = 'idle' | 'locked' | 'bypass' | 'unlocked' | 'error';
interface AppMeta { name: string; field: string; placeholder: string; }

// Each level's app wears its own field: Level 2 is Ledger with a serial, not NoteBox with a licence key.
const APPS: Record<number, AppMeta> = {
  1: { name: 'NoteBox', field: 'licence key', placeholder: 'BR-XXXX-XXXX' },
  2: { name: 'Ledger', field: 'serial number', placeholder: '000000000' },
};
const metaFor = (level: number): AppMeta => APPS[level] ?? { name: 'Target app', field: 'licence key', placeholder: '' };

// The app's state, by what the server decided.
function appStateOf(app: AppRun | null): AppState {
  if (!app) return 'idle';
  if (!app.compiled) return 'error';
  if (app.genuine) return 'unlocked';
  return app.opened ? 'bypass' : 'locked';
}

function statusOf(state: AppState, field: string): string {
  switch (state) {
    case 'locked': return `Invalid ${field}. The app stayed shut.`;
    case 'bypass': return `Opened by a patch: any ${field} works now. A patch earns no flag, though; only the real ${field} does.`;
    case 'unlocked': return `Unlocked with the real ${field}. Step 2 is yours.`;
    case 'error': return 'Your build would not compile, so the app never ran.';
    default: return `The app is locked. Enter a ${field} to activate it.`;
  }
}

// The target in the workbench: the gauntlet hands one in (and swaps it to morph), the ladder fetches its own. Owns
// the source being edited, the served baseline, the app's key field (cleared on a new target) and the morph flag.
function useTarget(port: WorkbenchPort, target: Target | null | undefined, report: Report) {
  const [shown, setShown] = useState<Target | null>(target ?? null);
  const [source, setSource] = useState(target?.source ?? '');
  const [baseline, setBaseline] = useState(target?.source ?? '');
  const [appKey, setAppKey] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [morphing, setMorphing] = useState(false);

  // A new target from the gauntlet: swap it in while rendering (React's "adjust state when a prop changes"), so the
  // editor keeps its model and only its content, map and check change. The first target is not a morph.
  if (target && target.key !== shown?.key) {
    setShown(target);
    setSource(target.source);
    setBaseline(target.source);
    setAppKey('');
    setMorphing(shown !== null);
  }

  // The ladder fetches its own target on mount; opening it begins the fight, so his greeting comes with it.
  useEffect(() => {
    if (!port.open) return undefined;
    let cancelled = false;
    port.open()
      .then(({ target: t, warden }) => {
        if (cancelled) return;
        setShown(t);
        setSource(t.source);
        setBaseline(t.source);
        report(warden);
      })
      .catch((e: unknown) => { if (!cancelled) setLoadError(String(e)); });
    return () => { cancelled = true; };
  }, [port, report]);

  useEffect(() => {
    if (!morphing) return undefined;
    const timer = setTimeout(() => setMorphing(false), MORPH_MS);
    return () => clearTimeout(timer);
  }, [morphing]);

  return { shown, source, setSource, baseline, appKey, setAppKey, loadError, morphing };
}

// Show the warden the player's edit once they pause, and only if it changed since he last saw it: his forensics on
// the server decide what the edit actually did. A freshly swapped-in target is not an edit. Returns how to tell it
// that a source was just shown to him another way (a run, the app).
function useWardenEdits(shown: Target | null, source: string, port: WorkbenchPort, report: Report) {
  const lastShown = useRef(source);       // the last source the warden was shown
  const seenKey = useRef(shown?.key ?? '');   // the target that last source belongs to

  useEffect(() => {
    if (!shown) return undefined;
    if (seenKey.current !== shown.key) {
      seenKey.current = shown.key;
      lastShown.current = source;
      return undefined;
    }
    if (source === lastShown.current) return undefined;
    const timer = setTimeout(() => {
      lastShown.current = source;
      port.observe('edit', undefined, source).then(report).catch(() => { /* he can miss a beat */ });
    }, EDIT_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [source, shown, port, report]);

  return useCallback((seen: string) => { lastShown.current = seen; }, []);
}

// "Run my patch": the server compiles and exercises the check. A run belongs to the target it ran on, so after a
// morph the terminal is empty again without anything having to clear it.
function useRunPatch(port: WorkbenchPort, shown: Target | null, source: string, report: Report, markShown: (s: string) => void) {
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<{ key: string; result: PatchRun } | null>(null);

  const runPatch = async () => {
    if (!shown) return;
    const key = shown.key;
    setRunning(true);
    try {
      const r = await port.run(source);
      markShown(source);
      setRun({ key, result: r });
      report(r.warden);
    } catch (e: unknown) {
      setRun({ key, result: { compiled: false, cracked: false, output: [`run failed: ${String(e)}`], diagnostics: [] } });
    } finally {
      setRunning(false);
    }
  };

  return { run, running, runPatch, clearRun: () => setRun(null) };
}

// The in-arena dnSpy-lite plus the level's REAL app. You read and patch the code on the left, then run the app
// with a key: patch IsValid and any key opens it (the showcase), or recover the real key and the app hands you
// the BR{...} flag to submit. The crack, the unlock and the flag are all decided on the server, and since Phase
// 4 so is the warden: every answer from the server carries his reaction, and the browser only reports what it
// alone sees (a method opened, an edit) for HIM to judge. Since Phase 6 it talks through a port, so the same
// workbench serves the ladder (it fetches its own level) and the gauntlet (the warden hands it each new target,
// and it morphs in place: same editor, new source, new method map, new check, no reload). The app panel and the
// honest hacks are keyed by the target, so a new target gives them a fresh start while the editor stays put.
export function Workbench({ port, target, onWarden }: Readonly<{
  port: WorkbenchPort;
  target?: Target | null;
  onWarden: (w: WardenView) => void;
}>) {
  // A reaction from the server, if it carried one, goes to the warden's rail.
  const report = useCallback<Report>((w) => { if (w) onWarden(w); }, [onWarden]);
  const { shown, source, setSource, baseline, appKey, setAppKey, loadError, morphing } = useTarget(port, target, report);
  const markShown = useWardenEdits(shown, source, port, report);
  const { run, running, runPatch, clearRun } = useRunPatch(port, shown, source, report, markShown);
  const jumpRef = useRef<EditorJump | null>(null);        // reveal a line in the editor (set on editor mount)

  const openMethod = (m: WorkbenchMethod) => {
    jumpRef.current?.(m.line);
    port.observe('read', m.name).then(report).catch(() => { /* he can miss a beat */ });
  };

  const reset = () => { setSource(baseline); clearRun(); };

  if (loadError) {
    return (
      <div className="wb">
        <div className="wb-h"><span className="wb-file">in-arena workbench</span></div>
        <div className="banner banner-error">could not open the target source ({loadError})</div>
      </div>
    );
  }

  const targetKey = shown?.key ?? 'none';
  const edited = shown !== null && source !== baseline;

  return (
    <div className="wb-split">
      <div className={morphing ? 'wb wb-morph' : 'wb'}>
        <WbHeader fileName={shown?.fileName} edited={edited} running={running} disabled={!shown || running} onReset={reset} onRun={() => void runPatch()} />

        <div className="wb-body">
          <MethodTree target={shown} onOpen={openMethod} />
          <div className="wb-editor">
            {shown
              ? (
                <Suspense fallback={<div className="wb-editor-loading">loading the editor...</div>}>
                  <MonacoEditor value={source} onChange={setSource} onReady={(j) => { jumpRef.current = j; }} />
                </Suspense>
              )
              : <div className="wb-editor-loading">fetching the target source...</div>}
          </div>
        </div>

        <RunTerminal run={run} targetKey={targetKey} />

        {/* Phase 4b: the honest hacks, tested on the server against the live defence (the ladder only). */}
        {port.hack && <HonestHacks key={targetKey} hack={port.hack} source={source} appKey={appKey} disabled={!shown} report={report} />}
      </div>

      {/* The level's real app, run server-side against whatever key you type, on your current build. */}
      <AppPanel
        key={targetKey}
        level={shown?.level ?? 1}
        port={port}
        source={source}
        appKey={appKey}
        onKey={setAppKey}
        disabled={!shown}
        report={report}
        onShown={markShown}
      />
    </div>
  );
}

function WbHeader({ fileName, edited, running, disabled, onReset, onRun }: Readonly<{
  fileName?: string;
  edited: boolean;
  running: boolean;
  disabled: boolean;
  onReset: () => void;
  onRun: () => void;
}>) {
  return (
    <div className="wb-h">
      <span className="wb-title">
        <span className="wb-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="wb-file">{fileName ?? 'opening target...'}</span>
        <span className="wb-tag">dnSpy-lite</span>
      </span>
      <span className="wb-h-tools">
        {edited && <button type="button" className="wb-reset" onClick={onReset}>reset</button>}
        <button type="button" className="wb-run" onClick={onRun} disabled={disabled}>
          {running ? 'running...' : 'run my patch'}
        </button>
      </span>
    </div>
  );
}

function MethodTree({ target, onOpen }: Readonly<{ target: Target | null; onOpen: (m: WorkbenchMethod) => void }>) {
  return (
    <aside className="wb-tree" aria-label="methods">
      <div className="wb-tree-h">methods</div>
      {!target || target.methods.length === 0
        ? <div className="wb-tree-empty">{target ? 'no methods' : 'reading...'}</div>
        : (
          <ul className="wb-tree-list">
            {target.methods.map((m) => (
              <li key={`${m.name}:${m.line}`}>
                <button type="button" className="wb-method" onClick={() => onOpen(m)} title={m.signature}>
                  <span className="wb-method-name">{m.name}</span>
                  <span className="wb-method-line">L{m.line}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
    </aside>
  );
}

// The run's output for THIS target (a run on an earlier target is not shown after a morph).
function RunTerminal({ run, targetKey }: Readonly<{ run: { key: string; result: PatchRun } | null; targetKey: string }>) {
  const result = run?.key === targetKey ? run.result : null;
  const errors = result ? result.diagnostics.filter((d) => d.isError) : [];
  return (
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
      {result && <Verdict cracked={result.cracked} />}
    </div>
  );
}

const Verdict = ({ cracked }: Readonly<{ cracked: boolean }>) =>
  cracked ? <div className="wb-verdict cracked">CRACKED</div> : <div className="wb-verdict held">NOT CRACKED YET</div>;

const HACKS: { kind: HackKind; idle: string; busy: string }[] = [
  { kind: 'patch', idle: 'patch the check', busy: 'patching...' },
  { kind: 'forge', idle: "forge the server's answer", busy: 'forging...' },
  { kind: 'outage', idle: 'cut the database line', busy: 'cutting...' },
];

// Phase 4b: try a hack against the live defence. The server decides whether it was strong enough.
function HonestHacks({ hack, source, appKey, disabled, report }: Readonly<{
  hack: NonNullable<WorkbenchPort['hack']>;
  source: string;
  appKey: string;
  disabled: boolean;
  report: Report;
}>) {
  const [result, setResult] = useState<HackResult | null>(null);
  const [busy, setBusy] = useState<HackKind | null>(null);

  const tryHack = async (kind: HackKind) => {
    setBusy(kind);
    try {
      const r = await hack(kind, source, appKey);
      setResult(r);
      report(r.warden);
    } catch (e: unknown) {
      setResult({ hack: kind, worked: false, lockOpened: null, defence: '', verdict: `hack failed: ${String(e)}`, lesson: '', warden: null });
    } finally {
      setBusy(null);
    }
  };

  const off = disabled || busy !== null;
  return (
    <div className="hk" aria-label="honest hacks">
      <div className="hk-h">
        <span className="hk-title">honest hacks</span>
        <span className="hk-sub">each one is tested on the server; it only wins if it is genuinely strong enough</span>
      </div>
      <div className="hk-row">
        {HACKS.map((h) => (
          <button key={h.kind} type="button" className="hk-btn" disabled={off} onClick={() => void tryHack(h.kind)}>
            {busy === h.kind ? h.busy : h.idle}
          </button>
        ))}
      </div>
      {result && <HackVerdict result={result} />}
    </div>
  );
}

function HackVerdict({ result }: Readonly<{ result: HackResult }>) {
  return (
    <output className={result.worked ? 'hk-res won' : 'hk-res held'}>
      <span className="hk-res-h">
        <b>{result.worked ? 'IT WORKED' : 'THE DEFENCE HELD'}</b>
        {result.defence && <span className="hk-def">verifier {result.defence}</span>}
      </span>
      <span className="hk-verdict">{result.verdict}</span>
      {result.lesson && <span className="hk-lesson">{result.lesson}</span>}
    </output>
  );
}

// The level's real app: step 1 runs it against the typed key on the CURRENT build (the server decides opened /
// genuine and only hands back a flag on a genuine unlock); step 2 submits that flag.
function AppPanel({ level, port, source, appKey, onKey, disabled, report, onShown }: Readonly<{
  level: number;
  port: WorkbenchPort;
  source: string;
  appKey: string;
  onKey: (k: string) => void;
  disabled: boolean;
  report: Report;
  onShown: (source: string) => void;
}>) {
  const [app, setApp] = useState<AppRun | null>(null);
  const [busy, setBusy] = useState(false);
  const meta = metaFor(level);
  const state = appStateOf(app);

  const launch = async () => {
    setBusy(true);
    try {
      const r = await port.app(source, appKey);
      onShown(source);
      setApp(r);
      report(r.warden);
    } catch (e: unknown) {
      setApp({ compiled: false, opened: false, genuine: false, flag: null, output: [`app run failed: ${String(e)}`], diagnostics: [] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`nb nb-${state}`}>
      <div className="nb-h">
        <span className="nb-title">
          <span className="wb-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="wb-file">{meta.name}</span>
        </span>
        <span className="nb-sub">runs your current build</span>
      </div>

      <div className="nb-body">
        <TargetApp level={level} open={state === 'unlocked' || state === 'bypass'} />

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
              onChange={(e) => onKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !busy && !disabled) void launch(); }}
            />
            <button type="button" className="nb-go" onClick={() => void launch()} disabled={busy || disabled}>
              {busy ? 'checking...' : 'Activate'}
            </button>
          </div>
          <div className="nb-hint">The real {meta.field} is hidden in the code. The grey text only shows its format, not the key.</div>
          <div className={`nb-status nb-status-${state}`}>{statusOf(state, meta.field)}</div>
        </div>

        {state === 'unlocked' && <FlagStep earned={app?.flag ?? ''} port={port} report={report} />}
      </div>
    </div>
  );
}

// Step 2: submit the earned flag; the server verifies it (and, in the gauntlet, the fight may morph onward).
function FlagStep({ earned, port, report }: Readonly<{ earned: string; port: WorkbenchPort; report: Report }>) {
  const [flag, setFlag] = useState(earned);
  const [solved, setSolved] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await port.submit(flag.trim());
      report(res.warden);
      if (res.correct) setSolved(res.solved ?? 'Cleared.');
      setMessage(res.message);
    } catch (e: unknown) {
      setMessage(`submit failed: ${String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="nb-step br">
      <div className="nb-step-h"><span className="nb-num">2</span> flag BR&#123;...&#125; <span className="nb-step-sub">submit it to clear the level</span></div>
      <code className="br-flag">{earned}</code>
      {solved
        ? <div className="br-solved">{solved}</div>
        : (
          <div className="nb-row">
            <input
              className="nb-key"
              aria-label="flag to submit"
              value={flag}
              spellCheck={false}
              onChange={(e) => setFlag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !submitting) void submit(); }}
            />
            <button type="button" className="nb-go br-submit" onClick={() => void submit()} disabled={submitting || !flag.trim()}>
              {submitting ? 'submitting...' : 'Submit flag'}
            </button>
          </div>
        )}
      {message && <div className="br-msg">{message}</div>}
    </div>
  );
}
