// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Input,
  Chip,
  Skeleton,
  Pagination,
} from "@heroui/react";
import {
  Heart,
  Search,
  Clock,
  MapPin,
  Users,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface Opportunity {
  id: number;
  title: string;
  description: string;
  organisation_name?: string;
  location?: string;
  date?: string;
  hours_needed?: number;
  volunteers_needed?: number;
  volunteers_signed_up: number;
  status: string;
  created_at: string;
}

export default function VolunteeringPage() {
  return (
    <ProtectedRoute>
      <VolunteeringContent />
    </ProtectedRoute>
  );
}

function VolunteeringContent() {
  const { user, logout } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const fetchOpportunities = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: { page: number; limit: number; search?: string } = {
        page: currentPage,
        limit: 12,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      const response = await api.getVolunteeringOpportunities(params);
      setOpportunities(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch volunteering opportunities:", error);
      setOpportunities([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);
  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Heart className="w-8 h-8 text-pink-400" />
            Volunteering
          </h1>
          <p className="text-white/50 mt-1">
            Give back to your community
          </p>
        </div>

        <div className="mb-8">
          <Input
            placeholder="Search opportunities..."
            value={searchQuery}
            onValueChange={(v) => {
              setSearchQuery(v);
              if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
              searchTimeoutRef.current = setTimeout(() => {
                setDebouncedSearch(v);
                setCurrentPage(1);
              }, 300);
            }}
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
            className="sm:max-w-xs"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-white/5 border border-white/10"
              >
                <Skeleton className="w-3/4 h-6 rounded mb-4" />
                <Skeleton className="w-full h-16 rounded mb-2" />
                <Skeleton className="w-1/2 h-4 rounded" />
              </div>
            ))}
          </div>
        ) : opportunities.length > 0 ? (
          <>
            <motion.div
              variants={containerVariantsFast}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {opportunities.map((opp) => (
                <MotionGlassCard
                  key={opp.id}
                  variants={itemVariants}
                  glow="none"
                  padding="none"
                  hover
                >
                  <Link
                    href={`/volunteering/${opp.id}`}
                    className="block p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Chip
                        size="sm"
                        variant="flat"
                        className={
                          opp.status === "open"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-gray-500/20 text-gray-400"
                        }
                      >
                        {opp.status}
                      </Chip>
                      {opp.volunteers_needed && (
                        <div className="flex items-center gap-1 text-white/60 text-sm">
                          <Users className="w-3 h-3" />
                          <span>
                            {opp.volunteers_signed_up}/{opp.volunteers_needed}
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                      {opp.title}
                    </h3>
                    <p className="text-sm text-white/50 mb-3 line-clamp-2">
                      {opp.description}
                    </p>
                    <div className="space-y-1 text-sm text-white/40">
                      {opp.organisation_name && (
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span>{opp.organisation_name}</span>
                        </div>
                      )}
                      {opp.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{opp.location}</span>
                        </div>
                      )}
                      {opp.date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(opp.date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {opp.hours_needed && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{opp.hours_needed} hours</span>
                        </div>
                      )}
                    </div>
                  </Link>
                </MotionGlassCard>
              ))}
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
              <Heart className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No opportunities found
            </h3>
            <p className="text-white/50">
              {searchQuery
                ? "Try adjusting your search terms"
                : "No volunteering opportunities available yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
