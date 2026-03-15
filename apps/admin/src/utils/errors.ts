// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Extract a user-friendly error message from an Axios error or unknown error.
 * Centralised so all admin pages use the same pattern.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null) {
    const axiosErr = err as { response?: { data?: { message?: string; error?: string } }; request?: unknown };
    if (axiosErr.response) {
      return axiosErr.response.data?.message || axiosErr.response.data?.error || fallback;
    }
    if (axiosErr.request) {
      return "Network error — please check your connection and try again";
    }
  }
  return fallback;
}
