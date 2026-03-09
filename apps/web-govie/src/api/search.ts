// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'

export interface SearchResult {
  id: number
  type: 'listing' | 'user' | 'event' | 'group' | 'post'
  title: string
  description?: string
  url: string
  score?: number
  createdAt: string
}

export const searchApi = {
  search: (query: string, type?: string, params?: Record<string, unknown>) =>
    apiClient.get<SearchResult[]>('/api/search', { params: { q: query, type, ...params } }).then((r) => r.data),

  semantic: (query: string) =>
    apiClient.post<SearchResult[]>('/api/search/semantic', { query }).then((r) => r.data),

  skills: (query: string) =>
    apiClient.get<{ id: number; name: string; category: string }[]>('/api/skills', { params: { q: query } }).then((r) => r.data),
}
