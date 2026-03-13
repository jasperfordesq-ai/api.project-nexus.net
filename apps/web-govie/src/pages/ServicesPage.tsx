// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listingsApi } from '../api/listings'
import type { Listing, ListingType, PaginationParams } from '../api/types'
import { isApiError } from '../context/AuthContext'

const CATEGORIES = [
  'All categories',
  'Education',
  'Home & Garden',
  'Tech Support',
  'Transport',
  'Cooking',
  'Creative Arts',
  'Childcare',
  'Pets',
  'Healthcare',
  'Admin & Office',
  'Other',
]

const PAGE_SIZE = 12

export function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [listings, setListings] = useState<Listing[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentPage = Number(searchParams.get('page') ?? '1')
  const searchQuery = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? ''
  const type = (searchParams.get('type') ?? '') as ListingType | ''

  const searchRef = useRef<HTMLInputElement>(null)

  const fetchListings = useCallback(async (params: PaginationParams) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await listingsApi.list(params)
      setListings(data.items ?? [])
      setTotalCount(data.totalCount ?? 0)
    } catch (err) {
      if (isApiError(err)) setError(err.message)
      else setError('Could not load services. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchListings({
      page: currentPage,
      pageSize: PAGE_SIZE,
      search: searchQuery || undefined,
      category: category || undefined,
      type: type || undefined,
    })
  }, [fetchListings, currentPage, searchQuery, category, type])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchRef.current?.value.trim() ?? ''
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (q) next.set('search', q)
      else next.delete('search')
      next.set('page', '1')
      return next
    })
  }

  const setParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      next.set('page', '1')
      return next
    })
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="nexus-container">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Services</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>
        Browse services
      </h1>

      {/* Filters */}
      <section aria-label="Search and filter services">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--nexus-space-3)', flexWrap: 'wrap', marginBottom: 'var(--nexus-space-5)' }}>
          <div className="nexus-form-group" style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="search-input" className="nexus-label">Search services</label>
            <input
              id="search-input"
              ref={searchRef}
              type="search"
              className="nexus-input"
              placeholder="e.g. gardening, tutoring, transport…"
              defaultValue={searchQuery}
              style={{ maxWidth: '100%' }}
            />
          </div>

          <div className="nexus-form-group">
            <label htmlFor="category-select" className="nexus-label">Category</label>
            <select
              id="category-select"
              className="nexus-select"
              value={category}
              onChange={(e) => setParam('category', e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c === 'All categories' ? '' : c.toLowerCase().replace(/\s+/g, '-')}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="nexus-form-group">
            <label htmlFor="type-select" className="nexus-label">Type</label>
            <select
              id="type-select"
              className="nexus-select"
              value={type}
              onChange={(e) => setParam('type', e.target.value)}
            >
              <option value="">All types</option>
              <option value="offer">Offering</option>
              <option value="request">Requesting</option>
            </select>
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button type="submit" className="nexus-btn nexus-btn--primary" style={{ fontSize: 16 }}>
              Search
            </button>
          </div>
        </form>
      </section>

      {/* Results summary */}
      {!isLoading && (
        <p
          aria-live="polite"
          aria-atomic="true"
          style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-4)' }}
        >
          {totalCount === 0
            ? 'No services found matching your filters.'
            : `Showing ${listings.length} of ${totalCount} service${totalCount !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="nexus-notification nexus-notification--error" role="alert">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="nexus-loading">
          <span className="nexus-spinner" aria-label="Loading services…" />
        </div>
      )}

      {/* Listing cards */}
      {!isLoading && listings.length > 0 && (
        <div className="nexus-cards">
          {listings.map((listing) => (
            <article key={listing.id} className="nexus-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="nexus-card__type">{listing.category}</span>
                <span className={`nexus-badge nexus-badge--${listing.type}`}>
                  {listing.type === 'offer' ? 'Offering' : 'Requesting'}
                </span>
              </div>

              <h2 className="nexus-card__title">
                <Link to={`/services/${listing.id}`}>{listing.title}</Link>
              </h2>

              <p className="nexus-card__body">
                {listing.description.length > 140
                  ? listing.description.slice(0, 140) + '…'
                  : listing.description}
              </p>

              <div className="nexus-card__meta">
                <span className={`nexus-badge nexus-badge--credits`}>
                  ⏱ {listing.creditRate} credit{listing.creditRate !== 1 ? 's' : ''}/hr
                </span>
                {listing.location && (
                  <span>📍 {listing.location}</span>
                )}
                <span style={{ marginLeft: 'auto', color: 'var(--nexus-color-text-secondary)', fontSize: 13 }}>
                  {listing.userName}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Pagination" style={{ marginTop: 'var(--nexus-space-6)', display: 'flex', gap: 'var(--nexus-space-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
          {currentPage > 1 && (
            <button
              className="nexus-btn nexus-btn--secondary nexus-btn--sm"
              onClick={() => setParam('page', String(currentPage - 1))}
            >
              ← Previous
            </button>
          )}
          {(() => {
            // Show up to 7 page buttons, centered around the current page
            const maxVisible = 7
            let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
            const endPage = Math.min(totalPages, startPage + maxVisible - 1)
            startPage = Math.max(1, endPage - maxVisible + 1)
            return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((p) => (
              <button
                key={p}
                className={`nexus-btn nexus-btn--sm ${p === currentPage ? 'nexus-btn--primary' : 'nexus-btn--secondary'}`}
                onClick={() => setParam('page', String(p))}
                aria-current={p === currentPage ? 'page' : undefined}
              >
                {p}
              </button>
            ))
          })()}
          {currentPage < totalPages && (
            <button
              className="nexus-btn nexus-btn--secondary nexus-btn--sm"
              onClick={() => setParam('page', String(currentPage + 1))}
            >
              Next →
            </button>
          )}
        </nav>
      )}

      {/* CTA */}
      {!isLoading && (
        <div style={{ marginTop: 'var(--nexus-space-7)', padding: 'var(--nexus-space-6)', background: 'var(--nexus-color-primary-light)', borderRadius: 6, textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 var(--nexus-space-3)' }}>Have a skill to share?</h2>
          <p style={{ margin: '0 0 var(--nexus-space-4)', color: 'var(--nexus-color-text-secondary)' }}>
            Post your service and start earning time credits today.
          </p>
          <Link to="/services/submit" className="nexus-btn nexus-btn--primary">
            Post a service
          </Link>
        </div>
      )}
    </div>
  )
}
