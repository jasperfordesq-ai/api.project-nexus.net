// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { ParityGrid, ParityStat, V15ParityPage } from "@/components/v15-parity-page";

export default function SocialPrescribingPage() {
  return (
    <V15ParityPage
      title="Social Prescribing"
      description="Connect members with community activities, volunteering, groups, and wellbeing-supporting opportunities."
      backHref="/dashboard"
      backLabel="Back to Dashboard"
      badge="Community"
      actions={[
        { label: "Groups", href: "/groups" },
        { label: "Events", href: "/events" },
        { label: "Volunteering", href: "/volunteering" },
      ]}
    >
      <ParityGrid>
        <ParityStat label="Pathway" value="Activities" />
        <ParityStat label="Pathway" value="Groups" tone="emerald" />
        <ParityStat label="Pathway" value="Support" tone="amber" />
      </ParityGrid>
    </V15ParityPage>
  );
}
