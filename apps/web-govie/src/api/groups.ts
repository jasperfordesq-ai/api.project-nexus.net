// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams, UserSummary } from './types'

/** Safely extract an array from backend response variants */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractItems(raw: any): any[] {
  return raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGroup(raw: any): Group {
  const isPrivate = raw.is_private ?? raw.isPrivate ?? false
  return {
    ...raw,
    type: isPrivate === true ? 'private' : 'public',
    memberCount: raw.member_count ?? raw.memberCount ?? 0,
    avatarUrl: raw.avatar_url ?? raw.avatarUrl,
    createdAt: raw.created_at ?? raw.createdAt,
    isMember: raw.is_member ?? raw.isMember,
    tenantId: raw.tenant_id ?? raw.tenantId,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGroupMember(raw: any): GroupMember {
  return {
    userId: raw.user?.id ?? raw.user_id ?? raw.userId,
    user: raw.user ?? {
      id: raw.user_id ?? raw.userId,
      email: raw.email ?? '',
      firstName: raw.first_name ?? raw.firstName ?? '',
      lastName: raw.last_name ?? raw.lastName ?? '',
      role: raw.role ?? 'member',
      tenantId: raw.tenant_id ?? raw.tenantId ?? 0,
      createdAt: raw.created_at ?? raw.createdAt ?? '',
    },
    role: raw.role ?? 'member',
    joinedAt: raw.joined_at ?? raw.joinedAt ?? raw.created_at ?? raw.createdAt ?? '',
  }
}

export const groupsApi = {
  list: (params?: PaginationParams) =>
    apiClient.get('/api/groups', { params }).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = r.data as any
      const items = extractItems(raw)
      const pagination = raw?.pagination
      return {
        items: items.map(mapGroup),
        totalCount: pagination?.total ?? raw?.totalCount ?? items.length,
        page: pagination?.page ?? raw?.page ?? 1,
        pageSize: pagination?.limit ?? raw?.pageSize ?? items.length,
        totalPages: pagination?.pages ?? raw?.totalPages ?? 1,
      } as PaginatedResponse<Group>
    }),

  my: () =>
    apiClient.get('/api/groups/my').then((r) => extractItems(r.data).map(mapGroup)),

  get: (id: number) =>
    apiClient.get(`/api/groups/${id}`).then((r) => mapGroup(r.data)),

  create: (payload: { name: string; description: string; type: string }) =>
    apiClient.post<Group>('/api/groups', {
      name: payload.name,
      description: payload.description,
      is_private: payload.type === 'private',
    }).then((r) => mapGroup(r.data)),

  update: (id: number, payload: Partial<Group>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = { ...payload }
    if (payload.type !== undefined) {
      body.is_private = payload.type === 'private'
      delete body.type
    }
    return apiClient.put(`/api/groups/${id}`, body).then((r) => mapGroup(r.data))
  },

  delete: (id: number) =>
    apiClient.delete(`/api/groups/${id}`).then((r) => r.data),

  members: (id: number) =>
    apiClient.get(`/api/groups/${id}/members`).then((r) => extractItems(r.data).map(mapGroupMember)),

  join: (id: number) =>
    apiClient.post(`/api/groups/${id}/join`).then((r) => r.data),

  leave: (id: number) =>
    apiClient.delete(`/api/groups/${id}/leave`).then((r) => r.data),
}
