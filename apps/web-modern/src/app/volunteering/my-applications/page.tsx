// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@heroui/react";
import { V15ParityPage } from "@/components/v15-parity-page";
import { MotionGlassCard } from "@/components/glass-card";
import { api } from "@/lib/api";

interface VolunteerHour {
  id: number;
  opportunity_id: number;
  opportunity_title: string;
  hours: number;
  logged_at: string;
}

export default function MyVolunteerApplicationsPage() {
  const [hours, setHours] = useState<VolunteerHour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyVolunteerHours()
      .then(setHours)
      .catch(() => setHours([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <V15ParityPage
      title="My Volunteering"
      description="Track your volunteering signups, logged hours, and recent applications."
      backHref="/volunteering"
      backLabel="Back to Volunteering"
      badge="Volunteering"
    >
      <div className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </>
        ) : hours.length > 0 ? (
          hours.map((entry) => (
            <MotionGlassCard key={entry.id} glow="none" padding="md">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">{entry.opportunity_title}</p>
                  <p className="text-sm text-white/45">
                    Logged {new Date(entry.logged_at).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-lg font-bold text-pink-300">{entry.hours}h</p>
              </div>
            </MotionGlassCard>
          ))
        ) : (
          <p className="text-white/50">No volunteering applications or hours yet.</p>
        )}
      </div>
    </V15ParityPage>
  );
}
