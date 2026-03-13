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
  Chip,
  Skeleton,
  Textarea,
} from "@heroui/react";
import {
  Clock,
  MapPin,
  Building2,
  ArrowLeft,
  Send,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface JobDetail {
  id: number;
  title: string;
  description: string;
  requirements?: string;
  organisation_name?: string;
  type: string;
  location?: string;
  hours_per_week?: number;
  time_credits_per_hour?: number;
  status: string;
  applications_count: number;
  created_at: string;
  posted_by: { id: number; first_name: string; last_name: string };
}

const typeColors: Record<string, string> = {
  "full-time": "bg-blue-500/20 text-blue-400",
  "part-time": "bg-purple-500/20 text-purple-400",
  "one-off": "bg-amber-500/20 text-amber-400",
  ongoing: "bg-emerald-500/20 text-emerald-400",
};

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <ProtectedRoute>
      <JobDetailContent params={params} />
    </ProtectedRoute>
  );
}

function JobDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, logout } = useAuth();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [coverMessage, setCoverMessage] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const fetchJob = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getJob(Number(id));
      setJob(data);
    } catch (error) {
      logger.error("Failed to fetch job:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);
  const handleApply = async () => {
    setIsApplying(true);
    try {
      await api.applyForJob(Number(id), {
        cover_message: coverMessage || undefined,
      });
      setHasApplied(true);
    } catch (error) {
      logger.error("Failed to apply:", error);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </Link>

        {isLoading ? (
          <div className="space-y-6">
            <div className="p-8 rounded-xl bg-white/5 border border-white/10">
              <Skeleton className="w-64 h-8 rounded mb-4" />
              <Skeleton className="w-full h-32 rounded" />
            </div>
          </div>
        ) : job ? (
          <motion.div
            variants={containerVariantsFast}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Header */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-3">
                    {job.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <Chip
                      size="sm"
                      variant="flat"
                      className={typeColors[job.type] || "bg-gray-500/20 text-gray-400"}
                    >
                      {job.type}
                    </Chip>
                    <Chip
                      size="sm"
                      variant="flat"
                      className={
                        job.status === "open"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }
                    >
                      {job.status}
                    </Chip>
                  </div>
                </div>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap gap-4 text-sm text-white/50 mb-6">
                {job.organisation_name && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {job.organisation_name}
                  </span>
                )}
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </span>
                )}
                {job.hours_per_week && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {job.hours_per_week} hrs/week
                  </span>
                )}
                {job.time_credits_per_hour && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {job.time_credits_per_hour} credits/hr
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {job.applications_count} applications
                </span>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-white/60 uppercase mb-2">
                  Description
                </h2>
                <p className="text-white/70 whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>

              {job.requirements && (
                <div className="mb-6">
                  <h2 className="text-sm font-semibold text-white/60 uppercase mb-2">
                    Requirements
                  </h2>
                  <p className="text-white/70 whitespace-pre-wrap">
                    {job.requirements}
                  </p>
                </div>
              )}

              {/* Posted by */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <Link href={`/members/${job.posted_by.id}`}>
                  <Avatar
                    name={`${job.posted_by.first_name} ${job.posted_by.last_name}`}
                    size="sm"
                    className="ring-2 ring-white/10"
                  />
                </Link>
                <div>
                  <p className="text-sm text-white/40">Posted by</p>
                  <Link href={`/members/${job.posted_by.id}`}>
                    <p className="text-sm text-white hover:text-indigo-400 transition-colors">
                      {job.posted_by.first_name} {job.posted_by.last_name}
                    </p>
                  </Link>
                </div>
                <span className="text-xs text-white/30 ml-auto">
                  {new Date(job.created_at).toLocaleDateString()}
                </span>
              </div>
            </MotionGlassCard>

            {/* Apply */}
            {job.status === "open" &&
              user &&
              job.posted_by.id !== user.id && (
                <MotionGlassCard
                  variants={itemVariants}
                  glow="none"
                  padding="lg"
                >
                  {hasApplied ? (
                    <div className="text-center py-4">
                      <p className="text-emerald-400 font-semibold">
                        Application submitted!
                      </p>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-white mb-4">
                        Apply for this job
                      </h2>
                      <Textarea
                        placeholder="Write a cover message (optional)..."
                        value={coverMessage}
                        onValueChange={setCoverMessage}
                        classNames={{
                          input: "text-white placeholder:text-white/30",
                          inputWrapper:
                            "bg-white/5 border border-white/10",
                        }}
                        minRows={3}
                        className="mb-4"
                      />
                      <Button
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                        startContent={<Send className="w-4 h-4" />}
                        onPress={handleApply}
                        isLoading={isApplying}
                      >
                        Submit Application
                      </Button>
                    </>
                  )}
                </MotionGlassCard>
              )}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-white mb-2">
              Job not found
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}
