// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { ParityGrid, ParityStat, V15ParityPage } from "@/components/v15-parity-page";

export default function GroupExchangesPage() {
  return (
    <V15ParityPage
      title="Group Exchanges"
      description="Coordinate multi-member exchanges where a group contributes time, skills, or support to a shared request."
      backHref="/groups"
      backLabel="Back to Groups"
      badge="Groups"
      actions={[{ label: "Create", href: "/group-exchanges/create" }]}
    >
      <ParityGrid>
        <ParityStat label="Exchange type" value="Shared" />
        <ParityStat label="Participants" value="Group" tone="emerald" />
        <ParityStat label="Settlement" value="Time credits" tone="amber" />
      </ParityGrid>
    </V15ParityPage>
  );
}
