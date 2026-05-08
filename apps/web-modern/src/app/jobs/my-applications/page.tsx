// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Chip, Skeleton } from "@heroui/react";
import { V15ParityPage } from "@/components/v15-parity-page";
import { MotionGlassCard } from "@/components/glass-card";
import { api } from "@/lib/api";

interface JobApplication {
  id: number;
  job_id: number;
  job_title: string;
  status: string;
  applied_at: string;
}

export default function MyJobApplicationsPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyJobApplications()
      .then(setApplications)
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <V15ParityPage
      title="My Job Applications"
      description="Track the jobs you have applied for and follow each application through review."
      backHref="/jobs"
      backLabel="Back to Jobs"
      badge="Jobs"
    >
      <div className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </>
        ) : applications.length > 0 ? (
          applications.map((application) => (
            <MotionGlassCard key={application.id} glow="none" padding="md">
              <Link href={`/jobs/${application.job_id}`} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">{application.job_title}</p>
                  <p className="text-sm text-white/45">
                    Applied {new Date(application.applied_at).toLocaleDateString()}
                  </p>
                </div>
                <Chip size="sm" className="bg-indigo-500/20 text-indigo-300">
                  {application.status}
                </Chip>
              </Link>
            </MotionGlassCard>
          ))
        ) : (
          <p className="text-white/50">No job applications yet.</p>
        )}
      </div>
    </V15ParityPage>
  );
}
