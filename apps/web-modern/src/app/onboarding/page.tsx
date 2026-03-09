// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button, Progress, Skeleton } from "@heroui/react";
import {
  CheckCircle,
  Circle,
  Sparkles,
  ArrowRight,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard, MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface OnboardingStep {
  id: number;
  key: string;
  title: string;
  description: string;
  sort_order: number;
  xp_reward: number;
}

interface CompletedStep {
  step_id: number;
  key: string;
  completed_at: string;
}

const stepLinks: Record<string, string> = {
  profile_complete: "/settings",
  skills_added: "/settings",
  first_listing: "/listings/new",
  first_connection: "/members",
  first_exchange: "/listings",
  join_group: "/groups",
  attend_event: "/events",
};

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <OnboardingContent />
    </ProtectedRoute>
  );
}

function OnboardingContent() {
  const { user, logout } = useAuth();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [stepsRes, progressRes] = await Promise.all([
        api.getOnboardingSteps(),
        api.getOnboardingProgress(),
      ]);
      setSteps(stepsRes?.data || []);
      const completed = new Set(
        (progressRes?.data?.completed_steps || []).map((s: CompletedStep) => s.key)
      );
      setCompletedKeys(completed);
      setCompletionPercentage(progressRes?.data?.completion_percentage || 0);
    } catch (error) {
      logger.error("Failed to fetch onboarding data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const isComplete = completionPercentage >= 100;

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-indigo-400" />
            Getting Started
          </h1>
          <p className="text-white/50 mt-1">
            Complete these steps to get the most out of the community
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="w-full h-8 rounded" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-5 rounded mb-2" />
                <Skeleton className="w-full h-4 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVariantsFast}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Progress Bar */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-medium">Your Progress</p>
                <span className="text-sm text-indigo-400 font-semibold">
                  {Math.round(completionPercentage)}%
                </span>
              </div>
              <Progress
                value={completionPercentage}
                className="mb-2"
                classNames={{
                  track: "bg-white/10",
                  indicator: "bg-gradient-to-r from-indigo-500 to-purple-600",
                }}
              />
              <p className="text-xs text-white/40">
                {completedKeys.size} of {steps.length} steps completed
              </p>
            </MotionGlassCard>

            {/* Completion Celebration */}
            {isComplete && (
              <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
                <div className="text-center py-4">
                  <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-white mb-2">
                    All Steps Complete!
                  </h2>
                  <p className="text-white/60">
                    You&apos;re all set to make the most of the community.
                  </p>
                </div>
              </MotionGlassCard>
            )}

            {/* Steps */}
            {steps
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((step) => {
                const isDone = completedKeys.has(step.key);
                const link = stepLinks[step.key];

                return (
                  <MotionGlassCard
                    key={step.id}
                    variants={itemVariants}
                    glow="none"
                    padding="md"
                    hover={!isDone}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 shrink-0">
                        {isDone ? (
                          <CheckCircle className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <Circle className="w-6 h-6 text-white/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${isDone ? "text-white/50 line-through" : "text-white"}`}>
                          {step.title}
                        </p>
                        <p className="text-sm text-white/40 mt-1">
                          {step.description}
                        </p>
                        {step.xp_reward > 0 && (
                          <span className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">
                            <Sparkles className="w-3 h-3" />
                            +{step.xp_reward} XP
                          </span>
                        )}
                      </div>
                      {!isDone && link && (
                        <Link href={link}>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shrink-0"
                            endContent={<ArrowRight className="w-4 h-4" />}
                          >
                            Start
                          </Button>
                        </Link>
                      )}
                    </div>
                  </MotionGlassCard>
                );
              })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
