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
  Switch,
  Skeleton,
} from "@heroui/react";
import { ArrowLeft, Users, Globe, Lock, Save } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { ErrorBoundary } from "@/components/error-boundary";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";

export default function EditGroupPage() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <EditGroupContent />
      </ErrorBoundary>
    </ProtectedRoute>
  );
}

function EditGroupContent() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const isValidId = !isNaN(id) && id > 0;
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_public: true,
    image_url: "",
  });

  useEffect(() => {
    if (!isValidId) { setIsLoading(false); setError("Invalid group ID"); return; }
    const loadGroup = async () => {
      try {
        const group = await api.getGroup(id);
        setFormData({
          name: group.name || "",
          description: group.description || "",
          is_public: group.is_public !== undefined ? group.is_public : true,
          image_url: group.image_url || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load group");
      } finally {
        setIsLoading(false);
      }
    };
    loadGroup();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Group name is required");
      return;
    }
    if (!formData.description.trim()) {
      setError("Description is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const data: {
        name: string;
        description: string;
        is_public: boolean;
        image_url?: string;
      } = {
        name: formData.name,
        description: formData.description,
        is_public: formData.is_public,
      };
      if (formData.image_url) {
        data.image_url = formData.image_url;
      }
      await api.updateGroup(id, data);
      router.push(`/groups/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update group");
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
          <Link href={`/groups/${id}`}>
            <Button
              isIconOnly
              variant="flat"
              className="bg-white/5 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Edit Group</h1>
            <p className="text-white/50 mt-1">
              Update your group details
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
                  <Users className="w-12 h-12 text-indigo-400" />
                </div>
              </div>

              {/* Name */}
              <Input
                label="Group Name"
                value={formData.name}
                onValueChange={(value) =>
                  setFormData({ ...formData, name: value })
                }
                isRequired
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

              {/* Image URL (optional) */}
              <Input
                label="Image URL (optional)"
                placeholder="https://example.com/group-image.jpg"
                value={formData.image_url}
                onValueChange={(value) =>
                  setFormData({ ...formData, image_url: value })
                }
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

              {/* Privacy Toggle */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {formData.is_public ? (
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-amber-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-white">
                        {formData.is_public ? "Public Group" : "Private Group"}
                      </p>
                      <p className="text-sm text-white/50">
                        {formData.is_public
                          ? "Anyone can find and join this group"
                          : "Members must be approved to join"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    isSelected={formData.is_public}
                    onValueChange={(value) =>
                      setFormData({ ...formData, is_public: value })
                    }
                    classNames={{
                      wrapper: "group-data-[selected=true]:bg-emerald-500",
                    }}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Link href={`/groups/${id}`} className="flex-1">
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
