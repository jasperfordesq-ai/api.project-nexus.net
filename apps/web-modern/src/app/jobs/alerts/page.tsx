// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { ParityGrid, ParityStat, V15ParityPage } from "@/components/v15-parity-page";

export default function JobAlertsPage() {
  return (
    <V15ParityPage
      title="Job Alerts"
      description="Manage saved job searches and notifications for new opportunities that match your availability and skills."
      backHref="/jobs"
      backLabel="Back to Jobs"
      badge="Jobs"
      actions={[{ label: "Saved Searches", href: "/saved-searches" }]}
    >
      <ParityGrid>
        <ParityStat label="Delivery" value="In-app" />
        <ParityStat label="Matching" value="Skills" tone="emerald" />
        <ParityStat label="Frequency" value="Daily" tone="amber" />
      </ParityGrid>
    </V15ParityPage>
  );
}
