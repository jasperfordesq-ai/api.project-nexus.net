// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Skeleton,
  Input,
  Pagination,
} from "@heroui/react";
import { AvatarWithFallback } from "@/components/avatar-with-fallback";
import {
  Users,
  Search,
  UserPlus,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type User } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

export default function MembersPage() {
  return (
    <ProtectedRoute>
      <MembersContent />
    </ProtectedRoute>
  );
}

function MembersContent() {
  const { user, logout } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sendingRequest, setSendingRequest] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.getMembers({
        page: currentPage,
        limit: 20,
        q: debouncedQuery || undefined,
      });
      setMembers(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (err) {
      logger.error("Failed to fetch members:", err);
      setError(err instanceof Error ? err.message : "Failed to load members. Please try again.");
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedQuery]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);
  const handleSendConnectionRequest = async (memberId: number) => {
    setSendingRequest(memberId);
    setActionError(null);
    try {
      await api.sendConnectionRequest(memberId);
    } catch (error) {
      logger.error("Failed to send connection request:", error);
      setActionError(error instanceof Error ? error.message : "Failed to send connection request.");
    } finally {
      setSendingRequest(null);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Member Directory</h1>
            <p className="text-white/50 mt-1">
              Find and connect with community members
            </p>
          </div>
        </div>

        {/* Fetch Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Action Error */}
        {actionError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {actionError}
          </div>
        )}

        {/* Search */}
        <div className="mb-8">
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            startContent={<Search className="w-5 h-5 text-white/40" />}
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

        {/* Members Grid */}
        <div role="region" aria-label="Member directory" aria-busy={isLoading} aria-live="polite">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex flex-col items-center">
                  <Skeleton className="w-20 h-20 rounded-full mb-4" />
                  <Skeleton className="w-32 h-5 rounded mb-2" />
                  <Skeleton className="w-24 h-4 rounded mb-4" />
                  <Skeleton className="w-full h-10 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : members.length > 0 ? (
          <>
            <motion.div
              variants={containerVariantsFast}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {members.map((member) => (
                <MotionGlassCard
                  key={member.id}
                  variants={itemVariants}
                  glow="none"
                  padding="lg"
                  hover
                >
                  <div className="flex flex-col items-center text-center">
                    <AvatarWithFallback
                      name={`${member.first_name} ${member.last_name}`}
                      size="lg"
                      className="w-20 h-20 text-xl ring-4 ring-white/10 mb-4"
                    />
                    <Link href={`/members/${member.id}`}>
                      <h3 className="font-semibold text-white hover:text-indigo-400 transition-colors">
                        {member.first_name} {member.last_name}
                      </h3>
                    </Link>
                    {member.bio && (
                      <p className="text-sm text-white/50 mt-1 line-clamp-2">
                        {member.bio}
                      </p>
                    )}
                    <p className="text-xs text-white/30 mt-2">
                      Joined {new Date(member.created_at).toLocaleDateString()}
                    </p>

                    {member.id !== user?.id && (
                      <div className="flex gap-2 mt-4 w-full">
                        <Button
                          size="sm"
                          className="flex-1 bg-white/10 text-white hover:bg-white/20"
                          startContent={<UserPlus className="w-4 h-4" />}
                          isLoading={sendingRequest === member.id}
                          onPress={() => handleSendConnectionRequest(member.id)}
                        >
                          Connect
                        </Button>
                        <Link href={`/messages?user=${member.id}`} className="flex-1">
                          <Button
                            size="sm"
                            className="w-full bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                            startContent={<MessageSquare className="w-4 h-4" />}
                          >
                            Message
                          </Button>
                        </Link>
                      </div>
                    )}
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
              No members found
            </h3>
            <p className="text-white/50">
              {searchQuery
                ? "Try adjusting your search"
                : "No members in the directory yet"}
            </p>
          </div>
        )}
        </div>{/* end members region */}
      </div>
    </div>
  );
}
