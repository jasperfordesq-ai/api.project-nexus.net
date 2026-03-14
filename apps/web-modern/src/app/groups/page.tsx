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
  Input,
  Chip,
  Pagination,
} from "@heroui/react";
import { Users, Search, Plus, Lock, Globe, UserPlus } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type Group, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

export default function GroupsPage() {
  return (
    <ProtectedRoute>
      <GroupsContent />
    </ProtectedRoute>
  );
}

function GroupsContent() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const response: PaginatedResponse<Group> = await api.getGroups({
        page: currentPage,
        limit: 12,
      });
      setGroups(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch groups:", error);
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);
  const filteredGroups = (groups || []).filter(
    (group) =>
      (group.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (group.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinGroup = async (groupId: number) => {
    setActionError(null);
    try {
      await api.joinGroup(groupId);
      fetchGroups();
    } catch (error) {
      logger.error("Failed to join group:", error);
      setActionError(error instanceof Error ? error.message : "Failed to join group. Please try again.");
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Groups</h1>
            <p className="text-white/50 mt-1">
              Join communities and connect with like-minded people
            </p>
          </div>
          <Link href="/groups/new">
            <Button
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              startContent={<Plus className="w-4 h-4" />}
            >
              Create Group
            </Button>
          </Link>
        </div>

        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3"
          >
            <span className="text-sm text-red-400">{actionError}</span>
          </motion.div>
        )}

        {/* Search */}
        <div className="mb-8">
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            startContent={<Search className="w-4 h-4 text-white/40" />}
            classNames={{
              input: "text-white placeholder:text-white/30",
              inputWrapper: [
                "bg-white/5",
                "border border-white/10",
                "hover:bg-white/10",
                "group-data-[focus=true]:bg-white/10",
                "group-data-[focus=true]:border-indigo-500/50",
              ],
            }}
            className="max-w-md"
          />
        </div>

        {/* Groups Grid */}
        <div role="region" aria-label="Groups" aria-busy={isLoading} aria-live="polite">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-white/5 border border-white/10"
              >
                <Skeleton className="w-16 h-16 rounded-xl mb-4" />
                <Skeleton className="w-3/4 h-6 rounded mb-2" />
                <Skeleton className="w-full h-12 rounded mb-4" />
                <Skeleton className="w-1/2 h-4 rounded" />
              </div>
            ))}
          </div>
        ) : filteredGroups.length > 0 ? (
          <>
            <motion.div
              variants={containerVariantsFast}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredGroups.map((group) => (
                <MotionGlassCard
                  key={group.id}
                  variants={itemVariants}
                  glow="none"
                  padding="lg"
                  hover
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center">
                      <Users className="w-7 h-7 text-indigo-400" />
                    </div>
                    <Chip
                      size="sm"
                      variant="flat"
                      startContent={
                        group.is_public ? (
                          <Globe className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )
                      }
                      className={
                        group.is_public
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }
                    >
                      {group.is_public ? "Public" : "Private"}
                    </Chip>
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2">
                    {group.name}
                  </h3>
                  <p className="text-sm text-white/50 mb-4 line-clamp-2">
                    {group.description}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-white/50">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">
                        {group.member_count} members
                      </span>
                    </div>

                    <Button
                      size="sm"
                      className="bg-white/10 text-white hover:bg-white/20"
                      startContent={<UserPlus className="w-4 h-4" />}
                      onPress={() => handleJoinGroup(group.id)}
                    >
                      Join
                    </Button>
                  </div>
                </MotionGlassCard>
              ))}
            </motion.div>

            {/* Pagination */}
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
              <Users className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No groups found
            </h3>
            <p className="text-white/50 mb-6">
              {searchQuery
                ? "Try adjusting your search"
                : "Be the first to create a group!"}
            </p>
            <Link href="/groups/new">
              <Button
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                startContent={<Plus className="w-4 h-4" />}
              >
                Create Group
              </Button>
            </Link>
          </div>
        )}
        </div>{/* end groups region */}
      </div>
    </div>
  );
}
