// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Button,
  Avatar,
  Chip,
  Skeleton,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import {
  Calendar,
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  CalendarCheck,
  CalendarX,
  Edit,
  Trash2,
  User,
  Share2,
  Bell,
  BellOff,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard, MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api, type Event, type EventAttendee, type PaginatedResponse } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function EventDetailPage() {
  return (
    <ProtectedRoute>
      <EventDetailContent />
    </ProtectedRoute>
  );
}

function EventDetailContent() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params.id);
  const { user, logout } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);
  const [userRsvp, setUserRsvp] = useState<EventAttendee | null>(null);
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);

  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  const fetchEvent = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eventData, attendeesData] = await Promise.all([
        api.getEvent(eventId),
        api.getEventAttendees(eventId),
      ]);
      setEvent(eventData);
      const attendeesList = attendeesData?.data || [];
      setAttendees(attendeesList);

      // Check user's RSVP status
      const userAttendee = attendeesList.find(
        (a) => a.user_id === user?.id
      );
      setUserRsvp(userAttendee || null);
    } catch (error) {
      logger.error("Failed to fetch event:", error);
      setAttendees([]);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, user?.id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);
  const handleSetReminder = async (minutes: number) => {
    try {
      await api.setEventReminder(eventId, { minutes_before: minutes });
      setReminderMinutes(minutes);
    } catch (error) {
      logger.error("Failed to set reminder:", error);
    }
  };

  const handleRemoveReminder = async () => {
    try {
      await api.removeEventReminder(eventId);
      setReminderMinutes(null);
    } catch (error) {
      logger.error("Failed to remove reminder:", error);
    }
  };

    const handleRsvp = async (status: "going" | "maybe" | "not_going") => {
    setIsRsvpLoading(true);
    try {
      const response = await api.rsvpToEvent(eventId, status);
      setUserRsvp(response);
      fetchEvent();
    } catch (error) {
      logger.error("Failed to RSVP:", error);
    } finally {
      setIsRsvpLoading(false);
    }
  };

  const handleCancelRsvp = async () => {
    setIsRsvpLoading(true);
    try {
      await api.cancelRsvp(eventId);
      setUserRsvp(null);
      fetchEvent();
    } catch (error) {
      logger.error("Failed to cancel RSVP:", error);
    } finally {
      setIsRsvpLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteEvent(eventId);
      router.push("/events");
    } catch (error) {
      logger.error("Failed to delete event:", error);
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isOrganizer = event?.organizer_id === user?.id;
  const isPastEvent = event ? new Date(event.end_time) < new Date() : false;
  const isFull = Boolean(
    event?.max_attendees && event.attendee_count >= event.max_attendees
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const getRsvpStatusColor = (status: string) => {
    switch (status) {
      case "going":
        return "bg-emerald-500/20 text-emerald-400";
      case "maybe":
        return "bg-amber-500/20 text-amber-400";
      case "not_going":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-white/10 text-white/50";
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>

        {isLoading ? (
          <div className="space-y-6">
            <div className="p-8 rounded-xl bg-white/5 border border-white/10">
              <Skeleton className="w-full h-48 rounded-lg mb-6" />
              <Skeleton className="w-3/4 h-8 rounded mb-4" />
              <Skeleton className="w-full h-24 rounded" />
            </div>
          </div>
        ) : event ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Main Content */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="none">
              {/* Hero Section */}
              <div className="relative h-48 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 rounded-t-xl flex items-center justify-center">
                <Calendar className="w-20 h-20 text-white/20" />
                <div className="absolute top-4 left-4 bg-indigo-500 rounded-lg px-4 py-3 text-center">
                  <p className="text-sm text-white/80 uppercase">
                    {new Date(event.start_time).toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {new Date(event.start_time).getDate()}
                  </p>
                </div>
                {isPastEvent && (
                  <div className="absolute top-4 right-4">
                    <Chip className="bg-white/20 text-white">Past Event</Chip>
                  </div>
                )}
              </div>

              <div className="p-8">
                <h1 className="text-3xl font-bold text-white mb-4">
                  {event.title}
                </h1>

                {/* Event Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 text-white/70">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white/50">Date & Time</p>
                      <p className="text-white">
                        {formatDate(event.start_time)}
                      </p>
                      <p className="text-sm">
                        {formatTime(event.start_time)} -{" "}
                        {formatTime(event.end_time)}
                      </p>
                    </div>
                  </div>

                  {event.location && (
                    <div className="flex items-center gap-3 text-white/70">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white/50">Location</p>
                        <p className="text-white">{event.location}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-white/70">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white/50">Attendees</p>
                      <p className="text-white">
                        {event.attendee_count}
                        {event.max_attendees && ` / ${event.max_attendees}`}{" "}
                        going
                      </p>
                    </div>
                  </div>

                  {event.group && (
                    <Link href={`/groups/${event.group.id}`}>
                      <div className="flex items-center gap-3 text-white/70 hover:text-white transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-sm text-white/50">Group</p>
                          <p className="text-white">{event.group.name}</p>
                        </div>
                      </div>
                    </Link>
                  )}
                </div>

                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-white mb-3">
                    About this event
                  </h2>
                  <p className="text-white/70 whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>

                {/* Organizer Info */}
                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <Link href={`/members/${event.organizer?.id}`}>
                    <div className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                      <Avatar
                        name={`${event.organizer?.first_name} ${event.organizer?.last_name}`}
                        size="lg"
                        className="ring-2 ring-white/10"
                      />
                      <div>
                        <p className="text-sm text-white/50">Organized by</p>
                        <p className="font-semibold text-white">
                          {event.organizer?.first_name}{" "}
                          {event.organizer?.last_name}
                        </p>
                      </div>
                    </div>
                  </Link>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {isOrganizer ? (
                      <>
                        <Link href={`/events/${event.id}/edit`}>
                          <Button
                            className="bg-white/10 text-white hover:bg-white/20"
                            startContent={<Edit className="w-4 h-4" />}
                          >
                            Edit
                          </Button>
                        </Link>
                        <Button
                          className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          startContent={<Trash2 className="w-4 h-4" />}
                          onPress={onDeleteOpen}
                        >
                          Delete
                        </Button>
                      </>
                    ) : !isPastEvent ? (
                      userRsvp ? (
                        <div className="flex items-center gap-2">
                          <Chip className={getRsvpStatusColor(userRsvp.status)}>
                            {userRsvp.status === "going"
                              ? "Going"
                              : userRsvp.status === "maybe"
                              ? "Maybe"
                              : "Not Going"}
                          </Chip>
                          <Button
                            className="bg-white/10 text-white hover:bg-white/20"
                            startContent={<CalendarX className="w-4 h-4" />}
                            onPress={handleCancelRsvp}
                            isLoading={isRsvpLoading}
                          >
                            Cancel RSVP
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                            startContent={<CalendarCheck className="w-4 h-4" />}
                            onPress={() => handleRsvp("going")}
                            isLoading={isRsvpLoading}
                            isDisabled={isFull}
                          >
                            {isFull ? "Event Full" : "Going"}
                          </Button>
                          <Button
                            className="bg-white/10 text-white hover:bg-white/20"
                            onPress={() => handleRsvp("maybe")}
                            isLoading={isRsvpLoading}
                          >
                            Maybe
                          </Button>
                        </div>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            </MotionGlassCard>

            {/* Attendees Section */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-indigo-400" />
                Attendees
                <span className="text-white/50 font-normal text-base">
                  ({attendees.filter((a) => a.status === "going").length} going)
                </span>
              </h2>

              {attendees.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {attendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-white/5"
                    >
                      <Link href={`/members/${attendee.user?.id}`}>
                        <Avatar
                          name={`${attendee.user?.first_name} ${attendee.user?.last_name}`}
                          size="md"
                          className="ring-2 ring-white/10"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/members/${attendee.user?.id}`}>
                          <p className="font-medium text-white hover:text-indigo-400 transition-colors">
                            {attendee.user?.first_name} {attendee.user?.last_name}
                          </p>
                        </Link>
                        <Chip
                          size="sm"
                          className={getRsvpStatusColor(attendee.status)}
                        >
                          {attendee.status}
                        </Chip>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-white/50">No attendees yet</p>
                  {!isPastEvent && !isOrganizer && (
                    <p className="text-white/40 text-sm mt-1">
                      Be the first to RSVP!
                    </p>
                  )}
                </div>
              )}
            </MotionGlassCard>
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Event not found
            </h3>
            <p className="text-white/50 mb-6">
              This event may have been cancelled or doesn&apos;t exist.
            </p>
            <Link href="/events">
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                Browse Events
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        classNames={{
          base: "bg-black/90 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-white">Delete Event</ModalHeader>
          <ModalBody>
            <p className="text-white/70">
              Are you sure you want to delete this event? All RSVPs will be
              removed. This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              className="text-white/70"
              onPress={onDeleteClose}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-500 text-white"
              onPress={handleDelete}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
