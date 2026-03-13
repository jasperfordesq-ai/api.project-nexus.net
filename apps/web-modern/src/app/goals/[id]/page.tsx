// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback, use } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Avatar,
  Skeleton,
  Progress,
  Input,
} from "@heroui/react";
import {
  Target,
  CheckCircle,
  Circle,
  ArrowLeft,
  Users,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface GoalDetail {
  id: number;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  unit: string;
  status: string;
  deadline?: string;
  milestones: { id: number; title: string; completed: boolean; completed_at?: string }[];
  contributors: { id: number; first_name: string; last_name: string; contribution: number }[];
  created_at: string;
}

export default function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <ProtectedRoute><GoalDetailContent params={params} /></ProtectedRoute>;
}

function GoalDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, logout } = useAuth();
  const [goal, setGoal] = useState<GoalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [isContributing, setIsContributing] = useState(false);

  const fetchGoal = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getGoal(Number(id));
      setGoal(data);
    } catch (error) {
      logger.error("Failed to fetch goal:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchGoal(); }, [fetchGoal]);
  const handleContribute = async () => {
    if (!amount || Number(amount) <= 0) return;
    setIsContributing(true);
    try {
      await api.contributeToGoal(Number(id), { amount: Number(amount) });
      setAmount("");
      fetchGoal();
    } catch (error) {
      logger.error("Failed to contribute:", error);
    } finally {
      setIsContributing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/goals" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Goals
        </Link>

        {isLoading ? (
          <div className="p-8 rounded-xl bg-white/5 border border-white/10">
            <Skeleton className="w-64 h-8 rounded mb-4" />
            <Skeleton className="w-full h-32 rounded" />
          </div>
        ) : goal ? (
          <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-6">
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h1 className="text-2xl font-bold text-white mb-2">{goal.title}</h1>
              <p className="text-white/70 mb-6">{goal.description}</p>

              <div className="mb-6">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Progress</span>
                  <span className="text-indigo-400 font-semibold">
                    {goal.current_value} / {goal.target_value} {goal.unit}
                  </span>
                </div>
                <Progress
                  value={(goal.current_value / goal.target_value) * 100}
                  maxValue={100}
                  size="lg"
                  classNames={{ track: "bg-white/10", indicator: "bg-indigo-500" }}
                />
              </div>

              {goal.status === "active" && (
                <div className="flex gap-3 items-end">
                  <Input
                    type="number"
                    label={`Contribute (${goal.unit})`}
                    value={amount}
                    onValueChange={setAmount}
                    classNames={{
                      input: "text-white",
                      inputWrapper: "bg-white/5 border border-white/10",
                      label: "text-white/60",
                    }}
                    className="w-48"
                  />
                  <Button
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                    startContent={<Plus className="w-4 h-4" />}
                    onPress={handleContribute}
                    isLoading={isContributing}
                    isDisabled={!amount || Number(amount) <= 0}
                  >
                    Contribute
                  </Button>
                </div>
              )}
            </MotionGlassCard>

            {/* Milestones */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4">Milestones</h2>
              <div className="space-y-3">
                {goal.milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    {m.completed ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-white/20 flex-shrink-0" />
                    )}
                    <span className={m.completed ? "text-white/60 line-through" : "text-white"}>
                      {m.title}
                    </span>
                    {m.completed_at && (
                      <span className="text-xs text-white/30 ml-auto">
                        {new Date(m.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </MotionGlassCard>

            {/* Contributors */}
            {goal.contributors.length > 0 && (
              <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" /> Contributors
                </h2>
                <div className="space-y-2">
                  {goal.contributors.map((c) => (
                    <Link key={c.id} href={`/members/${c.id}`}>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <Avatar name={`${c.first_name} ${c.last_name}`} size="sm" className="ring-2 ring-white/10" />
                        <p className="text-white font-medium flex-1">{c.first_name} {c.last_name}</p>
                        <span className="text-sm text-indigo-400">{c.contribution} {goal.unit}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </MotionGlassCard>
            )}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-white">Goal not found</h3>
          </div>
        )}
      </div>
    </div>
  );
}
