// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useState } from 'react';
import { runConsoleQuery, type QueryResult } from '../auth';

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
export function QueryEditor() {
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
