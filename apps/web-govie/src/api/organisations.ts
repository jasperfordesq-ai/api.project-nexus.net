// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams, UserSummary } from './types'

export interface Organisation {
  id: number
  name: string
  description: string
  type: string
  website?: string
  logoUrl?: string
  memberCount: number
  isVerified: boolean
  createdAt: string
  tenantId: number
}

export const organisationsApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Organisation>>('/api/organisations', { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Organisation>(`/api/organisations/${id}`).then((r) => r.data),

  create: (payload: Partial<Organisation>) =>
    apiClient.post<Organisation>('/api/organisations', payload).then((r) => r.data),

  update: (id: number, payload: Partial<Organisation>) =>
    apiClient.put<Organisation>(`/api/organisations/${id}`, payload).then((r) => r.data),

  members: (id: number) =>
    apiClient.get<UserSummary[]>(`/api/organisations/${id}/members`).then((r) => r.data),

  join: (id: number) =>
    apiClient.post(`/api/organisations/${id}/members`).then((r) => r.data),

  leave: (id: number) =>
    apiClient.delete(`/api/organisations/${id}/members/me`).then((r) => r.data),
}
