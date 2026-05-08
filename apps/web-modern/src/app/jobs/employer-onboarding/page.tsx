// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { V15ParityPage } from "@/components/v15-parity-page";

export default function Page() {
  return (
    <V15ParityPage
      title="Jobs Employer Onboarding"
      description="V1.5 migration parity route for /jobs/employer-onboarding."
      backHref="/jobs"
      backLabel="Back"
      badge="V1.5 parity"
    />
  );
}
