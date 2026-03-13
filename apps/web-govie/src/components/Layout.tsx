// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import type { ReactNode } from 'react'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="nexus-page">
      {/* Skip to main content link for keyboard / assistive technology users */}
      <a href="#main-content" className="nexus-skip-link">
        Skip to main content
      </a>

      <SiteHeader />

      <main id="main-content" className="nexus-main" tabIndex={-1}>
        {children}
      </main>

      <SiteFooter />
    </div>
  )
}
