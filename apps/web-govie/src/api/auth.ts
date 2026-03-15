// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type {
  AuthResult,
  LoginRequest,
  RawAuthResponse,
  RawRefreshResponse,
  RegisterRequest,
  UserSummary,
} from './types'

const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG || 'acme'

/** Placeholder user when backend doesn't return user data (e.g., 2FA pending) */
const EMPTY_USER: UserSummary = { id: 0, email: '', firstName: '', lastName: '', role: 'member', tenantId: 0, createdAt: '' }

/** Map snake_case auth user to camelCase UserSummary */
function mapUser(raw: NonNullable<RawAuthResponse['user']>): UserSummary {
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.first_name,
    lastName: raw.last_name,
    role: raw.role as UserSummary['role'],
    tenantId: raw.tenant_id,
    createdAt: raw.created_at || new Date().toISOString(),
  }
}

/** Map raw auth response to normalized AuthResult */
function mapAuthResponse(raw: RawAuthResponse): AuthResult {
  // When 2FA is required, backend returns temp_token instead of access_token,
  // and no user object is included
  if (raw.requires_2fa) {
    return {
      accessToken: raw.temp_token ?? raw.access_token ?? '',
      refreshToken: raw.refresh_token ?? '',
      user: EMPTY_USER,
      requires2fa: true,
    }
  }
  return {
    accessToken: raw.access_token ?? '',
    refreshToken: raw.refresh_token ?? '',
    user: raw.user ? mapUser(raw.user) : EMPTY_USER,
    requires2fa: false,
  }
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient
      .post<RawAuthResponse>('/api/auth/login', {
        email: email.toLowerCase(),
        password,
        tenant_slug: TENANT_SLUG,
      } satisfies LoginRequest)
      .then((r) => mapAuthResponse(r.data)),

  register: (payload: { email: string; password: string; first_name: string; last_name: string }) =>
    apiClient
      .post<RawAuthResponse>('/api/auth/register', {
        ...payload,
        email: payload.email.toLowerCase(),
        tenant_slug: TENANT_SLUG,
      } satisfies RegisterRequest)
      .then((r) => mapAuthResponse(r.data)),

  logout: () => apiClient.post('/api/auth/logout').then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient
      .post<RawRefreshResponse>('/api/auth/refresh', { refresh_token: refreshToken })
      .then((r) => ({
        accessToken: r.data.access_token,
        refreshToken: r.data.refresh_token,
      })),

  validate: () => apiClient.get('/api/auth/validate').then((r) => r.data),
}
