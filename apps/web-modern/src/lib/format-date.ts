// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Consistent date formatting utilities for the NEXUS frontend.
 * All functions use en-IE locale for consistency across the app.
 */

/** Format a date as "14 Mar 2026" */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format a date with time as "14 Mar 2026, 14:30" */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format a date as "Monday, 14 March 2026" */
export function formatDateLong(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Format time only as "14:30" */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("en-IE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format as relative time: "just now", "5m ago", "3h ago", "2d ago", or fallback to formatDate */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}
