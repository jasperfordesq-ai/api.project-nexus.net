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
  Select,
  SelectItem,
  Input,
} from "@heroui/react";
import {
  Clock,
  Plus,
  CalendarOff,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface Slot {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface Exception {
  id: number;
  date: string;
  is_available: boolean;
  note?: string;
}

export default function AvailabilityPage() {
  return (
    <ProtectedRoute>
      <AvailabilityContent />
    </ProtectedRoute>
  );
}

function AvailabilityContent() {
  const { user, logout } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // New slot form
  const [newDay, setNewDay] = useState("1");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");

  // New exception form
  const [excDate, setExcDate] = useState("");
  const [excAvailable, setExcAvailable] = useState("false");
  const [excNote, setExcNote] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, e] = await Promise.allSettled([
        api.getMyAvailability(),
        api.getMyExceptions(),
      ]);
      if (s.status === "fulfilled") setSlots(s.value || []);
      if (e.status === "fulfilled") setExceptions(e.value || []);
    } catch (error) {
      logger.error("Failed to fetch availability:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const handleAddSlot = async () => {
    setActionError(null);
    setActionLoading(true);
    try {
      await api.addAvailabilitySlot({
        day_of_week: Number(newDay),
        start_time: newStart,
        end_time: newEnd,
      });
      await fetchData();
    } catch (error) {
      logger.error("Failed to add slot:", error);
      setActionError(error instanceof Error ? error.message : "Failed to add time slot.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddException = async () => {
    if (!excDate) return;
    setActionError(null);
    setActionLoading(true);
    try {
      await api.addException({
        date: excDate,
        is_available: excAvailable === "true",
        note: excNote || undefined,
      });
      setExcDate("");
      setExcNote("");
      await fetchData();
    } catch (error) {
      logger.error("Failed to add exception:", error);
      setActionError(error instanceof Error ? error.message : "Failed to add exception.");
    } finally {
      setActionLoading(false);
    }
  };

  // Group slots by day
  const slotsByDay = DAYS.map((name, i) => ({
    name,
    dayIndex: i,
    daySlots: slots.filter((s) => s.day_of_week === i),
  }));

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Clock className="w-8 h-8 text-indigo-400" />
            My Availability
          </h1>
          <p className="text-white/50 mt-1">
            Set your weekly schedule and date exceptions
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-white/5 border border-white/10"
              >
                <Skeleton className="w-3/4 h-5 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVariantsFast}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Add Slot */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4">
                Add Time Slot
              </h2>
              <div className="flex flex-wrap gap-3 items-end">
                <Select
                  label="Day"
                  selectedKeys={new Set([newDay])}
                  onSelectionChange={(keys) =>
                    setNewDay(Array.from(keys)[0] as string)
                  }
                  classNames={{
                    trigger:
                      "bg-white/5 border border-white/10 text-white",
                    value: "text-white",
                    label: "text-white/60",
                    popoverContent: "bg-black/90 border border-white/10",
                  }}
                  className="w-40"
                >
                  {DAYS.map((d, i) => (
                    <SelectItem key={String(i)} className="text-white">
                      {d}
                    </SelectItem>
                  ))}
                </Select>
                <Input
                  type="time"
                  label="Start"
                  value={newStart}
                  onValueChange={setNewStart}
                  classNames={{
                    input: "text-white",
                    inputWrapper:
                      "bg-white/5 border border-white/10",
                    label: "text-white/60",
                  }}
                  className="w-32"
                />
                <Input
                  type="time"
                  label="End"
                  value={newEnd}
                  onValueChange={setNewEnd}
                  classNames={{
                    input: "text-white",
                    inputWrapper:
                      "bg-white/5 border border-white/10",
                    label: "text-white/60",
                  }}
                  className="w-32"
                />
                <Button
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                  startContent={<Plus className="w-4 h-4" />}
                  onPress={handleAddSlot}
                  isLoading={actionLoading}
                  isDisabled={actionLoading}
                >
                  Add
                </Button>
              </div>
            </MotionGlassCard>

            {/* Weekly Schedule */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4">
                Weekly Schedule
              </h2>
              <div className="space-y-3">
                {slotsByDay.map(({ name, daySlots }) => (
                  <div
                    key={name}
                    className="flex items-start gap-4 p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <span className="text-sm font-medium text-white/60 w-24 pt-1">
                      {name}
                    </span>
                    <div className="flex-1">
                      {daySlots.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {daySlots.map((slot) => (
                            <Chip
                              key={slot.id}
                              size="sm"
                              variant="flat"
                              className="bg-indigo-500/20 text-indigo-400"
                            >
                              {slot.start_time} - {slot.end_time}
                            </Chip>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-white/30">
                          No slots
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </MotionGlassCard>

            {/* Exceptions */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CalendarOff className="w-5 h-5 text-amber-400" />
                Date Exceptions
              </h2>
              <div className="flex flex-wrap gap-3 items-end mb-4">
                <Input
                  type="date"
                  label="Date"
                  value={excDate}
                  onValueChange={setExcDate}
                  classNames={{
                    input: "text-white",
                    inputWrapper:
                      "bg-white/5 border border-white/10",
                    label: "text-white/60",
                  }}
                  className="w-44"
                />
                <Select
                  label="Available?"
                  selectedKeys={new Set([excAvailable])}
                  onSelectionChange={(keys) =>
                    setExcAvailable(Array.from(keys)[0] as string)
                  }
                  classNames={{
                    trigger:
                      "bg-white/5 border border-white/10 text-white",
                    value: "text-white",
                    label: "text-white/60",
                    popoverContent: "bg-black/90 border border-white/10",
                  }}
                  className="w-36"
                >
                  <SelectItem key="false" className="text-white">
                    Unavailable
                  </SelectItem>
                  <SelectItem key="true" className="text-white">
                    Available
                  </SelectItem>
                </Select>
                <Input
                  label="Note (optional)"
                  value={excNote}
                  onValueChange={setExcNote}
                  classNames={{
                    input: "text-white placeholder:text-white/30",
                    inputWrapper:
                      "bg-white/5 border border-white/10",
                    label: "text-white/60",
                  }}
                  className="flex-1 min-w-[150px]"
                />
                <Button
                  className="bg-amber-500/20 text-amber-400"
                  startContent={<Plus className="w-4 h-4" />}
                  onPress={handleAddException}
                  isLoading={actionLoading}
                  isDisabled={!excDate || actionLoading}
                >
                  Add
                </Button>
              </div>

              {exceptions.length > 0 ? (
                <div className="space-y-2">
                  {exceptions.map((exc) => (
                    <div
                      key={exc.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
                    >
                      <span className="text-sm text-white font-medium">
                        {new Date(exc.date).toLocaleDateString()}
                      </span>
                      <Chip
                        size="sm"
                        variant="flat"
                        className={
                          exc.is_available
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }
                      >
                        {exc.is_available ? "Available" : "Unavailable"}
                      </Chip>
                      {exc.note && (
                        <span className="text-sm text-white/40 flex-1">
                          {exc.note}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/50 text-center py-4">
                  No exceptions set
                </p>
              )}
            </MotionGlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}
