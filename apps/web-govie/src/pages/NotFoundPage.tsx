// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="nexus-error-page">
      <p className="nexus-error-page__code" aria-hidden="true">404</p>
      <h1 className="nexus-error-page__title">Page not found</h1>
      <p className="nexus-error-page__body">
        The page you were looking for does not exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: 'var(--nexus-space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" className="nexus-btn nexus-btn--primary">Go to homepage</Link>
        <Link to="/services" className="nexus-btn nexus-btn--secondary">Browse services</Link>
      </div>
    </div>
  )
}
