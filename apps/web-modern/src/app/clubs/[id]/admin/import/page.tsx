// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { V15ParityPage } from "@/components/v15-parity-page";

export default function Page() {
  return (
    <V15ParityPage
      title="Clubs Id Admin Import"
      description="V1.5 migration parity route for /clubs/{id}/admin/import."
      backHref="/groups"
      backLabel="Back"
      badge="V1.5 parity"
    />
  );
}
