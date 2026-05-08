// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { ParityGrid, ParityStat, V15ParityPage } from "@/components/v15-parity-page";

export default function MatchPreferencesPage() {
  return (
    <V15ParityPage
      title="Match Preferences"
      description="Tune matching by availability, distance, skills, interests, and the kinds of community help you want to find."
      backHref="/matches"
      backLabel="Back to Matches"
      badge="Matching"
    >
      <ParityGrid>
        <ParityStat label="Weight" value="Skills" />
        <ParityStat label="Weight" value="Location" tone="emerald" />
        <ParityStat label="Weight" value="Availability" tone="amber" />
      </ParityGrid>
    </V15ParityPage>
  );
}
