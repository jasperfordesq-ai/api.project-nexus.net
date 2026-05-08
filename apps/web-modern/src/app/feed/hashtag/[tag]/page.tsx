// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { V15ParityPage } from "@/components/v15-parity-page";

export default async function HashtagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;

  return (
    <V15ParityPage
      title={`#${decodeURIComponent(tag)}`}
      description="Follow this topic in the community feed and discover related posts from members."
      backHref="/feed/hashtags"
      backLabel="Back to Hashtags"
      badge="Social"
      actions={[{ label: "Open Feed", href: "/feed" }]}
    />
  );
}
