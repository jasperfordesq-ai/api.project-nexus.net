// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams, UserProfile, UserSummary } from './types'

export const usersApi = {
  list: (params?: PaginationParams) =>
    apiClient.get('/api/users', { params: { page: params?.page, limit: params?.pageSize, search: params?.search } }).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = r.data as any
      const data = raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
      const pagination = raw?.pagination
      return {
        items: data,
        totalCount: pagination?.total ?? data.length,
        page: pagination?.page ?? 1,
        pageSize: pagination?.limit ?? data.length,
        totalPages: pagination?.pages ?? 1,
      } as PaginatedResponse<UserSummary>
    }),

  get: (id: number) =>
    apiClient.get<UserProfile>(`/api/users/${id}`).then((r) => r.data),

  me: () =>
    apiClient.get<UserProfile>('/api/users/me').then((r) => r.data),

  updateMe: (payload: Partial<UserProfile>) =>
    apiClient.patch<UserProfile>('/api/users/me', {
      first_name: payload.firstName,
      last_name: payload.lastName,
    }).then((r) => r.data),
}
