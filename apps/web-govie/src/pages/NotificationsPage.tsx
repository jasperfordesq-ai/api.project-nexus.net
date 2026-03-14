// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface Notification {
  id: number
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiClient.get('/api/notifications', { signal: controller.signal })
      .then(r => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const raw = r.data as any
        const items: any[] = raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        setNotifications(items.map((n: any) => ({
          id: n.id,
          type: n.type ?? 'system',
          title: n.title ?? '',
          message: n.body ?? n.message ?? '',
          isRead: n.is_read ?? n.isRead ?? false,
          createdAt: n.created_at ?? n.createdAt ?? '',
        })))
        /* eslint-enable @typescript-eslint/no-explicit-any */
      })
      .catch(err => { if (!controller.signal.aborted) setError(isApiError(err) ? err.message : 'Could not load notifications.') })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [])

  const markAllRead = async () => {
    try {
      await apiClient.put('/api/notifications/read-all')
      setNotifications(n => n.map(x => ({ ...x, isRead: true })))
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to mark as read.')
    }
  }

  const markRead = async (id: number) => {
    try {
      await apiClient.put(`/api/notifications/${id}/read`)
      setNotifications(n => n.map(x => x.id === id ? { ...x, isRead: true } : x))
    } catch (_) { /* mark-read failed — non-critical, already updated optimistically */ }
  }

  const typeBadgeColor = (type: string) => {
    const map: Record<string, string> = { message: '#0066cc', exchange: '#006B6B', badge: '#7c3aed', system: '#64748b' }
    return map[type] ?? '#64748b'
  }

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading notifications…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  const unread = notifications.filter(n => !n.isRead).length

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Notifications</li>
        </ol>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--nexus-space-5)', flexWrap: 'wrap', gap: 'var(--nexus-space-3)' }}>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: 0 }}>
          Notifications {unread > 0 && <span style={{ fontSize: 18, background: 'var(--nexus-color-primary)', color: 'white', borderRadius: 12, padding: '2px 10px', marginLeft: 10 }}>{unread}</span>}
        </h1>
        {unread > 0 && (
          <button className="nexus-btn nexus-btn--secondary" onClick={markAllRead}>Mark all as read</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="nexus-card" style={{ textAlign: 'center', padding: 'var(--nexus-space-7)', color: 'var(--nexus-color-text-secondary)' }}>
          You're all caught up! No notifications.
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-2)' }} role="list">
          {notifications.map(notif => (
            <li key={notif.id}>
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--nexus-space-4)',
                  padding: 'var(--nexus-space-4)',
                  background: notif.isRead ? 'var(--nexus-color-surface)' : 'white',
                  border: `1px solid ${notif.isRead ? 'var(--nexus-color-border)' : 'var(--nexus-color-primary)'}`,
                  borderLeft: notif.isRead ? '4px solid transparent' : '4px solid var(--nexus-color-primary)',
                  borderRadius: 8,
                  cursor: notif.isRead ? 'default' : 'pointer',
                }}
                onClick={() => !notif.isRead && markRead(notif.id)}
              >
                <div style={{ paddingTop: 2 }}>
                  <span
                    className="nexus-badge"
                    style={{ background: typeBadgeColor(notif.type), color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                  >
                    {notif.type}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 4px', fontWeight: notif.isRead ? 500 : 700, fontSize: 15 }}>{notif.title}</p>
                  <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--nexus-color-text-secondary)' }}>{notif.message}</p>
                  <time style={{ fontSize: 12, color: 'var(--nexus-color-text-secondary)' }} dateTime={notif.createdAt}>
                    {new Date(notif.createdAt).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })}
                  </time>
                </div>
                {!notif.isRead && (
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--nexus-color-primary)', flexShrink: 0, marginTop: 6 }} aria-hidden="true" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
