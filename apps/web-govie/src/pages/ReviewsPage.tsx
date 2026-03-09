// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface Review { id: number; listingTitle?: string; reviewerName: string; targetUserName: string; rating: number; comment: string; createdAt: string; type: 'given' | 'received' }

export function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'received' | 'given'>('received')

  useEffect(() => {
    apiClient.get<Review[]>('/api/reviews/my')
      .then(r => setReviews(r.data ?? []))
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load reviews.'))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading reviews…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  const filtered = reviews.filter(r => r.type === tab)
  const avgRating = filtered.length > 0 ? (filtered.reduce((s, r) => s + r.rating, 0) / filtered.length).toFixed(1) : null

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: 'var(--nexus-space-2) var(--nexus-space-4)',
    borderBottom: active ? '3px solid var(--nexus-color-primary)' : '3px solid transparent',
    fontWeight: active ? 700 : 400,
    color: active ? 'var(--nexus-color-primary)' : 'var(--nexus-color-text-secondary)',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 15,
  })

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/profile">Profile</Link></li>
          <li aria-current="page">My reviews</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>My Reviews</h1>

      <div style={{ borderBottom: '1px solid var(--nexus-color-border)', marginBottom: 'var(--nexus-space-5)', display: 'flex' }} role="tablist">
        <button role="tab" aria-selected={tab === 'received'} style={tabStyle(tab === 'received')} onClick={() => setTab('received')}>
          Received ({reviews.filter(r => r.type === 'received').length})
        </button>
        <button role="tab" aria-selected={tab === 'given'} style={tabStyle(tab === 'given')} onClick={() => setTab('given')}>
          Given ({reviews.filter(r => r.type === 'given').length})
        </button>
      </div>

      {avgRating && (
        <div style={{ marginBottom: 'var(--nexus-space-4)', fontSize: 14, color: 'var(--nexus-color-text-secondary)' }}>
          Average rating: <strong style={{ color: '#F59E0B' }}>{'★'.repeat(Math.round(Number(avgRating)))}</strong> {avgRating} from {filtered.length} review{filtered.length !== 1 ? 's' : ''}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="nexus-card" style={{ textAlign: 'center', padding: 'var(--nexus-space-7)', color: 'var(--nexus-color-text-secondary)' }}>
          No {tab} reviews yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-3)' }}>
          {filtered.map(review => (
            <div key={review.id} className="nexus-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--nexus-space-2)' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>
                    {tab === 'received' ? review.reviewerName : review.targetUserName}
                  </span>
                  {review.listingTitle && (
                    <span style={{ fontSize: 13, color: 'var(--nexus-color-text-secondary)', marginLeft: 'var(--nexus-space-2)' }}>
                      re: {review.listingTitle}
                    </span>
                  )}
                </div>
                <time style={{ fontSize: 13, color: 'var(--nexus-color-text-secondary)' }} dateTime={review.createdAt}>
                  {new Date(review.createdAt).toLocaleDateString('en-IE')}
                </time>
              </div>
              <div style={{ marginBottom: 'var(--nexus-space-2)', color: '#F59E0B', fontSize: 18 }}>
                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
