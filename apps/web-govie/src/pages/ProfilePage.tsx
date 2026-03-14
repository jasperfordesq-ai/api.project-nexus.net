// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import type { UserProfile, WalletBalance } from '../api/types'
import { isApiError, useAuth } from '../context/AuthContext'

export function ProfilePage() {
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    Promise.all([
      apiClient.get('/api/users/me').then((r) => {
        const raw = r.data as any
        return {
          id: raw.id,
          email: raw.email ?? '',
          firstName: raw.first_name ?? raw.firstName ?? '',
          lastName: raw.last_name ?? raw.lastName ?? '',
          role: raw.role ?? 'member',
          tenantId: raw.tenant_id ?? raw.tenantId ?? 0,
          createdAt: raw.created_at ?? raw.createdAt ?? '',
          bio: raw.bio ?? undefined,
          location: raw.location ?? undefined,
          skills: raw.skills ?? undefined,
          totalExchanges: raw.total_exchanges ?? raw.totalExchanges ?? undefined,
        } as UserProfile
      }),
      apiClient.get('/api/wallet/balance').then((r) => r.data as WalletBalance).catch(() => ({ balance: 0 }) as WalletBalance),
    ])
    /* eslint-enable @typescript-eslint/no-explicit-any */
      .then(([p, b]) => { setProfile(p); setBalance(b) })
      .catch((err) => {
        if (isApiError(err)) setError(err.message)
        else setError('Could not load profile.')
      })
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading profile…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : user ? `${user.firstName} ${user.lastName}` : 'Member'

  return (
    <div className="nexus-container">
      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>My profile</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--nexus-space-5)' }}>
        <section aria-labelledby="profile-name" style={{ background: 'var(--nexus-color-surface)', border: '1px solid var(--nexus-color-border)', borderRadius: 8, padding: 'var(--nexus-space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--nexus-space-4)', marginBottom: 'var(--nexus-space-4)' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--nexus-color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, flexShrink: 0 }} aria-hidden="true">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 id="profile-name" style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{displayName}</h2>
              <p style={{ margin: 0, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>{profile?.role ?? user?.role ?? 'member'}</p>
            </div>
          </div>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--nexus-space-2) var(--nexus-space-4)' }}>
            <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Email</dt>
            <dd style={{ margin: 0 }}>{profile?.email ?? user?.email}</dd>
            {profile?.location && <><dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Location</dt><dd style={{ margin: 0 }}>{profile.location}</dd></>}
            {profile?.bio && <><dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>About</dt><dd style={{ margin: 0 }}>{profile.bio}</dd></>}
            <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Member since</dt>
            <dd style={{ margin: 0 }}>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IE', { year: 'numeric', month: 'long' }) : '—'}</dd>
          </dl>
        </section>
        {balance && (
          <section aria-labelledby="wallet-heading" style={{ background: 'var(--nexus-color-primary)', borderRadius: 8, padding: 'var(--nexus-space-5)', color: 'white' }}>
            <h2 id="wallet-heading" style={{ margin: '0 0 var(--nexus-space-3)', fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Time credit balance</h2>
            <p style={{ margin: '0 0 var(--nexus-space-4)', fontSize: 52, fontWeight: 900, lineHeight: 1 }}>
              {balance.balance}<span style={{ fontSize: 18, fontWeight: 400, marginLeft: 8 }}>credits</span>
            </p>
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>1 credit = 1 hour of community exchange</p>
          </section>
        )}
        <section aria-labelledby="actions-heading" style={{ border: '1px solid var(--nexus-color-border)', borderRadius: 8, padding: 'var(--nexus-space-5)' }}>
          <h2 id="actions-heading" style={{ margin: '0 0 var(--nexus-space-4)', fontSize: 18 }}>Quick actions</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-3)' }}>
            {[{ to: '/services/submit', label: 'Post a new service', icon: '➕' }, { to: '/services', label: 'Browse services', icon: '🔍' }, { to: '/profile/edit', label: 'Edit profile', icon: '✏️' }].map((a) => (
              <li key={a.to}>
                <Link to={a.to} style={{ display: 'flex', alignItems: 'center', gap: 'var(--nexus-space-3)', padding: 'var(--nexus-space-3)', borderRadius: 4, textDecoration: 'none', color: 'var(--nexus-color-text)', border: '1px solid var(--nexus-color-border)' }}>
                  <span aria-hidden="true" style={{ fontSize: 20 }}>{a.icon}</span>
                  <span>{a.label}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--nexus-color-text-secondary)' }}>›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div style={{ marginTop: 'var(--nexus-space-6)', paddingTop: 'var(--nexus-space-4)', borderTop: '1px solid var(--nexus-color-border)' }}>
        <button className="nexus-btn nexus-btn--secondary" onClick={logout} style={{ color: 'var(--nexus-color-warning)', borderColor: 'var(--nexus-color-warning)' }}>Sign out</button>
      </div>
    </div>
  )
}
