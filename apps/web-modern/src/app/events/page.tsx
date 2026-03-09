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
  Tabs,
  Tab,
} from "@heroui/react";
import {
  Calendar,
  Search,
  Plus,
  MapPin,
  Clock,
  Users,
  CalendarCheck,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type Event, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

type EventFilter = "upcoming" | "past" | "all";

export default function EventsPage() {
  return (
    <ProtectedRoute>
      <EventsContent />
    </ProtectedRoute>
  );
}

function EventsContent() {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EventFilter>("upcoming");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const response: PaginatedResponse<Event> = await api.getEvents({
        status: statusFilter,
        page: currentPage,
        limit: 12,
      });
      setEvents(response?.data || []);
      setTotalPages(response?.pagination?.total_pages || 1);
    } catch (error) {
      logger.error("Failed to fetch events:", error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);
  const filteredEvents = (events || []).filter(
    (event) =>
      (event.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRsvp = async (eventId: number) => {
    try {
      await api.rsvpToEvent(eventId, "going");
      fetchEvents();
    } catch (error) {
      logger.error("Failed to RSVP:", error);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "TBD";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "TBD";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getDatePart = (dateStr: string | null | undefined, part: "month" | "day") => {
    if (!dateStr) return part === "month" ? "TBD" : "?";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return part === "month" ? "TBD" : "?";
    if (part === "month") {
      return date.toLocaleDateString("en-US", { month: "short" });
    }
    return date.getDate().toString();
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Events</h1>
            <p className="text-white/50 mt-1">
              Discover and join community events
            </p>
          </div>
          <Link href="/events/new">
            <Button
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              startContent={<Plus className="w-4 h-4" />}
            >
              Create Event
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Input
            placeholder="Search events..."
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
            className="sm:max-w-xs"
          />

          <Tabs
            selectedKey={statusFilter}
            onSelectionChange={(key) => {
              setStatusFilter(key as EventFilter);
              setCurrentPage(1);
            }}
            classNames={{
              tabList: "bg-white/5 border border-white/10",
              cursor: "bg-indigo-500",
              tab: "text-white/50 data-[selected=true]:text-white",
            }}
            size="sm"
          >
            <Tab key="upcoming" title="Upcoming" />
            <Tab key="past" title="Past" />
            <Tab key="all" title="All" />
          </Tabs>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-white/5 border border-white/10"
              >
                <Skeleton className="w-full h-32 rounded-lg mb-4" />
                <Skeleton className="w-3/4 h-6 rounded mb-2" />
                <Skeleton className="w-full h-12 rounded mb-4" />
                <Skeleton className="w-1/2 h-4 rounded" />
              </div>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <>
            <motion.div
              variants={containerVariantsFast}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredEvents.map((event) => (
                <MotionGlassCard
                  key={event.id}
                  variants={itemVariants}
                  glow="none"
                  padding="none"
                  hover
                >
                  {/* Date Badge */}
                  <div className="relative">
                    <div className="absolute top-4 left-4 bg-indigo-500 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-white/80 uppercase">
                        {getDatePart(event.start_time, "month")}
                      </p>
                      <p className="text-xl font-bold text-white">
                        {getDatePart(event.start_time, "day")}
                      </p>
                    </div>
                    <div className="h-32 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-t-xl flex items-center justify-center">
                      <Calendar className="w-12 h-12 text-white/20" />
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">
                      {event.title}
                    </h3>
                    <p className="text-sm text-white/50 mb-4 line-clamp-2">
                      {event.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-white/60">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                          {formatDate(event.start_time)} at{" "}
                          {formatTime(event.start_time)}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-white/60">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm truncate">
                            {event.location}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-white/60">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">
                          {event.attendee_count} attending
                          {event.max_attendees &&
                            ` / ${event.max_attendees} max`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={`${event.organizer?.first_name} ${event.organizer?.last_name}`}
                          size="sm"
                          className="ring-2 ring-white/10"
                        />
                        <span className="text-xs text-white/50">
                          by {event.organizer?.first_name}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        className="bg-white/10 text-white hover:bg-white/20"
                        startContent={<CalendarCheck className="w-4 h-4" />}
                        onPress={() => handleRsvp(event.id)}
                      >
                        RSVP
                      </Button>
                    </div>
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
              <Calendar className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No events found
            </h3>
            <p className="text-white/50 mb-6">
              {searchQuery
                ? "Try adjusting your search"
                : "Be the first to create an event!"}
            </p>
            <Link href="/events/new">
              <Button
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                startContent={<Plus className="w-4 h-4" />}
              >
                Create Event
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
