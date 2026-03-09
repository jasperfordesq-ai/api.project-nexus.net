// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface GamProfile { totalXp: number; level: number; xpToNextLevel: number; xpForCurrentLevel: number; streak: number; rank?: number }
interface Badge { id: number; name: string; description: string; iconUrl?: string; earnedAt?: string }

export function GamificationPage() {
  const [profile, setProfile] = useState<GamProfile | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      apiClient.get<GamProfile>('/api/gamification/profile').then(r => r.data),
      apiClient.get<Badge[]>('/api/gamification/badges/my').then(r => r.data ?? []),
    ])
      .then(([p, b]) => { setProfile(p); setBadges(b) })
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load gamification data.'))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading gamification…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  const xpProgress = profile ? Math.round(((profile.totalXp - profile.xpForCurrentLevel) / (profile.xpToNextLevel - profile.xpForCurrentLevel)) * 100) : 0

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Achievements</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>My achievements</h1>

      {profile && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--nexus-space-5)', marginBottom: 'var(--nexus-space-6)' }}>
          {/* Level card */}
          <section aria-labelledby="level-heading" className="nexus-card" style={{ background: 'var(--nexus-color-primary)', color: 'white', border: 'none' }}>
            <h2 id="level-heading" style={{ margin: '0 0 var(--nexus-space-2)', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Level</h2>
            <p style={{ margin: '0 0 var(--nexus-space-3)', fontSize: 56, fontWeight: 900, lineHeight: 1 }}>{profile.level}</p>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, height: 8, marginBottom: 'var(--nexus-space-2)', overflow: 'hidden' }}>
              <div style={{ width: `${xpProgress}%`, height: '100%', background: 'white', borderRadius: 4, transition: 'width 0.5s' }} role="progressbar" aria-valuenow={xpProgress} aria-valuemin={0} aria-valuemax={100} aria-label="XP progress" />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{profile.totalXp} XP &bull; {profile.xpToNextLevel - profile.totalXp} to level {profile.level + 1}</p>
          </section>

          {/* Streak */}
          <section aria-labelledby="streak-heading" className="nexus-card" style={{ textAlign: 'center' }}>
            <h2 id="streak-heading" style={{ margin: '0 0 var(--nexus-space-2)', fontSize: 14, fontWeight: 600, color: 'var(--nexus-color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current streak</h2>
            <p style={{ margin: '0 0 var(--nexus-space-2)', fontSize: 56, fontWeight: 900 }}>{profile.streak}</p>
            <p style={{ margin: 0, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>consecutive days</p>
          </section>

          {/* Rank */}
          {profile.rank && (
            <section aria-labelledby="rank-heading" className="nexus-card" style={{ textAlign: 'center' }}>
              <h2 id="rank-heading" style={{ margin: '0 0 var(--nexus-space-2)', fontSize: 14, fontWeight: 600, color: 'var(--nexus-color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Community rank</h2>
              <p style={{ margin: '0 0 var(--nexus-space-2)', fontSize: 56, fontWeight: 900 }}>#{profile.rank}</p>
              <Link to="/leaderboard" style={{ fontSize: 14, color: 'var(--nexus-color-primary)' }}>View leaderboard</Link>
            </section>
          )}
        </div>
      )}

      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Badges earned ({badges.length})</h2>
      {badges.length === 0 ? (
        <div className="nexus-card" style={{ textAlign: 'center', padding: 'var(--nexus-space-6)', color: 'var(--nexus-color-text-secondary)' }}>
          No badges yet. Start exchanging services to earn your first badge!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--nexus-space-4)' }}>
          {badges.map(badge => (
            <div key={badge.id} className="nexus-card" style={{ textAlign: 'center', padding: 'var(--nexus-space-5)' }}>
              <div style={{ fontSize: 48, marginBottom: 'var(--nexus-space-3)' }} aria-hidden="true">{badge.iconUrl ?? '🏅'}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 var(--nexus-space-1)' }}>{badge.name}</h3>
              <p style={{ margin: '0 0 var(--nexus-space-2)', fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>{badge.description}</p>
              {badge.earnedAt && <p style={{ margin: 0, fontSize: 11, color: 'var(--nexus-color-text-secondary)' }}>Earned {new Date(badge.earnedAt).toLocaleDateString('en-IE')}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
