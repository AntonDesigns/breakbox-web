// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

// The one place the backend URL lives. Everything talks to the API through here, so if the
// origin changes (or gets locked down later) I change it in a single spot.
const API_BASE = 'http://localhost:5080/api/challenges';

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

// The "look inside" X-ray: what a decompiler sees in a freshly generated target. Read only, no
// executable is sent. A sensitive string is one that gives the answer away, which the UI hides.
export interface XrayMethod { type: string; name: string; likelyCheck: boolean; }
export interface XrayString { value: string; method: string; sensitive: boolean; }
export interface Xray {
  level: number;
  name: string;
  assembly: string;
  methods: XrayMethod[];
  strings: XrayString[];
  likelyChecks: string[];
  note: string;
}

export async function fetchXray(level: number): Promise<Xray> {
  const res = await fetch(`${API_BASE}/inspect/${level}`);
  if (!res.ok) throw new Error(`inspect request failed: ${res.status}`);
  return res.json() as Promise<Xray>;
}

// SHA-256 of a string as hex, via the browser's Web Crypto. I compare the hash of a submitted flag
// against the hash the server sent with the download, so the flag is never checked in the clear.
export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Downloads the target and returns the flag hash the server sent for THIS exact download, so the
// arcade can later confirm a submitted flag against the target you actually took apart.
export async function downloadTarget(level: number): Promise<string | null> {
  const res = await fetch(generateUrl(level));
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const hash = res.headers.get('X-Flag-Hash');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `challenge_${level}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return hash;
}
