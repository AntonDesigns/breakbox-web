// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useCallback, useState } from 'react';
import { addUser, deleteUser, fetchConsoleUsers, updateUserRole } from '../auth';
import { useLoad } from '../useLoad';

// The user manager, the first slice of the Data tab's CRUD. useLoad lists the users; an admin can change
// a role, delete (with an inline confirm, never their own row), or add. Every write is admin-only and
// audited on the server (and so shows in the Threats feed), which stays the real guard (last admin cannot
// be demoted, a user with history is never deleted). The UI stays thin: it posts the change and reloads.
export function UserManager({ meId }: Readonly<{ meId: number }>) {
  const { data: users, error: loadError, reload } = useLoad(fetchConsoleUsers);
  const [error, setError] = useState<string | null>(null);   // errors from a write (the server's message)
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);   // the row whose delete is awaiting a confirm

  const changeRole = useCallback(async (id: number, role: string) => {
    setBusyId(id);
    try {
      await updateUserRole(id, role);
      setError(null);
      reload();   // re-fetch so the change (and anything the server adjusted) is what we show
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setBusyId(null);
    }
  }, [reload]);

  const remove = useCallback(async (id: number) => {
    setBusyId(id);
    setConfirmId(null);
    try {
      await deleteUser(id);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setBusyId(null);
    }
  }, [reload]);

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
      setError(null);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
    } finally {
      setAdding(false);
    }
  }, [nu, ne, np, nr, reload]);

  return (
    <div className="con-users">
      {(error ?? loadError) && <div className="banner banner-error">{error ?? loadError}</div>}
      {!users && !loadError && <div className="event-empty">Loading users...</div>}
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
