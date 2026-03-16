// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface Preferences { theme: string; language: string; timezone: string; emailNotifications: boolean; pushNotifications: boolean }
interface Session { id: string; device: string; ip: string; lastActiveAt: string; isCurrent: boolean }
interface TwoFaStatus { enabled: boolean }
interface TwoFaSetup { qrCodeUri: string; manualEntryKey: string }
interface Passkey { id: string; name: string; createdAt: string }

type SettingsTab = 'account' | 'security' | 'notifications' | 'privacy' | 'sessions'

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('account')
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Security state
  const [twoFaStatus, setTwoFaStatus] = useState<TwoFaStatus | null>(null)
  const [twoFaSetup, setTwoFaSetup] = useState<TwoFaSetup | null>(null)
  const [twoFaCode, setTwoFaCode] = useState('')
  const [twoFaLoading, setTwoFaLoading] = useState(false)

  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [editingPasskeyId, setEditingPasskeyId] = useState<string | null>(null)
  const [editPasskeyName, setEditPasskeyName] = useState('')

  // Change password - no dedicated endpoint exists; users must use "Forgot Password"

  const showSuccess = useCallback((msg: string) => {
    setSaveMsg(msg)
    setTimeout(() => setSaveMsg(null), 4000)
  }, [])

  const showError = useCallback((err: unknown, fallback: string) => {
    setError(isApiError(err) ? err.message : fallback)
  }, [])

  useEffect(() => {
    Promise.all([
      apiClient.get('/api/preferences').then(r => {
        const raw = r.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
        return {
          theme: raw.theme ?? raw.display?.theme ?? 'light',
          language: raw.language ?? raw.display?.language ?? 'en',
          timezone: raw.timezone ?? raw.display?.timezone ?? 'Europe/Dublin',
          emailNotifications: raw.email_notifications ?? raw.emailNotifications ?? true,
          pushNotifications: raw.push_notifications ?? raw.pushNotifications ?? false,
        } as Preferences
      }),
      apiClient.get('/api/sessions').then(r => {
        const raw = r.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
        const items = raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        return items.map((s: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          id: s.id,
          device: s.device ?? s.user_agent ?? 'Unknown device',
          ip: s.ip ?? s.ip_address ?? '',
          lastActiveAt: s.last_active_at ?? s.lastActiveAt ?? '',
          isCurrent: s.is_current ?? s.isCurrent ?? false,
        })) as Session[]
      }).catch(() => [] as Session[]),
      apiClient.get('/api/auth/2fa/status').then(r => {
        const raw = r.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
        return { enabled: raw.enabled ?? raw.is_enabled ?? false } as TwoFaStatus
      }).catch(() => ({ enabled: false }) as TwoFaStatus),
      apiClient.get('/api/passkeys').then(r => {
        const raw = r.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
        const items = raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        return items.map((p: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          id: String(p.id),
          name: p.name ?? p.displayName ?? 'Unnamed passkey',
          createdAt: p.created_at ?? p.createdAt ?? '',
        })) as Passkey[]
      }).catch(() => [] as Passkey[]),
    ])
      .then(([p, s, tfa, pk]) => {
        setPrefs(p)
        setSessions(s)
        setTwoFaStatus(tfa)
        setPasskeys(pk)
      })
      .catch(err => showError(err, 'Could not load settings.'))
      .finally(() => setIsLoading(false))
  }, [showError])

  const savePrefs = async () => {
    if (!prefs) return
    try {
      await Promise.all([
        apiClient.put('/api/preferences/display', {
          theme: prefs.theme,
          language: prefs.language,
          timezone: prefs.timezone,
        }),
        apiClient.put('/api/preferences/notifications-global', {
          email_notifications: prefs.emailNotifications,
          push_notifications: prefs.pushNotifications,
        }),
      ])
      showSuccess('Settings saved.')
    } catch (err) {
      showError(err, 'Failed to save settings.')
    }
  }

  const revokeSession = async (sessionId: string) => {
    try {
      await apiClient.delete(`/api/sessions/${sessionId}`)
      setSessions(s => s.filter(x => x.id !== sessionId))
    } catch (err) {
      showError(err, 'Failed to revoke session.')
    }
  }

  // ── 2FA ──
  const startTwoFaSetup = async () => {
    setTwoFaLoading(true)
    setError(null)
    try {
      const r = await apiClient.post('/api/auth/2fa/setup')
      const raw = r.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
      setTwoFaSetup({
        qrCodeUri: raw.qr_code_uri ?? raw.qrCodeUri ?? raw.qrCode ?? '',
        manualEntryKey: raw.manual_entry_key ?? raw.manualEntryKey ?? raw.secret ?? '',
      })
    } catch (err) {
      showError(err, 'Failed to start 2FA setup.')
    } finally {
      setTwoFaLoading(false)
    }
  }

  const verifyTwoFaSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!twoFaCode.trim()) {
      setError('Enter the 6-digit code from your authenticator app.')
      return
    }
    setTwoFaLoading(true)
    setError(null)
    try {
      await apiClient.post('/api/auth/2fa/verify-setup', { code: twoFaCode.trim() })
      setTwoFaStatus({ enabled: true })
      setTwoFaSetup(null)
      setTwoFaCode('')
      showSuccess('Two-factor authentication enabled.')
    } catch (err) {
      showError(err, 'Invalid code. Please try again.')
    } finally {
      setTwoFaLoading(false)
    }
  }

  const disableTwoFa = async () => {
    if (!window.confirm('Are you sure you want to disable two-factor authentication?')) return
    setTwoFaLoading(true)
    setError(null)
    try {
      await apiClient.post('/api/auth/2fa/disable')
      setTwoFaStatus({ enabled: false })
      setTwoFaSetup(null)
      showSuccess('Two-factor authentication disabled.')
    } catch (err) {
      showError(err, 'Failed to disable 2FA.')
    } finally {
      setTwoFaLoading(false)
    }
  }

  // ── Passkeys ──
  const renamePasskey = async (id: string) => {
    if (!editPasskeyName.trim()) return
    try {
      await apiClient.put(`/api/passkeys/${id}`, { name: editPasskeyName.trim() })
      setPasskeys(pk => pk.map(p => p.id === id ? { ...p, name: editPasskeyName.trim() } : p))
      setEditingPasskeyId(null)
      setEditPasskeyName('')
      showSuccess('Passkey renamed.')
    } catch (err) {
      showError(err, 'Failed to rename passkey.')
    }
  }

  const deletePasskey = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this passkey?')) return
    try {
      await apiClient.delete(`/api/passkeys/${id}`)
      setPasskeys(pk => pk.filter(p => p.id !== id))
      showSuccess('Passkey deleted.')
    } catch (err) {
      showError(err, 'Failed to delete passkey.')
    }
  }

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading settings..." /></div>

  const TABS: { key: SettingsTab; label: string }[] = [
    { key: 'account', label: 'Account' },
    { key: 'security', label: 'Security' },
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--nexus-space-6)' }}>
        <nav aria-label="Settings tabs" style={{ flexShrink: 0, width: '100%', maxWidth: 180 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {TABS.map(t => (
              <li key={t.key}>
                <button onClick={() => { setTab(t.key); setError(null) }} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', borderRadius: 6, background: tab === t.key ? 'var(--nexus-color-primary)' : 'none', color: tab === t.key ? 'white' : 'var(--nexus-color-text)', fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer', fontSize: 15 }}>
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          {/* ── Account Tab ── */}
          {tab === 'account' && prefs && (
            <section className="nexus-card">
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Profile preferences</h2>
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
              <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
                <label htmlFor="pref-tz" className="nexus-label">Timezone</label>
                <input id="pref-tz" type="text" className="nexus-input" value={prefs.timezone} onChange={e => setPrefs({ ...prefs, timezone: e.target.value })} placeholder="e.g. Europe/Dublin" />
              </div>
              <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-5)' }}>
                <label style={{ display: 'flex', gap: 'var(--nexus-space-3)', alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={prefs.emailNotifications} onChange={e => setPrefs({ ...prefs, emailNotifications: e.target.checked })} style={{ marginTop: 3 }} />
                  <div><span style={{ fontWeight: 600 }}>Email notifications</span><p style={{ margin: 0, fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>Receive notifications by email</p></div>
                </label>
              </div>
              <button className="nexus-btn nexus-btn--primary" onClick={savePrefs}>Save changes</button>
            </section>
          )}

          {/* ── Security Tab ── */}
          {tab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-5)' }}>
              {/* Change Password */}
              <section className="nexus-card">
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Change password</h2>
                <p style={{ margin: '0 0 var(--nexus-space-4)', fontSize: 14, color: 'var(--nexus-color-text-secondary)' }}>
                  To change your password, use the &quot;Forgot Password&quot; flow. We will send a secure reset link to your email.
                </p>
                <Link to="/forgot-password" className="nexus-btn nexus-btn--primary">
                  Reset password via email
                </Link>
              </section>

              {/* Two-Factor Authentication */}
              <section className="nexus-card">
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Two-factor authentication (2FA)</h2>
                <p style={{ margin: '0 0 var(--nexus-space-4)', fontSize: 14, color: 'var(--nexus-color-text-secondary)' }}>
                  Add an extra layer of security to your account using a time-based one-time password (TOTP) authenticator app.
                </p>

                {twoFaStatus?.enabled ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--nexus-space-3)', marginBottom: 'var(--nexus-space-4)' }}>
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--nexus-color-success)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--nexus-color-success)' }}>Enabled</span>
                    </div>
                    <button
                      className="nexus-btn nexus-btn--secondary nexus-btn--sm"
                      onClick={disableTwoFa}
                      disabled={twoFaLoading}
                    >
                      {twoFaLoading ? 'Disabling...' : 'Disable 2FA'}
                    </button>
                  </div>
                ) : twoFaSetup ? (
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: 'var(--nexus-space-3)' }}>
                      Scan this QR code with your authenticator app:
                    </p>
                    {twoFaSetup.qrCodeUri && (
                      <div style={{ marginBottom: 'var(--nexus-space-4)' }}>
                        <img
                          src={twoFaSetup.qrCodeUri}
                          alt="2FA QR Code"
                          style={{ maxWidth: 200, border: '1px solid var(--nexus-color-border)', borderRadius: 6, padding: 8, background: 'white' }}
                        />
                      </div>
                    )}
                    {twoFaSetup.manualEntryKey && (
                      <div style={{ marginBottom: 'var(--nexus-space-4)' }}>
                        <p style={{ fontSize: 14, color: 'var(--nexus-color-text-secondary)', margin: '0 0 var(--nexus-space-2)' }}>
                          Or enter this key manually:
                        </p>
                        <code style={{ display: 'inline-block', padding: '8px 12px', background: 'var(--nexus-color-surface)', border: '1px solid var(--nexus-color-border)', borderRadius: 4, fontFamily: 'monospace', fontSize: 14, letterSpacing: 1 }}>
                          {twoFaSetup.manualEntryKey}
                        </code>
                      </div>
                    )}
                    <form onSubmit={verifyTwoFaSetup} style={{ display: 'flex', gap: 'var(--nexus-space-3)', alignItems: 'flex-end' }}>
                      <div className="nexus-form-group">
                        <label htmlFor="totp-code" className="nexus-label">Verification code</label>
                        <input
                          id="totp-code"
                          type="text"
                          className="nexus-input"
                          value={twoFaCode}
                          onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          maxLength={6}
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          style={{ maxWidth: 160 }}
                          disabled={twoFaLoading}
                        />
                      </div>
                      <button type="submit" className="nexus-btn nexus-btn--primary nexus-btn--sm" disabled={twoFaLoading || twoFaCode.length < 6}>
                        {twoFaLoading ? 'Verifying...' : 'Verify and enable'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--nexus-space-3)', marginBottom: 'var(--nexus-space-4)' }}>
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--nexus-color-border)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)' }}>Disabled</span>
                    </div>
                    <button
                      className="nexus-btn nexus-btn--primary nexus-btn--sm"
                      onClick={startTwoFaSetup}
                      disabled={twoFaLoading}
                    >
                      {twoFaLoading ? 'Setting up...' : 'Enable 2FA'}
                    </button>
                  </div>
                )}
              </section>

              {/* Passkeys */}
              <section className="nexus-card">
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Passkeys</h2>
                <p style={{ margin: '0 0 var(--nexus-space-4)', fontSize: 14, color: 'var(--nexus-color-text-secondary)' }}>
                  Passkeys let you sign in without a password using your device's biometrics or security key.
                </p>

                {passkeys.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-3)', marginBottom: 'var(--nexus-space-4)' }}>
                    {passkeys.map(pk => (
                      <div key={pk.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--nexus-space-3)', background: 'var(--nexus-color-surface)', borderRadius: 6, border: '1px solid var(--nexus-color-border)' }}>
                        <div style={{ flex: 1 }}>
                          {editingPasskeyId === pk.id ? (
                            <div style={{ display: 'flex', gap: 'var(--nexus-space-2)', alignItems: 'center' }}>
                              <input
                                type="text"
                                className="nexus-input"
                                value={editPasskeyName}
                                onChange={e => setEditPasskeyName(e.target.value)}
                                style={{ maxWidth: 200, padding: '6px 10px', fontSize: 14 }}
                                onKeyDown={e => { if (e.key === 'Enter') renamePasskey(pk.id); if (e.key === 'Escape') setEditingPasskeyId(null) }}
                                autoFocus
                              />
                              <button className="nexus-btn nexus-btn--primary nexus-btn--sm" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => renamePasskey(pk.id)}>Save</button>
                              <button className="nexus-btn nexus-btn--secondary nexus-btn--sm" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setEditingPasskeyId(null)}>Cancel</button>
                            </div>
                          ) : (
                            <>
                              <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 14 }}>{pk.name}</p>
                              {pk.createdAt && (
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--nexus-color-text-secondary)' }}>
                                  Added {new Date(pk.createdAt).toLocaleDateString('en-IE')}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        {editingPasskeyId !== pk.id && (
                          <div style={{ display: 'flex', gap: 'var(--nexus-space-2)' }}>
                            <button
                              className="nexus-btn nexus-btn--secondary nexus-btn--sm"
                              style={{ padding: '6px 12px', fontSize: 13 }}
                              onClick={() => { setEditingPasskeyId(pk.id); setEditPasskeyName(pk.name) }}
                            >
                              Rename
                            </button>
                            <button
                              className="nexus-btn nexus-btn--secondary nexus-btn--sm"
                              style={{ padding: '6px 12px', fontSize: 13, color: 'var(--nexus-color-warning)', borderColor: 'var(--nexus-color-warning)' }}
                              onClick={() => deletePasskey(pk.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-4)', fontSize: 14 }}>
                    No passkeys registered.
                  </p>
                )}

                {/* TODO: Implement passkey registration using WebAuthn API:
                    1. POST /api/passkeys/register/begin to get PublicKeyCredentialCreationOptions
                    2. Call navigator.credentials.create() with the options
                    3. POST /api/passkeys/register/finish with the credential response */}
                <button
                  className="nexus-btn nexus-btn--secondary nexus-btn--sm"
                  disabled
                  title="Passkey registration requires HTTPS and is not yet available in this client"
                >
                  Add passkey (coming soon)
                </button>
              </section>
            </div>
          )}

          {/* ── Notifications Tab ── */}
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

          {/* ── Privacy Tab ── */}
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

          {/* ── Sessions Tab ── */}
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
