// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Avatar,
  Skeleton,
  Progress,
  Tabs,
  Tab,
  Pagination,
  Input,
} from "@heroui/react";
import {
  Trophy,
  Star,
  TrendingUp,
  Clock,
  Edit2,
  Save,
  X,
  Crown,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard, MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import {
  api,
  type GamificationProfile,
  type Badge,
  type XpTransaction,
  type LeaderboardEntry,
  type PaginatedResponse,
} from "@/lib/api";
import { logger } from "@/lib/logger";

type ProfileTab = "badges" | "leaderboard" | "history";
type LeaderboardPeriod = "all" | "week" | "month" | "year";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user, logout, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [recentXp, setRecentXp] = useState<XpTransaction[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgeSummary, setBadgeSummary] = useState({ total: 0, earned: 0, progress_percent: 0 });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState(0);
  const [xpHistory, setXpHistory] = useState<XpTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>("badges");
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        const [gamRes, badgesRes] = await Promise.all([
          api.getGamificationProfile(),
          api.getAllBadges().catch((err) => {
            logger.error("Failed to fetch badges:", err);
            return null;
          }),
        ]);

        setProfile(gamRes?.profile || null);
        setRecentXp(gamRes?.recent_xp || []);
        setBadges(badgesRes?.data || []);
        setBadgeSummary(badgesRes?.summary || { total: 0, earned: 0, progress_percent: 0 });
      } catch (error) {
        logger.error("Failed to fetch profile data:", error);
        setRecentXp([]);
        setBadges([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
    }
  }, [user]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await api.getLeaderboard({
        period: leaderboardPeriod,
        page: currentPage,
        limit: 20,
      });
      setLeaderboard(res?.data || []);
      setCurrentUserRank(res?.current_user_rank || 0);
      setTotalPages(res?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch leaderboard:", error);
      setLeaderboard([]);
    }
  }, [leaderboardPeriod, currentPage]);

  const fetchXpHistory = useCallback(async () => {
    try {
      const res = await api.getXpHistory({ page: currentPage, limit: 20 });
      setXpHistory(res?.data || []);
      setTotalPages(res?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch XP history:", error);
      setXpHistory([]);
    }
  }, [currentPage]);

  useEffect(() => {
    if (activeTab === "leaderboard") {
      fetchLeaderboard();
    } else if (activeTab === "history") {
      fetchXpHistory();
    }
  }, [activeTab, fetchLeaderboard, fetchXpHistory]);

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      await api.updateCurrentUser({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      await refreshUser();
      setIsEditing(false);
    } catch (error) {
      logger.error("Failed to update profile:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const xpProgress = profile
    ? profile.xp_required_for_next_level > profile.xp_required_for_current_level
      ? ((profile.total_xp - profile.xp_required_for_current_level) /
          (profile.xp_required_for_next_level - profile.xp_required_for_current_level)) *
        100
      : 100
    : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <GlassCard glow="primary" padding="lg">
            {isLoading ? (
              <div className="flex items-center gap-6">
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="w-48 h-8 rounded mb-2" />
                  <Skeleton className="w-32 h-4 rounded" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative">
                  <Avatar
                    name={`${user?.first_name} ${user?.last_name}`}
                    className="w-24 h-24 text-2xl ring-4 ring-indigo-500/30"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full px-2 py-1 flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-white" />
                    <span className="text-xs font-bold text-white">
                      Lv.{profile?.level}
                    </span>
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  {saveError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                      {saveError}
                    </div>
                  )}
                  {isEditing ? (
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                      <Input
                        value={firstName}
                        onValueChange={setFirstName}
                        placeholder="First name"
                        size="sm"
                        classNames={{
                          input: "text-white",
                          inputWrapper: "bg-white/10 border-white/20",
                        }}
                      />
                      <Input
                        value={lastName}
                        onValueChange={setLastName}
                        placeholder="Last name"
                        size="sm"
                        classNames={{
                          input: "text-white",
                          inputWrapper: "bg-white/10 border-white/20",
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          isIconOnly
                          size="sm"
                          className="bg-emerald-500/20 text-emerald-400"
                          onPress={handleSaveProfile}
                          isLoading={isSaving}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          className="bg-red-500/20 text-red-400"
                          onPress={() => {
                            setIsEditing(false);
                            setFirstName(user?.first_name || "");
                            setLastName(user?.last_name || "");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 justify-center sm:justify-start mb-2">
                      <h1 className="text-2xl font-bold text-white">
                        {user?.first_name} {user?.last_name}
                      </h1>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="text-white/50 hover:text-white"
                        onPress={() => setIsEditing(true)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-white/50 mb-4">{user?.email}</p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">XP Progress</span>
                      <span className="text-white font-medium">
                        {profile?.total_xp} XP
                      </span>
                    </div>
                    <Progress
                      value={xpProgress}
                      className="h-3"
                      classNames={{
                        indicator:
                          "bg-gradient-to-r from-amber-500 to-orange-500",
                        track: "bg-white/10",
                      }}
                    />
                    <p className="text-xs text-white/40">
                      {profile?.xp_to_next_level} XP to level{" "}
                      {(profile?.level || 0) + 1}
                    </p>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col gap-4 text-center">
                  <div className="bg-white/5 rounded-xl px-4 py-3">
                    <Star className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-white">
                      {profile?.badges_earned}
                    </p>
                    <p className="text-xs text-white/50">Badges</p>
                  </div>
                  <div className="bg-white/5 rounded-xl px-4 py-3">
                    <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-white">
                      {profile?.total_xp}
                    </p>
                    <p className="text-xs text-white/50">Total XP</p>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => {
              setActiveTab(key as ProfileTab);
              setCurrentPage(1);
            }}
            classNames={{
              tabList: "bg-white/5 border border-white/10",
              cursor: "bg-indigo-500",
              tab: "text-white/50 data-[selected=true]:text-white",
            }}
          >
            <Tab key="badges" title="Badges" />
            <Tab key="leaderboard" title="Leaderboard" />
            <Tab key="history" title="XP History" />
          </Tabs>
        </div>

        {/* Tab Content */}
        {activeTab === "badges" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-white/50">
                {badgeSummary.earned} of {badgeSummary.total} badges earned (
                {badgeSummary.progress_percent.toFixed(0)}%)
              </p>
            </div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            >
              {badges.map((badge) => (
                <MotionGlassCard
                  key={badge.id}
                  variants={itemVariants}
                  glow={badge.is_earned ? "secondary" : "none"}
                  padding="md"
                  className={!badge.is_earned ? "opacity-40 grayscale" : ""}
                >
                  <div className="text-center">
                    <span className="text-4xl block mb-2">{badge.icon}</span>
                    <h3 className="font-semibold text-white text-sm mb-1">
                      {badge.name}
                    </h3>
                    <p className="text-xs text-white/50 line-clamp-2">
                      {badge.description}
                    </p>
                    {badge.is_earned && badge.earned_at && (
                      <p className="text-xs text-indigo-400 mt-2">
                        Earned {new Date(badge.earned_at).toLocaleDateString()}
                      </p>
                    )}
                    <div className="mt-2 text-xs text-amber-400">
                      +{badge.xp_reward} XP
                    </div>
                  </div>
                </MotionGlassCard>
              ))}
            </motion.div>
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2">
                {(["all", "week", "month", "year"] as LeaderboardPeriod[]).map(
                  (period) => (
                    <Button
                      key={period}
                      size="sm"
                      className={
                        leaderboardPeriod === period
                          ? "bg-indigo-500 text-white"
                          : "bg-white/5 text-white/70 hover:bg-white/10"
                      }
                      onPress={() => {
                        setLeaderboardPeriod(period);
                        setCurrentPage(1);
                      }}
                    >
                      {period === "all"
                        ? "All Time"
                        : period.charAt(0).toUpperCase() + period.slice(1)}
                    </Button>
                  )
                )}
              </div>
            </div>

            {currentUserRank > 0 && (
              <GlassCard glow="accent" padding="md" className="mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <span className="font-bold text-indigo-400">
                      #{currentUserRank}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">Your Rank</p>
                    <p className="text-sm text-white/50">
                      Keep earning XP to climb the leaderboard!
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}

            <div className="space-y-3">
              {leaderboard.map((entry) => (
                <MotionGlassCard
                  key={entry.user.id}
                  variants={itemVariants}
                  glow="none"
                  padding="md"
                  className={entry.user.id === user?.id ? "ring-1 ring-indigo-500/50" : ""}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        entry.rank === 1
                          ? "bg-amber-500/20 text-amber-400"
                          : entry.rank === 2
                          ? "bg-gray-300/20 text-gray-300"
                          : entry.rank === 3
                          ? "bg-orange-600/20 text-orange-400"
                          : "bg-white/10 text-white/70"
                      }`}
                    >
                      {entry.rank <= 3 ? (
                        <Crown className="w-5 h-5" />
                      ) : (
                        `#${entry.rank}`
                      )}
                    </div>
                    <Avatar
                      name={`${entry.user.first_name} ${entry.user.last_name}`}
                      className="ring-2 ring-white/10"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-white">
                        {entry.user.first_name} {entry.user.last_name}
                      </p>
                      <p className="text-sm text-white/50">Level {entry.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{entry.period_xp} XP</p>
                      <p className="text-xs text-white/40">
                        {entry.total_xp} total
                      </p>
                    </div>
                  </div>
                </MotionGlassCard>
              ))}
            </div>

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
          </div>
        )}

        {activeTab === "history" && (
          <div>
            <div className="space-y-3">
              {xpHistory.length > 0 ? (
                xpHistory.map((xp) => (
                  <MotionGlassCard
                    key={xp.id}
                    variants={itemVariants}
                    glow="none"
                    padding="md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">
                          {xp.description}
                        </p>
                        <p className="text-sm text-white/50">{xp.source}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-400">+{xp.amount} XP</p>
                        <p className="text-xs text-white/40">
                          {new Date(xp.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </MotionGlassCard>
                ))
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">No XP history yet</p>
                </div>
              )}
            </div>

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
          </div>
        )}
      </div>
    </div>
  );
}
