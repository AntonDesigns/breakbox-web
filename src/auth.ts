// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { API } from './config';

// Auth + monitoring talk to the same API as the launcher, whose origin lives in config.ts. Every call
// sends credentials: "include" so the HttpOnly session cookie rides along; the frontend never sees or
// stores the token itself.

export interface Me { id: number; username: string; email: string; role: string; }
export interface AuditEvent { id: number; action: string; detail: string | null; ip: string | null; at: string; username: string | null; }
export interface MonitorFeed { scope: string; events: AuditEvent[]; }
// The shape the Console header reads: which database is live, and how much is in it.
export interface ConsoleStatus { provider: string; users: number; levels: number; events: number; generatedAt: string; }
// The schema tree the Data tab reads: tables, each with its columns (read from the EF Core model).
export interface SchemaColumn { name: string; type: string; }
export interface SchemaTable { name: string; columns: SchemaColumn[]; }
export interface ConsoleSchema { tables: SchemaTable[]; }

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

// The Console status line. Admin only on the server (401 signed-out, 403 non-admin); the caller shows
// the error rather than pretending the page works, so the admin boundary is never hidden.
export const fetchConsoleStatus = (): Promise<ConsoleStatus> =>
  fetch(`${API}/console/status`, { credentials: 'include' }).then(body<ConsoleStatus>);

// The Data tab's schema tree. Admin only on the server; read only (it reads the EF model, not data).
export const fetchConsoleSchema = (): Promise<ConsoleSchema> =>
  fetch(`${API}/console/schema`, { credentials: 'include' }).then(body<ConsoleSchema>);

// What the read-only query editor reads back: the columns, the rows (stringified cells, null for a null
// cell), the row count, and whether the result hit the server's row cap.
export interface QueryResult { columns: string[]; rows: (string | null)[][]; rowCount: number; truncated: boolean; }

// Run a read-only query. Admin only on the server, which refuses anything that is not a single SELECT/WITH
// and rolls back regardless, so this can read the database but never change it.
export const runConsoleQuery = (sql: string): Promise<QueryResult> =>
  post('/console/query', { sql }).then(body<QueryResult>);

// One table's DDL for the "how each table was made" view: the CREATE statement(s) that build it.
export interface TableDdl { name: string; sql: string; }

// The Data tab's "how each table was made". Admin only on the server; read only (generated from the EF
// Core model, in the live provider's dialect).
export const fetchConsoleDdl = (): Promise<TableDdl[]> =>
  fetch(`${API}/console/ddl`, { credentials: 'include' }).then(body<TableDdl[]>);

// A page of one table's rows for the table browser.
export interface TablePage { name: string; columns: string[]; rows: (string | null)[][]; page: number; size: number; total: number; }

// A level row in the levels manager (the one editable content table), and the body sent to add/edit one.
// Named LevelRow, not Level, so it is clearly distinct from the launcher's Level type in api.ts (which
// has the download tools, not the id) rather than two interfaces sharing one name.
export interface LevelRow { id: number; number: number; name: string; difficulty: string; tier: string; available: boolean; summary: string; learn: string; }
export type LevelInput = Omit<LevelRow, 'id'>;

// The levels manager. All admin-only on the server; every write is audited and shows in the Threats feed.
export const fetchConsoleLevels = (): Promise<LevelRow[]> =>
  fetch(`${API}/console/levels`, { credentials: 'include' }).then(body<LevelRow[]>);

export const addConsoleLevel = (lvl: LevelInput): Promise<{ id: number }> =>
  post('/console/levels', lvl).then(body<{ id: number }>);

export const updateConsoleLevel = (id: number, lvl: LevelInput): Promise<{ id: number }> =>
  fetch(`${API}/console/levels/${id}`, {
    method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lvl),
  }).then(body<{ id: number }>);

export const deleteConsoleLevel = (id: number): Promise<{ deleted: number }> =>
  fetch(`${API}/console/levels/${id}`, { method: 'DELETE', credentials: 'include' }).then(body<{ deleted: number }>);

// Browse a table's rows, paged. Admin only on the server; read only (only a real table name is accepted).
export const fetchConsoleTable = (name: string, page = 1, size = 25): Promise<TablePage> =>
  fetch(`${API}/console/tables/${encodeURIComponent(name)}?page=${page}&size=${size}`, { credentials: 'include' }).then(body<TablePage>);

// One row in the user manager: who they are and what role they hold (never the password hash).
export interface UserRow { id: number; username: string; email: string; role: string; createdAt: string; lastLoginAt: string | null; }

// The user manager's read side. Admin only on the server; read only.
export const fetchConsoleUsers = (): Promise<UserRow[]> =>
  fetch(`${API}/console/users`, { credentials: 'include' }).then(body<UserRow[]>);

// Change a user's role. Admin only and audited on the server, which also refuses demoting the last admin.
export const updateUserRole = (id: number, role: string): Promise<{ id: number; username: string; role: string }> =>
  fetch(`${API}/console/users/${id}/role`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  }).then(body<{ id: number; username: string; role: string }>);

// Delete a user. Admin only and audited on the server, which refuses deleting yourself or a user with
// activity history, and preserves the audit trail.
export const deleteUser = (id: number): Promise<{ deleted: number }> =>
  fetch(`${API}/console/users/${id}`, { method: 'DELETE', credentials: 'include' }).then(body<{ deleted: number }>);

// Create a user. Admin only and audited on the server, which validates it like sign-up (and rejects a
// duplicate username/email). The password is hashed server-side and never stored plaintext.
export const addUser = (username: string, email: string, password: string, role: string): Promise<{ id: number; username: string; role: string }> =>
  post('/console/users', { username, email, password, role }).then(body<{ id: number; username: string; role: string }>);

// Fire the dev-only attack harness (admin only; the server returns 404 outside Development). The
// blocked attempts it records then show up in the monitor on the next refresh.
export const runAttack = (): Promise<Response> => post('/dev/attack');
