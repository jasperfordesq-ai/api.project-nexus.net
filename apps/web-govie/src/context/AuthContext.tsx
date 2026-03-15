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
import { clearStoredTokens, getStoredTokens, setStoredTokens } from '../api/client'
import type { ApiError, UserSummary } from '../api/types'

interface AuthState {
  user: UserSummary | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  // Restore session from localStorage on mount and validate the token
  useEffect(() => {
    const storedUser = localStorage.getItem('nexus:user')
    const { access } = getStoredTokens()

    if (storedUser && access) {
      try {
        const user = JSON.parse(storedUser) as UserSummary
        // Optimistically restore the session, then validate the token
        setState({ user, isAuthenticated: true, isLoading: false })
        // Validate token with the backend — if invalid, clear the session
        authApi.validate().catch(() => {
          clearStoredTokens()
          localStorage.removeItem('nexus:user')
          setState({ user: null, isAuthenticated: false, isLoading: false })
        })
      } catch {
        clearStoredTokens()
        localStorage.removeItem('nexus:user')
        setState({ user: null, isAuthenticated: false, isLoading: false })
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }))
    }
  }, [])

  // Listen for session expiry events from the API client
  useEffect(() => {
    const handle = () => {
      setState({ user: null, isAuthenticated: false, isLoading: false })
    }
    window.addEventListener('nexus:session-expired', handle)
    return () => window.removeEventListener('nexus:session-expired', handle)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    setStoredTokens(data.accessToken, data.refreshToken)
    localStorage.setItem('nexus:user', JSON.stringify(data.user))
    setState({ user: data.user, isAuthenticated: true, isLoading: false })
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
      setState({ user: data.user, isAuthenticated: true, isLoading: false })
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Proceed with local logout even if the server call fails
    } finally {
      clearStoredTokens()
      setState({ user: null, isAuthenticated: false, isLoading: false })
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout],
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

// Type guard
export function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && 'message' in err
}
