// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams } from './types'

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
    apiClient.get<PaginatedResponse<FeedPost>>('/api/feed', { params }).then((r) => r.data),

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
    apiClient.get<FeedComment[]>(`/api/feed/${id}/comments`).then((r) => r.data),

  addComment: (id: number, content: string) =>
    apiClient.post<FeedComment>(`/api/feed/${id}/comments`, { content }).then((r) => r.data),

  deleteComment: (postId: number, commentId: number) =>
    apiClient.delete(`/api/feed/${postId}/comments/${commentId}`).then((r) => r.data),

  react: (id: number, emoji: string) =>
    apiClient.post(`/api/feed/${id}/react`, { emoji }).then((r) => r.data),

  report: (id: number, reason: string, details?: string) =>
    apiClient.post('/api/feed/report', { postId: id, reason, details }).then((r) => r.data),
}
