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
  Skeleton,
  Tabs,
  Tab,
  Pagination,
} from "@heroui/react";
import {
  Clock,
  MapPin,
  Users,
  CalendarClock,
  ArrowLeftRight,
  CheckCircle,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

type ShiftTab = "available" | "my-shifts" | "swaps";

interface Shift {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  spots_available: number;
  spots_filled: number;
  status: string;
  created_at: string;
}

interface MyShift {
  id: number;
  shift_id: number;
  shift: {
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    location: string;
  };
  status: string;
  signed_up_at: string;
}

interface SwapRequest {
  id: number;
  from_shift: { id: number; title: string; start_time: string };
  to_shift: { id: number; title: string; start_time: string };
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  open: "bg-emerald-500/20 text-emerald-400",
  filled: "bg-amber-500/20 text-amber-400",
  cancelled: "bg-red-500/20 text-red-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  pending: "bg-amber-500/20 text-amber-400",
  approved: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-red-500/20 text-red-400",
};

export default function ShiftsPage() {
  return (
    <ProtectedRoute>
      <ShiftsContent />
    </ProtectedRoute>
  );
}

function ShiftsContent() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ShiftTab>("available");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [myShifts, setMyShifts] = useState<MyShift[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [signingUpId, setSigningUpId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchAvailableShifts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getShifts({
        page: currentPage,
        limit: 10,
        status: "open",
      });
      setShifts(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (err) {
      logger.error("Failed to fetch shifts:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load available shifts"
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  const fetchMyShifts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getMyShifts();
      setMyShifts(data || []);
    } catch (err) {
      logger.error("Failed to fetch my shifts:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load your shifts"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSwapRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getShiftSwapRequests();
      setSwapRequests(data || []);
    } catch (err) {
      logger.error("Failed to fetch swap requests:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load swap requests"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "available") {
      fetchAvailableShifts();
    } else if (activeTab === "my-shifts") {
      fetchMyShifts();
    } else if (activeTab === "swaps") {
      fetchSwapRequests();
    }
  }, [activeTab, fetchAvailableShifts, fetchMyShifts, fetchSwapRequests]);

  const handleSignUp = async (shiftId: number) => {
    setSigningUpId(shiftId);
    try {
      await api.signUpForShift(shiftId);
      await fetchAvailableShifts();
    } catch (err) {
      logger.error("Failed to sign up for shift:", err);
      setError(
        err instanceof Error ? err.message : "Failed to sign up for shift"
      );
    } finally {
      setSigningUpId(null);
    }
  };

  const handleCancelSignup = async (shiftId: number) => {
    setCancellingId(shiftId);
    try {
      await api.cancelShiftSignup(shiftId);
      await fetchMyShifts();
    } catch (err) {
      logger.error("Failed to cancel shift signup:", err);
      setError(
        err instanceof Error ? err.message : "Failed to cancel shift signup"
      );
    } finally {
      setCancellingId(null);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CalendarClock className="w-8 h-8 text-indigo-400" />
            Shift Management
          </h1>
          <p className="text-white/50 mt-1">
            View shifts, sign up, and manage swap requests
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-6">
            {error}
          </div>
        )}

        <div className="mb-6">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => {
              setActiveTab(key as ShiftTab);
              setCurrentPage(1);
            }}
            classNames={{
              tabList: "bg-white/5 border border-white/10",
              cursor: "bg-indigo-500",
              tab: "text-white/50 data-[selected=true]:text-white",
            }}
          >
            <Tab key="available" title="Available" />
            <Tab key="my-shifts" title="My Shifts" />
            <Tab key="swaps" title="Swap Requests" />
          </Tabs>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-white/5 border border-white/10"
              >
                <Skeleton className="w-3/4 h-6 rounded mb-3" />
                <Skeleton className="w-1/2 h-4 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Available Shifts */}
            {activeTab === "available" && (
              <>
                {shifts.length > 0 ? (
                  <motion.div
                    variants={containerVariantsFast}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    {shifts.map((shift) => {
                      const spotsLeft =
                        shift.spots_available - shift.spots_filled;
                      return (
                        <MotionGlassCard
                          key={shift.id}
                          variants={itemVariants}
                          glow="none"
                          padding="lg"
                          hover
                        >
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-white">
                                  {shift.title}
                                </h3>
                                <Chip
                                  size="sm"
                                  variant="flat"
                                  className={
                                    statusColors[shift.status] || ""
                                  }
                                >
                                  {shift.status}
                                </Chip>
                              </div>
                              {shift.description && (
                                <p className="text-sm text-white/50 mb-3 line-clamp-2">
                                  {shift.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-4 text-sm text-white/60">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {formatDateTime(shift.start_time)} -{" "}
                                  {formatDateTime(shift.end_time)}
                                </span>
                                {shift.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {shift.location}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {spotsLeft} spot
                                  {spotsLeft !== 1 ? "s" : ""} left
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                              isLoading={signingUpId === shift.id}
                              isDisabled={spotsLeft <= 0}
                              onPress={() => handleSignUp(shift.id)}
                            >
                              {spotsLeft > 0 ? "Sign Up" : "Full"}
                            </Button>
                          </div>
                        </MotionGlassCard>
                      );
                    })}
                  </motion.div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <CalendarClock className="w-8 h-8 text-white/20" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No available shifts
                    </h3>
                    <p className="text-white/50">
                      Check back later for new shift openings.
                    </p>
                  </div>
                )}

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
            )}

            {/* My Shifts */}
            {activeTab === "my-shifts" && (
              <>
                {myShifts.length > 0 ? (
                  <motion.div
                    variants={containerVariantsFast}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    {myShifts.map((ms) => (
                      <MotionGlassCard
                        key={ms.id}
                        variants={itemVariants}
                        glow="none"
                        padding="lg"
                        hover
                      >
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-white">
                                {ms.shift.title}
                              </h3>
                              <Chip
                                size="sm"
                                variant="flat"
                                className={
                                  statusColors[ms.status] ||
                                  "bg-white/10 text-white/60"
                                }
                              >
                                {ms.status}
                              </Chip>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-white/60">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatDateTime(ms.shift.start_time)} -{" "}
                                {formatDateTime(ms.shift.end_time)}
                              </span>
                              {ms.shift.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {ms.shift.location}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/30 mt-2">
                              Signed up{" "}
                              {new Date(
                                ms.signed_up_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            isLoading={cancellingId === ms.shift_id}
                            onPress={() =>
                              handleCancelSignup(ms.shift_id)
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      </MotionGlassCard>
                    ))}
                  </motion.div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-white/20" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No shifts signed up
                    </h3>
                    <p className="text-white/50">
                      Browse available shifts and sign up.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Swap Requests */}
            {activeTab === "swaps" && (
              <>
                {swapRequests.length > 0 ? (
                  <motion.div
                    variants={containerVariantsFast}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    {swapRequests.map((swap) => (
                      <MotionGlassCard
                        key={swap.id}
                        variants={itemVariants}
                        glow="none"
                        padding="lg"
                        hover
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
                              <Chip
                                size="sm"
                                variant="flat"
                                className={
                                  statusColors[swap.status] ||
                                  "bg-white/10 text-white/60"
                                }
                              >
                                {swap.status}
                              </Chip>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="p-3 rounded-lg bg-white/5">
                                <p className="text-xs text-white/40 mb-1">
                                  From
                                </p>
                                <p className="text-sm font-medium text-white truncate">
                                  {swap.from_shift.title}
                                </p>
                                <p className="text-xs text-white/50">
                                  {formatDateTime(
                                    swap.from_shift.start_time
                                  )}
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-white/5">
                                <p className="text-xs text-white/40 mb-1">
                                  To
                                </p>
                                <p className="text-sm font-medium text-white truncate">
                                  {swap.to_shift.title}
                                </p>
                                <p className="text-xs text-white/50">
                                  {formatDateTime(
                                    swap.to_shift.start_time
                                  )}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-white/30 mt-2">
                              Requested{" "}
                              {new Date(
                                swap.created_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </MotionGlassCard>
                    ))}
                  </motion.div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <ArrowLeftRight className="w-8 h-8 text-white/20" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      No swap requests
                    </h3>
                    <p className="text-white/50">
                      Shift swap requests will appear here.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
