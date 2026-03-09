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
  Chip,
} from "@heroui/react";
import { Mail, Save, Check } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { GlassCard } from "@/components/glass-card";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

const NEWSLETTER_TOPICS = [
  "Community Updates",
  "New Listings",
  "Events",
  "Tips & Guides",
  "Feature Announcements",
];

export default function NewsletterPage() {
  return <ProtectedRoute><NewsletterContent /></ProtectedRoute>;
}

function NewsletterContent() {
  const { user, logout } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    api.getNewsletterSubscription()
      .then((data) => {
        setSubscribed(data.subscribed);
        setPreferences(data.preferences || []);
      })
      .catch((error) => logger.error("Failed to fetch subscription:", error))
      .finally(() => setIsLoading(false));
  }, []);
  const togglePref = (topic: string) => {
    setPreferences((prev) =>
      prev.includes(topic) ? prev.filter((p) => p !== topic) : [...prev, topic]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateNewsletterSubscription({ subscribed, preferences });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      logger.error("Failed to save subscription:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogout={logout} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Mail className="w-8 h-8 text-indigo-400" />
            Newsletter
          </h1>
          <p className="text-white/50 mt-1">Manage your newsletter subscription</p>
        </div>

        {isLoading ? (
          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
            <Skeleton className="w-3/4 h-5 rounded" />
          </div>
        ) : (
          <GlassCard glow="none" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-white font-medium">Subscribe to Newsletter</p>
                <p className="text-sm text-white/40">Receive regular community updates</p>
              </div>
              <Switch
                isSelected={subscribed}
                onValueChange={setSubscribed}
                classNames={{ wrapper: "bg-white/10 group-data-[selected=true]:bg-indigo-500" }}
              />
            </div>

            {subscribed && (
              <div className="mb-6">
                <p className="text-sm text-white/60 mb-3">Select topics you are interested in:</p>
                <div className="flex flex-wrap gap-2">
                  {NEWSLETTER_TOPICS.map((topic) => (
                    <Chip
                      key={topic}
                      variant="flat"
                      className={`cursor-pointer ${
                        preferences.includes(topic)
                          ? "bg-indigo-500/20 text-indigo-400"
                          : "bg-white/5 text-white/50"
                      }`}
                      onClick={() => togglePref(topic)}
                    >
                      {topic}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <Button
              className={saved ? "bg-emerald-500 text-white" : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"}
              startContent={saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              onPress={handleSave}
              isLoading={isSaving}
            >
              {saved ? "Saved!" : "Save"}
            </Button>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
