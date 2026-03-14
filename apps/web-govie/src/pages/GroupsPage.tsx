// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

interface Group { id: number; name: string; description: string; memberCount: number; type: string; isPublic: boolean }

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapGroup(raw: any): Group {
  return {
    id: raw.id,
    name: raw.name ?? '',
    description: raw.description ?? '',
    memberCount: raw.member_count ?? raw.memberCount ?? 0,
    type: raw.type ?? (raw.is_private ? 'private' : 'public'),
    // Backend returns is_private (boolean), frontend uses isPublic (inverted)
    isPublic: raw.isPublic ?? !(raw.is_private ?? false),
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    apiClient.get('/api/groups', { signal: controller.signal })
      .then(r => {
        const raw = r.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
        const items = raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
        setGroups(items.map(mapGroup))
      })
      .catch(err => { if (!controller.signal.aborted) setError(isApiError(err) ? err.message : 'Could not load groups.') })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [])

  const debouncedSearch = useDebouncedValue(search)
  const filtered = groups.filter(g => g.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || g.description?.toLowerCase().includes(debouncedSearch.toLowerCase()))

  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Groups</li>
        </ol>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--nexus-space-5)', flexWrap: 'wrap', gap: 'var(--nexus-space-4)' }}>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: 0 }}>Community groups</h1>
        <Link to="/groups/new" className="nexus-btn nexus-btn--primary">Create group</Link>
      </div>

      <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-5)', maxWidth: 400 }}>
        <label htmlFor="group-search" className="nexus-label">Search groups</label>
        <input id="group-search" type="search" className="nexus-input" placeholder="Search by name or description…" value={search} onChange={e => setSearch(e.target.value)} disabled={isLoading} />
      </div>

      <div role="region" aria-label="Groups list" aria-busy={isLoading} aria-live="polite">
      {isLoading ? (
        <div className="nexus-skeleton-grid" aria-label="Loading groups…">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="nexus-skeleton-card">
              <div className="nexus-skeleton-line" style={{ width: '30%', height: '0.75rem', marginBottom: '0.75rem' }} />
              <div className="nexus-skeleton-line" style={{ width: '70%', height: '1.2rem', marginBottom: '0.5rem' }} />
              <div className="nexus-skeleton-line" style={{ width: '100%', height: '0.9rem', marginBottom: '0.5rem' }} />
              <div className="nexus-skeleton-line" style={{ width: '40%', height: '0.8rem' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="nexus-empty-state">
          <p>{search ? 'No groups match your search.' : 'No groups available. Why not create one?'}</p>
          {!search && <Link to="/groups/new" className="nexus-btn nexus-btn--primary">Create a group</Link>}
        </div>
      ) : (
        <div className="nexus-cards">
          {filtered.map(group => (
            <article key={group.id} className="nexus-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--nexus-space-2)' }}>
                <span className="nexus-badge" style={{ background: group.isPublic ? '#006B6B' : '#64748b', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>
                  {group.isPublic ? 'Public' : 'Private'}
                </span>
                {group.type && <span style={{ fontSize: 12, color: 'var(--nexus-color-text-secondary)' }}>{group.type}</span>}
              </div>
              <h2 className="nexus-card__title" style={{ fontSize: 18 }}>
                <Link to={`/groups/${group.id}`}>{group.name}</Link>
              </h2>
              <p className="nexus-card__body">{group.description?.slice(0, 120)}{group.description?.length > 120 ? '…' : ''}</p>
              <div className="nexus-card__meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</span>
                <Link to={`/groups/${group.id}`} className="nexus-btn nexus-btn--secondary nexus-btn--sm">View group</Link>
              </div>
            </article>
          ))}
        </div>
      )}
      </div>{/* end groups region */}
    </div>
  )
}
