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
  Select,
  SelectItem,
  Slider,
  Skeleton,
} from "@heroui/react";
import { ArrowLeft, Package, Clock, Save } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { ErrorBoundary } from "@/components/error-boundary";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";

export default function EditListingPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <EditListingContent />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}

function EditListingContent() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "offer" as "offer" | "request",
    time_credits: 1,
    status: "active" as string,
  });

  useEffect(() => {
    const loadListing = async () => {
      try {
        const listing = await api.getListing(id);
        setFormData({
          title: listing.title || "",
          description: listing.description || "",
          type: listing.type || "offer",
          time_credits: listing.time_credits || 1,
          status: listing.status || "active",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load listing");
      } finally {
        setIsLoading(false);
      }
    };
    loadListing();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await api.updateListing(id, formData);
      router.push(`/listings/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update listing");
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
          <Link href={`/listings/${id}`}>
            <Button
              isIconOnly
              variant="flat"
              className="bg-white/5 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Edit Listing</h1>
            <p className="text-white/50 mt-1">
              Update your listing details
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

              {/* Type Selection */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "offer" })}
                  className={`p-4 rounded-xl border transition-all ${
                    formData.type === "offer"
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <Package className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-medium">Offer</p>
                  <p className="text-xs opacity-60 mt-1">I can help with...</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "request" })}
                  className={`p-4 rounded-xl border transition-all ${
                    formData.type === "request"
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <Clock className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-medium">Request</p>
                  <p className="text-xs opacity-60 mt-1">I need help with...</p>
                </button>
              </div>

              <Input
                label="Title"
                value={formData.title}
                onValueChange={(value) => setFormData({ ...formData, title: value })}
                isRequired
                classNames={{
                  label: "text-white/70",
                  input: "text-white placeholder:text-white/30",
                  inputWrapper: ["bg-white/5", "border border-white/10", "hover:bg-white/10", "group-data-[focus=true]:bg-white/10", "group-data-[focus=true]:border-indigo-500/50"],
                }}
              />

              <Textarea
                label="Description"
                value={formData.description}
                onValueChange={(value) => setFormData({ ...formData, description: value })}
                isRequired
                minRows={4}
                classNames={{
                  label: "text-white/70",
                  input: "text-white placeholder:text-white/30",
                  inputWrapper: ["bg-white/5", "border border-white/10", "hover:bg-white/10", "group-data-[focus=true]:bg-white/10", "group-data-[focus=true]:border-indigo-500/50"],
                }}
              />

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-white/70">Time Credits</label>
                  <span className="text-lg font-semibold text-indigo-400">
                    {formData.time_credits} credit{formData.time_credits !== 1 ? "s" : ""}
                  </span>
                </div>
                <Slider
                  size="sm"
                  step={1}
                  minValue={1}
                  maxValue={20}
                  value={formData.time_credits}
                  onChange={(value) =>
                    setFormData({ ...formData, time_credits: Array.isArray(value) ? value[0] : value })
                  }
                  classNames={{
                    track: "bg-white/10",
                    filler: "bg-gradient-to-r from-indigo-500 to-purple-500",
                    thumb: "bg-white shadow-lg",
                  }}
                />
              </div>

              <Select
                label="Status"
                selectedKeys={[formData.status]}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as "active" | "draft";
                  setFormData({ ...formData, status: value });
                }}
                classNames={{
                  label: "text-white/70",
                  value: "text-white",
                  trigger: ["bg-white/5", "border border-white/10", "hover:bg-white/10", "data-[open=true]:bg-white/10", "data-[open=true]:border-indigo-500/50"],
                  popoverContent: "bg-zinc-900 border border-white/10",
                }}
              >
                <SelectItem key="active" className="text-white">Active - Visible to everyone</SelectItem>
                <SelectItem key="draft" className="text-white">Draft - Save for later</SelectItem>
              </Select>

              <div className="flex gap-4 pt-4">
                <Link href={`/listings/${id}`} className="flex-1">
                  <Button variant="flat" className="w-full bg-white/5 text-white hover:bg-white/10">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                  isLoading={isSubmitting}
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
