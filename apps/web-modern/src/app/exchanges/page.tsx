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
  Avatar,
  Skeleton,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Pagination,
} from "@heroui/react";
import {
  ArrowLeftRight,
  Filter,
  ChevronDown,
  Clock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type Exchange, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

type StatusFilter = "all" | "requested" | "accepted" | "in_progress" | "completed" | "cancelled" | "disputed";

const statusColors: Record<string, string> = {
  requested: "bg-amber-500/20 text-amber-400",
  accepted: "bg-blue-500/20 text-blue-400",
  declined: "bg-red-500/20 text-red-400",
  in_progress: "bg-purple-500/20 text-purple-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-gray-500/20 text-gray-400",
  disputed: "bg-orange-500/20 text-orange-400",
};

const statusLabels: Record<string, string> = {
  requested: "Requested",
  accepted: "Accepted",
  declined: "Declined",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

export default function ExchangesPage() {
  return (
    <ProtectedRoute>
      <ExchangesContent />
    </ProtectedRoute>
  );
}

function ExchangesContent() {
  const { user, logout } = useAuth();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchExchanges = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: { status?: string; page: number; limit: number } = {
        page: currentPage,
        limit: 12,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const response: PaginatedResponse<Exchange> = await api.getExchanges(params);
      setExchanges(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch exchanges:", error);
      setExchanges([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchExchanges();
  }, [fetchExchanges]);

  useEffect(() => {
    api.getUnreadMessageCount().then((res) => setUnreadCount(res?.count || 0));
  }, []);

  const getOtherUser = (exchange: Exchange) => {
    if (exchange.requester_id === user?.id) return exchange.provider;
    return exchange.requester;
  };

  const getUserRole = (exchange: Exchange) => {
    return exchange.requester_id === user?.id ? "Requester" : "Provider";
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} unreadCount={unreadCount} onLogout={logout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Exchanges</h1>
            <p className="text-white/50 mt-1">
              Track your service exchanges with other members
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8">
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="flat"
                className="bg-white/5 text-white border border-white/10"
                startContent={<Filter className="w-4 h-4" />}
                endContent={<ChevronDown className="w-4 h-4" />}
              >
                {statusFilter === "all" ? "All Status" : statusLabels[statusFilter]}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Status filter"
              selectionMode="single"
              selectedKeys={new Set([statusFilter])}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as StatusFilter;
                setStatusFilter(selected);
                setCurrentPage(1);
              }}
              className="bg-black/80 backdrop-blur-xl border border-white/10"
            >
              <DropdownItem key="all" className="text-white">All Status</DropdownItem>
              <DropdownItem key="requested" className="text-white">Requested</DropdownItem>
              <DropdownItem key="accepted" className="text-white">Accepted</DropdownItem>
              <DropdownItem key="in_progress" className="text-white">In Progress</DropdownItem>
              <DropdownItem key="completed" className="text-white">Completed</DropdownItem>
              <DropdownItem key="cancelled" className="text-white">Cancelled</DropdownItem>
              <DropdownItem key="disputed" className="text-white">Disputed</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>

        {/* Exchanges List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="w-3/4 h-5 rounded mb-2" />
                    <Skeleton className="w-1/2 h-4 rounded" />
                  </div>
                  <Skeleton className="w-24 h-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : exchanges.length > 0 ? (
          <>
            <motion.div
              variants={containerVariantsFast}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {exchanges.map((exchange) => {
                const otherUser = getOtherUser(exchange);
                const role = getUserRole(exchange);

                return (
                  <MotionGlassCard
                    key={exchange.id}
                    variants={itemVariants}
                    glow="none"
                    padding="none"
                    hover
                  >
                    <Link href={`/exchanges/${exchange.id}`} className="block p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {/* Users */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar
                            name={user ? `${user.first_name} ${user.last_name}` : ""}
                            size="sm"
                            className="ring-2 ring-white/10 shrink-0"
                          />
                          <ArrowRight className="w-4 h-4 text-white/30 shrink-0" />
                          <Avatar
                            name={otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : ""}
                            size="sm"
                            className="ring-2 ring-white/10 shrink-0"
                          />
                          <div className="min-w-0 ml-2">
                            <p className="text-white font-medium truncate">
                              {exchange.listing?.title || exchange.description || "Exchange"}
                            </p>
                            <p className="text-sm text-white/50 truncate">
                              with {otherUser?.first_name} {otherUser?.last_name} · {role}
                            </p>
                          </div>
                        </div>

                        {/* Status & Hours */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-500/20">
                            <Clock className="w-4 h-4 text-indigo-400" />
                            <span className="text-sm font-semibold text-indigo-400">
                              {exchange.hours}h
                            </span>
                          </div>
                          <Chip
                            size="sm"
                            variant="flat"
                            className={statusColors[exchange.status] || "bg-gray-500/20 text-gray-400"}
                          >
                            {statusLabels[exchange.status] || exchange.status}
                          </Chip>
                          <span className="text-xs text-white/40">
                            {new Date(exchange.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </Link>
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
              <ArrowLeftRight className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No exchanges yet
            </h3>
            <p className="text-white/50 mb-6">
              Browse listings to start exchanging services with other members.
            </p>
            <Link href="/listings">
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                Browse Listings
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
