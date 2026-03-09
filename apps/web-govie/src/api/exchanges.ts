// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams } from './types'

export type ExchangeStatus = 'proposed' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'

export interface Exchange {
  id: number
  listingId: number
  listingTitle: string
  proposerId: number
  proposerName: string
  providerId: number
  providerName: string
  creditAmount: number
  status: ExchangeStatus
  message?: string
  scheduledAt?: string
  completedAt?: string
  createdAt: string
  tenantId: number
}

export const exchangesApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Exchange>>('/api/exchanges', { params }).then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Exchange>(`/api/exchanges/${id}`).then((r) => r.data),

  propose: (payload: { listingId: number; message?: string; scheduledAt?: string }) =>
    apiClient.post<Exchange>('/api/exchanges', payload).then((r) => r.data),

  accept: (id: number) =>
    apiClient.put<Exchange>(`/api/exchanges/${id}/accept`).then((r) => r.data),

  decline: (id: number) =>
    apiClient.put(`/api/exchanges/${id}/decline`).then((r) => r.data),

  complete: (id: number, creditAmount?: number) =>
    apiClient.put(`/api/exchanges/${id}/complete`, { creditAmount }).then((r) => r.data),

  cancel: (id: number, reason?: string) =>
    apiClient.put(`/api/exchanges/${id}/cancel`, { reason }).then((r) => r.data),

  dispute: (id: number, reason: string) =>
    apiClient.post(`/api/exchanges/${id}/dispute`, { reason }).then((r) => r.data),
}
