// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { useState } from 'react';
import { fetchConsoleStatus } from '../auth';
import { useLoad } from '../useLoad';
import { DataPanel } from './DataPanel';
import { DesignedPanel } from './DesignedPanel';
import { PurpleTeam } from './PurpleTeam';
import { ThreatsFeed } from './ThreatsFeed';
import { STAGE_LABEL, TABS, type TabId } from './types';

// The BreakBox Console: the defensive half of the project made live. One admin surface that watches the
// system, operates the database, and ships changes, the blue team against the red team I already am on
// the attack side. This file is the shell: the six-tab frame and a real status line from the API. The
// tab bodies live in their own files (ThreatsFeed, DataPanel); the other four tabs are drawn honestly as
// DesignedPanel with the sprint they land in, so the shell never pretends to do what it cannot do yet.
//
// Everything here is admin only. The server decides that (401 signed-out, 403 non-admin); the shell only
// renders for the admin and shows the server's refusal otherwise, so opening the page proves nothing.
export function Console({ onClose, meId }: Readonly<{ onClose: () => void; meId: number }>) {
  const [active, setActive] = useState<TabId>('threats');
  const { data: status, error: statusError, reload: loadStatus } = useLoad(fetchConsoleStatus);

  const activeTab = TABS.find((t) => t.id === active)!;

  // The panel subtitle and body, as plain statements rather than nested ternaries.
  let panelSub = STAGE_LABEL[activeTab.stage];
  if (active === 'threats') panelSub = 'live feed · admin';
  else if (active === 'data') panelSub = 'live db · admin';
  else if (active === 'purple') panelSub = 'both sides · admin';

  let panelBody = <DesignedPanel tab={activeTab} />;
  if (active === 'threats') panelBody = <ThreatsFeed />;
  else if (active === 'data') panelBody = <DataPanel meId={meId} />;
  else if (active === 'purple') panelBody = <PurpleTeam />;

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
          <button type="button" className="ghost" onClick={loadStatus}>refresh</button>
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
