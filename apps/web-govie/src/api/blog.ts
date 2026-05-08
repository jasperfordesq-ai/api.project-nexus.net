// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'
import type { PaginatedResponse, PaginationParams } from './types'

export interface BlogPost {
  id: number; slug: string; title: string; excerpt?: string; content: string;
  authorId: number; authorName: string; category?: string; tags?: string[];
  publishedAt?: string; createdAt: string
}

export const blogApi = {
  posts: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<BlogPost>>('/api/blog', { params }).then(r => r.data),
  post: (slug: string) => apiClient.get<BlogPost>(`/api/blog/${slug}`).then(r => r.data),
  categories: () => apiClient.get<{ id: number; name: string; postCount: number }[]>('/api/blog/categories').then(r => r.data),
}
