// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams, Transaction, WalletBalance } from './types'

export const walletApi = {
  balance: () =>
    apiClient.get<WalletBalance>('/api/wallet/balance').then((r) => r.data),

  transactions: (params?: PaginationParams) =>
    apiClient.get('/api/wallet/transactions', { params: { page: params?.page, limit: params?.pageSize } }).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = r.data as any
      const data = raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
      const pagination = raw?.pagination
      return {
        items: data,
        totalCount: pagination?.total ?? data.length,
        page: pagination?.page ?? 1,
        pageSize: pagination?.limit ?? data.length,
        totalPages: pagination?.pages ?? 1,
      } as PaginatedResponse<Transaction>
    }),

  transaction: (id: number) =>
    apiClient.get<Transaction>(`/api/wallet/transactions/${id}`).then((r) => r.data),

  transfer: (payload: { recipientId: number; amount: number; description?: string; listingId?: number }) =>
    apiClient.post<Transaction>('/api/wallet/transfer', {
      receiver_id: payload.recipientId,
      amount: payload.amount,
      description: payload.description,
      listing_id: payload.listingId,
    }).then((r) => r.data),
}
