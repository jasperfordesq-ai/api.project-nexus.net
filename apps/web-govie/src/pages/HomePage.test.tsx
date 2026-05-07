// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from './HomePage'
import apiClient from '../api/client'
import { listingsApi } from '../api/listings'

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true } as const

vi.mock('../api/listings', () => ({
  listingsApi: {
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: 1,
          title: 'Garden help',
          description: 'Help with planting and weeding',
          type: 'offer',
          creditRate: 1,
          category: 'Home & Garden',
        },
      ],
      totalCount: 3,
    }),
  },
}))

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { totalCount: 5 } }),
  },
}))

vi.mock('../context/AuthContext', () => ({
  isApiError: () => false,
  useAuth: () => ({ isAuthenticated: false, isLoading: false, user: null }),
}))

describe('HomePage', () => {
  beforeEach(() => vi.clearAllMocks())

  function renderHome() {
    return render(
      <MemoryRouter future={routerFuture}>
        <HomePage />
      </MemoryRouter>,
    )
  }

  it('renders without crashing', async () => {
    renderHome()
    // Should render at minimum without throwing
    expect(document.body).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByText('Recently posted')).toBeInTheDocument()
      expect(screen.getByText('5+')).toBeInTheDocument()
    })
    expect(listingsApi.list).toHaveBeenCalledWith({ page: 1, pageSize: 3 })
    expect(apiClient.get).toHaveBeenCalledWith('/api/users')
  })

  it('renders a sign-up or browse link', async () => {
    renderHome()
    // HomePage should have at least one link
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
    await waitFor(() => {
      expect(screen.getByText('Garden help')).toBeInTheDocument()
    })
  })
})
