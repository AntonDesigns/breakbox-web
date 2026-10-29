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
export async function downloadTarget(level: number): Promise<void> {
  const res = await fetch(generateUrl(level));
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `challenge_${level}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
