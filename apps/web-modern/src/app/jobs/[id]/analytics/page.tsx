// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { ParityGrid, ParityStat, V15ParityPage } from "@/components/v15-parity-page";

export default async function JobAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <V15ParityPage
      title="Job Analytics"
      description="Track job visibility, application progress, and conversion signals for this opportunity."
      backHref={`/jobs/${id}`}
      backLabel="Back to Job"
      badge={`Job #${id}`}
      actions={[{ label: "Applications", href: `/jobs/${id}/kanban` }]}
    >
      <ParityGrid>
        <ParityStat label="Funnel" value="Views" />
        <ParityStat label="Pipeline" value="Applicants" tone="emerald" />
        <ParityStat label="Fairness" value="Bias audit" tone="amber" />
      </ParityGrid>
    </V15ParityPage>
  );
}
