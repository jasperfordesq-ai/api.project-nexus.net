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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConnection(raw: any): Connection {
  const otherUser = raw?.other_user ?? raw?.otherUser ?? raw?.connectedUser
  return {
    id: raw.id,
    userId: raw.user_id ?? raw.userId,
    connectedUserId: otherUser?.id ?? raw.addressee_id ?? raw.connectedUserId ?? raw.connected_user_id,
    connectedUser: otherUser ? {
      id: otherUser.id,
      email: otherUser.email ?? '',
      firstName: otherUser.first_name ?? otherUser.firstName ?? '',
      lastName: otherUser.last_name ?? otherUser.lastName ?? '',
      role: otherUser.role ?? 'member',
      tenantId: otherUser.tenant_id ?? otherUser.tenantId ?? 0,
      avatarUrl: otherUser.avatar_url ?? otherUser.avatarUrl,
      createdAt: otherUser.created_at ?? otherUser.createdAt ?? '',
    } : raw.connectedUser,
    status: raw.status,
    createdAt: raw.created_at ?? raw.createdAt,
  }
}

export const connectionsApi = {
  list: (params?: PaginationParams) =>
    apiClient.get('/api/connections', { params }).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = r.data as any
      const items = raw?.connections ?? raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
      const pagination = raw?.pagination
      return {
        items: items.map(mapConnection),
        totalCount: pagination?.total ?? raw?.totalCount ?? items.length,
        page: pagination?.page ?? raw?.page ?? 1,
        pageSize: pagination?.limit ?? raw?.pageSize ?? items.length,
        totalPages: pagination?.pages ?? raw?.totalPages ?? 1,
      } as PaginatedResponse<Connection>
    }),

  pending: () =>
    apiClient.get('/api/connections/pending').then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = r.data as any
      const items = raw?.connections ?? raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
      return items.map(mapConnection) as Connection[]
    }),

  send: (userId: number) =>
    apiClient.post('/api/connections', { user_id: userId }).then((r) => mapConnection(r.data)),

  accept: (id: number) =>
    apiClient.put(`/api/connections/${id}/accept`).then((r) => mapConnection(r.data)),

  decline: (id: number) =>
    apiClient.put(`/api/connections/${id}/decline`).then((r) => r.data),

  remove: (id: number) =>
    apiClient.delete(`/api/connections/${id}`).then((r) => r.data),
}
