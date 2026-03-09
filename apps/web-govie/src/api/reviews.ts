// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'
import type { PaginatedResponse, PaginationParams } from './types'

export interface Review {
  id: number; reviewerId: number; reviewerName: string; targetUserId: number;
  rating: number; comment: string; exchangeId?: number; createdAt: string
}

export const reviewsApi = {
  user: (userId: number, params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Review>>(`/api/reviews/user/${userId}`, { params }).then(r => r.data),
  create: (payload: { targetUserId: number; rating: number; comment: string; exchangeId?: number }) =>
    apiClient.post<Review>('/api/reviews', payload).then(r => r.data),
  my: () => apiClient.get<Review[]>('/api/reviews/my').then(r => r.data),
}
