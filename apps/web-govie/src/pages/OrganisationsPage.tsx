// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface Organisation { id: number; name: string; type: string; description: string; memberCount: number; isVerified: boolean }

export function OrganisationsPage() {
  const [orgs, setOrgs] = useState<Organisation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<{ items: Organisation[] }>('/api/organisations')
      .then(r => setOrgs(r.data?.items ?? (r.data as unknown as Organisation[]) ?? []))
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load organisations.'))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading organisations..." /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Organisations</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>Community organisations</h1>

      {orgs.length === 0 ? (
        <div className="nexus-card" style={{ textAlign: 'center', padding: 'var(--nexus-space-7)', color: 'var(--nexus-color-text-secondary)' }}>
          No organisations listed yet.
        </div>
      ) : (
        <div className="nexus-cards">
          {orgs.map(org => (
            <article key={org.id} className="nexus-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--nexus-space-2)' }}>
                <span className="nexus-badge" style={{ background: '#006B6B', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>{org.type}</span>
                {org.isVerified && <span style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>Verified</span>}
              </div>
              <h2 className="nexus-card__title" style={{ fontSize: 18 }}>
                <Link to={`/organisations/${org.id}`}>{org.name}</Link>
              </h2>
              <p className="nexus-card__body">{org.description?.slice(0, 120)}{org.description?.length > 120 ? '...' : ''}</p>
              <div className="nexus-card__meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>{org.memberCount} member{org.memberCount !== 1 ? 's' : ''}</span>
                <Link to={`/organisations/${org.id}`} className="nexus-btn nexus-btn--secondary nexus-btn--sm">View</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
