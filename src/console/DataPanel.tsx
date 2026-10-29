// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useMemo, useState } from 'react';
import { fetchConsoleDdl, fetchConsoleSchema, fetchConsoleStatus } from '../auth';
import { useLoad } from '../useLoad';
import { QueryEditor } from './QueryEditor';
import { UserManager } from './UserManager';
import { LevelsManager } from './LevelsManager';
import { TableBrowser } from './TableBrowser';

// The Data tab: a live database control room over the real database, read through the admin-only Console
// API. A stat strip up top says what is live, then three cards: the read-only query console, a schema
// explorer (a rail of tables beside the selected table's rows and the DDL that built it), and the managed
// records (the audited CRUD on users and levels). Everything above is a thin view; the server stays the
// guard (admin only, SELECT only, every write audited), and the schema is the migration-governed shape.
type Managed = 'users' | 'levels';

export function DataPanel({ meId }: Readonly<{ meId: number }>) {
  const { data: status } = useLoad(fetchConsoleStatus);
  const { data: schema, error } = useLoad(fetchConsoleSchema);
  const { data: ddl } = useLoad(fetchConsoleDdl);
  const [selected, setSelected] = useState<string | null>(null);
  const [managed, setManaged] = useState<Managed>('users');

  const tables = useMemo(() => schema?.tables ?? [], [schema]);
  const active = selected ?? tables[0]?.name ?? null;   // the explorer opens on the first table
  const activeDdl = ddl?.find((t) => t.name === active) ?? null;

  return (
    <div className="datax">
      <div className="tstrip">
        <div className="tstat"><span className="tstat-k">database</span><span className="tstat-v">{status?.provider ?? '—'}</span><span className="tstat-sub">live provider</span></div>
        <div className="tstat"><span className="tstat-k">tables</span><span className="tstat-v data">{tables.length || '—'}</span><span className="tstat-sub">migration-governed</span></div>
        <div className="tstat"><span className="tstat-k">users</span><span className="tstat-v data">{status?.users ?? '—'}</span><span className="tstat-sub">accounts</span></div>
        <div className="tstat"><span className="tstat-k">levels</span><span className="tstat-v data">{status?.levels ?? '—'}</span><span className="tstat-sub">the RE ladder</span></div>
        <div className="tstat"><span className="tstat-k">audit events</span><span className="tstat-v data">{status?.events ?? '—'}</span><span className="tstat-sub">append-only</span></div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <section className="dx-card">
        <div className="dx-head"><span className="dx-title">query console</span><span className="dx-sub">read-only SELECT, run in a rolled-back transaction</span></div>
        <QueryEditor />
      </section>

      <section className="dx-card">
        <div className="dx-head"><span className="dx-title">schema explorer</span><span className="dx-sub">{tables.length ? `${tables.length} tables · click to browse` : 'the migration-governed shape'}</span></div>
        {!schema && !error && <div className="event-empty">Loading the schema...</div>}
        {schema && (
          <div className="dx-explorer">
            <ul className="dx-rail">
              {tables.map((t) => (
                <li key={t.name}>
                  <button type="button" className={`dx-rail-item ${t.name === active ? 'on' : ''}`} onClick={() => setSelected(t.name)}>
                    <span className="dx-rail-name">{t.name}</span>
                    <span className="dx-rail-cols">{t.columns.length}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="dx-main">
              {active
                ? (
                  <>
                    <TableBrowser key={active} name={active} />
                    {activeDdl && (
                      <details className="ddl-item dx-ddl">
                        <summary className="ddl-sum">how {active} was made</summary>
                        <pre className="ddl-sql">{activeDdl.sql}</pre>
                      </details>
                    )}
                  </>
                )
                : <div className="event-empty">No tables to show.</div>}
            </div>
          </div>
        )}
      </section>

      <section className="dx-card">
        <div className="dx-head">
          <span className="dx-title">managed records</span>
          <div className="dx-seg" role="tablist" aria-label="managed table">
            <button type="button" role="tab" aria-selected={managed === 'users'} className={managed === 'users' ? 'on' : ''} onClick={() => setManaged('users')}>users</button>
            <button type="button" role="tab" aria-selected={managed === 'levels'} className={managed === 'levels' ? 'on' : ''} onClick={() => setManaged('levels')}>levels</button>
          </div>
        </div>
        {managed === 'users' ? <UserManager meId={meId} /> : <LevelsManager />}
      </section>
    </div>
  );
}
