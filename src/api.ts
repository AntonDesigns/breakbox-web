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

// Builds the download URL for a level. I hand back a URL for a plain link rather than fetching
// the bytes myself: the browser downloads the file directly and the server sets the filename.
export function generateUrl(level: number): string {
  return `${API_BASE}/generate/${level}`;
}

// Downloads the target zip. I fetch the bytes and save them with a blob link so a failed request
// (backend down) surfaces as an error the guide can show, rather than a browser error page.
export async function downloadTarget(level: number, filename?: string): Promise<void> {
  // Credentialed, so the session cookie rides along and the server records the issued target against the
  // signed-in player (anonymous downloads still work, they are just not tracked). A caller can name the
  // file (the Hack tab hands you the dynamic build named for the anti-cheat, e.g. Level1_serverkey.zip).
  const res = await fetch(generateUrl(level), { credentials: 'include' });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `challenge_${level}.zip`;
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
