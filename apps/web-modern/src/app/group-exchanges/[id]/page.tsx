// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { ParityGrid, ParityStat, V15ParityPage } from "@/components/v15-parity-page";

export default async function GroupExchangeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <V15ParityPage
      title="Group Exchange"
      description="Review participants, requested outcomes, time-credit allocation, and exchange status."
      backHref="/group-exchanges"
      backLabel="Back to Group Exchanges"
      badge={`Exchange #${id}`}
    >
      <ParityGrid>
        <ParityStat label="Status" value="Open" />
        <ParityStat label="Participants" value="Group" tone="emerald" />
        <ParityStat label="Credits" value="Shared" tone="amber" />
      </ParityGrid>
    </V15ParityPage>
  );
}
