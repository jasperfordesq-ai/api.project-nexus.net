// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams, UserSummary } from './types'

export interface Group {
  id: number
  name: string
  description: string
  type: 'public' | 'private' | 'secret'
  memberCount: number
  avatarUrl?: string
  createdAt: string
  isMember?: boolean
  tenantId: number
}

export interface GroupMember {
  userId: number
  user: UserSummary
  role: 'member' | 'moderator' | 'admin'
  joinedAt: string
}

export const groupsApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Group>>('/api/groups', { params }).then((r) => r.data),

  my: () =>
    apiClient.get<Group[]>('/api/groups/my').then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Group>(`/api/groups/${id}`).then((r) => r.data),

  create: (payload: { name: string; description: string; type: string }) =>
    apiClient.post<Group>('/api/groups', payload).then((r) => r.data),

  update: (id: number, payload: Partial<Group>) =>
    apiClient.put<Group>(`/api/groups/${id}`, payload).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/api/groups/${id}`).then((r) => r.data),

  members: (id: number) =>
    apiClient.get<GroupMember[]>(`/api/groups/${id}/members`).then((r) => r.data),

  join: (id: number) =>
    apiClient.post(`/api/groups/${id}/join`).then((r) => r.data),

  leave: (id: number) =>
    apiClient.delete(`/api/groups/${id}/leave`).then((r) => r.data),
}
