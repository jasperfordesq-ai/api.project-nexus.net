// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { walletApi } from './wallet'

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  getStoredTokens: vi.fn(() => ({ access: null, refresh: null })),
  setStoredTokens: vi.fn(),
  clearStoredTokens: vi.fn(),
}))

import apiClient from './client'
const mock = apiClient as unknown as Record<string, ReturnType<typeof vi.fn>>

describe('walletApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('balance calls GET /api/wallet/balance', async () => {
    mock.get.mockResolvedValue({ data: { balance: 42.5, currency: 'credits' } })
    const result = await walletApi.balance()
    expect(mock.get).toHaveBeenCalledWith('/api/wallet/balance')
    expect(result).toMatchObject({ balance: 42.5 })
  })

  it('transactions calls GET /api/wallet/transactions', async () => {
    mock.get.mockResolvedValue({ data: { data: [], totalCount: 0 } })
    await walletApi.transactions()
    expect(mock.get).toHaveBeenCalledWith('/api/wallet/transactions', { params: { page: undefined, limit: undefined } })
  })

  it('transfer calls POST /api/wallet/transfer', async () => {
    mock.post.mockResolvedValue({ data: { success: true, transactionId: 99 } })
    await walletApi.transfer({ recipientId: 5, amount: 10, description: 'Thanks!' })
    expect(mock.post).toHaveBeenCalledWith('/api/wallet/transfer', {
      receiver_id: 5,
      amount: 10,
      description: 'Thanks!',
      listing_id: undefined,
    })
  })
})
