// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams } from './types'

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
    apiClient.get<PaginatedResponse<Notification>>('/api/notifications', { params }).then((r) => r.data),

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
