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
