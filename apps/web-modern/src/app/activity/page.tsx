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
} from "@heroui/react";
import {
  Activity,
  ArrowLeftRight,
  ShoppingBag,
  CalendarDays,
  MessageSquare,
  Clock,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

type ActivityType = "all" | "exchanges" | "listings" | "events" | "social";

interface ActivityItem {
  id: number;
  type: string;
  title: string;
  description?: string;
  created_at: string;
  user?: { first_name: string; last_name: string; avatar_url?: string };
  metadata?: Record<string, unknown>;
}

const filterOptions: { key: ActivityType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "exchanges", label: "Exchanges" },
  { key: "listings", label: "Listings" },
  { key: "events", label: "Events" },
  { key: "social", label: "Social" },
];

const typeIcons: Record<string, typeof Activity> = {
  exchange: ArrowLeftRight,
  listing: ShoppingBag,
  event: CalendarDays,
  social: MessageSquare,
};

const typeColors: Record<string, string> = {
  exchange: "text-emerald-400",
  listing: "text-amber-400",
  event: "text-blue-400",
  social: "text-purple-400",
};

export default function ActivityPage() {
  return (
    <ProtectedRoute>
      <ActivityContent />
    </ProtectedRoute>
  );
}

function ActivityContent() {
  const { user, logout } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<ActivityType>("all");

  const fetchActivity = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getActivityFeed(currentPage);
      let items: ActivityItem[] = response?.data || [];

      if (filter !== "all") {
        const filterMap: Record<string, string> = {
          exchanges: "exchange",
          listings: "listing",
          events: "event",
          social: "social",
        };
        items = items.filter((a) => a.type === filterMap[filter]);
      }

      setActivities(items);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch activity feed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filter]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);
  const handleFilterChange = (newFilter: ActivityType) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-400" />
            Activity Feed
          </h1>
          <p className="text-white/50 mt-1">Recent community activity and updates</p>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filterOptions.map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={filter === opt.key ? "solid" : "flat"}
              className={
                filter === opt.key
                  ? "bg-indigo-500 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }
              onPress={() => handleFilterChange(opt.key)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-5 rounded-xl bg-white/5 border border-white/10 flex gap-4">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-3/4 h-5 rounded" />
                  <Skeleton className="w-1/2 h-4 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length > 0 ? (
          <>
            <motion.div
              variants={containerVariantsFast}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {activities.map((activity) => {
                const Icon = typeIcons[activity.type] || Activity;
                const iconColor = typeColors[activity.type] || "text-white/40";

                return (
                  <MotionGlassCard
                    key={activity.id}
                    variants={itemVariants}
                    glow="none"
                    padding="md"
                    hover
                  >
                    <div className="flex gap-4">
                      {/* Timeline icon */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center ${iconColor}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="w-px flex-1 bg-white/10 mt-2" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-white">
                              {activity.title}
                            </h3>
                            {activity.user && (
                              <p className="text-xs text-white/40 mt-0.5">
                                {activity.user.first_name} {activity.user.last_name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Chip
                              size="sm"
                              variant="flat"
                              className="bg-white/5 text-white/40 capitalize"
                            >
                              {activity.type}
                            </Chip>
                          </div>
                        </div>

                        {activity.description && (
                          <p className="text-sm text-white/50 mt-2 line-clamp-2">
                            {activity.description}
                          </p>
                        )}

                        <div className="flex items-center gap-1 text-xs text-white/30 mt-2">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(activity.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </MotionGlassCard>
                );
              })}
            </motion.div>

            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
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
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No activity yet</h3>
            <p className="text-white/50">Community activity will appear here as members interact.</p>
          </div>
        )}
      </div>
    </div>
  );
}
