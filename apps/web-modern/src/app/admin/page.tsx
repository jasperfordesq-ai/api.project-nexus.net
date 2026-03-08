"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button, Chip, Skeleton } from "@heroui/react";
import {
  Users,
  ListTodo,
  Clock,
  Settings,
  Shield,
  TrendingUp,
  AlertCircle,
  FolderTree,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { AdminProtectedRoute } from "@/components/admin-protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type AdminDashboard } from "@/lib/api";

export default function AdminDashboardPage() {
  return (
    <AdminProtectedRoute>
      <AdminDashboardContent />
    </AdminProtectedRoute>
  );
}

function AdminDashboardContent() {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await api.adminGetDashboard();
        setDashboard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-indigo-400" />
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <p className="text-white/50">Manage users, content, and platform settings</p>
        </motion.div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Users Stats */}
          <MotionGlassCard variants={itemVariants} glow="primary">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/50 text-sm">Total Users</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-white mt-1">
                    {dashboard?.users.total || 0}
                  </p>
                )}
              </div>
              <div className="p-3 bg-indigo-500/20 rounded-lg">
                <Users className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="text-emerald-400">
                {dashboard?.users.active || 0} active
              </span>
              <span className="text-red-400">
                {dashboard?.users.suspended || 0} suspended
              </span>
            </div>
          </MotionGlassCard>

          {/* Listings Stats */}
          <MotionGlassCard variants={itemVariants} glow="secondary">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/50 text-sm">Total Listings</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-white mt-1">
                    {dashboard?.listings.total || 0}
                  </p>
                )}
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <ListTodo className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="text-emerald-400">
                {dashboard?.listings.active || 0} active
              </span>
              {(dashboard?.listings.pending_review || 0) > 0 && (
                <Chip size="sm" color="warning" variant="flat">
                  {dashboard?.listings.pending_review} pending review
                </Chip>
              )}
            </div>
          </MotionGlassCard>

          {/* Transactions Stats */}
          <MotionGlassCard variants={itemVariants} glow="accent">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/50 text-sm">Credits Transferred</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-white mt-1">
                    {dashboard?.transactions.total_credits_transferred.toFixed(1) || 0}
                  </p>
                )}
              </div>
              <div className="p-3 bg-cyan-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div className="mt-4 text-sm text-white/50">
              {dashboard?.transactions.last_30_days || 0} transactions last 30 days
            </div>
          </MotionGlassCard>

          {/* Community Stats */}
          <MotionGlassCard variants={itemVariants} glow="primary">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/50 text-sm">Categories</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-white mt-1">
                    {dashboard?.community.categories || 0}
                  </p>
                )}
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-lg">
                <FolderTree className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm text-white/50">
              <span>{dashboard?.community.groups || 0} groups</span>
              <span>{dashboard?.community.upcoming_events || 0} events</span>
            </div>
          </MotionGlassCard>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-semibold text-white mb-4">Admin Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/admin/users">
              <MotionGlassCard
                className="cursor-pointer hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/20 rounded-lg">
                      <Users className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">User Management</h3>
                      <p className="text-white/50 text-sm">View, edit, suspend users</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/30" />
                </div>
              </MotionGlassCard>
            </Link>

            <Link href="/admin/categories">
              <MotionGlassCard
                className="cursor-pointer hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-lg">
                      <FolderTree className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Categories</h3>
                      <p className="text-white/50 text-sm">Manage listing categories</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/30" />
                </div>
              </MotionGlassCard>
            </Link>

            <Link href="/admin/moderation">
              <MotionGlassCard
                className="cursor-pointer hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Content Moderation</h3>
                      <p className="text-white/50 text-sm">Review pending listings</p>
                    </div>
                  </div>
                  {(dashboard?.listings.pending_review || 0) > 0 && (
                    <Chip size="sm" color="warning" variant="solid">
                      {dashboard?.listings.pending_review}
                    </Chip>
                  )}
                </div>
              </MotionGlassCard>
            </Link>

            <Link href="/admin/config">
              <MotionGlassCard
                className="cursor-pointer hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-cyan-500/20 rounded-lg">
                      <Settings className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Configuration</h3>
                      <p className="text-white/50 text-sm">Tenant settings</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/30" />
                </div>
              </MotionGlassCard>
            </Link>

            <Link href="/admin/roles">
              <MotionGlassCard
                className="cursor-pointer hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-lg">
                      <Shield className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Roles</h3>
                      <p className="text-white/50 text-sm">Manage user roles</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/30" />
                </div>
              </MotionGlassCard>
            </Link>
          </div>
        </motion.div>

        {/* Recent Activity Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <h2 className="text-xl font-semibold text-white mb-4">New Users (Last 30 Days)</h2>
          <MotionGlassCard>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {dashboard?.users.new_last_30_days || 0}
                </p>
                <p className="text-white/50 text-sm">new user registrations</p>
              </div>
            </div>
          </MotionGlassCard>
        </motion.div>
      </div>
    </div>
  );
}
