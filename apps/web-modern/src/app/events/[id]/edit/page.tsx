// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Button,
  Input,
  Textarea,
  Skeleton,
} from "@heroui/react";
import { ArrowLeft, Calendar, MapPin, Users, Clock, Save } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { ErrorBoundary } from "@/components/error-boundary";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";

export default function EditEventPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <EditEventContent />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}

function EditEventContent() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const isValidId = !isNaN(id) && id > 0;
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    start_time: "",
    end_time: "",
    max_attendees: "",
  });

  useEffect(() => {
    if (!isValidId) { setIsLoading(false); setError("Invalid event ID"); return; }
    const loadEvent = async () => {
      try {
        const event = await api.getEvent(id);
        setFormData({
          title: event.title || "",
          description: event.description || "",
          location: event.location || "",
          start_time: event.start_time
            ? new Date(event.start_time).toISOString().slice(0, 16)
            : "",
          end_time: event.end_time
            ? new Date(event.end_time).toISOString().slice(0, 16)
            : "",
          max_attendees: event.max_attendees ? String(event.max_attendees) : "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        setIsLoading(false);
      }
    };
    loadEvent();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.title.trim()) {
      setError("Event title is required");
      return;
    }
    if (!formData.description.trim()) {
      setError("Description is required");
      return;
    }

    const start = new Date(formData.start_time);
    const end = new Date(formData.end_time);

    if (end <= start) {
      setError("End time must be after start time");
      return;
    }

    setIsSubmitting(true);

    try {
      const data: {
        title: string;
        description: string;
        start_time: string;
        end_time: string;
        location?: string;
        max_attendees?: number;
      } = {
        title: formData.title,
        description: formData.description,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
      };

      if (formData.location) {
        data.location = formData.location;
      }

      if (formData.max_attendees) {
        data.max_attendees = parseInt(formData.max_attendees, 10);
      }

      await api.updateEvent(id, data);
      router.push(`/events/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/events/${id}`}>
            <Button
              isIconOnly
              variant="flat"
              className="bg-white/5 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Edit Event</h1>
            <p className="text-white/50 mt-1">
              Update your event details
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-20 rounded-xl bg-white/5" />
            <Skeleton className="h-14 rounded-xl bg-white/5" />
            <Skeleton className="h-32 rounded-xl bg-white/5" />
            <Skeleton className="h-14 rounded-xl bg-white/5" />
          </div>
        ) : (
          <MotionGlassCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            glow="primary"
            padding="lg"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Preview Icon */}
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center border border-white/10">
                  <Calendar className="w-12 h-12 text-indigo-400" />
                </div>
              </div>

              {/* Title */}
              <Input
                label="Event Title"
                value={formData.title}
                onValueChange={(value) =>
                  setFormData({ ...formData, title: value })
                }
                isRequired
                startContent={<Calendar className="w-4 h-4 text-white/40" />}
                classNames={{
                  label: "text-white/70",
                  input: "text-white placeholder:text-white/30",
                  inputWrapper: [
                    "bg-white/5",
                    "border border-white/10",
                    "hover:bg-white/10",
                    "group-data-[focus=true]:bg-white/10",
                    "group-data-[focus=true]:border-indigo-500/50",
                  ],
                }}
              />

              {/* Description */}
              <Textarea
                label="Description"
                value={formData.description}
                onValueChange={(value) =>
                  setFormData({ ...formData, description: value })
                }
                isRequired
                minRows={4}
                classNames={{
                  label: "text-white/70",
                  input: "text-white placeholder:text-white/30",
                  inputWrapper: [
                    "bg-white/5",
                    "border border-white/10",
                    "hover:bg-white/10",
                    "group-data-[focus=true]:bg-white/10",
                    "group-data-[focus=true]:border-indigo-500/50",
                  ],
                }}
              />

              {/* Date/Time Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-white/70 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:bg-white/10 focus:border-indigo-500/50 focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/70 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:bg-white/10 focus:border-indigo-500/50 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Location */}
              <Input
                label="Location (optional)"
                value={formData.location}
                onValueChange={(value) =>
                  setFormData({ ...formData, location: value })
                }
                startContent={<MapPin className="w-4 h-4 text-white/40" />}
                classNames={{
                  label: "text-white/70",
                  input: "text-white placeholder:text-white/30",
                  inputWrapper: [
                    "bg-white/5",
                    "border border-white/10",
                    "hover:bg-white/10",
                    "group-data-[focus=true]:bg-white/10",
                    "group-data-[focus=true]:border-indigo-500/50",
                  ],
                }}
              />

              {/* Max Attendees */}
              <Input
                type="number"
                label="Max Attendees (optional)"
                placeholder="Leave empty for unlimited"
                value={formData.max_attendees}
                onValueChange={(value) =>
                  setFormData({ ...formData, max_attendees: value })
                }
                min={1}
                startContent={<Users className="w-4 h-4 text-white/40" />}
                classNames={{
                  label: "text-white/70",
                  input: "text-white placeholder:text-white/30",
                  inputWrapper: [
                    "bg-white/5",
                    "border border-white/10",
                    "hover:bg-white/10",
                    "group-data-[focus=true]:bg-white/10",
                    "group-data-[focus=true]:border-indigo-500/50",
                  ],
                }}
              />

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Link href={`/events/${id}`} className="flex-1">
                  <Button variant="flat" className="w-full bg-white/5 text-white hover:bg-white/10">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting}
                  startContent={!isSubmitting && <Save className="w-4 h-4" />}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </MotionGlassCard>
        )}
      </div>
    </div>
  );
}
