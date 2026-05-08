// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { ParityGrid, ParityStat, V15ParityPage } from "@/components/v15-parity-page";

export default function CreateJobPage() {
  return (
    <V15ParityPage
      title="Create Job"
      description="Draft a community job opportunity, then publish it for members who want to earn time credits through structured work."
      backHref="/jobs"
      backLabel="Back to Jobs"
      badge="Jobs"
      actions={[{ label: "Browse Jobs", href: "/jobs" }]}
    >
      <ParityGrid>
        <ParityStat label="Recommended title length" value="8-12 words" />
        <ParityStat label="Credit model" value="Hourly" tone="emerald" />
        <ParityStat label="Review queue" value="Optional" tone="amber" />
      </ParityGrid>
    </V15ParityPage>
  );
}
