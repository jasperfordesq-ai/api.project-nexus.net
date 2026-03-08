// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Info, AlertTriangle, AlertOctagon } from "lucide-react";
import { api } from "@/lib/api";
import { logger } from "@/lib/logger";

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

const DISMISSED_KEY = "nexus_dismissed_announcements";

function getDismissedIds(): number[] {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addDismissedId(id: number) {
  const ids = getDismissedIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  }
}

const typeConfig: Record<string, { icon: typeof Info; bg: string; border: string; text: string }> = {
  info: {
    icon: Info,
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
  },
  critical: {
    icon: AlertOctagon,
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
  },
};

export function SystemAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const data = await api.getSystemAnnouncements();
        const dismissed = getDismissedIds();
        const visible = (data || []).filter(
          (a: Announcement) => !dismissed.includes(a.id)
        );
        setAnnouncements(visible);
      } catch (error) {
        logger.error("Failed to fetch system announcements:", error);
      }
    }
    fetchAnnouncements();
  }, []);

  const handleDismiss = async (id: number) => {
    addDismissedId(id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    try {
      await api.dismissAnnouncement(id);
    } catch (error) {
      logger.error("Failed to dismiss announcement:", error);
    }
  };

  if (announcements.length === 0) return null;

  return (
    <div className="w-full space-y-2 mb-4">
      <AnimatePresence mode="popLayout">
        {announcements.map((announcement) => {
          const config = typeConfig[announcement.type] || typeConfig.info;
          const Icon = config.icon;

          return (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`
                rounded-xl ${config.bg} border ${config.border}
                backdrop-blur-xl backdrop-saturate-150
                px-4 py-3
              `}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${config.text} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-semibold ${config.text}`}>
                    {announcement.title}
                  </h4>
                  <p className="text-sm text-white/60 mt-0.5">
                    {announcement.message}
                  </p>
                </div>
                <button
                  onClick={() => handleDismiss(announcement.id)}
                  className="text-white/30 hover:text-white/60 transition-colors shrink-0 mt-0.5"
                  aria-label="Dismiss announcement"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
