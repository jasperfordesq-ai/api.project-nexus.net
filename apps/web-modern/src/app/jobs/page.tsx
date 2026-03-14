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
  Chip,
  Skeleton,
  Pagination,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import {
  Briefcase,
  Search,
  Clock,
  MapPin,
  ChevronDown,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface Job {
  id: number;
  title: string;
  description: string;
  organisation_name?: string;
  type: string;
  location?: string;
  hours_per_week?: number;
  time_credits_per_hour?: number;
  status: string;
  created_at: string;
  posted_by: { id: number; first_name: string; last_name: string };
}

type JobType = "all" | "full-time" | "part-time" | "one-off" | "ongoing";

const typeColors: Record<string, string> = {
  "full-time": "bg-blue-500/20 text-blue-400",
  "part-time": "bg-purple-500/20 text-purple-400",
  "one-off": "bg-amber-500/20 text-amber-400",
  ongoing: "bg-emerald-500/20 text-emerald-400",
};

export default function JobsPage() {
  return (
    <ProtectedRoute>
      <JobsContent />
    </ProtectedRoute>
  );
}

function JobsContent() {
  const { user, logout } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<JobType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: { page: number; limit: number; type?: string; search?: string } = {
        page: currentPage,
        limit: 12,
      };
      if (typeFilter !== "all") params.type = typeFilter;
      if (searchQuery) params.search = searchQuery;
      const response = await api.getJobs(params);
      setJobs(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (err) {
      logger.error("Failed to fetch jobs:", err);
      setError(err instanceof Error ? err.message : "Failed to load jobs. Please try again.");
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, typeFilter, searchQuery]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);
  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-indigo-400" />
            Jobs
          </h1>
          <p className="text-white/50 mt-1">
            Find time-credit paid opportunities in the community
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Input
            placeholder="Search jobs..."
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
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="flat"
                className="bg-white/5 text-white border border-white/10"
                endContent={<ChevronDown className="w-4 h-4" />}
              >
                {typeFilter === "all" ? "All Types" : typeFilter}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Job type filter"
              selectionMode="single"
              selectedKeys={new Set([typeFilter])}
              onSelectionChange={(keys) => {
                setTypeFilter(Array.from(keys)[0] as JobType);
                setCurrentPage(1);
              }}
              className="bg-black/80 backdrop-blur-xl border border-white/10"
            >
              <DropdownItem key="all" className="text-white">All Types</DropdownItem>
              <DropdownItem key="full-time" className="text-white">Full-time</DropdownItem>
              <DropdownItem key="part-time" className="text-white">Part-time</DropdownItem>
              <DropdownItem key="one-off" className="text-white">One-off</DropdownItem>
              <DropdownItem key="ongoing" className="text-white">Ongoing</DropdownItem>
            </DropdownMenu>
          </Dropdown>
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
        ) : jobs.length > 0 ? (
          <>
            <motion.div
              variants={containerVariantsFast}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {jobs.map((job) => (
                <MotionGlassCard
                  key={job.id}
                  variants={itemVariants}
                  glow="none"
                  padding="none"
                  hover
                >
                  <Link href={`/jobs/${job.id}`} className="block p-6">
                    <div className="flex items-start justify-between mb-3">
                      <Chip
                        size="sm"
                        variant="flat"
                        className={typeColors[job.type] || "bg-gray-500/20 text-gray-400"}
                      >
                        {job.type}
                      </Chip>
                      {job.time_credits_per_hour && (
                        <div className="flex items-center gap-1 text-white/70">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {job.time_credits_per_hour}h/hr
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                      {job.title}
                    </h3>
                    <p className="text-sm text-white/50 mb-3 line-clamp-2">
                      {job.description}
                    </p>
                    <div className="space-y-1 text-sm text-white/40">
                      {job.organisation_name && (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span>{job.organisation_name}</span>
                        </div>
                      )}
                      {job.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{job.location}</span>
                        </div>
                      )}
                      {job.hours_per_week && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{job.hours_per_week} hrs/week</span>
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
              <Briefcase className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No jobs found
            </h3>
            <p className="text-white/50">
              {searchQuery
                ? "Try adjusting your search terms"
                : "No jobs have been posted yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
