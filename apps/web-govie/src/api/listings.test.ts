// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listingsApi } from './listings'

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  getStoredTokens: vi.fn(() => ({ access: null, refresh: null })),
  setStoredTokens: vi.fn(),
  clearStoredTokens: vi.fn(),
}))

import apiClient from './client'
const mock = apiClient as unknown as Record<string, ReturnType<typeof vi.fn>>

describe('listingsApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list calls GET /api/listings', async () => {
    mock.get.mockResolvedValue({ data: { data: [], totalCount: 0 } })
    await listingsApi.list()
    expect(mock.get).toHaveBeenCalledWith('/api/listings', { params: { page: undefined, limit: undefined, search: undefined, category: undefined, type: undefined } })
  })

  it('get calls GET /api/listings/:id', async () => {
    mock.get.mockResolvedValue({ data: { id: 5, title: 'Test' } })
    const result = await listingsApi.get(5)
    expect(mock.get).toHaveBeenCalledWith('/api/listings/5')
    expect(result).toMatchObject({ id: 5 })
  })

  it('create calls POST /api/listings', async () => {
    const payload = { title: 'New', description: 'Desc', type: 'offer' as const, category: 'Tech', creditRate: 2 }
    const rawResponse = { id: 1, title: 'New', description: 'Desc', type: 'offer', status: 'active', location: null, estimated_hours: 2, is_featured: false, view_count: 0, expires_at: null, created_at: '2026-01-01', updated_at: null, user: null }
    mock.post.mockResolvedValue({ data: rawResponse })
    await listingsApi.create(payload)
    expect(mock.post).toHaveBeenCalledWith('/api/listings', {
      title: 'New',
      description: 'Desc',
      type: 'offer',
      location: undefined,
      estimated_hours: 2,
      category_id: undefined,
    })
  })

  it('update calls PUT /api/listings/:id', async () => {
    mock.put.mockResolvedValue({ data: { id: 3, title: 'Updated' } })
    await listingsApi.update(3, { title: 'Updated' })
    expect(mock.put).toHaveBeenCalledWith('/api/listings/3', { title: 'Updated' })
  })

  it('delete calls DELETE /api/listings/:id', async () => {
    mock.delete.mockResolvedValue({ data: {} })
    await listingsApi.delete(7)
    expect(mock.delete).toHaveBeenCalledWith('/api/listings/7')
  })
})
