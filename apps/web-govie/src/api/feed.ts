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

export interface FeedPost {
  id: number
  authorId: number
  authorName: string
  authorAvatarUrl?: string
  content: string
  imageUrl?: string
  likeCount: number
  commentCount: number
  shareCount: number
  isLiked: boolean
  tags?: string[]
  createdAt: string
  updatedAt: string
  tenantId: number
}

export interface FeedComment {
  id: number
  postId: number
  authorId: number
  authorName: string
  content: string
  createdAt: string
}

export const feedApi = {
  list: (params?: PaginationParams) =>
    apiClient.get('/api/feed', { params }).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = r.data as any
      const items = extractItems(raw)
      const pagination = raw?.pagination
      return {
        items: items as FeedPost[],
        totalCount: pagination?.total ?? raw?.totalCount ?? items.length,
        page: pagination?.page ?? raw?.page ?? 1,
        pageSize: pagination?.limit ?? raw?.pageSize ?? items.length,
        totalPages: pagination?.pages ?? raw?.totalPages ?? 1,
      } as PaginatedResponse<FeedPost>
    }),

  get: (id: number) =>
    apiClient.get<FeedPost>(`/api/feed/${id}`).then((r) => r.data),

  create: (payload: { content: string; imageUrl?: string; tags?: string[] }) =>
    apiClient.post<FeedPost>('/api/feed', payload).then((r) => r.data),

  update: (id: number, payload: { content?: string; imageUrl?: string }) =>
    apiClient.put<FeedPost>(`/api/feed/${id}`, payload).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/api/feed/${id}`).then((r) => r.data),

  like: (id: number) =>
    apiClient.post(`/api/feed/${id}/like`).then((r) => r.data),

  unlike: (id: number) =>
    apiClient.delete(`/api/feed/${id}/like`).then((r) => r.data),

  comments: (id: number) =>
    apiClient.get(`/api/feed/${id}/comments`).then((r) => extractItems(r.data) as FeedComment[]),

  addComment: (id: number, content: string) =>
    apiClient.post<FeedComment>(`/api/feed/${id}/comments`, { content }).then((r) => r.data),

  deleteComment: (postId: number, commentId: number) =>
    apiClient.delete(`/api/feed/${postId}/comments/${commentId}`).then((r) => r.data),

  react: (id: number, emoji: string) =>
    apiClient.post(`/api/feed/${id}/react`, { reaction_type: emoji }).then((r) => r.data),

  report: (id: number, reason: string, details?: string) =>
    apiClient.post(`/api/feed/${id}/report`, { reason, details }).then((r) => r.data),
}
