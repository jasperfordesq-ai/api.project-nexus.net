// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams } from './types'

/** Safely extract an array from backend response variants */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractItems(raw: any): any[] {
  return raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
}

export interface Notification {
  id: number
  type: string
  title: string
  message: string
  isRead: boolean
  actionUrl?: string
  createdAt: string
}

export const notificationsApi = {
  list: (params?: PaginationParams) =>
    apiClient.get('/api/notifications', { params }).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = r.data as any
      const items = extractItems(raw)
      const pagination = raw?.pagination
      return {
        items: items as Notification[],
        totalCount: pagination?.total ?? raw?.totalCount ?? items.length,
        page: pagination?.page ?? raw?.page ?? 1,
        pageSize: pagination?.limit ?? raw?.pageSize ?? items.length,
        totalPages: pagination?.pages ?? raw?.totalPages ?? 1,
      } as PaginatedResponse<Notification>
    }),

  unreadCount: () =>
    apiClient.get<{ count: number }>('/api/notifications/unread-count').then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Notification>(`/api/notifications/${id}`).then((r) => r.data),

  markRead: (id: number) =>
    apiClient.put(`/api/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    apiClient.put('/api/notifications/read-all').then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/api/notifications/${id}`).then((r) => r.data),
}
