// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useEffect, useState } from 'react';
import { addUser, deleteUser, fetchConsoleDdl, fetchConsoleSchema, fetchConsoleStatus, fetchConsoleTable, fetchConsoleUsers, fetchEvents, runConsoleQuery, updateUserRole, type AuditEvent, type ConsoleSchema, type ConsoleStatus, type QueryResult, type TableDdl, type TablePage, type UserRow } from './auth';

// The BreakBox Console: the defensive half of the project made live. It is one admin surface that
// watches the system, operates the database, and ships changes, the blue team against the red team I
// already am on the attack side. This file is the scaffold: the six-tab shell, a real status line
// from the API, and the live Threats feed. The other five tabs are drawn honestly as designed, with
// the sprint they land in, so the shell never pretends to do what it cannot do yet.
//
// Everything here is admin only. The server decides that (401 signed-out, 403 non-admin); the shell
// only renders for the admin and shows the server's refusal otherwise, so opening the page proves
// nothing on its own.

type TabId = 'threats' | 'purple' | 'anticheat' | 'hack' | 'data' | 'ship';
type Stage = 'built' | 'sprint2' | 'sprint3';

interface TabDef { id: TabId; label: string; stage: Stage; blurb: string; }

// The six tabs, in the order of the design sheet. The blurb is the one honest sentence of what each
// tab is for; the full behaviour lives in the architecture and the how-it-works document.
const TABS: TabDef[] = [
  { id: 'threats',   label: 'Threats',     stage: 'built',   blurb: 'The live feed of everything: my own actions, attacks, and the database changes they cause, in one timeline.' },
  { id: 'purple',    label: 'Purple team', stage: 'sprint3', blurb: 'One event understood from both sides, with the exact code path that handled it and the OWASP category it maps to.' },
  { id: 'anticheat', label: 'Anti-cheat',  stage: 'sprint3', blurb: 'Shield a level. The defence is real and lands in the database and the feed, and is baked into the next dynamic build.' },
  { id: 'hack',      label: 'Hack',        stage: 'sprint3', blurb: 'Break one anti-cheat. Run attack opens its own live window; the hack counters exactly the defence it is paired with.' },
  { id: 'data',      label: 'Data',        stage: 'built',   blurb: 'A live database IDE over my own MySQL: the schema as a tree, a read-only query editor, and how each table was made.' },
  { id: 'ship',      label: 'Ship',        stage: 'sprint3', blurb: 'The delivery pipeline shown the way GitHub shows it, gated so a merge to main only runs when every check is green.' },
];

const STAGE_LABEL: Record<Stage, string> = { built: 'built', sprint2: 'Sprint 2', sprint3: 'Sprint 3' };

// Colour an action by what it means, the same rule the monitor uses: a block or failure reads as a
// warning, a sign-in or register as ok. Kept local so the Console shell stays self-contained.
function severity(action: string): string {
  if (action.includes('fail') || action.includes('blocked') || action.includes('denied')) return 'bad';
  if (action === 'login' || action === 'register') return 'good';
  return 'neutral';
}

// The live feed, reused for the Threats tab. It polls the same audit endpoint the monitor does, so an
// admin sees the whole system; a sign-out, a wrong password or a blocked attack appear within seconds.
function ThreatsFeed() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const feed = await fetchEvents();
      setEvents(feed.events);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => { void load(); }, 4000);   // live-ish without a websocket
    return () => clearInterval(timer);
  }, [load]);

  return (
    <>
      {error && <div className="banner banner-error">{error}</div>}
      <div className="eventlist">
        <div className="event-row event-head">
          <span>time</span><span>action</span><span>user</span><span>detail</span><span>ip</span>
        </div>
        {events.length === 0 && !error && (
          <div className="event-empty">No events yet. Sign out and in, or try a wrong password, and watch them appear here.</div>
        )}
        {events.map((ev) => (
          <div key={ev.id} className="event-row">
            <span className="ev-time">{new Date(ev.at).toLocaleTimeString()}</span>
            <span className={`ev-action sev-${severity(ev.action)}`}>{ev.action}</span>
            <span className="ev-user">{ev.username ?? '—'}</span>
            <span className="ev-detail">{ev.detail ?? ''}</span>
            <span className="ev-ip">{ev.ip ?? ''}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// The results of one read-only query, as a table. The cells are already strings from the server (null
// cells read as a dimmed "null"), so this only has to lay them out and say how many rows came back.
function QueryResultTable({ result }: Readonly<{ result: QueryResult }>) {
  if (result.columns.length === 0) return <div className="event-empty">The query returned no columns.</div>;

  return (
    <div className="qresult">
      <div className="qresult-meta">
        {result.rowCount} row{result.rowCount === 1 ? '' : 's'}
        {result.truncated && <span className="qresult-cap"> · capped at 200</span>}
      </div>
      <div className="qresult-scroll">
        <table className="qtable">
          <thead>
            <tr>{result.columns.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {result.rows.map((row, ri) => (
              // Query rows have no natural id, and the result is an immutable snapshot that never
              // reorders, so the row index is a stable key here.
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={result.columns[ci] ?? ci} className={cell === null ? 'qnull' : undefined}>
                    {cell === null ? 'null' : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.rowCount === 0 && <div className="event-empty">The query ran and returned no rows.</div>}
    </div>
  );
}

// The read-only query editor. The admin types SQL and runs it; the server is the one that guarantees it
// is read only (single SELECT/WITH, run inside a rolled-back transaction), so this stays a thin editor
// and never pretends to enforce anything itself.
function QueryEditor() {
  const [sql, setSql] = useState('SELECT Id, Username, Role FROM Users');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      setResult(await runConsoleQuery(sql));
      setError(null);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setRunning(false);
    }
  }, [sql]);

  return (
    <div className="con-query">
      <label className="con-qlabel" htmlFor="con-sql">read-only query</label>
      <textarea
        id="con-sql"
        className="con-sql"
        spellCheck={false}
        rows={3}
        value={sql}
        onChange={(e) => setSql(e.target.value)}
      />
      <div className="con-qbar">
        <button type="button" className="run" disabled={running} onClick={() => { void run(); }}>
          {running ? 'running...' : 'Run'}
        </button>
        <span className="con-qhint">SELECT only. The server refuses writes and rolls back every query.</span>
      </div>
      {error && <div className="banner banner-error">{error}</div>}
      {result && <QueryResultTable result={result} />}
    </div>
  );
}

// The user manager, the first slice of the Data tab's CRUD. It lists the users and lets an admin change a
// role; the write is admin-only and audited on the server (and so shows in the Threats feed), and the
// server refuses demoting the last admin. The UI stays thin: it posts the change and reloads the list.
function UserManager({ meId }: Readonly<{ meId: number }>) {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);   // the row whose delete is awaiting a confirm

  const load = useCallback(async () => {
    try {
      setUsers(await fetchConsoleUsers());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const changeRole = useCallback(async (id: number, role: string) => {
    setBusyId(id);
    try {
      await updateUserRole(id, role);
      await load();   // reload so the change (and anything the server adjusted) is what we show
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setBusyId(null);
    }
  }, [load]);

  const remove = useCallback(async (id: number) => {
    setBusyId(id);
    setConfirmId(null);
    try {
      await deleteUser(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setBusyId(null);
    }
  }, [load]);

  // The add-user form, kept as its own small piece of state so the table stays a pure render of the list.
  const [nu, setNu] = useState('');
  const [ne, setNe] = useState('');
  const [np, setNp] = useState('');
  const [nr, setNr] = useState('user');
  const [adding, setAdding] = useState(false);

  const add = useCallback(async () => {
    setAdding(true);
    try {
      await addUser(nu.trim(), ne.trim(), np, nr);
      setNu(''); setNe(''); setNp('');
      await load();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setAdding(false);
    }
  }, [nu, ne, np, nr, load]);

  return (
    <div className="con-users">
      {error && <div className="banner banner-error">{error}</div>}
      {!users && !error && <div className="event-empty">Loading users...</div>}
      {users && (
        <div className="qresult-scroll">
          <table className="qtable">
            <thead>
              <tr><th>id</th><th>username</th><th>email</th><th>role</th><th>last login</th><th>{''}</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className="role-select"
                      value={u.role}
                      disabled={busyId === u.id}
                      onChange={(e) => { void changeRole(u.id, e.target.value); }}
                      aria-label={`role for ${u.username}`}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}</td>
                  <td className="u-actions">
                    {u.id === meId ? (
                      <span className="u-you">you</span>
                    ) : confirmId === u.id ? (
                      <>
                        <button type="button" className="u-del confirm" disabled={busyId === u.id} onClick={() => { void remove(u.id); }}>delete</button>
                        <button type="button" className="u-cancel" onClick={() => setConfirmId(null)}>cancel</button>
                      </>
                    ) : (
                      <button type="button" className="u-del" disabled={busyId === u.id} onClick={() => setConfirmId(u.id)}>delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form className="user-add" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <input value={nu} onChange={(e) => setNu(e.target.value)} placeholder="username" aria-label="new username" />
        <input value={ne} onChange={(e) => setNe(e.target.value)} placeholder="email" aria-label="new email" />
        <input value={np} onChange={(e) => setNp(e.target.value)} type="password" placeholder="password" aria-label="new password" />
        <select className="role-select" value={nr} onChange={(e) => setNr(e.target.value)} aria-label="new user role">
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button type="submit" className="add-btn" disabled={adding}>{adding ? 'adding...' : 'add user'}</button>
      </form>

      <p className="con-note">
        Changes are audited and show up in the Threats feed. The last admin cannot be demoted, you cannot
        delete your own account, and a user with activity history is never deleted.
      </p>
    </div>
  );
}

// The table browser: a page of one table's rows, read from the server (read only, admin only). It is keyed
// by table name in the parent, so picking a different table remounts it and the page resets to one.
function TableBrowser({ name, onClose }: Readonly<{ name: string; onClose: () => void }>) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TablePage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchConsoleTable(name, page, 25)
      .then((d) => { if (live) { setData(d); setError(null); } })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : 'request failed'); });
    return () => { live = false; };
  }, [name, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  return (
    <div className="tbrowse">
      <div className="tbrowse-head">
        <span className="tbrowse-name">{name}</span>
        <span className="tbrowse-count">{data ? `${data.total} row${data.total === 1 ? '' : 's'}` : ''}</span>
        <button type="button" className="ghost" onClick={onClose}>close</button>
      </div>
      {error && <div className="banner banner-error">{error}</div>}
      {data && (
        <>
          <div className="qresult-scroll">
            <table className="qtable">
              <thead><tr>{data.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {data.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={data.columns[ci] ?? ci} className={cell === null ? 'qnull' : undefined}>{cell === null ? 'null' : cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tbrowse-pager">
            <button type="button" className="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>prev</button>
            <span className="tbrowse-page">page {data.page} / {pages}</span>
            <button type="button" className="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>next</button>
          </div>
        </>
      )}
    </div>
  );
}

// The Data tab: a live database IDE over the real database. The read-only query editor and the user
// manager are the tools; the schema tree is the reference (read from the EF Core model, the
// migration-governed shape), and clicking a table browses its rows; the DDL section shows how each table
// was made.
function DataPanel({ meId }: Readonly<{ meId: number }>) {
  const [schema, setSchema] = useState<ConsoleSchema | null>(null);
  const [ddl, setDdl] = useState<TableDdl[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ddlError, setDdlError] = useState<string | null>(null);
  const [browse, setBrowse] = useState<string | null>(null);   // the table whose rows are being browsed

  useEffect(() => {
    fetchConsoleSchema()
      .then(setSchema)
      .catch((e) => setError(e instanceof Error ? e.message : 'request failed'));
    fetchConsoleDdl()
      .then(setDdl)
      .catch((e) => setDdlError(e instanceof Error ? e.message : 'request failed'));
  }, []);

  return (
    <div className="con-data">
      <QueryEditor />

      <h3 className="con-subhead">users</h3>
      <UserManager meId={meId} />

      <h3 className="con-subhead">schema</h3>
      <p className="con-note">
        The live schema, read from the EF Core model (the migration-governed shape of the database). Click a
        table to browse its rows.
      </p>
      {error && <div className="banner banner-error">{error}</div>}
      {!schema && !error && <div className="event-empty">Loading the schema...</div>}
      {browse && <TableBrowser key={browse} name={browse} onClose={() => setBrowse(null)} />}
      {schema && (
        <div className="schema-grid">
          {schema.tables.map((t) => (
            <div key={t.name} className="schema-table">
              <button type="button" className="schema-th schema-th-btn" onClick={() => setBrowse(t.name)}>
                <span className="schema-tname">{t.name}</span>
                <span className="schema-ccount">{t.columns.length} cols</span>
              </button>
              <ul className="schema-cols">
                {t.columns.map((c) => (
                  <li key={c.name}>
                    <span className="col-name">{c.name}</span>
                    <span className="col-type">{c.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <h3 className="con-subhead ddl-head">how each table was made</h3>
      <p className="con-note">
        The CREATE statements, generated from the EF Core model in the live provider's dialect. Click a
        table to see the DDL that builds it.
      </p>
      {ddlError && <div className="banner banner-error">{ddlError}</div>}
      {!ddl && !ddlError && <div className="event-empty">Loading the DDL...</div>}
      {ddl && (
        <div className="ddl-list">
          {ddl.map((t) => (
            <details key={t.name} className="ddl-item">
              <summary className="ddl-sum">{t.name}</summary>
              <pre className="ddl-sql">{t.sql}</pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

// An honest placeholder for a tab that is designed but not built yet. It states what the tab will be
// and the sprint it lands in, rather than faking a working feature.
function DesignedPanel({ tab }: Readonly<{ tab: TabDef }>) {
  return (
    <div className="con-designed">
      <span className={`con-stage stage-${tab.stage}`}>{STAGE_LABEL[tab.stage]}</span>
      <p className="con-blurb">{tab.blurb}</p>
      <p className="con-note">Designed, not built yet. This tab is scaffolded here so the shape is real; the feature lands in {STAGE_LABEL[tab.stage]}.</p>
    </div>
  );
}

export function Console({ onClose, meId }: Readonly<{ onClose: () => void; meId: number }>) {
  const [active, setActive] = useState<TabId>('threats');
  const [status, setStatus] = useState<ConsoleStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await fetchConsoleStatus());
      setStatusError(null);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'request failed');
    }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  const activeTab = TABS.find((t) => t.id === active)!;

  // The panel subtitle and body, as plain statements rather than nested ternaries.
  let panelSub = STAGE_LABEL[activeTab.stage];
  if (active === 'threats') panelSub = 'live feed · admin';
  else if (active === 'data') panelSub = 'live db · admin';

  let panelBody = <DesignedPanel tab={activeTab} />;
  if (active === 'threats') panelBody = <ThreatsFeed />;
  else if (active === 'data') panelBody = <DataPanel meId={meId} />;

  return (
    <section className="console">
      <div className="con-head">
        <div className="con-title">
          <span className="con-mark">BreakBox</span>
          <span className="con-sub">console · defensive operations</span>
        </div>
        <div className="con-status">
          {status && (
            <>
              <span className="con-stat"><span className="k">db</span>{status.provider}</span>
              <span className="con-stat"><span className="k">users</span>{status.users}</span>
              <span className="con-stat"><span className="k">levels</span>{status.levels}</span>
              <span className="con-stat"><span className="k">events</span>{status.events}</span>
            </>
          )}
          {statusError && <span className="con-stat err">status: {statusError}</span>}
          <button type="button" className="ghost" onClick={() => { void loadStatus(); }}>refresh</button>
          <button type="button" className="ghost" onClick={onClose}>back to launcher</button>
        </div>
      </div>

      <div className="con-tabs" role="tablist" aria-label="console sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            className={`con-tab ${t.id === active ? 'on' : ''}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
            {t.stage !== 'built' && <span className="con-tab-dot" aria-hidden="true" />}
          </button>
        ))}
      </div>

      <div className="con-panel" role="tabpanel">
        <h2 className="section">
          {activeTab.label}
          <span className="dim">{panelSub}</span>
        </h2>
        {panelBody}
      </div>
    </section>
  );
}
