// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface Organisation { id: number; name: string; type: string; description: string; mission?: string; website?: string; memberCount: number; isVerified: boolean; createdAt: string }
interface OrgMember { id: number; userId: number; userName: string; role: string }

export function OrganisationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [org, setOrg] = useState<Organisation | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<Organisation>(`/api/organisations/${id}`)
      .then(r => { setOrg(r.data); return apiClient.get<OrgMember[]>(`/api/organisations/${id}/members`) })
      .then(r => setMembers(r.data ?? []))
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load organisation.'))
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading organisation..." /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>
  if (!org) return null

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/organisations">Organisations</Link></li>
          <li aria-current="page">{org.name}</li>
        </ol>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--nexus-space-6)' }}>
        <div>
          <div style={{ display: 'flex', gap: 'var(--nexus-space-3)', alignItems: 'center', marginBottom: 'var(--nexus-space-3)' }}>
            <span className="nexus-badge" style={{ background: '#006B6B', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>{org.type}</span>
            {org.isVerified && <span style={{ fontSize: 13, color: '#15803d', fontWeight: 700 }}>Verified organisation</span>}
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-4)' }}>{org.name}</h1>
          <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-4)', lineHeight: 1.6 }}>{org.description}</p>
          {org.mission && (
            <div style={{ padding: 'var(--nexus-space-4)', background: 'var(--nexus-color-primary-light)', borderRadius: 8, marginBottom: 'var(--nexus-space-4)' }}>
              <h3 style={{ margin: '0 0 var(--nexus-space-2)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--nexus-color-text-secondary)' }}>Mission</h3>
              <p style={{ margin: 0, fontStyle: 'italic' }}>{org.mission}</p>
            </div>
          )}
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--nexus-space-2) var(--nexus-space-4)' }}>
            <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Members</dt>
            <dd style={{ margin: 0 }}>{org.memberCount}</dd>
            <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Founded</dt>
            <dd style={{ margin: 0 }}>{new Date(org.createdAt).toLocaleDateString('en-IE', { year: 'numeric', month: 'long' })}</dd>
            {org.website && <>
              <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Website</dt>
              <dd style={{ margin: 0 }}><a href={org.website} target="_blank" rel="noopener noreferrer">{org.website}</a></dd>
            </>}
          </dl>
        </div>

        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Members ({members.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-2)' }}>
            {members.slice(0, 10).map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--nexus-space-3)', padding: 'var(--nexus-space-2) 0', borderBottom: '1px solid var(--nexus-color-border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--nexus-color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                  {m.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <Link to={`/members/${m.userId}`} style={{ fontWeight: 600, fontSize: 14 }}>{m.userName}</Link>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--nexus-color-text-secondary)' }}>{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
