// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams, UserSummary } from './types'

export interface Connection {
  id: number
  userId: number
  connectedUserId: number
  connectedUser: UserSummary
  status: 'pending' | 'accepted'
  createdAt: string
}

export const connectionsApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Connection>>('/api/connections', { params }).then((r) => r.data),

  pending: () =>
    apiClient.get<Connection[]>('/api/connections/pending').then((r) => r.data),

  send: (userId: number) =>
    apiClient.post<Connection>('/api/connections', { userId }).then((r) => r.data),

  accept: (id: number) =>
    apiClient.put<Connection>(`/api/connections/${id}/accept`).then((r) => r.data),

  decline: (id: number) =>
    apiClient.put(`/api/connections/${id}/decline`).then((r) => r.data),

  remove: (id: number) =>
    apiClient.delete(`/api/connections/${id}`).then((r) => r.data),
}
