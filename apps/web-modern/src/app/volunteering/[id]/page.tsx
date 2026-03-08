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
  Progress,
} from "@heroui/react";
import {
  Heart,
  Clock,
  MapPin,
  Calendar,
  Users,
  ArrowLeft,
  HandHeart,
  Download,
  Award,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard, MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface OpportunityDetail {
  id: number;
  title: string;
  description: string;
  organisation_name?: string;
  location?: string;
  date?: string;
  hours_needed?: number;
  volunteers_needed?: number;
  volunteers_signed_up: number;
  volunteers: { id: number; first_name: string; last_name: string }[];
  status: string;
  created_at: string;
}

export default function VolunteeringDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <ProtectedRoute>
      <VolunteeringDetailContent params={params} />
    </ProtectedRoute>
  );
}

function VolunteeringDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, logout } = useAuth();
  const [opp, setOpp] = useState<OpportunityDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [volunteerHours, setVolunteerHours] = useState<any>(null);

  const fetchOpp = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getVolunteeringOpportunity(Number(id));
      setOpp(data);
      if (user && data.volunteers) {
        setHasApplied(data.volunteers.some((v) => v.id === user.id));
      }
    } catch (error) {
      logger.error("Failed to fetch opportunity:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchOpp();
  }, [fetchOpp]);
  const fetchVolunteerHours = useCallback(async () => {
    try {
      const hours = await api.getVolunteerHours();
      setVolunteerHours(hours);
    } catch (error) {
      logger.error("Failed to fetch volunteer hours:", error);
    }
  }, []);

  const handleDownloadCertificate = async (opportunityId: number) => {
    try {
      const blob = await api.getVolunteerCertificate(opportunityId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "volunteer-certificate.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error("Failed to download certificate:", error);
    }
  };

    useEffect(() => {
    api.getUnreadMessageCount().then((res) => setUnreadCount(res?.count || 0));
    fetchVolunteerHours();
  }, [fetchVolunteerHours]);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await api.applyToVolunteer(Number(id));
      setHasApplied(true);
      fetchOpp();
    } catch (error) {
      logger.error("Failed to apply:", error);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} unreadCount={unreadCount} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/volunteering"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Volunteering
        </Link>

        {isLoading ? (
          <div className="space-y-6">
            <div className="p-8 rounded-xl bg-white/5 border border-white/10">
              <Skeleton className="w-64 h-8 rounded mb-4" />
              <Skeleton className="w-full h-32 rounded" />
            </div>
          </div>
        ) : opp ? (
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
                    {opp.title}
                  </h1>
                  <Chip
                    size="sm"
                    variant="flat"
                    className={
                      opp.status === "open"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-gray-500/20 text-gray-400"
                    }
                  >
                    {opp.status}
                  </Chip>
                </div>
                {opp.status === "open" && !hasApplied && (
                  <Button
                    className="bg-gradient-to-r from-pink-500 to-rose-600 text-white"
                    startContent={<HandHeart className="w-4 h-4" />}
                    onPress={handleApply}
                    isLoading={isApplying}
                  >
                    Volunteer
                  </Button>
                )}
                {hasApplied && (
                  <Chip
                    size="md"
                    variant="flat"
                    className="bg-emerald-500/20 text-emerald-400"
                  >
                    Signed up
                  </Chip>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-white/50 mb-6">
                {opp.organisation_name && (
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {opp.organisation_name}
                  </span>
                )}
                {opp.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {opp.location}
                  </span>
                )}
                {opp.date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(opp.date).toLocaleDateString()}
                  </span>
                )}
                {opp.hours_needed && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {opp.hours_needed} hours
                  </span>
                )}
              </div>

              {opp.volunteers_needed && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white/60">
                      Volunteer slots
                    </span>
                    <span className="text-sm text-white/60">
                      {opp.volunteers_signed_up} / {opp.volunteers_needed}
                    </span>
                  </div>
                  <Progress
                    value={opp.volunteers_signed_up}
                    maxValue={opp.volunteers_needed}
                    classNames={{
                      track: "bg-white/10",
                      indicator: "bg-pink-500",
                    }}
                  />
                </div>
              )}

              <p className="text-white/70 whitespace-pre-wrap">
                {opp.description}
              </p>
            </MotionGlassCard>

            {/* Volunteers */}
            {opp.volunteers && opp.volunteers.length > 0 && (
              <MotionGlassCard
                variants={itemVariants}
                glow="none"
                padding="lg"
              >
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-pink-400" />
                  Volunteers ({opp.volunteers.length})
                </h2>
                <div className="space-y-2">
                  {opp.volunteers.map((v) => (
                    <Link key={v.id} href={`/members/${v.id}`}>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <Avatar
                          name={`${v.first_name} ${v.last_name}`}
                          size="sm"
                          className="ring-2 ring-white/10"
                        />
                        <p className="text-white font-medium">
                          {v.first_name} {v.last_name}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </MotionGlassCard>
            )}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-white mb-2">
              Opportunity not found
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}
