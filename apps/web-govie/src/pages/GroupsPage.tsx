// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

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
    apiClient.get('/api/groups')
      .then(r => {
        const raw = r.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
        const items = raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
        setGroups(items.map(mapGroup))
      })
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load groups.'))
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.description?.toLowerCase().includes(search.toLowerCase()))

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading groups…" /></div>
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
        <input id="group-search" type="search" className="nexus-input" placeholder="Search by name or description…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="nexus-card" style={{ textAlign: 'center', padding: 'var(--nexus-space-7)', color: 'var(--nexus-color-text-secondary)' }}>
          {search ? 'No groups match your search.' : 'No groups yet. Be the first to create one!'}
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
    </div>
  )
}
