// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import apiClient from '../api/client'
import { exchangesApi } from '../api/exchanges'
import { isApiError } from '../context/AuthContext'

interface Listing { id: number; title: string; creditRate: number; userName: string }

export function ProposeExchangePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listingId = searchParams.get('listingId')
  const [listing, setListing] = useState<Listing | null>(null)
  const [message, setMessage] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [hours, setHours] = useState('1')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (listingId) {
      apiClient.get(`/api/listings/${listingId}`)
        .then(r => {
          const raw = r.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
          const user = raw.user ?? raw.owner ?? {}
          setListing({
            id: raw.id,
            title: raw.title ?? '',
            creditRate: raw.creditRate ?? raw.credit_rate ?? raw.estimated_hours ?? raw.estimatedHours ?? 1,
            userName: raw.userName ?? raw.user_name ?? (user.first_name || user.firstName ? `${user.first_name ?? user.firstName ?? ''} ${user.last_name ?? user.lastName ?? ''}`.trim() : 'Unknown'),
          })
        })
        .catch(() => setError('Could not load service details.'))
    }
  }, [listingId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!listingId) { setError('No service selected.'); return }
    const parsedHours = Number(hours)
    if (!parsedHours || parsedHours <= 0) { setError('Please enter a valid duration greater than 0.'); return }
    setIsSubmitting(true)
    try {
      const res = await exchangesApi.propose({
        listingId: Number(listingId),
        message: message.trim() || undefined,
        scheduledAt: scheduledAt || undefined,
        agreedHours: Number(hours),
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate(`/exchanges/${(res as any).id}`)
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to propose exchange.')
      setIsSubmitting(false)
    }
  }

  const credits = listing ? listing.creditRate * Number(hours) : 0

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/services">Services</Link></li>
          <li aria-current="page">Propose exchange</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>Propose an exchange</h1>

      <div style={{ maxWidth: 560 }}>
        {error && <div className="nexus-notification nexus-notification--error" role="alert" style={{ marginBottom: 'var(--nexus-space-4)' }}>{error}</div>}

        {listing && (
          <div className="nexus-card" style={{ background: 'var(--nexus-color-primary-light)', marginBottom: 'var(--nexus-space-4)' }}>
            <h2 style={{ margin: '0 0 var(--nexus-space-2)', fontSize: 17 }}>{listing.title}</h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--nexus-color-text-secondary)' }}>
              Offered by {listing.userName} &bull; {listing.creditRate} credit{listing.creditRate !== 1 ? 's' : ''}/hr
            </p>
          </div>
        )}

        <div className="nexus-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
              <label htmlFor="hours" className="nexus-label">Duration (hours)</label>
              <input id="hours" type="number" className="nexus-input" value={hours} onChange={e => setHours(e.target.value)} min={1} max={100} step={0.5} disabled={isSubmitting} style={{ maxWidth: 120 }} />
              {listing && <p style={{ margin: 'var(--nexus-space-1) 0 0', fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>Total: {credits} credits</p>}
            </div>

            <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
              <label htmlFor="scheduled-at" className="nexus-label">Preferred date and time</label>
              <input id="scheduled-at" type="datetime-local" className="nexus-input" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} disabled={isSubmitting} />
            </div>

            <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-5)' }}>
              <label htmlFor="exchange-message" className="nexus-label">Message to provider (optional)</label>
              <textarea id="exchange-message" className="nexus-input" value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe what you need and any relevant details..." rows={4} maxLength={1000} disabled={isSubmitting} style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 'var(--nexus-space-3)' }}>
              <button type="submit" className="nexus-btn nexus-btn--primary" disabled={isSubmitting || !listingId}>
                {isSubmitting ? 'Sending…' : 'Send proposal'}
              </button>
              <Link to={listingId ? `/services/${listingId}` : '/services'} className="nexus-btn nexus-btn--secondary">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
