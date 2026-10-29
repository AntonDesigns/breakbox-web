// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useState } from 'react';
import { fetchConsoleTable } from '../auth';
import { useLoad } from '../useLoad';

// The table browser: a page of one table's rows, read from the server (read only, admin only). useLoad
// re-runs whenever the name or page changes; the parent also keys it by name, so picking a different
// table remounts it and the page resets to one.
export function TableBrowser({ name, onClose }: Readonly<{ name: string; onClose: () => void }>) {
  const [page, setPage] = useState(1);
  const { data, error } = useLoad(() => fetchConsoleTable(name, page, 25), [name, page]);

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
