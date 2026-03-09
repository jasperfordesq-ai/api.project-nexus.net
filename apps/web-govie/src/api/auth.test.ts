// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authApi } from './auth'

vi.mock('./client', () => {
  const mockClient = {
    post: vi.fn(),
    get: vi.fn(),
  }
  return {
    default: mockClient,
    getStoredTokens: vi.fn(() => ({ access: null, refresh: null })),
    setStoredTokens: vi.fn(),
    clearStoredTokens: vi.fn(),
  }
})

import apiClient from './client'

const mockClient = apiClient as unknown as { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> }

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('calls POST /api/auth/login and returns data', async () => {
      const response = { data: { accessToken: 'tok', refreshToken: 'ref', user: { id: 1 } } }
      mockClient.post.mockResolvedValue(response)

      const result = await authApi.login('user@test.com', 'password123')

      expect(mockClient.post).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
        email: 'user@test.com',
        password: 'password123',
      }))
      expect(result).toEqual(response.data)
    })
  })

  describe('logout', () => {
    it('calls POST /api/auth/logout', async () => {
      mockClient.post.mockResolvedValue({ data: { message: 'Logged out' } })
      await authApi.logout()
      expect(mockClient.post).toHaveBeenCalledWith('/api/auth/logout')
    })
  })

  describe('validate', () => {
    it('calls GET /api/auth/validate', async () => {
      mockClient.get.mockResolvedValue({ data: { valid: true } })
      await authApi.validate()
      expect(mockClient.get).toHaveBeenCalledWith('/api/auth/validate')
    })
  })

  describe('refresh', () => {
    it('calls POST /api/auth/refresh with token', async () => {
      const response = { data: { accessToken: 'new-tok', refreshToken: 'new-ref' } }
      mockClient.post.mockResolvedValue(response)
      const result = await authApi.refresh('old-refresh-token')
      expect(mockClient.post).toHaveBeenCalledWith('/api/auth/refresh', { refreshToken: 'old-refresh-token' })
      expect(result).toEqual(response.data)
    })
  })
})
