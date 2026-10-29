// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useState } from 'react';
import { addConsoleLevel, deleteConsoleLevel, fetchConsoleLevels, updateConsoleLevel, type LevelInput, type LevelRow } from '../auth';
import { useLoad } from '../useLoad';

// The levels manager: record CRUD on the one editable content table. The catalog ships empty, so the
// first use is adding levels. One form serves add and edit; the list below has edit and delete (with an
// inline confirm). Every write is admin-only and audited on the server, which stays the real guard
// (unique number, a level in use is never deleted); the UI just posts and reloads.
export function LevelsManager() {
  const { data: levels, error: loadError, reload } = useLoad(fetchConsoleLevels);
  const [error, setError] = useState<string | null>(null);   // errors from a write (the server's message)
  const [editing, setEditing] = useState<number | null>(null);   // id being edited, or null = add mode
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [tier, setTier] = useState('core');
  const [available, setAvailable] = useState(true);
  const [summary, setSummary] = useState('');
  const [learn, setLearn] = useState('');

  const reset = useCallback(() => {
    setEditing(null); setNumber(''); setName(''); setDifficulty('Easy'); setTier('core');
    setAvailable(true); setSummary(''); setLearn('');
  }, []);

  const startEdit = useCallback((l: LevelRow) => {
    setEditing(l.id); setNumber(String(l.number)); setName(l.name); setDifficulty(l.difficulty);
    setTier(l.tier); setAvailable(l.available); setSummary(l.summary); setLearn(l.learn);
  }, []);

  const save = useCallback(async () => {
    setBusy(true);
    const input: LevelInput = { number: Number(number), name, difficulty, tier, available, summary, learn };
    try {
      if (editing === null) await addConsoleLevel(input);
      else await updateConsoleLevel(editing, input);
      reset();
      setError(null);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setBusy(false);
    }
  }, [editing, number, name, difficulty, tier, available, summary, learn, reset, reload]);

  const remove = useCallback(async (id: number) => {
    setBusy(true);
    setConfirmId(null);
    try {
      await deleteConsoleLevel(id);
      if (editing === id) reset();
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setBusy(false);
    }
  }, [editing, reset, reload]);

  return (
    <div className="con-levels">
      {(error ?? loadError) && <div className="banner banner-error">{error ?? loadError}</div>}
      {!levels && !loadError && <div className="event-empty">Loading levels...</div>}
      {levels && levels.length === 0 && <div className="event-empty">No levels yet. The catalog ships empty; add one below.</div>}
      {levels && levels.length > 0 && (
        <div className="qresult-scroll">
          <table className="qtable">
            <thead>
              <tr><th>#</th><th>name</th><th>difficulty</th><th>tier</th><th>available</th><th>{''}</th></tr>
            </thead>
            <tbody>
              {levels.map((l) => (
                <tr key={l.id}>
                  <td>{l.number}</td>
                  <td>{l.name}</td>
                  <td>{l.difficulty}</td>
                  <td>{l.tier}</td>
                  <td>{l.available ? 'yes' : 'no'}</td>
                  <td className="u-actions">
                    <button type="button" className="u-del" disabled={busy} onClick={() => startEdit(l)}>edit</button>
                    {confirmId === l.id ? (
                      <>
                        <button type="button" className="u-del confirm" disabled={busy} onClick={() => { void remove(l.id); }}>delete</button>
                        <button type="button" className="u-cancel" onClick={() => setConfirmId(null)}>cancel</button>
                      </>
                    ) : (
                      <button type="button" className="u-del" disabled={busy} onClick={() => setConfirmId(l.id)}>delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form className="level-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="level-form-title">{editing === null ? 'add a level' : `editing level #${number}`}</div>
        <div className="level-form-row">
          <input className="lf-num" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="no." inputMode="numeric" aria-label="level number" />
          <input className="lf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="name" aria-label="level name" />
          <select className="role-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="difficulty">
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <select className="role-select" value={tier} onChange={(e) => setTier(e.target.value)} aria-label="tier">
            <option value="core">core</option>
            <option value="advanced">advanced</option>
          </select>
          <label className="lf-avail"><input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /> available</label>
        </div>
        <input className="lf-text" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="summary" aria-label="summary" />
        <input className="lf-text" value={learn} onChange={(e) => setLearn(e.target.value)} placeholder="what you learn" aria-label="what you learn" />
        <div className="level-form-bar">
          <button type="submit" className="add-btn" disabled={busy}>{editing === null ? 'add level' : 'save changes'}</button>
          {editing !== null && <button type="button" className="u-cancel" onClick={reset}>cancel</button>}
        </div>
      </form>
      <p className="con-note">Every change is audited and shows in the Threats feed. Numbers are unique, and a level in use cannot be deleted.</p>
    </div>
  );
}
