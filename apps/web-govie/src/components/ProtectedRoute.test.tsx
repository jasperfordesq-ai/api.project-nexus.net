// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

// Mock useAuth
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../context/AuthContext'
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>

describe('ProtectedRoute', () => {
  it('shows loading spinner when isLoading is true', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true })
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <p>Protected</p>
        </ProtectedRoute>
      </MemoryRouter>,
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <p>Protected content</p>
        </ProtectedRoute>
      </MemoryRouter>,
    )
    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  it('redirects to /login when unauthenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false })
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <p>Dashboard</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('redirects to custom redirectTo path when specified', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false })
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/signin" element={<p>Sign in</p>} />
          <Route
            path="/secret"
            element={
              <ProtectedRoute redirectTo="/signin">
                <p>Secret</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })
})
