// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Skeleton,
  Switch,
  Select,
  SelectItem,
} from "@heroui/react";
import { Settings, Save } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { MotionGlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";
import { containerVariantsFast, itemVariants } from "@/lib/animations";

interface Preferences {
  email_notifications: boolean;
  push_notifications: boolean;
  theme: string;
  language: string;
  timezone: string;
  visibility: string;
  show_online_status: boolean;
  show_location: boolean;
}

export default function PreferencesPage() {
  return <ProtectedRoute><PreferencesContent /></ProtectedRoute>;
}

function PreferencesContent() {
  const { user, logout } = useAuth();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const fetchPrefs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getUserPreferences();
      setPrefs(data);
    } catch (error) {
      logger.error("Failed to fetch preferences:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);
  const handleSave = async () => {
    if (!prefs) return;
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      await api.updateUserPreferences(prefs);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      logger.error("Failed to save preferences:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const update = (key: keyof Preferences, value: unknown) => {
    setPrefs((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Settings className="w-8 h-8 text-indigo-400" />
              Preferences
            </h1>
            <p className="text-white/50 mt-1">Customise your experience</p>
          </div>
          {!isLoading && prefs && (
            <Button
              className={saveStatus === "saved" ? "bg-emerald-500/20 text-emerald-400" : saveStatus === "error" ? "bg-red-500/20 text-red-400" : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"}
              startContent={<Save className="w-4 h-4" />}
              onPress={handleSave}
              isLoading={isSaving}
            >
              {saveStatus === "saved" ? "Saved!" : saveStatus === "error" ? "Failed" : "Save"}
            </Button>
          )}
        </div>

        {isLoading || !prefs ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Skeleton className="w-3/4 h-5 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div variants={containerVariantsFast} initial="hidden" animate="visible" className="space-y-6">
            {/* Notifications */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4">Notifications</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Email Notifications</p>
                    <p className="text-sm text-white/40">Receive updates via email</p>
                  </div>
                  <Switch
                    isSelected={prefs.email_notifications}
                    onValueChange={(v) => update("email_notifications", v)}
                    classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Push Notifications</p>
                    <p className="text-sm text-white/40">Receive browser push notifications</p>
                  </div>
                  <Switch
                    isSelected={prefs.push_notifications}
                    onValueChange={(v) => update("push_notifications", v)}
                    classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
                  />
                </div>
              </div>
            </MotionGlassCard>

            {/* Display */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4">Display</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Language"
                  selectedKeys={new Set([prefs.language])}
                  onSelectionChange={(keys) => update("language", Array.from(keys)[0] as string)}
                  classNames={{ trigger: "bg-white/5 border border-white/10 text-white", value: "text-white", label: "text-white/60", popoverContent: "bg-black/90 border border-white/10" }}
                >
                  <SelectItem key="en" className="text-white">English</SelectItem>
                  <SelectItem key="es" className="text-white">Spanish</SelectItem>
                  <SelectItem key="fr" className="text-white">French</SelectItem>
                  <SelectItem key="de" className="text-white">German</SelectItem>
                  <SelectItem key="ga" className="text-white">Irish</SelectItem>
                </Select>
                <Select
                  label="Timezone"
                  selectedKeys={new Set([prefs.timezone])}
                  onSelectionChange={(keys) => update("timezone", Array.from(keys)[0] as string)}
                  classNames={{ trigger: "bg-white/5 border border-white/10 text-white", value: "text-white", label: "text-white/60", popoverContent: "bg-black/90 border border-white/10" }}
                >
                  <SelectItem key="UTC" className="text-white">UTC</SelectItem>
                  <SelectItem key="Europe/London" className="text-white">London</SelectItem>
                  <SelectItem key="Europe/Dublin" className="text-white">Dublin</SelectItem>
                  <SelectItem key="America/New_York" className="text-white">New York</SelectItem>
                  <SelectItem key="America/Los_Angeles" className="text-white">Los Angeles</SelectItem>
                </Select>
              </div>
            </MotionGlassCard>

            {/* Privacy */}
            <MotionGlassCard variants={itemVariants} glow="none" padding="lg">
              <h2 className="text-lg font-semibold text-white mb-4">Privacy</h2>
              <div className="space-y-4">
                <Select
                  label="Profile Visibility"
                  selectedKeys={new Set([prefs.visibility])}
                  onSelectionChange={(keys) => update("visibility", Array.from(keys)[0] as string)}
                  classNames={{ trigger: "bg-white/5 border border-white/10 text-white", value: "text-white", label: "text-white/60", popoverContent: "bg-black/90 border border-white/10" }}
                >
                  <SelectItem key="public" className="text-white">Public</SelectItem>
                  <SelectItem key="members" className="text-white">Members Only</SelectItem>
                  <SelectItem key="connections" className="text-white">Connections Only</SelectItem>
                </Select>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Show Online Status</p>
                    <p className="text-sm text-white/40">Let others see when you are online</p>
                  </div>
                  <Switch
                    isSelected={prefs.show_online_status}
                    onValueChange={(v) => update("show_online_status", v)}
                    classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Show Location</p>
                    <p className="text-sm text-white/40">Display your location on your profile</p>
                  </div>
                  <Switch
                    isSelected={prefs.show_location}
                    onValueChange={(v) => update("show_location", v)}
                    classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
                  />
                </div>
              </div>
            </MotionGlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}
