// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listingsApi } from '../api/listings'
import type { Listing } from '../api/types'
import { isApiError, useAuth } from '../context/AuthContext'

export function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { isAuthenticated } = useAuth()
  const [listing, setListing] = useState<Listing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestSent, setRequestSent] = useState(false)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    listingsApi
      .get(Number(id))
      .then(setListing)
      .catch((err) => {
        if (isApiError(err)) setError(err.message)
        else setError('Could not load service details.')
      })
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return (
      <div className="nexus-loading">
        <span className="nexus-spinner" aria-label="Loading service details…" />
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="nexus-container">
        <div className="nexus-notification nexus-notification--error" role="alert">
          {error ?? 'Service not found.'}
        </div>
        <Link to="/services" className="nexus-btn nexus-btn--secondary" style={{ marginTop: 16 }}>
          ← Back to services
        </Link>
      </div>
    )
  }

  return (
    <div className="nexus-container">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/services">Services</Link></li>
          <li aria-current="page">{listing.title}</li>
        </ol>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--nexus-space-6)' }}>
        {/* Main content */}
        <article>
          <div style={{ marginBottom: 'var(--nexus-space-3)', display: 'flex', gap: 'var(--nexus-space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className={`nexus-badge nexus-badge--${listing.type}`}>
              {listing.type === 'offer' ? 'Offering' : 'Requesting'}
            </span>
            <span className="nexus-badge nexus-badge--credits">
              ⏱ {listing.creditRate} credit{listing.creditRate !== 1 ? 's' : ''}/hr
            </span>
            <span style={{ fontSize: 14, color: 'var(--nexus-color-text-secondary)' }}>
              {listing.category}
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: '0 0 var(--nexus-space-5)' }}>
            {listing.title}
          </h1>

          <div style={{
            background: 'var(--nexus-color-surface)',
            border: '1px solid var(--nexus-color-border)',
            borderRadius: 6,
            padding: 'var(--nexus-space-5)',
            marginBottom: 'var(--nexus-space-5)',
          }}>
            <h2 style={{ fontSize: 18, margin: '0 0 var(--nexus-space-3)' }}>About this service</h2>
            <p style={{ margin: 0, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{listing.description}</p>
          </div>

          {/* Tags */}
          {listing.tags && listing.tags.length > 0 && (
            <div style={{ marginBottom: 'var(--nexus-space-5)' }}>
              <h2 style={{ fontSize: 16, margin: '0 0 var(--nexus-space-2)' }}>Tags</h2>
              <div style={{ display: 'flex', gap: 'var(--nexus-space-2)', flexWrap: 'wrap' }}>
                {listing.tags.map((tag) => (
                  <span key={tag} style={{
                    padding: '4px 12px',
                    background: 'var(--nexus-color-primary-light)',
                    color: 'var(--nexus-color-primary)',
                    borderRadius: 20,
                    fontSize: 14,
                    fontWeight: 600,
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          {listing.location && (
            <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-5)' }}>
              📍 {listing.location}
            </p>
          )}
        </article>

        {/* Sidebar / action panel */}
        <aside style={{
          background: 'var(--nexus-color-surface)',
          border: '2px solid var(--nexus-color-primary)',
          borderRadius: 8,
          padding: 'var(--nexus-space-5)',
          alignSelf: 'start',
        }} aria-label="Request this service">
          <div style={{ marginBottom: 'var(--nexus-space-4)' }}>
            <p style={{ fontSize: 13, color: 'var(--nexus-color-text-secondary)', margin: '0 0 var(--nexus-space-1)' }}>
              Offered by
            </p>
            <p style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>{listing.userName}</p>
          </div>

          <div style={{ marginBottom: 'var(--nexus-space-4)', padding: 'var(--nexus-space-3)', background: 'white', borderRadius: 4, border: '1px solid var(--nexus-color-border)' }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>Credit rate</p>
            <p style={{ margin: 0, fontWeight: 900, fontSize: 28, color: 'var(--nexus-color-accent)' }}>
              {listing.creditRate} <span style={{ fontSize: 14, fontWeight: 400 }}>credit{listing.creditRate !== 1 ? 's' : ''}/hour</span>
            </p>
          </div>

          {requestSent ? (
            <div className="nexus-notification nexus-notification--success" role="status">
              ✓ Request sent! The member will be notified.
            </div>
          ) : isAuthenticated ? (
            <button
              className="nexus-btn nexus-btn--primary"
              style={{ width: '100%' }}
              onClick={() => setRequestSent(true)}
            >
              {listing.type === 'offer' ? 'Request this service' : 'Offer to help'}
            </button>
          ) : (
            <div>
              <Link
                to="/login"
                className="nexus-btn nexus-btn--primary"
                style={{ width: '100%', display: 'block', textAlign: 'center' }}
              >
                Sign in to request
              </Link>
              <p style={{ fontSize: 13, textAlign: 'center', margin: 'var(--nexus-space-2) 0 0', color: 'var(--nexus-color-text-secondary)' }}>
                Don't have an account? <Link to="/register">Join free</Link>
              </p>
            </div>
          )}

          <p style={{ fontSize: 13, color: 'var(--nexus-color-text-secondary)', margin: 'var(--nexus-space-3) 0 0', textAlign: 'center' }}>
            No money changes hands — only time credits
          </p>
        </aside>
      </div>
    </div>
  )
}
