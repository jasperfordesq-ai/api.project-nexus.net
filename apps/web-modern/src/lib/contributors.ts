// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Contributor data structure matching contributors.json schema.
 * This data MUST be displayed on all About pages per NOTICE requirements.
 */
export interface Contributor {
  name: string;
  role: string;
  type: "creator" | "founder" | "contributor" | "acknowledgement";
  note?: string;
  links?: string[];
}

/**
 * Grouped contributors for display on About pages.
 */
export interface ContributorGroups {
  creator: Contributor | null;
  founders: Contributor[];
  contributors: Contributor[];
  acknowledgements: Contributor[];
}

/**
 * Import contributors data at build time.
 * This is the canonical source - do not hardcode contributors elsewhere.
 */
import contributorsData from "../../contributors.json";

/**
 * Get all contributors from the canonical source.
 * Returns null if data cannot be loaded.
 */
export function getContributors(): Contributor[] | null {
  try {
    return contributorsData as Contributor[];
  } catch (error) {
    console.warn("Contributors list unavailable:", error);
    return null;
  }
}

/**
 * Get contributors grouped by type for About page display.
 */
export function getContributorGroups(): ContributorGroups {
  const contributors = getContributors();

  if (!contributors) {
    return {
      creator: null,
      founders: [],
      contributors: [],
      acknowledgements: [],
    };
  }

  return {
    creator: contributors.find((c) => c.type === "creator") || null,
    founders: contributors.filter((c) => c.type === "founder"),
    contributors: contributors.filter((c) => c.type === "contributor"),
    acknowledgements: contributors.filter((c) => c.type === "acknowledgement"),
  };
}

/**
 * Get the research foundation acknowledgement (special case).
 */
export function getResearchFoundation(): Contributor | null {
  const contributors = getContributors();
  if (!contributors) return null;

  return contributors.find(
    (c) => c.type === "acknowledgement" && c.role === "Research Foundation"
  ) || null;
}
