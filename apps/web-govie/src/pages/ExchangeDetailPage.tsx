// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface Exchange {
  id: number; listingTitle: string; listingId: number; requesterName: string; requesterId: number
  providerName: string; providerId: number; status: string; creditAmount: number; message?: string
  scheduledAt?: string; completedAt?: string; createdAt: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapExchange(raw: any): Exchange {
  return {
    id: raw.id,
    listingTitle: raw.listing_title ?? raw.listingTitle ?? '',
    listingId: raw.listing_id ?? raw.listingId ?? 0,
    requesterName: raw.requester_name ?? raw.requesterName ?? '',
    requesterId: raw.requester_id ?? raw.requesterId ?? 0,
    providerName: raw.provider_name ?? raw.providerName ?? '',
    providerId: raw.provider_id ?? raw.providerId ?? 0,
    status: raw.status ?? 'pending',
    creditAmount: raw.credit_amount ?? raw.creditAmount ?? 0,
    message: raw.message ?? undefined,
    scheduledAt: raw.scheduled_at ?? raw.scheduledAt ?? undefined,
    completedAt: raw.completed_at ?? raw.completedAt ?? undefined,
    createdAt: raw.created_at ?? raw.createdAt ?? '',
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const STATUS_COLORS: Record<string, string> = { requested: '#C8640C', pending: '#C8640C', accepted: '#006B6B', active: '#006B6B', inprogress: '#006B6B', in_progress: '#006B6B', completed: '#15803d', cancelled: '#64748b', declined: '#dc2626', disputed: '#dc2626' }

export function ExchangeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [exchange, setExchange] = useState<Exchange | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    apiClient.get(`/api/exchanges/${id}`)
      .then(r => setExchange(mapExchange(r.data)))
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load exchange.'))
      .finally(() => setIsLoading(false))
  }, [id])

  const doAction = async (action: string) => {
    setActing(true)
    try {
      await apiClient.put(`/api/exchanges/${id}/${action}`)
      setExchange(e => e ? { ...e, status: action === 'accept' ? 'accepted' : action === 'complete' ? 'completed' : action === 'decline' ? 'declined' : 'cancelled' } : e)
      setActionMsg('Action completed successfully.')
    } catch (err) {
      setActionMsg(isApiError(err) ? err.message : 'Action failed.')
    } finally {
      setActing(false)
    }
  }

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading exchange..." /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>
  if (!exchange) return null

  const status = exchange.status.toLowerCase()

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/exchanges">Exchanges</Link></li>
          <li aria-current="page">Exchange #{exchange.id}</li>
        </ol>
      </nav>

      {actionMsg && <div className="nexus-notification nexus-notification--success" role="status" style={{ marginBottom: 'var(--nexus-space-4)' }}>{actionMsg}</div>}

      <div style={{ display: 'flex', gap: 'var(--nexus-space-3)', alignItems: 'center', marginBottom: 'var(--nexus-space-4)' }}>
        <h1 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 900, margin: 0 }}>Exchange #{exchange.id}</h1>
        <span className="nexus-badge" style={{ background: STATUS_COLORS[status] ?? '#64748b', color: 'white', padding: '4px 12px', borderRadius: 4, fontSize: 13, textTransform: 'capitalize' }}>{exchange.status}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--nexus-space-5)' }}>
        <div className="nexus-card">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Details</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--nexus-space-2) var(--nexus-space-4)' }}>
            <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Service</dt>
            <dd style={{ margin: 0 }}><Link to={`/services/${exchange.listingId}`}>{exchange.listingTitle}</Link></dd>
            <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Requester</dt>
            <dd style={{ margin: 0 }}><Link to={`/members/${exchange.requesterId}`}>{exchange.requesterName}</Link></dd>
            <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Provider</dt>
            <dd style={{ margin: 0 }}><Link to={`/members/${exchange.providerId}`}>{exchange.providerName}</Link></dd>
            <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Credits</dt>
            <dd style={{ margin: 0, fontWeight: 700 }}>{exchange.creditAmount}</dd>
            {exchange.scheduledAt && <>
              <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Scheduled</dt>
              <dd style={{ margin: 0 }}>{new Date(exchange.scheduledAt).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })}</dd>
            </>}
            <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Proposed</dt>
            <dd style={{ margin: 0, fontSize: 14 }}>{new Date(exchange.createdAt).toLocaleDateString('en-IE')}</dd>
          </dl>

          {exchange.message && (
            <div style={{ marginTop: 'var(--nexus-space-4)', padding: 'var(--nexus-space-3)', background: 'var(--nexus-color-surface)', borderRadius: 6, borderLeft: '3px solid var(--nexus-color-primary)' }}>
              <p style={{ margin: 0, fontSize: 14, fontStyle: 'italic' }}>"{exchange.message}"</p>
            </div>
          )}
        </div>

        <div className="nexus-card">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-3)' }}>
            {(status === 'requested' || status === 'pending') && (
              <>
                <button className="nexus-btn nexus-btn--primary" onClick={() => doAction('accept')} disabled={acting}>Accept exchange</button>
                <button className="nexus-btn nexus-btn--secondary" onClick={() => doAction('decline')} disabled={acting} style={{ color: 'var(--nexus-color-warning)' }}>Decline</button>
              </>
            )}
            {(status === 'accepted' || status === 'active' || status === 'inprogress' || status === 'in_progress') && (
              <>
                <button className="nexus-btn nexus-btn--primary" onClick={() => doAction('complete')} disabled={acting}>Mark as completed</button>
                <button className="nexus-btn nexus-btn--secondary" onClick={() => doAction('cancel')} disabled={acting} style={{ color: 'var(--nexus-color-warning)' }}>Cancel</button>
              </>
            )}
            {(status === 'completed' || status === 'cancelled' || status === 'declined') && (
              <p style={{ color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>This exchange is {status}. No further actions available.</p>
            )}
            <Link to="/exchanges" className="nexus-btn nexus-btn--secondary">Back to exchanges</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
