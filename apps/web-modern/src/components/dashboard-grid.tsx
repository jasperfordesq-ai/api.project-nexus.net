"use client";

import { Button, Progress, Avatar, Chip } from "@heroui/react";
import { motion, type Variants } from "framer-motion";
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
} from "lucide-react";
import Link from "next/link";
import { MotionGlassCard, StructuredGlassCard } from "./glass-card";

interface DashboardGridProps {
  balance?: number;
  recentTransactions?: Array<{
    id: number;
    type: "sent" | "received";
    amount: number;
    description: string;
    user: string;
    date: string;
  }>;
  activeListings?: number;
  pendingRequests?: number;
  unreadMessages?: number;
  recentListings?: Array<{
    id: number;
    title: string;
    type: "offer" | "request";
    credits: number;
    user: string;
  }>;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

// Demo data for showcase
const demoData: DashboardGridProps = {
  balance: 24.5,
  recentTransactions: [
    { id: 1, type: "received", amount: 2, description: "Web design consultation", user: "Sarah M.", date: "Today" },
    { id: 2, type: "sent", amount: 1.5, description: "Guitar lesson", user: "John D.", date: "Yesterday" },
    { id: 3, type: "received", amount: 3, description: "Resume review", user: "Mike R.", date: "2 days ago" },
  ],
  activeListings: 5,
  pendingRequests: 3,
  unreadMessages: 7,
  recentListings: [
    { id: 1, title: "Professional Photography", type: "offer", credits: 2, user: "Emma W." },
    { id: 2, title: "Math Tutoring", type: "offer", credits: 1.5, user: "David L." },
    { id: 3, title: "Garden Help Needed", type: "request", credits: 2, user: "Lisa K." },
    { id: 4, title: "Language Exchange", type: "offer", credits: 1, user: "Carlos M." },
  ],
};

export function DashboardGrid({
  balance = demoData.balance,
  recentTransactions = demoData.recentTransactions,
  activeListings = demoData.activeListings,
  pendingRequests = demoData.pendingRequests,
  unreadMessages = demoData.unreadMessages,
  recentListings = demoData.recentListings,
}: DashboardGridProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {/* Balance Card - Spans 2 columns on larger screens */}
      <MotionGlassCard
        variants={itemVariants}
        className="md:col-span-2 lg:col-span-2"
        glow="primary"
        padding="lg"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/50">Time Credits</p>
                <p className="text-3xl font-bold text-white">{balance}</p>
              </div>
            </div>
            <Chip
              startContent={<TrendingUp className="w-3 h-3" />}
              size="sm"
              className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              variant="bordered"
            >
              +12% this month
            </Chip>
          </div>

          <div className="space-y-3 flex-1">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Monthly Goal</span>
              <span className="text-white">30 credits</span>
            </div>
            <Progress
              value={(balance! / 30) * 100}
              className="h-2"
              classNames={{
                indicator: "bg-gradient-to-r from-indigo-500 to-purple-500",
                track: "bg-white/10",
              }}
            />
          </div>

          <div className="flex gap-3 mt-6">
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
      </MotionGlassCard>

      {/* Quick Stats Cards */}
      <MotionGlassCard variants={itemVariants} glow="secondary" padding="lg">
        <div className="flex flex-col h-full">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
            <ListTodo className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{activeListings}</p>
          <p className="text-sm text-white/50 mb-4">Active Listings</p>
          <Link href="/listings/new" className="mt-auto">
            <Button
              size="sm"
              variant="flat"
              className="w-full bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
              startContent={<Plus className="w-4 h-4" />}
            >
              New Listing
            </Button>
          </Link>
        </div>
      </MotionGlassCard>

      <MotionGlassCard variants={itemVariants} glow="accent" padding="lg">
        <div className="flex flex-col h-full">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white">{unreadMessages}</p>
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
          {recentTransactions?.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.type === "received"
                      ? "bg-emerald-500/20"
                      : "bg-orange-500/20"
                  }`}
                >
                  {tx.type === "received" ? (
                    <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-orange-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{tx.description}</p>
                  <p className="text-xs text-white/40">
                    {tx.type === "received" ? "From" : "To"} {tx.user} · {tx.date}
                  </p>
                </div>
              </div>
              <p
                className={`font-medium ${
                  tx.type === "received" ? "text-emerald-400" : "text-orange-400"
                }`}
              >
                {tx.type === "received" ? "+" : "-"}{tx.amount}h
              </p>
            </div>
          ))}
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
              Discover Listings
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
          {recentListings?.map((listing) => (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  name={listing.user}
                  size="sm"
                  className="ring-2 ring-white/10"
                />
                <div>
                  <p className="text-sm font-medium text-white">{listing.title}</p>
                  <p className="text-xs text-white/40">by {listing.user}</p>
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
                  {listing.credits}h
                </span>
              </div>
            </Link>
          ))}
        </div>
      </MotionGlassCard>
    </motion.div>
  );
}
