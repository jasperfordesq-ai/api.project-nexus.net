// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

import apiClient from './client'
import type {
  CreateListingRequest,
  Listing,
  PaginatedResponse,
  PaginationParams,
  UpdateListingRequest,
} from './types'

export const listingsApi = {
  list: (params?: PaginationParams) =>
    apiClient
      .get<PaginatedResponse<Listing>>('/api/listings', { params })
      .then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Listing>(`/api/listings/${id}`).then((r) => r.data),

  create: (payload: CreateListingRequest) =>
    apiClient.post<Listing>('/api/listings', payload).then((r) => r.data),

  update: (id: number, payload: UpdateListingRequest) =>
    apiClient.put<Listing>(`/api/listings/${id}`, payload).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/api/listings/${id}`).then((r) => r.data),
}
