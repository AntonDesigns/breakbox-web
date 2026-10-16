// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

// Auth + monitoring talk to the same API as the launcher. Every call sends credentials: "include"
// so the HttpOnly session cookie rides along; the frontend never sees or stores the token itself.
const API = 'http://localhost:5080/api';

export interface Me { id: number; username: string; email: string; role: string; }
export interface AuditEvent { id: number; action: string; detail: string | null; ip: string | null; at: string; username: string | null; }
export interface MonitorFeed { scope: string; events: AuditEvent[]; }

// Read the JSON body, or throw the server's error message so the UI can show something specific.
async function body<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  let message = `request failed (${res.status})`;
  try { const b = await res.json(); if (b?.error) message = b.error as string; } catch { /* no json body */ }
  throw new Error(message);
}

const post = (path: string, data?: unknown): Promise<Response> =>
  fetch(`${API}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });

// Resolve the current session, or null when not signed in (the server answers 401, not an error).
export async function getMe(): Promise<Me | null> {
  const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
  if (res.status === 401) return null;
  return body<Me>(res);
}

export const login = (username: string, password: string): Promise<Me> =>
  post('/auth/login', { username, password }).then(body<Me>);

export const register = (username: string, email: string, password: string): Promise<Me> =>
  post('/auth/register', { username, email, password }).then(body<Me>);

export const logout = (): Promise<Response> => post('/auth/logout');

export const fetchEvents = (): Promise<MonitorFeed> =>
  fetch(`${API}/monitor/events`, { credentials: 'include' }).then(body<MonitorFeed>);

// Fire the dev-only attack harness (admin only; the server returns 404 outside Development). The
// blocked attempts it records then show up in the monitor on the next refresh.
export const runAttack = (): Promise<Response> => post('/dev/attack');
