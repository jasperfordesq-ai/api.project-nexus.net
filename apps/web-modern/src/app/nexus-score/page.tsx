// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button, Avatar, Skeleton, Chip, Pagination } from "@heroui/react";
import { TrendingUp, RefreshCw, Trophy } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard, MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface NexusScore {
  userId: number;
  score: number;
  tier: string;
  exchange_score: number;
  review_score: number;
  engagement_score: number;
  reliability_score: number;
  tenure_score: number;
  last_calculated_at: string;
}

const tierColors: Record<string, string> = {
  newcomer: "bg-gray-500/20 text-gray-400",
  emerging: "bg-blue-500/20 text-blue-400",
  established: "bg-purple-500/20 text-purple-400",
  trusted: "bg-emerald-500/20 text-emerald-400",
  exemplary: "bg-yellow-500/20 text-yellow-400",
};

export default function NexusScorePage() {
  return (
    <ProtectedRoute>
      <NexusScoreContent />
    </ProtectedRoute>
  );
}

function NexusScoreContent() {
  const { user, logout } = useAuth();
  const [myScore, setMyScore] = useState<NexusScore | null>(null);
  const [leaderboard, setLeaderboard] = useState<{
    userId: number;
    score: number;
    tier: string;
    user: { id: number; first_name: string; last_name: string };
  }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [score, lb] = await Promise.allSettled([
        api.getMyNexusScore(),
        api.getNexusScoreLeaderboard({ page: currentPage, limit: 20 }),
      ]);
      if (score.status === "fulfilled") setMyScore(score.value);
      if (lb.status === "fulfilled") {
        setLeaderboard(lb.value?.data || []);
        setTotalPages(lb.value?.pagination?.total_pages || 1);
      }
    } catch (error) {
      logger.error("Failed to fetch NexusScore:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await api.recalculateNexusScore();
      fetchData();
    } catch (error) {
      logger.error("Failed to recalculate:", error);
    } finally {
      setIsRecalculating(false);
    }
  };

  const dimensions = myScore ? [
    { label: "Exchanges", value: myScore.exchange_score, max: 200, color: "from-blue-500 to-blue-600" },
    { label: "Reviews", value: myScore.review_score, max: 200, color: "from-purple-500 to-purple-600" },
    { label: "Engagement", value: myScore.engagement_score, max: 200, color: "from-indigo-500 to-indigo-600" },
    { label: "Reliability", value: myScore.reliability_score, max: 200, color: "from-emerald-500 to-emerald-600" },
    { label: "Tenure", value: myScore.tenure_score, max: 200, color: "from-amber-500 to-amber-600" },
  ] : [];

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-indigo-400" />
              NexusScore
            </h1>
            <p className="text-white/50 mt-1">Your community reputation score (0-1000)</p>
          </div>
          <Button
            className="bg-white/10 text-white"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={handleRecalculate}
            isLoading={isRecalculating}
          >
            Recalculate
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="p-8 rounded-xl bg-white/5 border border-white/10">
              <Skeleton className="w-48 h-16 rounded mx-auto" />
            </div>
          </div>
        ) : (
          <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-6">
            {/* Score Card */}
            {myScore && (
              <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-white mb-2">{myScore.score}</div>
                  <Chip size="lg" variant="flat" className={tierColors[myScore.tier] || "bg-gray-500/20 text-gray-400"}>
                    {myScore.tier.charAt(0).toUpperCase() + myScore.tier.slice(1)}
                  </Chip>
                  <p className="text-xs text-white/40 mt-2">
                    Last calculated {new Date(myScore.last_calculated_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Dimension Bars */}
                <div className="space-y-3">
                  {dimensions.map((dim) => (
                    <div key={dim.label} className="flex items-center gap-3">
                      <span className="text-sm text-white/60 w-24">{dim.label}</span>
                      <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${dim.color}`}
                          style={{ width: `${(dim.value / dim.max) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-white/60 w-12 text-right">{dim.value}</span>
                    </div>
                  ))}
                </div>
              </MotionGlassCard>
            )}

            {/* Leaderboard */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Leaderboard
              </h2>
              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <Link key={entry.userId} href={`/members/${entry.user.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                      <span className="text-sm font-bold text-white/40 w-8">
                        {(currentPage - 1) * 20 + i + 1}
                      </span>
                      <Avatar
                        name={`${entry.user.first_name} ${entry.user.last_name}`}
                        size="sm"
                        className="ring-2 ring-white/10"
                      />
                      <p className="text-white font-medium flex-1">
                        {entry.user.first_name} {entry.user.last_name}
                      </p>
                      <Chip size="sm" variant="flat" className={tierColors[entry.tier] || ""}>
                        {entry.tier}
                      </Chip>
                      <span className="text-lg font-bold text-indigo-400 w-16 text-right">
                        {entry.score}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination
                    total={totalPages}
                    page={currentPage}
                    onChange={setCurrentPage}
                    classNames={{
                      wrapper: "gap-2",
                      item: "bg-white/5 text-white border-white/10 hover:bg-white/10",
                      cursor: "bg-indigo-500 text-white",
                    }}
                  />
                </div>
              )}
            </MotionGlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}
