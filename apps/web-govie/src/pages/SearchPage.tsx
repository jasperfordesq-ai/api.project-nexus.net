// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface SearchResult { id: number; type: 'listing' | 'user' | 'event' | 'group'; title: string; description?: string; meta?: string }

const TYPE_COLORS: Record<string, string> = { listing: '#006B6B', user: '#0066cc', event: '#7c3aed', group: '#C8640C' }
const TYPE_LINKS: Record<string, (id: number) => string> = {
  listing: id => `/services/${id}`,
  user: id => `/members/${id}`,
  event: id => `/events/${id}`,
  group: id => `/groups/${id}`,
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState(query)

  useEffect(() => {
    if (!query.trim()) return
    setIsLoading(true)
    setError(null)
    apiClient.get<SearchResult[]>('/api/search', { params: { q: query } })
      .then(r => setResults(r.data ?? []))
      .catch(err => setError(isApiError(err) ? err.message : 'Search failed.'))
      .finally(() => setIsLoading(false))
  }, [query])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      setSearchParams({ q: inputValue.trim() })
    }
  }

  return (
    <div className="nexus-container">
      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>Search</h1>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--nexus-space-3)', marginBottom: 'var(--nexus-space-6)', maxWidth: 600 }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="search-q" className="nexus-sr-only">Search</label>
          <input
            id="search-q"
            type="search"
            className="nexus-input"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Search services, members, events, groups..."
            style={{ width: '100%' }}
          />
        </div>
        <button type="submit" className="nexus-btn nexus-btn--primary">Search</button>
      </form>

      {error && <div className="nexus-notification nexus-notification--error" role="alert" style={{ marginBottom: 'var(--nexus-space-4)' }}>{error}</div>}

      {isLoading && <div className="nexus-loading"><span className="nexus-spinner" aria-label="Searching..." /></div>}

      {!isLoading && query && (
        <p aria-live="polite" style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-4)' }}>
          {results.length === 0 ? `No results for "${query}"` : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`}
        </p>
      )}

      {!isLoading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-3)' }}>
          {results.map(r => (
            <Link
              key={`${r.type}-${r.id}`}
              to={TYPE_LINKS[r.type]?.(r.id) ?? '/'}
              style={{ display: 'block', padding: 'var(--nexus-space-4)', background: 'var(--nexus-color-surface)', border: '1px solid var(--nexus-color-border)', borderRadius: 8, textDecoration: 'none', color: 'var(--nexus-color-text)' }}
            >
              <div style={{ display: 'flex', gap: 'var(--nexus-space-3)', alignItems: 'flex-start' }}>
                <span className="nexus-badge" style={{ background: TYPE_COLORS[r.type] ?? '#64748b', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 4, textTransform: 'capitalize', flexShrink: 0, marginTop: 2 }}>
                  {r.type}
                </span>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>{r.title}</h3>
                  {r.description && <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--nexus-color-text-secondary)' }}>{r.description.slice(0, 120)}{r.description.length > 120 ? '...' : ''}</p>}
                  {r.meta && <p style={{ margin: 0, fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>{r.meta}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!query && !isLoading && (
        <div className="nexus-card" style={{ textAlign: 'center', padding: 'var(--nexus-space-7)', color: 'var(--nexus-color-text-secondary)' }}>
          Enter a search term above to find services, members, events, and groups.
        </div>
      )}
    </div>
  )
}
