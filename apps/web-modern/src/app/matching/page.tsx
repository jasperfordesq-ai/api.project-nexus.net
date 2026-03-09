// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button, Avatar, Skeleton, Progress } from "@heroui/react";
import { Zap, RefreshCw, CheckCircle, XCircle, UserCheck } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface Match {
  id: number;
  matched_user_id: number;
  score: number;
  factors: Record<string, number>;
  matched_user: { id: number; first_name: string; last_name: string };
  status: string;
  created_at: string;
}

export default function MatchingPage() {
  return (
    <ProtectedRoute>
      <MatchingContent />
    </ProtectedRoute>
  );
}

function MatchingContent() {
  const { user, logout } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComputing, setIsComputing] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getMatches();
      setMatches(data || []);
    } catch (error) {
      logger.error("Failed to fetch matches:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const handleCompute = async () => {
    setIsComputing(true);
    try {
      await api.computeMatches();
      fetchData();
    } catch (error) {
      logger.error("Failed to compute matches:", error);
    } finally {
      setIsComputing(false);
    }
  };

  const handleRespond = async (id: number, response: string) => {
    try {
      await api.respondToMatch(id, response);
      setMatches((prev) => prev.map((m) => m.id === id ? { ...m, status: response } : m));
    } catch (error) {
      logger.error("Failed to respond to match:", error);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Zap className="w-8 h-8 text-indigo-400" />
              Smart Matches
            </h1>
            <p className="text-white/50 mt-1">Members matched to you based on skills and interests</p>
          </div>
          <Button
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={handleCompute}
            isLoading={isComputing}
          >
            Find Matches
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-5 rounded" />
              </div>
            ))}
          </div>
        ) : matches.length > 0 ? (
          <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-4">
            {matches.map((match) => (
              <MotionGlassCard key={match.id} variants={itemVariants} glow="none" padding="md" hover>
                <div className="flex items-center gap-4">
                  <Link href={`/members/${match.matched_user.id}`}>
                    <Avatar
                      name={`${match.matched_user.first_name} ${match.matched_user.last_name}`}
                      size="lg"
                      className="ring-2 ring-white/10"
                    />
                  </Link>
                  <div className="flex-1">
                    <Link href={`/members/${match.matched_user.id}`}>
                      <p className="text-white font-semibold hover:text-indigo-400 transition-colors">
                        {match.matched_user.first_name} {match.matched_user.last_name}
                      </p>
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-white/50">Match score:</span>
                      <Progress
                        value={match.score}
                        maxValue={100}
                        className="w-24"
                        classNames={{
                          track: "bg-white/10",
                          indicator: match.score > 70 ? "bg-emerald-500" : match.score > 40 ? "bg-amber-500" : "bg-red-500",
                        }}
                        size="sm"
                      />
                      <span className="text-sm font-semibold text-indigo-400">{Math.round(match.score)}%</span>
                    </div>
                  </div>
                  {match.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-emerald-500/20 text-emerald-400" startContent={<CheckCircle className="w-4 h-4" />} onPress={() => handleRespond(match.id, "accepted")}>
                        Connect
                      </Button>
                      <Button size="sm" className="bg-red-500/20 text-red-400" startContent={<XCircle className="w-4 h-4" />} onPress={() => handleRespond(match.id, "declined")}>
                        Skip
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-white/40 capitalize">{match.status}</span>
                  )}
                </div>
              </MotionGlassCard>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No matches yet</h3>
            <p className="text-white/50 mb-6">Click &quot;Find Matches&quot; to discover compatible members.</p>
          </div>
        )}
      </div>
    </div>
  );
}
