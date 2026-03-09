// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface Preferences { theme: string; language: string; timezone: string; emailNotifications: boolean; pushNotifications: boolean }
interface Session { id: string; device: string; ip: string; lastActiveAt: string; isCurrent: boolean }

type SettingsTab = 'account' | 'notifications' | 'privacy' | 'sessions'

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('account')
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      apiClient.get<Preferences>('/api/preferences').then(r => r.data),
      apiClient.get<Session[]>('/api/sessions').then(r => r.data ?? []),
    ])
      .then(([p, s]) => { setPrefs(p); setSessions(s) })
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load settings.'))
      .finally(() => setIsLoading(false))
  }, [])

  const savePrefs = async () => {
    if (!prefs) return
    try {
      await apiClient.put('/api/preferences', prefs)
      setSaveMsg('Settings saved.')
      setTimeout(() => setSaveMsg(null), 3000)
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to save settings.')
    }
  }

  const revokeSession = async (sessionId: string) => {
    try {
      await apiClient.delete(`/api/sessions/${sessionId}`)
      setSessions(s => s.filter(x => x.id !== sessionId))
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to revoke session.')
    }
  }

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading settings..." /></div>

  const TABS: { key: SettingsTab; label: string }[] = [
    { key: 'account', label: 'Account' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'privacy', label: 'Privacy' },
    { key: 'sessions', label: 'Sessions' },
  ]

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Settings</li>
        </ol>
      </nav>
      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>Settings</h1>
      {error && <div className="nexus-notification nexus-notification--error" role="alert" style={{ marginBottom: 'var(--nexus-space-4)' }}>{error}</div>}
      {saveMsg && <div className="nexus-notification nexus-notification--success" role="status" style={{ marginBottom: 'var(--nexus-space-4)' }}>{saveMsg}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 'var(--nexus-space-6)' }}>
        <nav aria-label="Settings tabs">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {TABS.map(t => (
              <li key={t.key}>
                <button onClick={() => setTab(t.key)} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', borderRadius: 6, background: tab === t.key ? 'var(--nexus-color-primary)' : 'none', color: tab === t.key ? 'white' : 'var(--nexus-color-text)', fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer', fontSize: 15 }}>
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          {tab === 'account' && prefs && (
            <section className="nexus-card">
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Account preferences</h2>
              <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
                <label htmlFor="pref-theme" className="nexus-label">Theme</label>
                <select id="pref-theme" className="nexus-select" value={prefs.theme} onChange={e => setPrefs({ ...prefs, theme: e.target.value })}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
                <label htmlFor="pref-lang" className="nexus-label">Language</label>
                <select id="pref-lang" className="nexus-select" value={prefs.language} onChange={e => setPrefs({ ...prefs, language: e.target.value })}>
                  <option value="en">English</option>
                  <option value="ga">Gaeilge</option>
                  <option value="fr">Francais</option>
                  <option value="es">Espanol</option>
                  <option value="de">Deutsch</option>
                  <option value="pl">Polski</option>
                  <option value="pt">Portugues</option>
                </select>
              </div>
              <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-5)' }}>
                <label htmlFor="pref-tz" className="nexus-label">Timezone</label>
                <input id="pref-tz" type="text" className="nexus-input" value={prefs.timezone} onChange={e => setPrefs({ ...prefs, timezone: e.target.value })} placeholder="e.g. Europe/Dublin" />
              </div>
              <button className="nexus-btn nexus-btn--primary" onClick={savePrefs}>Save changes</button>
            </section>
          )}
          {tab === 'notifications' && prefs && (
            <section className="nexus-card">
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Notification preferences</h2>
              <label style={{ display: 'flex', gap: 'var(--nexus-space-3)', alignItems: 'flex-start', marginBottom: 'var(--nexus-space-4)', cursor: 'pointer' }}>
                <input type="checkbox" checked={prefs.emailNotifications} onChange={e => setPrefs({ ...prefs, emailNotifications: e.target.checked })} style={{ marginTop: 3 }} />
                <div><span style={{ fontWeight: 600 }}>Email notifications</span><p style={{ margin: 0, fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>Receive notifications by email</p></div>
              </label>
              <label style={{ display: 'flex', gap: 'var(--nexus-space-3)', alignItems: 'flex-start', marginBottom: 'var(--nexus-space-4)', cursor: 'pointer' }}>
                <input type="checkbox" checked={prefs.pushNotifications} onChange={e => setPrefs({ ...prefs, pushNotifications: e.target.checked })} style={{ marginTop: 3 }} />
                <div><span style={{ fontWeight: 600 }}>Push notifications</span><p style={{ margin: 0, fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>Receive browser push notifications</p></div>
              </label>
              <button className="nexus-btn nexus-btn--primary" onClick={savePrefs}>Save changes</button>
            </section>
          )}
          {tab === 'privacy' && (
            <section className="nexus-card">
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Privacy</h2>
              <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-4)' }}>Manage your privacy settings and data.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-3)' }}>
                <Link to="/legal/privacy" style={{ color: 'var(--nexus-color-primary)' }}>View Privacy Policy</Link>
                <Link to="/legal/cookies" style={{ color: 'var(--nexus-color-primary)' }}>Cookie preferences</Link>
              </div>
            </section>
          )}
          {tab === 'sessions' && (
            <section className="nexus-card">
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Active sessions</h2>
              {sessions.length === 0 ? (
                <p style={{ color: 'var(--nexus-color-text-secondary)' }}>No active sessions found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-3)' }}>
                  {sessions.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--nexus-space-3)', background: 'var(--nexus-color-surface)', borderRadius: 6, border: '1px solid var(--nexus-color-border)' }}>
                      <div>
                        <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 14 }}>{s.device}</p>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--nexus-color-text-secondary)' }}>{s.ip}</p>
                      </div>
                      {!s.isCurrent && <button className="nexus-btn nexus-btn--secondary nexus-btn--sm" onClick={() => revokeSession(s.id)}>Revoke</button>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
