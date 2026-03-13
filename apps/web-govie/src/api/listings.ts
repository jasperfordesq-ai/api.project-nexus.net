// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import { normalizePaginated, fullName } from './normalize'
import type {
  CreateListingRequest,
  Listing,
  PaginatedResponse,
  PaginationParams,
  UpdateListingRequest,
} from './types'

/** Raw listing shape from backend (snake_case, nested user object) */
interface RawListing {
  id: number
  title: string
  description: string | null
  type: string
  status: string
  location: string | null
  estimated_hours: number | null
  is_featured: boolean
  view_count: number
  expires_at: string | null
  created_at: string
  updated_at: string | null
  user: { id: number; first_name: string; last_name: string } | null
  category?: { id: number; name: string } | null
}

function mapListing(raw: RawListing): Listing {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? '',
    type: raw.type as Listing['type'],
    status: raw.status as Listing['status'],
    category: raw.category?.name ?? '',
    creditRate: raw.estimated_hours ?? 1,
    userId: raw.user?.id ?? 0,
    userName: fullName(raw.user),
    tenantId: 0,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at ?? raw.created_at,
    viewCount: raw.view_count ?? 0,
    location: raw.location ?? undefined,
  }
}

export const listingsApi = {
  list: (params?: PaginationParams): Promise<PaginatedResponse<Listing>> =>
    apiClient
      .get('/api/listings', { params: { page: params?.page, limit: params?.pageSize, search: params?.search, category: params?.category, type: params?.type } })
      .then((r) => normalizePaginated(r.data, mapListing)),

  get: (id: number) =>
    apiClient.get<RawListing>(`/api/listings/${id}`).then((r) => mapListing(r.data)),

  create: (payload: CreateListingRequest) =>
    apiClient.post('/api/listings', {
      title: payload.title,
      description: payload.description,
      type: payload.type,
      location: payload.location,
      estimated_hours: payload.creditRate,
    }).then((r) => {
      const raw = r.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
      return { ...raw, id: raw.id } as Listing
    }),

  update: (id: number, payload: UpdateListingRequest) =>
    apiClient.put(`/api/listings/${id}`, {
      ...(payload.title !== undefined && { title: payload.title }),
      ...(payload.description !== undefined && { description: payload.description }),
      ...(payload.type !== undefined && { type: payload.type }),
      ...(payload.location !== undefined && { location: payload.location }),
      ...(payload.creditRate !== undefined && { estimated_hours: payload.creditRate }),
      ...(payload.status !== undefined && { status: payload.status }),
    }).then((r) => r.data as Listing),

  delete: (id: number) =>
    apiClient.delete(`/api/listings/${id}`).then((r) => r.data),
}
