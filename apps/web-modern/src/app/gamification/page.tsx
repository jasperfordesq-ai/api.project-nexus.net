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
  Progress,
  Tab,
  Tabs,
} from "@heroui/react";
import {
  Trophy,
  Flame,
  Gift,
  Star,
  Medal,
  Zap,
  Crown,
  Target,
  Calendar,
  TrendingUp,
  Award,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface Challenge {
  id: number;
  title: string;
  description: string;
  type: string;
  target_value: number;
  current_value?: number;
  reward_xp: number;
  start_date: string;
  end_date: string;
  participant_count: number;
  is_joined: boolean;
  status: string;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  streak_type: string;
}

interface DailyReward {
  claimed: boolean;
  reward_xp: number;
  day_number: number;
  next_claim_at?: string;
}

interface Season {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  theme: string;
}

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  display_name: string;
  avatar_url?: string;
  xp: number;
  level: number;
}

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  earned: boolean;
  earned_at?: string;
  rarity: string;
}

interface GamificationStats {
  total_xp: number;
  level: number;
  xp_to_next_level: number;
  challenges_completed: number;
  achievements_earned: number;
  current_streak: number;
  season_rank?: number;
}

const challengeStatusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  completed: "bg-blue-500/20 text-blue-400",
  expired: "bg-red-500/20 text-red-400",
  upcoming: "bg-amber-500/20 text-amber-400",
};

const rarityColors: Record<string, string> = {
  common: "bg-gray-500/20 text-gray-400",
  uncommon: "bg-green-500/20 text-green-400",
  rare: "bg-blue-500/20 text-blue-400",
  epic: "bg-purple-500/20 text-purple-400",
  legendary: "bg-amber-500/20 text-amber-400",
};

export default function GamificationPage() {
  return (
    <ProtectedRoute>
      <GamificationContent />
    </ProtectedRoute>
  );
}

function GamificationContent() {
  const { user, logout } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [dailyReward, setDailyReward] = useState<DailyReward | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [claimingReward, setClaimingReward] = useState(false);
  const [activeTab, setActiveTab] = useState("challenges");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        challengesRes,
        streakRes,
        seasonsRes,
        currentSeasonRes,
        achievementsRes,
        statsRes,
      ] = await Promise.all([
        api.getChallenges().catch(() => []),
        api.getStreak().catch(() => null),
        api.getSeasons().catch(() => []),
        api.getCurrentSeason().catch(() => null),
        api.getAchievements().catch(() => []),
        api.getGamificationStats().catch(() => null),
      ]);

      setChallenges(challengesRes || []);
      setStreak(streakRes);
      setSeasons(seasonsRes || []);
      setCurrentSeason(currentSeasonRes);
      setAchievements(achievementsRes || []);
      setStats(statsRes);

      if (currentSeasonRes?.id) {
        const lb = await api.getSeasonLeaderboard(currentSeasonRes.id).catch(() => []);
        setLeaderboard(lb || []);
      }
    } catch (error) {
      logger.error("Failed to fetch gamification data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const handleJoinChallenge = async (challengeId: number) => {
    setJoiningId(challengeId);
    try {
      await api.joinChallenge(challengeId);
      setChallenges((prev) =>
        prev.map((c) => (c.id === challengeId ? { ...c, is_joined: true, participant_count: c.participant_count + 1 } : c))
      );
    } catch (error) {
      logger.error("Failed to join challenge:", error);
    } finally {
      setJoiningId(null);
    }
  };

  const handleClaimReward = async () => {
    setClaimingReward(true);
    try {
      const result = await api.claimDailyReward();
      setDailyReward(result);
      if (stats) {
        setStats({ ...stats, total_xp: stats.total_xp + (result?.reward_xp || 0) });
      }
    } catch (error) {
      logger.error("Failed to claim daily reward:", error);
    } finally {
      setClaimingReward(false);
    }
  };

  const renderStats = () => {
    if (!stats) return null;
    const xpProgress = stats.xp_to_next_level > 0
      ? ((stats.total_xp % stats.xp_to_next_level) / stats.xp_to_next_level) * 100
      : 0;

    return (
      <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-2xl font-bold text-white">{stats.level}</span>
            </div>
            <span className="text-xs text-white/40">Level</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span className="text-2xl font-bold text-white">{stats.total_xp.toLocaleString()}</span>
            </div>
            <span className="text-xs text-white/40">Total XP</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-2xl font-bold text-white">{stats.current_streak}</span>
            </div>
            <span className="text-xs text-white/40">Day Streak</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span className="text-2xl font-bold text-white">{stats.achievements_earned}</span>
            </div>
            <span className="text-xs text-white/40">Achievements</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white/60">Level Progress</span>
            <span className="text-indigo-400 font-semibold">
              {stats.total_xp % (stats.xp_to_next_level || 1)} / {stats.xp_to_next_level} XP
            </span>
          </div>
          <Progress
            value={xpProgress}
            maxValue={100}
            classNames={{ track: "bg-white/10", indicator: "bg-indigo-500" }}
          />
        </div>
      </MotionGlassCard>
    );
  };

  const renderChallenges = () => (
    <div className="space-y-4">
      {challenges.length > 0 ? (
        challenges.map((challenge) => {
          const pct = challenge.target_value > 0 && challenge.current_value
            ? (challenge.current_value / challenge.target_value) * 100
            : 0;
          return (
            <MotionGlassCard key={challenge.id} variants={itemVariants} glow="none" padding="lg" hover>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-semibold text-white">{challenge.title}</h3>
                </div>
                <Chip size="sm" variant="flat" className={challengeStatusColors[challenge.status] || ""}>
                  {challenge.status}
                </Chip>
              </div>
              <p className="text-sm text-white/50 mb-4 line-clamp-2">{challenge.description}</p>

              {challenge.is_joined && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/60">Progress</span>
                    <span className="text-indigo-400 font-semibold">
                      {challenge.current_value || 0} / {challenge.target_value}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    maxValue={100}
                    classNames={{ track: "bg-white/10", indicator: "bg-indigo-500" }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-white/40">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {challenge.participant_count} participants
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    {challenge.reward_xp} XP
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Ends {new Date(challenge.end_date).toLocaleDateString()}
                  </span>
                </div>
                {!challenge.is_joined && challenge.status === "active" && (
                  <Button
                    size="sm"
                    className="bg-indigo-500 text-white hover:bg-indigo-600"
                    isLoading={joiningId === challenge.id}
                    onPress={() => handleJoinChallenge(challenge.id)}
                  >
                    Join
                  </Button>
                )}
              </div>
            </MotionGlassCard>
          );
        })
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-white/20" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No challenges yet</h3>
          <p className="text-white/50">Active challenges will appear here.</p>
        </div>
      )}
    </div>
  );

  const renderStreaksAndRewards = () => (
    <div className="space-y-6">
      {/* Streak Card */}
      <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <Flame className="w-6 h-6 text-orange-400" />
          <h3 className="text-lg font-semibold text-white">Current Streak</h3>
        </div>
        {streak ? (
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Flame className="w-8 h-8 text-orange-400" />
                <span className="text-4xl font-bold text-white">{streak.current_streak}</span>
              </div>
              <span className="text-sm text-white/40">Current Streak (days)</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="w-8 h-8 text-amber-400" />
                <span className="text-4xl font-bold text-white">{streak.longest_streak}</span>
              </div>
              <span className="text-sm text-white/40">Longest Streak (days)</span>
            </div>
          </div>
        ) : (
          <p className="text-white/50 text-sm">Start your streak by being active every day!</p>
        )}
      </MotionGlassCard>

      {/* Daily Reward Card */}
      <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <Gift className="w-6 h-6 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">Daily Reward</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm mb-1">
              {dailyReward?.claimed
                ? `You earned ${dailyReward.reward_xp} XP today!`
                : "Claim your daily bonus XP reward."}
            </p>
            {dailyReward?.day_number && (
              <p className="text-xs text-white/40">Day {dailyReward.day_number} streak bonus</p>
            )}
          </div>
          <Button
            className={
              dailyReward?.claimed
                ? "bg-white/10 text-white/40"
                : "bg-emerald-500 text-white hover:bg-emerald-600"
            }
            isDisabled={dailyReward?.claimed}
            isLoading={claimingReward}
            onPress={handleClaimReward}
            startContent={<Gift className="w-4 h-4" />}
          >
            {dailyReward?.claimed ? "Claimed" : "Claim Reward"}
          </Button>
        </div>
      </MotionGlassCard>
    </div>
  );

  const renderSeasons = () => (
    <div className="space-y-6">
      {/* Current Season */}
      {currentSeason && (
        <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">{currentSeason.name}</h3>
              <p className="text-xs text-white/40">
                {new Date(currentSeason.start_date).toLocaleDateString()} &mdash;{" "}
                {new Date(currentSeason.end_date).toLocaleDateString()}
              </p>
            </div>
            {currentSeason.is_active && (
              <Chip size="sm" variant="flat" className="bg-emerald-500/20 text-emerald-400 ml-auto">
                Active
              </Chip>
            )}
          </div>
          {stats?.season_rank && (
            <p className="text-sm text-white/60">
              Your rank: <span className="text-amber-400 font-semibold">#{stats.season_rank}</span>
            </p>
          )}
        </MotionGlassCard>
      )}

      {/* Leaderboard */}
      <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <Medal className="w-6 h-6 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Season Leaderboard</h3>
        </div>
        {leaderboard.length > 0 ? (
          <div className="space-y-3">
            {leaderboard.map((entry) => (
              <div
                key={entry.user_id}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className={`text-lg font-bold w-8 text-center ${
                  entry.rank === 1 ? "text-amber-400" :
                  entry.rank === 2 ? "text-gray-300" :
                  entry.rank === 3 ? "text-amber-600" :
                  "text-white/40"
                }`}>
                  #{entry.rank}
                </span>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm text-white/60">
                  {entry.display_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-white">{entry.display_name}</span>
                  <span className="text-xs text-white/40 ml-2">Lv.{entry.level}</span>
                </div>
                <span className="text-sm font-semibold text-indigo-400">{entry.xp.toLocaleString()} XP</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/50 text-sm text-center py-4">No leaderboard data available yet.</p>
        )}
      </MotionGlassCard>
    </div>
  );

  const renderAchievements = () => {
    const earned = achievements.filter((a) => a.earned);
    const locked = achievements.filter((a) => !a.earned);

    return (
      <div className="space-y-6">
        {earned.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
              Earned ({earned.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {earned.map((achievement) => (
                <MotionGlassCard key={achievement.id} variants={itemVariants} glow="none" padding="md" hover>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                      <Award className="w-6 h-6 text-amber-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-white mb-1">{achievement.name}</h4>
                    <p className="text-xs text-white/40 line-clamp-2 mb-2">{achievement.description}</p>
                    <Chip size="sm" variant="flat" className={rarityColors[achievement.rarity] || ""}>
                      {achievement.rarity}
                    </Chip>
                    {achievement.earned_at && (
                      <p className="text-xs text-white/30 mt-1">
                        {new Date(achievement.earned_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </MotionGlassCard>
              ))}
            </div>
          </div>
        )}

        {locked.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
              Locked ({locked.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {locked.map((achievement) => (
                <MotionGlassCard key={achievement.id} variants={itemVariants} glow="none" padding="md">
                  <div className="text-center opacity-50">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2">
                      <Award className="w-6 h-6 text-white/20" />
                    </div>
                    <h4 className="text-sm font-semibold text-white mb-1">{achievement.name}</h4>
                    <p className="text-xs text-white/40 line-clamp-2 mb-2">{achievement.description}</p>
                    <Chip size="sm" variant="flat" className={rarityColors[achievement.rarity] || ""}>
                      {achievement.rarity}
                    </Chip>
                  </div>
                </MotionGlassCard>
              ))}
            </div>
          </div>
        )}

        {achievements.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No achievements yet</h3>
            <p className="text-white/50">Complete challenges and stay active to earn achievements.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400" />
            Gamification
          </h1>
          <p className="text-white/50 mt-1">Challenges, streaks, seasons, and achievements</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-6 rounded mb-4" />
                <Skeleton className="w-full h-4 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="mb-8">
              {renderStats()}
            </motion.div>

            {/* Tabs */}
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(key as string)}
              classNames={{
                tabList: "bg-white/5 border border-white/10",
                tab: "text-white/60 data-[selected=true]:text-white",
                cursor: "bg-indigo-500",
              }}
              className="mb-6"
            >
              <Tab key="challenges" title="Challenges" />
              <Tab key="streaks" title="Streaks & Rewards" />
              <Tab key="seasons" title="Seasons" />
              <Tab key="achievements" title="Achievements" />
            </Tabs>

            <motion.div variants={containerVariantsFast} initial="hidden" animate="visible">
              {activeTab === "challenges" && renderChallenges()}
              {activeTab === "streaks" && renderStreaksAndRewards()}
              {activeTab === "seasons" && renderSeasons()}
              {activeTab === "achievements" && renderAchievements()}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
