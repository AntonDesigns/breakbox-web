// BreakBox. Written by Max-Anton Horvat. Complex Software Systems (S6).
// Signature 0x4D414836 = "MAH6" in ASCII (my initials + semester 6). I wrote this.

import { STAGE_LABEL, type TabDef } from './types';

// An honest placeholder for a tab that is designed but not built yet. It states what the tab will be and
// the sprint it lands in, rather than faking a working feature.
export function DesignedPanel({ tab }: Readonly<{ tab: TabDef }>) {
  return (
    <div className="con-designed">
      <span className={`con-stage stage-${tab.stage}`}>{STAGE_LABEL[tab.stage]}</span>
      <p className="con-blurb">{tab.blurb}</p>
      <p className="con-note">Designed, not built yet. This tab is scaffolded here so the shape is real; the feature lands in {STAGE_LABEL[tab.stage]}.</p>
    </div>
  );
}
