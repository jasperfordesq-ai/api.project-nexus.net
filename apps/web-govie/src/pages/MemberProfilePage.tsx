// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface MemberProfile { id: number; firstName: string; lastName: string; bio?: string; skills?: string[]; exchangeCount: number; totalXp: number; level: number; memberSince: string; isConnected: boolean }
interface Review { id: number; reviewerName: string; rating: number; comment: string; createdAt: string }

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProfile(raw: any): MemberProfile {
  return {
    id: raw.id,
    firstName: raw.first_name ?? raw.firstName ?? '',
    lastName: raw.last_name ?? raw.lastName ?? '',
    bio: raw.bio ?? undefined,
    skills: raw.skills ?? undefined,
    exchangeCount: raw.exchange_count ?? raw.exchangeCount ?? 0,
    totalXp: raw.total_xp ?? raw.totalXp ?? 0,
    level: raw.level ?? 1,
    memberSince: raw.member_since ?? raw.memberSince ?? raw.created_at ?? raw.createdAt ?? '',
    isConnected: raw.is_connected ?? raw.isConnected ?? false,
  }
}

function mapReview(raw: any): Review {
  return {
    id: raw.id,
    reviewerName: raw.reviewer_name ?? raw.reviewerName ?? '',
    rating: raw.rating ?? 0,
    comment: raw.comment ?? '',
    createdAt: raw.created_at ?? raw.createdAt ?? '',
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function MemberProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      apiClient.get(`/api/users/${id}`).then(r => mapProfile(r.data)),
      apiClient.get(`/api/users/${id}/reviews`).then(r => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = r.data as any
        const items = raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        return items.map(mapReview)
      }).catch(() => [] as Review[]),
    ])
      .then(([p, r]) => { setProfile(p); setReviews(r) })
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load profile.'))
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading profile…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>
  if (!profile) return null

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/members">Members</Link></li>
          <li aria-current="page">{profile.firstName} {profile.lastName}</li>
        </ol>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--nexus-space-6)' }}>
        <div>
          <div className="nexus-card" style={{ textAlign: 'center', marginBottom: 'var(--nexus-space-5)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--nexus-color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 32, margin: '0 auto var(--nexus-space-3)' }} aria-hidden="true">
              {profile.firstName.charAt(0).toUpperCase()}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 var(--nexus-space-1)' }}>{profile.firstName} {profile.lastName}</h1>
            <p style={{ color: 'var(--nexus-color-text-secondary)', fontSize: 14, margin: '0 0 var(--nexus-space-3)' }}>
              Member since {new Date(profile.memberSince).toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })}
            </p>
            {profile.bio && <p style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 var(--nexus-space-4)' }}>{profile.bio}</p>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--nexus-space-3)', marginBottom: 'var(--nexus-space-4)', paddingTop: 'var(--nexus-space-3)', borderTop: '1px solid var(--nexus-color-border)' }}>
              <div><div style={{ fontSize: 22, fontWeight: 900 }}>{profile.exchangeCount}</div><div style={{ fontSize: 12, color: 'var(--nexus-color-text-secondary)' }}>Exchanges</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 900 }}>Lv {profile.level}</div><div style={{ fontSize: 12, color: 'var(--nexus-color-text-secondary)' }}>Level</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 900 }}>{profile.totalXp}</div><div style={{ fontSize: 12, color: 'var(--nexus-color-text-secondary)' }}>XP</div></div>
            </div>

            {!profile.isConnected && (
              <Link to={`/connections?invite=${profile.id}`} className="nexus-btn nexus-btn--primary" style={{ display: 'inline-block' }}>Connect with {profile.firstName}</Link>
            )}
            {profile.isConnected && (
              <span className="nexus-badge" style={{ background: 'var(--nexus-color-surface)', padding: '6px 14px', borderRadius: 20, fontSize: 14 }}>Connected</span>
            )}
          </div>

          {profile.skills && profile.skills.length > 0 && (
            <div className="nexus-card">
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 var(--nexus-space-3)' }}>Skills & Services</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--nexus-space-2)' }}>
                {profile.skills.map(skill => (
                  <span key={skill} className="nexus-badge" style={{ background: 'var(--nexus-color-primary)', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>
            Reviews {avgRating && <span style={{ fontSize: 16, color: 'var(--nexus-color-text-secondary)', fontWeight: 400 }}>({avgRating} avg from {reviews.length})</span>}
          </h2>
          {reviews.length === 0 ? (
            <div className="nexus-card" style={{ textAlign: 'center', padding: 'var(--nexus-space-6)', color: 'var(--nexus-color-text-secondary)' }}>
              No reviews yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-3)' }}>
              {reviews.map(review => (
                <div key={review.id} className="nexus-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--nexus-space-2)' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{review.reviewerName}</span>
                    <span style={{ fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>{new Date(review.createdAt).toLocaleDateString('en-IE')}</span>
                  </div>
                  <div style={{ marginBottom: 'var(--nexus-space-2)', color: '#F59E0B' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
