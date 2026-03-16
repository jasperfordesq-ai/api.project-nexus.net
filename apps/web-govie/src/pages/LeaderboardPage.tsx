// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface LeaderboardEntry { rank: number; userId: number; userName: string; totalXp: number; level: number }

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get('/api/gamification/leaderboard')
      .then(r => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = r.data as any
        const data: LeaderboardEntry[] = raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        setEntries(data)
      })
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load leaderboard.'))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading leaderboard…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  const medalColor = (rank: number) => rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : undefined

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Leaderboard</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-2)' }}>XP Leaderboard</h1>
      <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-5)' }}>Top community members ranked by experience points</p>

      {entries.length === 0 ? (
        <div className="nexus-card" style={{ textAlign: 'center', padding: 'var(--nexus-space-7)', color: 'var(--nexus-color-text-secondary)' }}>
          No leaderboard data yet.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--nexus-color-border)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }} aria-label="XP Leaderboard">
            <thead style={{ background: 'var(--nexus-color-surface)' }}>
              <tr>
                {['Rank', 'Member', 'Level', 'XP'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 13, color: 'var(--nexus-color-text-secondary)', borderBottom: '1px solid var(--nexus-color-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 50).map((entry, i) => (
                <tr key={entry.userId} style={{ background: i % 2 === 0 ? 'white' : 'var(--nexus-color-surface)', borderBottom: '1px solid var(--nexus-color-border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: entry.rank <= 3 ? 700 : 400 }}>
                    {medalColor(entry.rank) ? (
                      <span style={{ color: medalColor(entry.rank), fontSize: 20 }} aria-label={`Rank ${entry.rank}`}>{entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}</span>
                    ) : (
                      <span style={{ color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>{entry.rank}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--nexus-space-3)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--nexus-color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }} aria-hidden="true">
                        {entry.userName.charAt(0).toUpperCase()}
                      </div>
                      <Link to={`/members/${entry.userId}`} style={{ fontWeight: 600 }}>{entry.userName}</Link>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="nexus-badge" style={{ background: 'var(--nexus-color-primary)', color: 'white', padding: '2px 10px', borderRadius: 12, fontSize: 13 }}>Lv {entry.level}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>{entry.totalXp.toLocaleString()} XP</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 'var(--nexus-space-5)', textAlign: 'center' }}>
        <Link to="/gamification" className="nexus-btn nexus-btn--secondary">My achievements</Link>
      </div>
    </div>
  )
}
