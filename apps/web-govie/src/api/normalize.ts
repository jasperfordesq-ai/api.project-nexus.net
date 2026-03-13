// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Normalizes backend API responses (snake_case, nested objects)
 * into the camelCase flat shapes expected by the web-govie frontend.
 */

import type { PaginatedResponse } from './types'

// ─── Pagination ──────────────────────────────────────────────────────────────

/** Backend pagination envelope: { data: T[], pagination: { page, limit, total, pages } } */
interface BackendPaginated<T> {
  data: T[]
  pagination?: { page: number; limit: number; total: number; pages: number }
}

/** Map backend paginated response to frontend PaginatedResponse<U> */
export function normalizePaginated<T, U>(
  raw: BackendPaginated<T>,
  mapItem: (item: T) => U,
): PaginatedResponse<U> {
  const p = raw.pagination
  return {
    items: (raw.data ?? []).map(mapItem),
    totalCount: p?.total ?? raw.data?.length ?? 0,
    page: p?.page ?? 1,
    pageSize: p?.limit ?? raw.data?.length ?? 20,
    totalPages: p?.pages ?? 1,
  }
}

// ─── User name helper ────────────────────────────────────────────────────────

/** Flatten a backend { first_name, last_name } object into "First Last" */
export function fullName(u: { first_name?: string; last_name?: string } | null | undefined): string {
  if (!u) return 'Unknown'
  return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'Unknown'
}
