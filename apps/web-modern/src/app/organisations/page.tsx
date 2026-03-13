// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Input,
  Avatar,
  Chip,
  Skeleton,
  Pagination,
} from "@heroui/react";
import { Building2, Search, Users, Globe } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface Organisation {
  id: number;
  name: string;
  description: string;
  logo_url?: string;
  website?: string;
  member_count: number;
  created_at: string;
}

export default function OrganisationsPage() {
  return (
    <ProtectedRoute>
      <OrganisationsContent />
    </ProtectedRoute>
  );
}

function OrganisationsContent() {
  const { user, logout } = useAuth();
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrgs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: { page: number; limit: number; search?: string } = {
        page: currentPage,
        limit: 12,
      };
      if (searchQuery) params.search = searchQuery;
      const response = await api.getOrganisations(params);
      setOrgs(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch organisations:", error);
      setOrgs([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);
  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-indigo-400" />
              Organisations
            </h1>
            <p className="text-white/50 mt-1">
              Community organisations and partners
            </p>
          </div>
        </div>

        <div className="mb-8">
          <Input
            placeholder="Search organisations..."
            value={searchQuery}
            onValueChange={(v) => {
              setSearchQuery(v);
              setCurrentPage(1);
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
                <Skeleton className="w-full h-24 rounded-lg mb-4" />
                <Skeleton className="w-3/4 h-6 rounded mb-2" />
                <Skeleton className="w-1/2 h-4 rounded" />
              </div>
            ))}
          </div>
        ) : orgs.length > 0 ? (
          <>
            <motion.div
              variants={containerVariantsFast}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {orgs.map((org) => (
                <MotionGlassCard
                  key={org.id}
                  variants={itemVariants}
                  glow="none"
                  padding="none"
                  hover
                >
                  <Link
                    href={`/organisations/${org.id}`}
                    className="block p-6"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar
                        name={org.name}
                        src={org.logo_url}
                        size="lg"
                        className="ring-2 ring-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {org.name}
                        </h3>
                        <div className="flex items-center gap-1 text-white/40 text-sm">
                          <Users className="w-3 h-3" />
                          <span>{org.member_count} members</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-white/50 line-clamp-3 mb-3">
                      {org.description}
                    </p>
                    {org.website && (
                      <div className="flex items-center gap-1 text-indigo-400 text-sm">
                        <Globe className="w-3 h-3" />
                        <span className="truncate">{org.website}</span>
                      </div>
                    )}
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
              <Building2 className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No organisations found
            </h3>
            <p className="text-white/50">
              {searchQuery
                ? "Try adjusting your search terms"
                : "No organisations have been created yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
