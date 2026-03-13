// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button, Progress, Avatar, Chip, Skeleton } from "@heroui/react";
import {
  Wallet,
  TrendingUp,
  Clock,
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  ListTodo,
  Plus,
  ChevronRight,
  Sparkles,
  Calendar,
  Trophy,
  Star,
  Award,
  ArrowLeftRight,
  Briefcase,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import {
  api,
  type WalletBalance,
  type Transaction,
  type Listing,
  type GamificationProfile,
} from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariants, itemVariants } from "@/lib/animations";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [gamification, setGamification] = useState<GamificationProfile | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [balanceRes, txRes, listingsRes, msgRes, gamRes] = await Promise.all([
          api.getBalance(),
          api.getTransactions({ limit: 5 }),
          api.getListings({ status: "active", limit: 4 }),
          api.getUnreadMessageCount().catch(() => ({ count: 0 })),
          api.getGamificationProfile().catch(() => null),
        ]);

        setBalance(balanceRes);
        setTransactions(txRes?.data || []);
        setListings(listingsRes?.data || []);
        setMessageCount(msgRes?.count || 0);
        if (gamRes?.profile) {
          setGamification(gamRes.profile);
        }
      } catch (error) {
        logger.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {user?.first_name}!
          </h1>
          <p className="text-white/50 mt-1">
            Here&apos;s what&apos;s happening with your account today.
          </p>
        </motion.div>

        {/* Dashboard Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* Balance Card */}
          <MotionGlassCard
            variants={itemVariants}
            className="md:col-span-2"
            glow="primary"
            padding="lg"
          >
            {isLoading ? (
              <DashboardSkeleton />
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-white/50">Time Credits</p>
                      <p className="text-3xl font-bold text-white">
                        {balance?.balance ?? 0}
                      </p>
                    </div>
                  </div>
                  <Chip
                    startContent={<TrendingUp className="w-3 h-3" />}
                    size="sm"
                    className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    variant="bordered"
                  >
                    Active
                  </Chip>
                </div>

                <div className="flex gap-3 mt-auto">
                  <Link href="/wallet/send" className="flex-1">
                    <Button
                      className="w-full bg-white/10 text-white hover:bg-white/20"
                      startContent={<ArrowUpRight className="w-4 h-4" />}
                    >
                      Send
                    </Button>
                  </Link>
                  <Link href="/wallet" className="flex-1">
                    <Button
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                      startContent={<ArrowDownLeft className="w-4 h-4" />}
                    >
                      History
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </MotionGlassCard>

          {/* Gamification Card */}
          <MotionGlassCard variants={itemVariants} glow="secondary" padding="lg">
            {isLoading ? (
              <Skeleton className="w-full h-32 rounded-lg" />
            ) : gamification ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span className="text-white font-medium">Level {gamification.level}</span>
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">XP Progress</span>
                    <span className="text-white">{gamification.total_xp} XP</span>
                  </div>
                  <Progress
                    value={
                      gamification.xp_required_for_next_level > gamification.xp_required_for_current_level
                        ? ((gamification.total_xp - gamification.xp_required_for_current_level) /
                            (gamification.xp_required_for_next_level -
                              gamification.xp_required_for_current_level)) *
                          100
                        : 0
                    }
                    className="h-2"
                    classNames={{
                      indicator: "bg-gradient-to-r from-amber-500 to-orange-500",
                      track: "bg-white/10",
                    }}
                  />
                  <p className="text-xs text-white/40">
                    {gamification.xp_to_next_level} XP to level {gamification.level + 1}
                  </p>
                </div>
                <Link href="/profile" className="mt-4">
                  <Button
                    size="sm"
                    variant="flat"
                    className="w-full bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
                    endContent={<Star className="w-4 h-4" />}
                  >
                    {gamification.badges_earned} Badges
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Trophy className="w-8 h-8 text-white/20 mb-2" />
                <p className="text-sm text-white/50">Gamification coming soon</p>
              </div>
            )}
          </MotionGlassCard>

          {/* Messages Card */}
          <MotionGlassCard variants={itemVariants} glow="accent" padding="lg">
            <div className="flex flex-col h-full">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold text-white">{messageCount}</p>
              <p className="text-sm text-white/50 mb-4">Unread Messages</p>
              <Link href="/messages" className="mt-auto">
                <Button
                  size="sm"
                  variant="flat"
                  className="w-full bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
                  endContent={<ChevronRight className="w-4 h-4" />}
                >
                  View All
                </Button>
              </Link>
            </div>
          </MotionGlassCard>

          {/* Recent Transactions */}
          <MotionGlassCard
            variants={itemVariants}
            className="md:col-span-2"
            glow="none"
            padding="none"
          >
            <div className="p-5 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Recent Transactions
                </h3>
                <Link href="/wallet">
                  <Button
                    size="sm"
                    variant="light"
                    className="text-white/50 hover:text-white"
                    endContent={<ChevronRight className="w-4 h-4" />}
                  >
                    View All
                  </Button>
                </Link>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="p-4">
                    <Skeleton className="w-full h-12 rounded-lg" />
                  </div>
                ))
              ) : transactions.length > 0 ? (
                transactions.map((tx) => {
                  const isSent = tx.sender_id === user?.id;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isSent ? "bg-orange-500/20" : "bg-emerald-500/20"
                          }`}
                        >
                          {isSent ? (
                            <ArrowUpRight className="w-4 h-4 text-orange-400" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {tx.description}
                          </p>
                          <p className="text-xs text-white/40">
                            {isSent ? "To" : "From"}{" "}
                            {isSent
                              ? `${tx.receiver?.first_name} ${tx.receiver?.last_name}`
                              : `${tx.sender?.first_name} ${tx.sender?.last_name}`}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`font-medium ${
                          isSent ? "text-orange-400" : "text-emerald-400"
                        }`}
                      >
                        {isSent ? "-" : "+"}
                        {tx.amount}h
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <p className="text-white/40">No transactions yet</p>
                </div>
              )}
            </div>
          </MotionGlassCard>

          {/* Recent Listings */}
          <MotionGlassCard
            variants={itemVariants}
            className="md:col-span-2"
            glow="none"
            padding="none"
          >
            <div className="p-5 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Recent Listings
                </h3>
                <Link href="/listings">
                  <Button
                    size="sm"
                    variant="light"
                    className="text-white/50 hover:text-white"
                    endContent={<ChevronRight className="w-4 h-4" />}
                  >
                    Browse All
                  </Button>
                </Link>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="p-4">
                    <Skeleton className="w-full h-12 rounded-lg" />
                  </div>
                ))
              ) : listings.length > 0 ? (
                listings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/listings/${listing.id}`}
                    className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={`${listing.user?.first_name} ${listing.user?.last_name}`}
                        size="sm"
                        className="ring-2 ring-white/10"
                      />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {listing.title}
                        </p>
                        <p className="text-xs text-white/40">
                          by {listing.user?.first_name} {listing.user?.last_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip
                        size="sm"
                        variant="flat"
                        className={
                          listing.type === "offer"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-amber-500/20 text-amber-400"
                        }
                      >
                        {listing.type}
                      </Chip>
                      <span className="text-sm font-medium text-white/70">
                        {listing.time_credits}h
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-white/40">No listings yet</p>
                  <Link href="/listings/new" className="mt-2 inline-block">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                      startContent={<Plus className="w-4 h-4" />}
                    >
                      Create Listing
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </MotionGlassCard>

          {/* Quick Actions */}
          <MotionGlassCard
            variants={itemVariants}
            className="lg:col-span-4"
            glow="none"
            padding="lg"
          >
            <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link href="/listings/new">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-center cursor-pointer">
                  <ListTodo className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                  <p className="text-sm text-white">New Listing</p>
                </div>
              </Link>
              <Link href="/exchanges">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-center cursor-pointer">
                  <ArrowLeftRight className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-white">Exchanges</p>
                </div>
              </Link>
              <Link href="/skills">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-center cursor-pointer">
                  <Award className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-sm text-white">My Skills</p>
                </div>
              </Link>
              <Link href="/nexus-score">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-center cursor-pointer">
                  <TrendingUp className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                  <p className="text-sm text-white">NexusScore</p>
                </div>
              </Link>
              <Link href="/feed">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-center cursor-pointer">
                  <Sparkles className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                  <p className="text-sm text-white">View Feed</p>
                </div>
              </Link>
              <Link href="/jobs">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-center cursor-pointer">
                  <Briefcase className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-sm text-white">Jobs</p>
                </div>
              </Link>
              <Link href="/events">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-center cursor-pointer">
                  <Calendar className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  <p className="text-sm text-white">Events</p>
                </div>
              </Link>
              <Link href="/ideas">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-center cursor-pointer">
                  <Lightbulb className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                  <p className="text-sm text-white">Ideas</p>
                </div>
              </Link>
            </div>
          </MotionGlassCard>
        </motion.div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <div>
          <Skeleton className="w-20 h-4 rounded mb-2" />
          <Skeleton className="w-16 h-8 rounded" />
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton className="flex-1 h-10 rounded-lg" />
        <Skeleton className="flex-1 h-10 rounded-lg" />
      </div>
    </div>
  );
}
