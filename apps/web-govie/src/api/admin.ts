// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams, UserSummary } from './types'

export interface AdminDashboard {
  totalUsers: number
  activeUsers: number
  totalExchanges: number
  totalCreditsCirculated: number
  pendingListings: number
  openDisputes: number
}

export const adminApi = {
  dashboard: () =>
    apiClient.get<AdminDashboard>('/api/admin/dashboard').then((r) => r.data),

  users: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<UserSummary>>('/api/admin/users', { params }).then((r) => r.data),

  userDetails: (id: number) =>
    apiClient.get(`/api/admin/users/${id}`).then((r) => r.data),

  updateUser: (id: number, payload: Record<string, unknown>) =>
    apiClient.put(`/api/admin/users/${id}`, payload).then((r) => r.data),

  suspendUser: (id: number) =>
    apiClient.put(`/api/admin/users/${id}/suspend`).then((r) => r.data),

  activateUser: (id: number) =>
    apiClient.put(`/api/admin/users/${id}/activate`).then((r) => r.data),

  config: () =>
    apiClient.get('/api/admin/config').then((r) => r.data),

  updateConfig: (payload: Record<string, unknown>) =>
    apiClient.put('/api/admin/config', payload).then((r) => r.data),
}
