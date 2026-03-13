// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import axios, { type AxiosInstance, type AxiosResponse, AxiosError } from 'axios'
import type { ApiError } from './types'

// In local dev the Vite proxy forwards /api/* to the backend.
// In production VITE_API_BASE_URL should be the full backend origin.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// Tenant slug for X-Tenant-ID header (required for unauthenticated API requests)
const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG || 'acme'

function getStoredTokens() {
  try {
    return {
      access: localStorage.getItem('nexus:access_token'),
      refresh: localStorage.getItem('nexus:refresh_token'),
    }
  } catch {
    return { access: null, refresh: null }
  }
}

function setStoredTokens(access: string, refresh: string) {
  try {
    localStorage.setItem('nexus:access_token', access)
    localStorage.setItem('nexus:refresh_token', refresh)
  } catch {
    // localStorage unavailable (SSR/privacy mode) — fail silently
  }
}

function clearStoredTokens() {
  try {
    localStorage.removeItem('nexus:access_token')
    localStorage.removeItem('nexus:refresh_token')
    localStorage.removeItem('nexus:user')
  } catch {
    // fail silently
  }
}

// Create the main Axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ─── Request interceptor: attach JWT + tenant header ─────────────────────────
apiClient.interceptors.request.use((config) => {
  const { access } = getStoredTokens()
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  // Always send X-Tenant-ID so unauthenticated endpoints (FAQs, legal docs,
  // translations, blog, pages, subscriptions, etc.) can resolve the tenant.
  config.headers['X-Tenant-ID'] = TENANT_SLUG
  return config
})

// ─── Response interceptor: handle 401 + token refresh ────────────────────────
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function subscribeRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function notifyRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined

    if (error.response?.status === 401 && original && !original._retry) {
      const { refresh } = getStoredTokens()
      if (!refresh) {
        clearStoredTokens()
        window.dispatchEvent(new CustomEvent('nexus:session-expired'))
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeRefresh((newToken) => {
            if (original.headers) original.headers.Authorization = `Bearer ${newToken}`
            resolve(apiClient(original))
          })
          setTimeout(() => reject(error), 10_000)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        // Call backend directly (bypass interceptors) with snake_case field names
        const res = await axios.post<{ access_token: string; refresh_token: string }>(
          `${BASE_URL}/api/auth/refresh`,
          { refresh_token: refresh },
          { headers: { 'X-Tenant-ID': TENANT_SLUG } },
        )
        const newAccessToken = res.data.access_token
        const newRefreshToken = res.data.refresh_token
        setStoredTokens(newAccessToken, newRefreshToken)
        notifyRefreshed(newAccessToken)
        if (original.headers) original.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient(original)
      } catch {
        clearStoredTokens()
        window.dispatchEvent(new CustomEvent('nexus:session-expired'))
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    // Normalise error shape
    const apiError: ApiError = {
      message:
        (error.response?.data as { message?: string } | undefined)?.message ??
        error.message ??
        'An unexpected error occurred',
      statusCode: error.response?.status,
      errors: (error.response?.data as { errors?: Record<string, string[]> } | undefined)?.errors,
    }
    return Promise.reject(apiError)
  },
)

export { apiClient, getStoredTokens, setStoredTokens, clearStoredTokens }
export default apiClient
