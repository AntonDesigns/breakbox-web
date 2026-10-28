// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useState } from 'react';
import { fetchConsoleDdl, fetchConsoleSchema } from '../auth';
import { useLoad } from '../useLoad';
import { QueryEditor } from './QueryEditor';
import { UserManager } from './UserManager';
import { LevelsManager } from './LevelsManager';
import { TableBrowser } from './TableBrowser';

// The Data tab: a live database IDE over the real database. The query editor, the user manager and the
// levels manager are the tools; the schema tree is the reference (read from the EF Core model, the
// migration-governed shape), and clicking a table browses its rows; the DDL section shows how each table
// was made.
export function DataPanel({ meId }: Readonly<{ meId: number }>) {
  const { data: schema, error } = useLoad(fetchConsoleSchema);
  const { data: ddl, error: ddlError } = useLoad(fetchConsoleDdl);
  const [browse, setBrowse] = useState<string | null>(null);   // the table whose rows are being browsed

  return (
    <div className="con-data">
      <QueryEditor />

      <h3 className="con-subhead">users</h3>
      <UserManager meId={meId} />

      <h3 className="con-subhead">levels</h3>
      <LevelsManager />

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
