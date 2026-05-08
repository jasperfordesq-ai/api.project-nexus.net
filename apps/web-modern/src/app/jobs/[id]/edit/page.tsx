// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { V15ParityPage } from "@/components/v15-parity-page";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <V15ParityPage
      title="Edit Job"
      description="Update role details, time-credit expectations, location, and application guidance for this community job."
      backHref={`/jobs/${id}`}
      backLabel="Back to Job"
      badge={`Job #${id}`}
      actions={[{ label: "View Job", href: `/jobs/${id}` }]}
    />
  );
}
