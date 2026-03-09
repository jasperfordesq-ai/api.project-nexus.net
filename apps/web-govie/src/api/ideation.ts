// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'
import type { PaginatedResponse, PaginationParams } from './types'

export interface Idea {
  id: number; title: string; description: string; authorId: number; authorName: string;
  voteCount: number; hasVoted: boolean; status: string; createdAt: string
}

export const ideationApi = {
  list: (params?: PaginationParams) => apiClient.get<PaginatedResponse<Idea>>('/api/ideation', { params }).then(r => r.data),
  get: (id: number) => apiClient.get<Idea>(`/api/ideation/${id}`).then(r => r.data),
  create: (payload: { title: string; description: string }) =>
    apiClient.post<Idea>('/api/ideation', payload).then(r => r.data),
  vote: (id: number) => apiClient.post(`/api/ideation/${id}/vote`).then(r => r.data),
  unvote: (id: number) => apiClient.delete(`/api/ideation/${id}/vote`).then(r => r.data),
}
