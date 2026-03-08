// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Chip,
  Skeleton,
  Pagination,
  Progress,
} from "@heroui/react";
import { Target, CheckCircle, Circle, Calendar } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface Goal {
  id: number;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  unit: string;
  status: string;
  deadline?: string;
  milestones: { id: number; title: string; completed: boolean }[];
  created_at: string;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  completed: "bg-blue-500/20 text-blue-400",
  expired: "bg-red-500/20 text-red-400",
};

export default function GoalsPage() {
  return (
    <ProtectedRoute>
      <GoalsContent />
    </ProtectedRoute>
  );
}

function GoalsContent() {
  const { user, logout } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getGoals({ page: currentPage, limit: 10 });
      setGoals(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch goals:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);
  useEffect(() => {
    api.getUnreadMessageCount().then((res) => setUnreadCount(res?.count || 0));
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar user={user} unreadCount={unreadCount} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-indigo-400" />
            Community Goals
          </h1>
          <p className="text-white/50 mt-1">Track collective achievements and milestones</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-6 rounded mb-4" />
                <Skeleton className="w-full h-4 rounded" />
              </div>
            ))}
          </div>
        ) : goals.length > 0 ? (
          <>
            <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-6">
              {goals.map((goal) => {
                const pct = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
                const completedMilestones = goal.milestones.filter((m) => m.completed).length;
                return (
                  <MotionGlassCard key={goal.id} variants={itemVariants} glow="none" padding="lg" hover>
                    <Link href={`/goals/${goal.id}`} className="block">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-white">{goal.title}</h3>
                        <Chip size="sm" variant="flat" className={statusColors[goal.status] || ""}>
                          {goal.status}
                        </Chip>
                      </div>
                      <p className="text-sm text-white/50 mb-4 line-clamp-2">{goal.description}</p>

                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white/60">Progress</span>
                          <span className="text-indigo-400 font-semibold">
                            {goal.current_value} / {goal.target_value} {goal.unit}
                          </span>
                        </div>
                        <Progress
                          value={pct}
                          maxValue={100}
                          classNames={{ track: "bg-white/10", indicator: "bg-indigo-500" }}
                        />
                      </div>

                      {/* Milestones summary */}
                      {goal.milestones.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-white/40">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span>{completedMilestones}/{goal.milestones.length} milestones</span>
                        </div>
                      )}

                      {goal.deadline && (
                        <div className="flex items-center gap-1 text-sm text-white/40 mt-2">
                          <Calendar className="w-3 h-3" />
                          <span>Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                    </Link>
                  </MotionGlassCard>
                );
              })}
            </motion.div>
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination total={totalPages} page={currentPage} onChange={setCurrentPage}
                  classNames={{ wrapper: "gap-2", item: "bg-white/5 text-white border-white/10 hover:bg-white/10", cursor: "bg-indigo-500 text-white" }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No goals yet</h3>
            <p className="text-white/50">Community goals will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
