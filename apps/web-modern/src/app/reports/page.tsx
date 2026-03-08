// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Chip, Skeleton } from "@heroui/react";
import { Flag, Clock } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface Report {
  id: number;
  content_type: string;
  content_id: number;
  reason: string;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  reviewing: "bg-blue-500/20 text-blue-400",
  resolved: "bg-emerald-500/20 text-emerald-400",
  dismissed: "bg-gray-500/20 text-gray-400",
};

export default function MyReportsPage() {
  return <ProtectedRoute><MyReportsContent /></ProtectedRoute>;
}

function MyReportsContent() {
  const { user, logout } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    api.getMyReports()
      .then((data) => setReports(data || []))
      .catch((error) => logger.error("Failed to fetch reports:", error))
      .finally(() => setIsLoading(false));
  }, []);
  useEffect(() => {
    api.getUnreadMessageCount().then((res) => setUnreadCount(res?.count || 0));
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar user={user} unreadCount={unreadCount} onLogout={logout} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Flag className="w-8 h-8 text-indigo-400" />
            My Reports
          </h1>
          <p className="text-white/50 mt-1">Content you have reported</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-5 rounded" />
              </div>
            ))}
          </div>
        ) : reports.length > 0 ? (
          <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-4">
            {reports.map((report) => (
              <MotionGlassCard key={report.id} variants={itemVariants} glow="none" padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {report.content_type} #{report.content_id}
                    </p>
                    <p className="text-sm text-white/50 mt-1">{report.reason}</p>
                    <p className="text-xs text-white/30 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Chip size="sm" variant="flat" className={statusColors[report.status] || ""}>
                    {report.status}
                  </Chip>
                </div>
              </MotionGlassCard>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Flag className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No reports</h3>
            <p className="text-white/50">You haven&apos;t reported any content.</p>
          </div>
        )}
      </div>
    </div>
  );
}
