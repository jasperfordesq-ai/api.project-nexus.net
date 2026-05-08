// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { V15ParityPage } from "@/components/v15-parity-page";

export default function CreateGroupExchangePage() {
  return (
    <V15ParityPage
      title="Create Group Exchange"
      description="Start a group exchange request with a clear outcome, participant roles, and time-credit expectations."
      backHref="/group-exchanges"
      backLabel="Back to Group Exchanges"
      badge="Groups"
      actions={[{ label: "Groups", href: "/groups" }]}
    />
  );
}
