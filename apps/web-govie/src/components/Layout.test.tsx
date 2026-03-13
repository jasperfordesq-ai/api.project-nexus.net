// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Layout } from './Layout'

// Mock sub-components that may use hooks or complex imports
vi.mock('./SiteHeader', () => ({
  SiteHeader: () => <header data-testid="site-header">Header</header>,
}))
vi.mock('./SiteFooter', () => ({
  SiteFooter: () => <footer data-testid="site-footer">Footer</footer>,
}))

describe('Layout', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <Layout>
          <p>Test content</p>
        </Layout>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('site-header')).toBeInTheDocument()
    expect(screen.getByTestId('site-footer')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders skip-to-main-content link', () => {
    render(
      <MemoryRouter>
        <Layout>
          <div />
        </Layout>
      </MemoryRouter>,
    )
    expect(screen.getByText('Skip to main content')).toBeInTheDocument()
  })

  it('renders main element with id main-content', () => {
    render(
      <MemoryRouter>
        <Layout>
          <div />
        </Layout>
      </MemoryRouter>,
    )
    expect(document.getElementById('main-content')).not.toBeNull()
  })
})
