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
    apiClient.get<PaginatedResponse<Transaction>>('/api/wallet/transactions', { params }).then((r) => r.data),

  transaction: (id: number) =>
    apiClient.get<Transaction>(`/api/wallet/transactions/${id}`).then((r) => r.data),

  transfer: (payload: { recipientId: number; amount: number; description?: string }) =>
    apiClient.post<Transaction>('/api/wallet/transfer', payload).then((r) => r.data),
}
