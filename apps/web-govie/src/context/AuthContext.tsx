// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi } from '../api/auth'
import apiClient, { clearStoredTokens, getStoredTokens, setStoredTokens } from '../api/client'
import type { ApiError, UserSummary } from '../api/types'

interface AuthState {
  user: UserSummary | null
  isAuthenticated: boolean
  isLoading: boolean
  requires2fa: boolean
  pendingAccessToken: string | null
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ requires2fa: boolean }>
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>
  logout: () => Promise<void>
  verify2fa: (code: string) => Promise<void>
  cancel2fa: () => void
  updateUser: (partial: Partial<UserSummary>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    requires2fa: false,
    pendingAccessToken: null,
  })

  // Restore session from localStorage on mount and validate the token
  useEffect(() => {
    const storedUser = localStorage.getItem('nexus:user')
    const { access } = getStoredTokens()

    if (storedUser && access) {
      try {
        const user = JSON.parse(storedUser) as UserSummary
        // Optimistically restore the session, then validate the token
        setState({ user, isAuthenticated: true, isLoading: false, requires2fa: false, pendingAccessToken: null })
        // Validate token with the backend — if invalid, clear the session
        authApi.validate().catch(() => {
          clearStoredTokens()
          localStorage.removeItem('nexus:user')
          setState({ user: null, isAuthenticated: false, isLoading: false, requires2fa: false, pendingAccessToken: null })
        })
      } catch {
        clearStoredTokens()
        localStorage.removeItem('nexus:user')
        setState({ user: null, isAuthenticated: false, isLoading: false, requires2fa: false, pendingAccessToken: null })
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }))
    }
  }, [])

  // Listen for session expiry events from the API client
  useEffect(() => {
    const handle = () => {
      setState({ user: null, isAuthenticated: false, isLoading: false, requires2fa: false, pendingAccessToken: null })
    }
    window.addEventListener('nexus:session-expired', handle)
    return () => window.removeEventListener('nexus:session-expired', handle)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    if (data.requires2fa) {
      // Store token temporarily but don't complete login until 2FA verified
      setState(s => ({ ...s, requires2fa: true, pendingAccessToken: data.accessToken, isLoading: false }))
      return { requires2fa: true }
    }
    setStoredTokens(data.accessToken, data.refreshToken)
    localStorage.setItem('nexus:user', JSON.stringify(data.user))
    setState({ user: data.user, isAuthenticated: true, isLoading: false, requires2fa: false, pendingAccessToken: null })
    return { requires2fa: false }
  }, [])

  const register = useCallback(
    async (email: string, password: string, firstName: string, lastName: string) => {
      const data = await authApi.register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      })
      setStoredTokens(data.accessToken, data.refreshToken)
      localStorage.setItem('nexus:user', JSON.stringify(data.user))
      setState({ user: data.user, isAuthenticated: true, isLoading: false, requires2fa: false, pendingAccessToken: null })
    },
    [],
  )

  const verify2fa = useCallback(async (code: string) => {
    const token = state.pendingAccessToken
    if (!token) throw new Error('No pending 2FA session')
    const res = await apiClient.post('/api/auth/2fa/verify', { code }, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const raw = res.data as { access_token?: string; refresh_token?: string; user?: any } // eslint-disable-line @typescript-eslint/no-explicit-any
    const accessToken = raw.access_token ?? token
    const { refresh: existingRefresh } = getStoredTokens()
    const refreshToken = raw.refresh_token ?? existingRefresh ?? ''
    setStoredTokens(accessToken, refreshToken)
    // Re-fetch user profile after 2FA
    const userRes = await apiClient.get('/api/users/me', { headers: { Authorization: `Bearer ${accessToken}` } })
    const u = userRes.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const user: UserSummary = {
      id: u.id, email: u.email ?? '', firstName: u.first_name ?? u.firstName ?? '',
      lastName: u.last_name ?? u.lastName ?? '', role: u.role ?? 'member',
      tenantId: u.tenant_id ?? u.tenantId ?? 0, createdAt: u.created_at ?? u.createdAt ?? '',
    }
    localStorage.setItem('nexus:user', JSON.stringify(user))
    setState({ user, isAuthenticated: true, isLoading: false, requires2fa: false, pendingAccessToken: null })
  }, [state.pendingAccessToken])

  const cancel2fa = useCallback(() => {
    setState(s => ({ ...s, requires2fa: false, pendingAccessToken: null }))
  }, [])

  const updateUser = useCallback((partial: Partial<UserSummary>) => {
    setState(s => {
      if (!s.user) return s
      const updated = { ...s.user, ...partial }
      localStorage.setItem('nexus:user', JSON.stringify(updated))
      return { ...s, user: updated }
    })
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Proceed with local logout even if the server call fails
    } finally {
      clearStoredTokens()
      localStorage.removeItem('nexus:user')
      setState({ user: null, isAuthenticated: false, isLoading: false, requires2fa: false, pendingAccessToken: null })
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout, verify2fa, cancel2fa, updateUser }),
    [state, login, register, logout, verify2fa, cancel2fa, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

// Convenience hook for pages that require authentication
export function useRequireAuth() {
  const auth = useAuth()
  if (!auth.isLoading && !auth.isAuthenticated) {
    // Caller is responsible for redirecting — keeps this hook pure
    return { ...auth, authorized: false as const }
  }
  return { ...auth, authorized: !auth.isLoading && auth.isAuthenticated }
}

// Type guard — the API client interceptor normalizes errors to { message, statusCode, errors }
export function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && 'message' in err && typeof (err as ApiError).message === 'string'
}
