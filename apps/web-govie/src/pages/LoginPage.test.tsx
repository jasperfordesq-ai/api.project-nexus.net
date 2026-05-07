// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'

const mockLogin = vi.fn()
const mockVerify2fa = vi.fn()
const mockCancel2fa = vi.fn()
const mockNavigate = vi.fn()
const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true } as const

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, verify2fa: mockVerify2fa, cancel2fa: mockCancel2fa }),
  isApiError: (err: unknown) =>
    typeof err === 'object' && err !== null && 'statusCode' in err && 'message' in err,
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderLogin() {
  return render(
    <MemoryRouter future={routerFuture}>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders email and password fields', () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('shows validation errors when form is submitted empty', async () => {
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      // Either "Enter your email address" or "Enter a valid email address" may appear first
      const errorMsg = screen.queryByText(/enter your email/i) ?? screen.queryByText(/enter a valid email/i) ?? screen.queryByText(/enter your password/i)
      expect(errorMsg).toBeInTheDocument()
    })
  })

  it('calls login and navigates on successful submission', async () => {
    mockLogin.mockResolvedValue({ requires2fa: false })
    renderLogin()

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockNavigate).toHaveBeenCalled()
    })
  })

  it('shows error message on failed login', async () => {
    mockLogin.mockRejectedValue({ statusCode: 401, message: 'Invalid credentials' })
    renderLogin()

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/email address or password is incorrect/i)).toBeInTheDocument()
    })
  })
})
