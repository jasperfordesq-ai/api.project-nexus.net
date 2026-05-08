// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { V15ParityPage } from "@/components/v15-parity-page";

export default function CreateVolunteeringOpportunityPage() {
  return (
    <V15ParityPage
      title="Create Volunteering Opportunity"
      description="Post a volunteering opportunity with dates, location, capacity, and the support your organisation needs."
      backHref="/volunteering"
      backLabel="Back to Volunteering"
      badge="Volunteering"
      actions={[{ label: "Organisations", href: "/organisations" }]}
    />
  );
}
