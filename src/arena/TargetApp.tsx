// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useState } from 'react';

// The level's real app as its user would see it, rendered in the arena (Phase 4b): NoteBox for Level 1, Ledger for
// Level 2, the same apps the generator builds. The premium feature is locked until the app is opened (by the real
// key, or by a patch that makes any key work) and then it actually runs, so an unlock visibly DOES something.
// Whether it opened is always the server's decision (the app run); this only shows the result.
export function TargetApp({ level, open }: Readonly<{ level: number; open: boolean }>) {
  return level === 2 ? <Ledger open={open} /> : <NoteBox open={open} />;
}

const LOCKED_HINT = 'Premium: unlock the app with a licence key first';

function Plan({ open }: Readonly<{ open: boolean }>) {
  return <span className={`ta-plan${open ? ' pro' : ''}`}>{open ? 'Premium' : 'Free plan'}</span>;
}

function NoteBox({ open }: Readonly<{ open: boolean }>) {
  const [notes, setNotes] = useState('Arena notes\n- IsValid decides the lock\n- the flag is decided on the server\n- a patch opens the lock, not the vault');
  const [exported, setExported] = useState(false);
  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  return (
    <div className="ta" aria-label="NoteBox, the level 1 app">
      <div className="ta-bar"><span className="ta-name">NoteBox</span><Plan open={open} /></div>
      <textarea className="ta-notes" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="notes" spellCheck={false} />
      <div className="ta-foot">
        <span className="ta-stat">{words} words</span>
        <button type="button" className="ta-pro" disabled={!open} title={open ? 'Export your notes' : LOCKED_HINT} onClick={() => setExported(true)}>
          Export PDF
        </button>
      </div>
      {open && exported && (
        <div className="ta-out" role="status">
          <div className="ta-page">
            <div className="ta-page-h">NoteBox Premium &middot; exported PDF</div>
            <pre className="ta-page-body">{notes}</pre>
          </div>
          <button type="button" className="ta-close" onClick={() => setExported(false)}>close</button>
        </div>
      )}
    </div>
  );
}

// The ledger's month. The amounts add up to the balance the generated Ledger shows (EUR 2,338.40).
const ENTRIES = [
  { date: '03 Nov', item: 'Client invoice', amount: 2400 },
  { date: '05 Nov', item: 'Hosting', amount: -14.6 },
  { date: '09 Nov', item: 'Laptop repair', amount: -89 },
  { date: '12 Nov', item: 'Workshop fee', amount: 150 },
  { date: '14 Nov', item: 'Software licence', amount: -108 },
];
const eur = (n: number) => `€ ${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Ledger({ open }: Readonly<{ open: boolean }>) {
  const [report, setReport] = useState(false);
  const income = ENTRIES.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const expenses = -ENTRIES.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);
  const net = income - expenses;

  return (
    <div className="ta" aria-label="Ledger, the level 2 app">
      <div className="ta-bar"><span className="ta-name">Ledger</span><Plan open={open} /></div>
      <div className="ta-balance"><span>Net balance this month</span><b>{eur(net)}</b></div>
      <table className="ta-ledger">
        <tbody>
          {ENTRIES.map((e) => (
            <tr key={e.date + e.item}>
              <td>{e.date}</td><td>{e.item}</td><td className={e.amount < 0 ? 'neg' : 'pos'}>{eur(e.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ta-foot">
        <span className="ta-stat">{ENTRIES.length} entries</span>
        <button type="button" className="ta-pro" disabled={!open} title={open ? 'Build the monthly report' : LOCKED_HINT} onClick={() => setReport(true)}>
          Monthly report
        </button>
      </div>
      {open && report && (
        <div className="ta-out" role="status">
          <div className="ta-page">
            <div className="ta-page-h">Ledger Pro &middot; monthly report, November</div>
            <div className="ta-bars">
              <div className="ta-barrow"><span>income</span><i style={{ width: '100%' }} /><b>{eur(income)}</b></div>
              <div className="ta-barrow"><span>expenses</span><i className="neg" style={{ width: `${(expenses / income) * 100}%` }} /><b>{eur(expenses)}</b></div>
              <div className="ta-barrow"><span>net</span><i style={{ width: `${(net / income) * 100}%` }} /><b>{eur(net)}</b></div>
            </div>
          </div>
          <button type="button" className="ta-close" onClick={() => setReport(false)}>close</button>
        </div>
      )}
    </div>
  );
}
