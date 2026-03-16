// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { exchangesApi, formatExchangeStatus, type Exchange } from '../api/exchanges'
import { isApiError } from '../context/AuthContext'

const statusColour: Record<string, string> = {
  requested: '#b45309',
  accepted: '#1d4ed8',
  inprogress: '#0369a1',
  completed: '#15803d',
  cancelled: '#6b7280',
  disputed: '#b91c1c',
}

export function ExchangesPage() {
  const [exchanges, setExchanges] = useState<Exchange[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    exchangesApi.list({ pageSize: 50 })
      .then(r => setExchanges(r.items ?? []))
      .catch((err) => {
        if (isApiError(err)) setError(err.message)
        else setError('Could not load exchanges.')
      })
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Exchanges</li>
        </ol>
      </nav>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--nexus-space-3)', marginBottom: 'var(--nexus-space-5)' }}>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: 0 }}>My exchanges</h1>
        <Link to="/exchanges/new" className="nexus-btn nexus-btn--primary">Propose exchange</Link>
      </div>
      {exchanges?.length === 0 ? (
        <div className="nexus-card" style={{ textAlign: 'center', padding: 'var(--nexus-space-7)', color: 'var(--nexus-color-text-secondary)' }}>
          No exchanges yet. Browse <Link to="/services">services</Link> to propose your first exchange.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-3)' }}>
          {(exchanges ?? []).map(ex => (
            <div key={ex.id} className="nexus-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--nexus-space-3)' }}>
              <div>
                <h2 style={{ margin: '0 0 var(--nexus-space-1)', fontSize: 17, fontWeight: 700 }}>
                  <Link to={`/exchanges/${ex.id}`} style={{ color: 'var(--nexus-color-primary)' }}>{ex.listingTitle}</Link>
                </h2>
                <p style={{ margin: '0 0 var(--nexus-space-1)', fontSize: 14, color: 'var(--nexus-color-text-secondary)' }}>
                  {ex.proposerName} → {ex.providerName} &bull; {ex.creditAmount} credit{ex.creditAmount !== 1 ? 's' : ''}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--nexus-color-text-secondary)' }}>{new Date(ex.createdAt).toLocaleDateString('en-IE')}</p>
              </div>
              <span className="nexus-badge" style={{ background: statusColour[ex.status] ?? '#6b7280', color: 'white' }}>
                {formatExchangeStatus(ex.status)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
