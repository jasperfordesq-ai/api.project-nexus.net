// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

import apiClient from './client'
import type { AuthResponse, LoginRequest, RegisterRequest } from './types'

const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG || 'acme'

export const authApi = {
  login: (email: string, password: string) =>
    apiClient
      .post<AuthResponse>('/api/auth/login', {
        email,
        password,
        tenant_slug: TENANT_SLUG,
      } satisfies LoginRequest)
      .then((r) => r.data),

  register: (payload: Omit<RegisterRequest, 'tenant_slug'>) =>
    apiClient
      .post<AuthResponse>('/api/auth/register', {
        ...payload,
        tenant_slug: TENANT_SLUG,
      } satisfies RegisterRequest)
      .then((r) => r.data),

  logout: () => apiClient.post('/api/auth/logout').then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient
      .post<{ accessToken: string; refreshToken: string }>('/api/auth/refresh', { refreshToken })
      .then((r) => r.data),

  validate: () => apiClient.get('/api/auth/validate').then((r) => r.data),
}
