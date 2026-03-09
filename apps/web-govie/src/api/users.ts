// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams, UserProfile, UserSummary } from './types'

export const usersApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<UserSummary>>('/api/users', { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<UserProfile>(`/api/users/${id}`).then((r) => r.data),

  me: () =>
    apiClient.get<UserProfile>('/api/users/me').then((r) => r.data),

  updateMe: (payload: Partial<UserProfile>) =>
    apiClient.patch<UserProfile>('/api/users/me', payload).then((r) => r.data),
}
