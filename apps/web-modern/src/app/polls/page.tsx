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
import { BarChart3, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface PollOption {
  id: number;
  text: string;
  votes: number;
}

interface Poll {
  id: number;
  question: string;
  description?: string;
  options: PollOption[];
  total_votes: number;
  status: string;
  ends_at?: string;
  created_by: { id: number; first_name: string; last_name: string };
  created_at: string;
  user_voted_option_id?: number;
}

export default function PollsPage() {
  return (
    <ProtectedRoute>
      <PollsContent />
    </ProtectedRoute>
  );
}

function PollsContent() {
  const { user, logout } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPolls = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getPolls({ page: currentPage, limit: 10 });
      setPolls(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch polls:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => { fetchPolls(); }, [fetchPolls]);
  const handleVote = async (pollId: number, optionId: number) => {
    try {
      await api.votePoll(pollId, optionId);
      setPolls((prev) =>
        prev.map((p) => {
          if (p.id !== pollId) return p;
          return {
            ...p,
            user_voted_option_id: optionId,
            total_votes: p.total_votes + 1,
            options: p.options.map((o) =>
              o.id === optionId ? { ...o, votes: o.votes + 1 } : o
            ),
          };
        })
      );
    } catch (error) {
      logger.error("Failed to vote:", error);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-400" />
            Polls
          </h1>
          <p className="text-white/50 mt-1">Vote on community decisions</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-6 rounded mb-4" />
                <Skeleton className="w-full h-20 rounded" />
              </div>
            ))}
          </div>
        ) : polls.length > 0 ? (
          <>
            <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-6">
              {polls.map((poll) => {
                const hasVoted = poll.user_voted_option_id != null;
                return (
                  <MotionGlassCard key={poll.id} variants={itemVariants} glow="none" padding="lg">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white flex-1">{poll.question}</h3>
                      <Chip size="sm" variant="flat" className={
                        poll.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"
                      }>
                        {poll.status}
                      </Chip>
                    </div>
                    {poll.description && <p className="text-sm text-white/50 mb-4">{poll.description}</p>}

                    <div className="space-y-3">
                      {poll.options.map((option) => {
                        const pct = poll.total_votes > 0 ? (option.votes / poll.total_votes) * 100 : 0;
                        const isSelected = poll.user_voted_option_id === option.id;
                        return (
                          <div key={option.id}>
                            {hasVoted || poll.status !== "active" ? (
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className={`${isSelected ? "text-indigo-400 font-semibold" : "text-white/70"}`}>
                                    {option.text} {isSelected && <CheckCircle2 className="w-3 h-3 inline ml-1" />}
                                  </span>
                                  <span className="text-white/40">{Math.round(pct)}%</span>
                                </div>
                                <Progress
                                  value={pct}
                                  maxValue={100}
                                  size="sm"
                                  classNames={{
                                    track: "bg-white/10",
                                    indicator: isSelected ? "bg-indigo-500" : "bg-white/20",
                                  }}
                                />
                              </div>
                            ) : (
                              <Button
                                className="w-full bg-white/5 text-white border border-white/10 hover:bg-white/10 justify-start"
                                onPress={() => handleVote(poll.id, option.id)}
                              >
                                {option.text}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10 text-sm text-white/40">
                      <span>{poll.total_votes} votes</span>
                      <div className="flex items-center gap-2">
                        <Link href={`/members/${poll.created_by.id}`}>
                          <span className="hover:text-white transition-colors">
                            {poll.created_by.first_name} {poll.created_by.last_name}
                          </span>
                        </Link>
                        {poll.ends_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Ends {new Date(poll.ends_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
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
              <BarChart3 className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No polls yet</h3>
            <p className="text-white/50">Community polls will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
