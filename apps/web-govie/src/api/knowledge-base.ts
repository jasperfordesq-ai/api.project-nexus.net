// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'
import type { PaginatedResponse, PaginationParams } from './types'

export interface KbArticle {
  id: number; slug: string; title: string; content: string;
  category: string; viewCount: number; createdAt: string
}

export const knowledgeBaseApi = {
  articles: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<KbArticle>>('/api/knowledge-base', { params }).then(r => r.data),
  article: (slug: string) =>
    apiClient.get<KbArticle>(`/api/knowledge-base/${slug}`).then(r => r.data),
  categories: () =>
    apiClient.get<{ id: number; name: string; articleCount: number }[]>('/api/knowledge-base/categories').then(r => r.data),
}
