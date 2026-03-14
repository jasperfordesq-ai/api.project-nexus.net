// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError, useAuth } from '../context/AuthContext'

interface DashboardData {
  wallet: { balance: number }
  gamification: { totalXp: number; level: number; streak: number; rank?: number }
  notifications: { unreadCount: number }
  messages: { unreadCount: number }
  recentExchanges: { id: number; title: string; status: string; createdAt: string }[]
  upcomingEvents: { id: number; title: string; startsAt: string; location?: string }[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCount(raw: any): number {
  return raw?.unread_count ?? raw?.unreadCount ?? raw?.count ?? 0
}

export function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    Promise.all([
      apiClient.get('/api/wallet/balance', { signal }).then(r => r.data).catch(() => ({ balance: 0 })),
      apiClient.get('/api/gamification/profile', { signal }).then(r => r.data).catch(() => ({ totalXp: 0, level: 1, streak: 0 })),
      apiClient.get('/api/notifications/unread-count', { signal }).then(r => r.data).catch(() => ({ count: 0 })),
      apiClient.get('/api/messages/unread-count', { signal }).then(r => r.data).catch(() => ({ count: 0 })),
      apiClient.get('/api/exchanges?limit=5', { signal }).then(r => {
        const raw = r.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
        const items = raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
        return items.map((ex: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          id: ex.id,
          title: ex.listing_title ?? ex.listingTitle ?? ex.title ?? '',
          status: ex.status ?? 'pending',
          createdAt: ex.created_at ?? ex.createdAt ?? '',
        }))
      }).catch(() => []),
      apiClient.get('/api/events?upcoming_only=true&limit=3', { signal }).then(r => {
        const raw = r.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
        const items = raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
        return items.map((ev: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          id: ev.id,
          title: ev.title ?? '',
          startsAt: ev.starts_at ?? ev.startsAt ?? '',
          location: ev.location ?? undefined,
        }))
      }).catch(() => []),
    ])
      .then(([wallet, gam, notif, msgs, exchanges, events]) => {
        if (signal.aborted) return
        setData({
          wallet: wallet as DashboardData['wallet'],
          gamification: gam as DashboardData['gamification'],
          notifications: { unreadCount: extractCount(notif) },
          messages: { unreadCount: extractCount(msgs) },
          recentExchanges: exchanges as DashboardData['recentExchanges'],
          upcomingEvents: events as DashboardData['upcomingEvents'],
        })
      })
      .catch(err => { if (!signal.aborted) setError(isApiError(err) ? err.message : 'Could not load dashboard.') })
      .finally(() => { if (!signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading dashboard…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  const exchangeStatusColor: Record<string, string> = {
    requested: '#D97706', pending: '#D97706', accepted: '#059669', active: '#059669', inprogress: '#059669', in_progress: '#059669', completed: '#6B7280', cancelled: '#DC2626', declined: '#DC2626',
  }

  return (
    <div className="nexus-container">
      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-2)' }}>
        Welcome back, {user?.firstName ?? 'Member'}
      </h1>
      <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-6)' }}>
        Here is your community overview for today.
      </p>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--nexus-space-4)', marginBottom: 'var(--nexus-space-6)' }}>
        <div className="nexus-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--nexus-color-primary)' }}>{data?.wallet.balance ?? 0}</div>
          <div style={{ fontSize: 13, color: 'var(--nexus-color-text-secondary)', marginTop: 4 }}>Time Credits</div>
          <Link to="/wallet" style={{ fontSize: 13, color: 'var(--nexus-color-primary)', display: 'block', marginTop: 8 }}>Wallet</Link>
        </div>
        <div className="nexus-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 900 }}>Lv {data?.gamification.level ?? 1}</div>
          <div style={{ fontSize: 13, color: 'var(--nexus-color-text-secondary)', marginTop: 4 }}>{data?.gamification.totalXp ?? 0} XP</div>
          <Link to="/gamification" style={{ fontSize: 13, color: 'var(--nexus-color-primary)', display: 'block', marginTop: 8 }}>Achievements</Link>
        </div>
        <div className="nexus-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 900 }}>{data?.gamification.streak ?? 0}</div>
          <div style={{ fontSize: 13, color: 'var(--nexus-color-text-secondary)', marginTop: 4 }}>Day streak</div>
          {data?.gamification.rank && (
            <div style={{ fontSize: 12, color: 'var(--nexus-color-text-secondary)', marginTop: 4 }}>Rank #{data.gamification.rank}</div>
          )}
        </div>
        <div className="nexus-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 900 }}>{(data?.notifications.unreadCount ?? 0) + (data?.messages.unreadCount ?? 0)}</div>
          <div style={{ fontSize: 13, color: 'var(--nexus-color-text-secondary)', marginTop: 4 }}>Unread</div>
          <Link to="/messages" style={{ fontSize: 13, color: 'var(--nexus-color-primary)', display: 'block', marginTop: 8 }}>Messages</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--nexus-space-5)' }}>
        {/* Recent exchanges */}
        <section aria-labelledby="exchanges-heading">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--nexus-space-3)' }}>
            <h2 id="exchanges-heading" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Active Exchanges</h2>
            <Link to="/exchanges" style={{ fontSize: 14, color: 'var(--nexus-color-primary)' }}>View all</Link>
          </div>
          {!data?.recentExchanges.length ? (
            <div className="nexus-card" style={{ color: 'var(--nexus-color-text-secondary)', fontSize: 14, textAlign: 'center', padding: 'var(--nexus-space-5)' }}>
              No active exchanges. <Link to="/services">Browse services</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-2)' }}>
              {data.recentExchanges.map(ex => (
                <Link key={ex.id} to={`/exchanges/${ex.id}`} style={{ textDecoration: 'none' }}>
                  <div className="nexus-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--nexus-space-3) var(--nexus-space-4)' }}>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{ex.title}</span>
                    <span className="nexus-badge" style={{ background: exchangeStatusColor[ex.status] ?? '#6B7280', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>{ex.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming events */}
        <section aria-labelledby="events-heading">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--nexus-space-3)' }}>
            <h2 id="events-heading" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Upcoming Events</h2>
            <Link to="/events" style={{ fontSize: 14, color: 'var(--nexus-color-primary)' }}>View all</Link>
          </div>
          {!data?.upcomingEvents.length ? (
            <div className="nexus-card" style={{ color: 'var(--nexus-color-text-secondary)', fontSize: 14, textAlign: 'center', padding: 'var(--nexus-space-5)' }}>
              No upcoming events. <Link to="/events">Browse events</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-2)' }}>
              {data.upcomingEvents.map(ev => (
                <Link key={ev.id} to={`/events/${ev.id}`} style={{ textDecoration: 'none' }}>
                  <div className="nexus-card" style={{ padding: 'var(--nexus-space-3) var(--nexus-space-4)' }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{ev.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--nexus-color-text-secondary)', marginTop: 4 }}>
                      {new Date(ev.startsAt).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })}
                      {ev.location && ` · ${ev.location}`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: 'var(--nexus-space-6)', padding: 'var(--nexus-space-5)', background: 'var(--nexus-color-surface)', borderRadius: 8, border: '1px solid var(--nexus-color-border)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 var(--nexus-space-4)' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 'var(--nexus-space-3)', flexWrap: 'wrap' }}>
          <Link to="/services" className="nexus-btn nexus-btn--primary nexus-btn--sm">Browse services</Link>
          <Link to="/services/submit" className="nexus-btn nexus-btn--secondary nexus-btn--sm">Offer a service</Link>
          <Link to="/feed" className="nexus-btn nexus-btn--secondary nexus-btn--sm">Community feed</Link>
          <Link to="/wallet/transfer" className="nexus-btn nexus-btn--secondary nexus-btn--sm">Send credits</Link>
        </div>
      </div>
    </div>
  )
}
