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
  Tabs,
  Tab,
  Pagination,
} from "@heroui/react";
import { AvatarWithFallback } from "@/components/avatar-with-fallback";
import {
  Users,
  UserPlus,
  UserMinus,
  Check,
  X,
  Search,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type Connection, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";

type ConnectionFilter = "accepted" | "pending";

export default function ConnectionsPage() {
  return (
    <ProtectedRoute>
      <ConnectionsContent />
    </ProtectedRoute>
  );
}

function ConnectionsContent() {
  const { user, logout } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<ConnectionFilter>("accepted");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    setIsLoading(true);
    try {
      const response: PaginatedResponse<Connection> = await api.getConnections({
        status: filter,
        page: currentPage,
        limit: 20,
      });
      setConnections(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch connections:", error);
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  }, [filter, currentPage]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);
  const handleAccept = async (connectionId: number) => {
    setActionError(null);
    try {
      await api.respondToConnection(connectionId, "accepted");
      fetchConnections();
    } catch (error) {
      logger.error("Failed to accept connection:", error);
      setActionError(error instanceof Error ? error.message : "Failed to accept connection.");
    }
  };

  const handleReject = async (connectionId: number) => {
    setActionError(null);
    try {
      await api.respondToConnection(connectionId, "rejected");
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    } catch (error) {
      logger.error("Failed to reject connection:", error);
      setActionError(error instanceof Error ? error.message : "Failed to decline connection.");
    }
  };

  const handleRemove = async (connectionId: number) => {
    setActionError(null);
    try {
      await api.removeConnection(connectionId);
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    } catch (error) {
      logger.error("Failed to remove connection:", error);
      setActionError(error instanceof Error ? error.message : "Failed to remove connection.");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Get the count of pending requests
  const pendingCount = filter === "pending" ? connections.length : 0;

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Connections</h1>
            <p className="text-white/50 mt-1">
              Manage your network of community members
            </p>
          </div>
          <Link href="/members">
            <Button
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              startContent={<UserPlus className="w-4 h-4" />}
            >
              Find People
            </Button>
          </Link>
        </div>

        {/* Action Error */}
        {actionError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {actionError}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <Tabs
            selectedKey={filter}
            onSelectionChange={(key) => {
              setFilter(key as ConnectionFilter);
              setCurrentPage(1);
            }}
            classNames={{
              tabList: "bg-white/5 border border-white/10",
              cursor: "bg-indigo-500",
              tab: "text-white/50 data-[selected=true]:text-white",
            }}
          >
            <Tab key="accepted" title="My Connections" />
            <Tab
              key="pending"
              title={
                <span className="flex items-center gap-2">
                  Pending Requests
                </span>
              }
            />
          </Tabs>
        </div>

        {/* Connections List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="w-14 h-14 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="w-32 h-5 rounded mb-2" />
                    <Skeleton className="w-24 h-4 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : connections.length > 0 ? (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {connections.map((connection) => {
                const isReceived = connection.recipient_id === user?.id;
                const otherUser = isReceived
                  ? connection.requester
                  : connection.recipient;

                return (
                  <MotionGlassCard
                    key={connection.id}
                    variants={itemVariants}
                    glow="none"
                    padding="md"
                    hover
                  >
                    <div className="flex items-center gap-4">
                      <AvatarWithFallback
                        name={`${otherUser?.first_name} ${otherUser?.last_name}`}
                        size="lg"
                        className="ring-2 ring-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <Link href={`/members/${otherUser?.id}`}>
                          <p className="font-semibold text-white hover:text-indigo-400 transition-colors">
                            {otherUser?.first_name} {otherUser?.last_name}
                          </p>
                        </Link>
                        <p className="text-sm text-white/50">
                          {otherUser?.email}
                        </p>
                        {filter === "pending" && (
                          <p className="text-xs text-white/40 mt-1">
                            {isReceived ? "Wants to connect" : "Request sent"}
                          </p>
                        )}
                      </div>

                      {filter === "accepted" ? (
                        <div className="flex gap-2">
                          <Link href={`/messages?user=${otherUser?.id}`}>
                            <Button
                              size="sm"
                              className="bg-white/10 text-white hover:bg-white/20"
                            >
                              Message
                            </Button>
                          </Link>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            className="text-red-400 hover:bg-red-500/20"
                            onPress={() => handleRemove(connection.id)}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : isReceived ? (
                        <div className="flex gap-2">
                          <Button
                            isIconOnly
                            size="sm"
                            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            onPress={() => handleAccept(connection.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            isIconOnly
                            size="sm"
                            className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            onPress={() => handleReject(connection.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="light"
                          className="text-white/50"
                          isDisabled
                        >
                          Pending
                        </Button>
                      )}
                    </div>
                  </MotionGlassCard>
                );
              })}
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
              {filter === "accepted"
                ? "No connections yet"
                : "No pending requests"}
            </h3>
            <p className="text-white/50 mb-6">
              {filter === "accepted"
                ? "Start building your network by connecting with community members"
                : "You don't have any pending connection requests"}
            </p>
            {filter === "accepted" && (
              <Link href="/members">
                <Button
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                  startContent={<Search className="w-4 h-4" />}
                >
                  Find People
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
