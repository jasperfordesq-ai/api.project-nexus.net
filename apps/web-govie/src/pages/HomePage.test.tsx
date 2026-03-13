// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from './HomePage'

vi.mock('../api/listings', () => ({
  listingsApi: {
    list: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
  },
}))

vi.mock('../context/AuthContext', () => ({
  isApiError: () => false,
  useAuth: () => ({ isAuthenticated: false, isLoading: false, user: null }),
}))

describe('HomePage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders without crashing', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    // Should render at minimum without throwing
    expect(document.body).toBeTruthy()
  })

  it('renders a sign-up or browse link', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    // HomePage should have at least one link
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })
})
