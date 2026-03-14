// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Skeleton,
  Switch,
} from "@heroui/react";
import { Bell, Save, Check } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

interface PushSettings {
  enabled: boolean;
  categories: {
    messages: boolean;
    exchanges: boolean;
    connections: boolean;
    listings: boolean;
    events: boolean;
  };
}

const categoryLabels: Record<string, { title: string; desc: string }> = {
  messages: { title: "Messages", desc: "New messages and conversation updates" },
  exchanges: { title: "Exchanges", desc: "Exchange requests and status changes" },
  connections: { title: "Connections", desc: "Connection requests and acceptances" },
  listings: { title: "Listings", desc: "New listings matching your interests" },
  events: { title: "Events", desc: "Event reminders and updates" },
};

export default function PushNotificationsPage() {
  return <ProtectedRoute><PushContent /></ProtectedRoute>;
}

function PushContent() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<PushSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    api.getPushSettings()
      .then((data) => setSettings(data))
      .catch((error) => logger.error("Failed to fetch push settings:", error))
      .finally(() => setIsLoading(false));
  }, []);
  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await api.updatePushSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      logger.error("Failed to save push settings:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (key: string) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        categories: {
          ...prev.categories,
          [key]: !prev.categories[key as keyof typeof prev.categories],
        },
      };
    });
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Bell className="w-8 h-8 text-indigo-400" />
              Push Notifications
            </h1>
            <p className="text-white/50 mt-1">Control what notifications you receive</p>
          </div>
          <Button
            className={saved ? "bg-emerald-500 text-white" : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"}
            startContent={saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            onPress={handleSave}
            isLoading={isSaving}
          >
            {saved ? "Saved!" : "Save"}
          </Button>
        </div>

        {isLoading || !settings ? (
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <Skeleton className="w-3/4 h-5 rounded" />
          </div>
        ) : (
          <GlassCard glow="none" padding="lg">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div>
                <p className="text-white font-medium">Enable Push Notifications</p>
                <p className="text-sm text-white/40">Receive browser notifications</p>
              </div>
              <Switch
                isSelected={settings.enabled}
                onValueChange={(v) => setSettings((prev) => prev ? { ...prev, enabled: v } : prev)}
                classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
              />
            </div>

            {settings.enabled && (
              <div className="space-y-4">
                <p className="text-sm text-white/60">Notification categories:</p>
                {Object.entries(categoryLabels).map(([key, { title, desc }]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{title}</p>
                      <p className="text-sm text-white/40">{desc}</p>
                    </div>
                    <Switch
                      isSelected={settings.categories[key as keyof typeof settings.categories]}
                      onValueChange={() => toggleCategory(key)}
                      classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
                    />
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  );
}
