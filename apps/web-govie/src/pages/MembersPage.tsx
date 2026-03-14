// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

interface Member { id: number; firstName: string; lastName: string; bio?: string; skills?: string[]; exchangeCount: number; isConnected: boolean }

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapMember(raw: any): Member {
  return {
    id: raw.id,
    firstName: raw.first_name ?? raw.firstName ?? '',
    lastName: raw.last_name ?? raw.lastName ?? '',
    bio: raw.bio ?? undefined,
    skills: raw.skills ?? undefined,
    exchangeCount: raw.exchange_count ?? raw.exchangeCount ?? 0,
    isConnected: raw.is_connected ?? raw.isConnected ?? false,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const ITEMS_PER_PAGE = 12

export function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    apiClient.get('/api/users', { signal: controller.signal })
      .then(r => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = r.data as any
        const items = raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        setMembers(items.map(mapMember))
      })
      .catch(err => { if (!controller.signal.aborted) setError(isApiError(err) ? err.message : 'Could not load members.') })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [])

  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  const debouncedQuery = useDebouncedValue(query)
  const filtered = members.filter(m =>
    debouncedQuery === '' || `${m.firstName} ${m.lastName}`.toLowerCase().includes(debouncedQuery.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginatedMembers = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Reset to page 1 when search query changes
  useEffect(() => { setPage(1) }, [debouncedQuery])

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Members</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-2)' }}>Community Members</h1>
      <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-5)' }}>{members.length} members in your community</p>

      <div style={{ marginBottom: 'var(--nexus-space-5)' }}>
        <label htmlFor="member-search" className="nexus-sr-only">Search members</label>
        <input
          id="member-search"
          type="search"
          className="nexus-input"
          placeholder="Search by name…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ maxWidth: 400 }}
          disabled={isLoading}
        />
      </div>

      <div role="region" aria-label="Members list" aria-busy={isLoading} aria-live="polite">
      {isLoading ? (
        <div className="nexus-skeleton-grid" aria-label="Loading members…">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="nexus-skeleton-card">
              <div style={{ display: 'flex', gap: 'var(--nexus-space-3)', marginBottom: '0.75rem' }}>
                <div className="nexus-skeleton-line" style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="nexus-skeleton-line" style={{ width: '60%', height: '1rem', marginBottom: '0.5rem' }} />
                  <div className="nexus-skeleton-line" style={{ width: '40%', height: '0.8rem' }} />
                </div>
              </div>
              <div className="nexus-skeleton-line" style={{ width: '100%', height: '0.9rem', marginBottom: '0.5rem' }} />
              <div className="nexus-skeleton-line" style={{ width: '50%', height: '0.8rem' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="nexus-empty-state">
          <p>No members found matching your search.</p>
        </div>
      ) : (
        <div className="nexus-cards">
          {paginatedMembers.map(member => (
            <div key={member.id} className="nexus-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--nexus-space-3)', marginBottom: 'var(--nexus-space-3)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--nexus-color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0 }} aria-hidden="true">
                  {member.firstName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <Link to={`/members/${member.id}`} style={{ fontWeight: 700, fontSize: 16 }}>
                    {member.firstName} {member.lastName}
                  </Link>
                  <div style={{ fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>{member.exchangeCount} exchanges completed</div>
                </div>
              </div>

              {member.bio && (
                <p style={{ fontSize: 14, color: 'var(--nexus-color-text)', marginBottom: 'var(--nexus-space-3)', lineHeight: 1.5 }}>
                  {member.bio.length > 120 ? member.bio.slice(0, 120) + '…' : member.bio}
                </p>
              )}

              {member.skills && member.skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--nexus-space-2)', marginBottom: 'var(--nexus-space-3)' }}>
                  {member.skills.slice(0, 4).map(skill => (
                    <span key={skill} className="nexus-badge" style={{ background: 'var(--nexus-color-surface)', color: 'var(--nexus-color-text)', border: '1px solid var(--nexus-color-border)', fontSize: 12, padding: '2px 8px', borderRadius: 12 }}>{skill}</span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--nexus-space-2)' }}>
                <Link to={`/members/${member.id}`} className="nexus-btn nexus-btn--secondary nexus-btn--sm">View profile</Link>
                {!member.isConnected && (
                  <Link to={`/connections?invite=${member.id}`} className="nexus-btn nexus-btn--primary nexus-btn--sm">Connect</Link>
                )}
                {member.isConnected && (
                  <span className="nexus-badge" style={{ background: 'var(--nexus-color-success-light)', color: 'var(--nexus-color-success)', padding: '4px 10px', borderRadius: 12, fontSize: 13, display: 'flex', alignItems: 'center' }}>Connected</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>{/* end members region */}

      {!isLoading && totalPages > 1 && (
        <nav className="nexus-pagination" aria-label="Pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </nav>
      )}
    </div>
  )
}
