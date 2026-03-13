// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/*
 * SiteHeader — Nexus Community custom header
 *
 * This header intentionally does NOT use government logos, state emblems,
 * the Irish harp, shamrocks, or any other mark associated with the
 * Government of Ireland. It uses GOV.IE design-system typography and spacing
 * conventions while applying the Nexus Community colour brand.
 *
 * See BRANDING.md for the full non-affiliation disclaimer.
 */

import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function SiteHeader() {
  const { isAuthenticated, user, logout } = useAuth()
  const [navOpen, setNavOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    setNavOpen(false)
  }

  return (
    <>
      {/* Phase / context banner */}
      <div className="nexus-phase-banner" role="banner" aria-label="Service context">
        <div className="nexus-phase-banner__inner">
          <span className="nexus-phase-badge">BETA</span>
          <span>
            This is a community time-exchange service, not a government service. Your feedback
            helps us improve.
          </span>
        </div>
      </div>

      {/* Main header */}
      <header className="nexus-header">
        <div className="nexus-header__inner">
          {/* Brand mark — clearly Nexus, not a government mark */}
          <Link
            to="/"
            className="nexus-header__brand"
            aria-label="Nexus Community — go to homepage"
          >
            <span className="nexus-header__brand-mark" aria-hidden="true">N</span>
            <span className="nexus-header__brand-name">
              Nexus Community
              <span className="nexus-header__brand-tagline">Time exchange platform</span>
            </span>
          </Link>

          {/* Mobile toggle */}
          <button
            className="nexus-nav-toggle"
            aria-expanded={navOpen}
            aria-controls="main-nav"
            aria-label={navOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setNavOpen((o) => !o)}
          >
            {navOpen ? '✕ Close' : '☰ Menu'}
          </button>

          {/* Navigation */}
          <nav
            id="main-nav"
            aria-label="Main navigation"
            className={`nexus-header__nav${navOpen ? ' nexus-header__nav--open' : ''}`}
          >
            <NavLink
              to="/services"
              className={({ isActive }) =>
                `nexus-header__nav-link${isActive ? ' nexus-header__nav-link--active' : ''}`
              }
              onClick={() => setNavOpen(false)}
            >
              Services
            </NavLink>

            {isAuthenticated ? (
              <>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `nexus-header__nav-link${isActive ? ' nexus-header__nav-link--active' : ''}`
                  }
                  onClick={() => setNavOpen(false)}
                >
                  {user?.firstName ?? 'Profile'}
                </NavLink>
                <button
                  className="nexus-btn nexus-btn--secondary nexus-btn--sm"
                  style={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)' }}
                  onClick={handleLogout}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `nexus-header__nav-link${isActive ? ' nexus-header__nav-link--active' : ''}`
                  }
                  onClick={() => setNavOpen(false)}
                >
                  Sign in
                </NavLink>
                <Link
                  to="/register"
                  className="nexus-btn nexus-btn--secondary nexus-btn--sm"
                  style={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)' }}
                  onClick={() => setNavOpen(false)}
                >
                  Join
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  )
}
