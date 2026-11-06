// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { API } from './config';

// The launcher talks to the challenges endpoints. The origin itself lives in config.ts, shared with the
// auth/console layer, so there is a single place to change it.
const API_BASE = `${API}/challenges`;

export interface Level {
  number: number;
  name: string;
  difficulty: string;
  summary: string;
  tools: string[];
  learn: string;
  tier: string;
  available: boolean;
}

// Loads the level list. This is a cross-origin fetch, so it only works because the API allows
// this origin in its CORS policy. I throw on a bad status instead of returning junk, so the UI
// can show a clear error rather than a blank page.
export async function fetchLevels(): Promise<Level[]> {
  const res = await fetch(`${API_BASE}/levels`);
  if (!res.ok) throw new Error(`levels request failed: ${res.status}`);
  return res.json() as Promise<Level[]>;
}

// The levels the catalogue can actually generate. Resolving the target through this fixed set (instead of
// using the caller's number directly) keeps the request URL built from a known constant, never from the
// persisted, and therefore untrusted, level value: the client-side request-forgery defence.
const GENERATABLE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

// Downloads the target zip. I fetch the bytes and save them with a blob link so a failed request
// (backend down) surfaces as an error the guide can show, rather than a browser error page.
export async function downloadTarget(level: number, filename?: string, features?: string[]): Promise<void> {
  // Credentialed, so the session cookie rides along and the server records the issued target against the
  // signed-in player (anonymous downloads still work, they are just not tracked). A caller can name the
  // file and pass the armed anti-cheats to bake into the dynamic build (the Hack tab hands you e.g.
  // Level2_computedkey.zip, with its features baked into the generated target).
  // Validate the level to a plain integer before it reaches the request URL, so a caller can never steer the
  // fetch at a crafted path: the generate endpoint only ever takes a level number.
  // Resolve the requested level to one of the fixed generatable levels, so the value that reaches the URL is a
  // constant from the set above, never the (untrusted) persisted number itself.
  const n = GENERATABLE_LEVELS.find((lvl) => lvl === Math.trunc(level));
  if (n === undefined) throw new Error(`invalid level: ${level}`);
  const query = features?.length ? `?features=${encodeURIComponent(features.join(','))}` : '';
  const res = await fetch(`${API_BASE}/generate/${n}${query}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `challenge_${n}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// What the server returns for a flag submission: whether it was right, the level's new status, and how
// many attempts the player has made. Decided server-side, so the UI cannot fake a solve.
export interface SubmitResult { correct: boolean; status: string; attempts: number; }

// Submit a flag for a level. Credentialed, so the server ties the attempt to the signed-in player; it
// answers 401 when signed out. The server checks the flag against the exact target it issued.
export async function submitFlag(level: number, flag: string): Promise<SubmitResult> {
  const res = await fetch(`${API_BASE}/submit`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, flag }),
  });
  if (!res.ok) throw new Error(`submit failed: ${res.status}`);
  return res.json() as Promise<SubmitResult>;
}

// One row of the signed-in player's progress: a level, its status and when it was solved.
export interface ProgressRow { number: number; name: string; status: string; attempts: number; solvedAt: string | null; }

// The signed-in player's own progress, for the solved badges. Credentialed; 401 when signed out.
export async function fetchProgress(): Promise<ProgressRow[]> {
  const res = await fetch(`${API_BASE}/progress`, { credentials: 'include' });
  if (!res.ok) throw new Error(`progress request failed: ${res.status}`);
  return res.json() as Promise<ProgressRow[]>;
}

// The Level-Experimental Arena: a live, server-decided Moving Target Defence duel against an adaptive
// adversary. The server holds the engine, the player model, and the state; the client picks a technique and
// renders what comes back - including the defence's MAPE-K reasoning and the profile it has built of you.
export interface ArenaReasoning { monitor: string; analyse: string; plan: string; execute: string; }
export interface ArenaProfile { read: number; reverse: number; patch: number; deobfuscate: number; }
export interface ArenaState {
  rung: string;
  ladder: string[];
  beaten: string[];
  profile: ArenaProfile;
  round: number;
  fails: number;
  beat: boolean | null;
  ended: boolean;
  narration: string | null;
  reasoning: ArenaReasoning | null;
  moves: string[];
}

// Start (or restart) a duel. Credentialed: the defence opens past the techniques this account has proven.
export async function arenaStart(): Promise<ArenaState> {
  const res = await fetch(`${API}/arena/start`, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error(`arena start failed: ${res.status}`);
  return res.json() as Promise<ArenaState>;
}

// Play one technique against the current rung. The engine runs server-side; the result is the new state.
export async function arenaMove(move: string): Promise<ArenaState> {
  const res = await fetch(`${API}/arena/move`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ move }),
  });
  if (!res.ok) throw new Error(`arena move failed: ${res.status}`);
  return res.json() as Promise<ArenaState>;
}

// The in-arena workbench (Phase 2), the browser "dnSpy-lite". The server serves the level's REAL source + a
// method map (what the player reads and edits), and runs the player's edited source SERVER-SIDE to decide if
// the crack worked. Credentialed: the arena is signed-in only. The level is resolved through the fixed set
// above, so the value that reaches the request is a known constant, never a steered path.

// One method in the served source, for the method tree: its name, a readable signature, and the 1-based line.
export interface WorkbenchMethod { name: string; signature: string; line: number; }
export interface WorkbenchSource { level: number; fileName: string; source: string; methods: WorkbenchMethod[]; }

export async function fetchWorkbenchSource(level: number): Promise<WorkbenchSource> {
  const n = GENERATABLE_LEVELS.find((lvl) => lvl === Math.trunc(level));
  if (n === undefined) throw new Error(`invalid level: ${level}`);
  const res = await fetch(`${API}/arena/workbench/source/${n}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`workbench source failed: ${res.status}`);
  return res.json() as Promise<WorkbenchSource>;
}

// One compiler message for the build panel. A run result: whether it built, whether the gate fell, the
// narration lines for the terminal, and any build diagnostics (populated only when compiled is false).
export interface PatchDiagnostic { message: string; line: number; isError: boolean; }
export interface PatchRun { compiled: boolean; cracked: boolean; output: string[]; diagnostics: PatchDiagnostic[]; }

export async function runWorkbenchPatch(level: number, source: string): Promise<PatchRun> {
  const n = GENERATABLE_LEVELS.find((lvl) => lvl === Math.trunc(level));
  if (n === undefined) throw new Error(`invalid level: ${level}`);
  const res = await fetch(`${API}/arena/workbench/run`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: n, source }),
  });
  if (!res.ok) throw new Error(`run failed: ${res.status}`);
  return res.json() as Promise<PatchRun>;
}

// The in-arena app run (Phase 3): run the level's REAL app against one typed key, on the player's CURRENT
// build. "opened" is the app's own behaviour (the build's IsValid accepted the key): patch the check and any
// key opens it, which is the showcase. "genuine" is decided server-side (the typed key is the real one), and
// the flag is released ONLY on a genuine unlock, so a patched build proves the lock is dead but earns nothing.
export interface AppRun {
  compiled: boolean;
  opened: boolean;
  genuine: boolean;
  flag: string | null;
  output: string[];
  diagnostics: PatchDiagnostic[];
}

export async function runWorkbenchApp(level: number, source: string, key: string): Promise<AppRun> {
  const n = GENERATABLE_LEVELS.find((lvl) => lvl === Math.trunc(level));
  if (n === undefined) throw new Error(`invalid level: ${level}`);
  const res = await fetch(`${API}/arena/workbench/app`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: n, source, key }),
  });
  if (!res.ok) throw new Error(`app run failed: ${res.status}`);
  return res.json() as Promise<AppRun>;
}
