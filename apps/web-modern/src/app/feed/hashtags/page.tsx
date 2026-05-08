// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import Link from "next/link";
import { Chip } from "@heroui/react";
import { V15ParityPage } from "@/components/v15-parity-page";

const commonTags = ["community", "skills", "events", "volunteering", "jobs", "help", "offers", "requests"];

export default function HashtagsPage() {
  return (
    <V15ParityPage
      title="Hashtags"
      description="Browse common community topics and jump into related feed conversations."
      backHref="/feed"
      backLabel="Back to Feed"
      badge="Social"
    >
      <div className="flex flex-wrap gap-3">
        {commonTags.map((tag) => (
          <Link key={tag} href={`/feed/hashtag/${tag}`}>
            <Chip className="bg-white/10 text-white hover:bg-white/15 transition-colors">
              #{tag}
            </Chip>
          </Link>
        ))}
      </div>
    </V15ParityPage>
  );
}
