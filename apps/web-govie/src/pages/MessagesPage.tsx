// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { fullName } from '../api/normalize'
import { isApiError } from '../context/AuthContext'

interface Conversation {
  id: number
  otherUserName: string
  otherUserId: number
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

/** Map backend conversation shape to frontend Conversation */
function mapConversation(raw: Record<string, unknown>): Conversation {
  const participant = raw.participant as { id?: number; first_name?: string; last_name?: string } | null
  const lastMsg = raw.last_message as { content?: string; created_at?: string } | null
  return {
    id: raw.id as number,
    otherUserId: participant?.id ?? 0,
    otherUserName: fullName(participant),
    lastMessage: lastMsg?.content ?? '',
    lastMessageAt: (lastMsg?.created_at ?? raw.created_at ?? '') as string,
    unreadCount: (raw.unread_count ?? 0) as number,
  }
}

export function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get('/api/messages')
      .then(r => {
        const raw = r.data as { data?: unknown[] } | unknown[]
        const items = Array.isArray(raw) ? raw : (raw?.data ?? [])
        setConversations((items as Record<string, unknown>[]).map(mapConversation))
      })
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load messages.'))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading messages…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Messages</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>Messages</h1>

      {conversations.length === 0 ? (
        <div className="nexus-card" style={{ textAlign: 'center', padding: 'var(--nexus-space-7)', color: 'var(--nexus-color-text-secondary)' }}>
          <p style={{ fontSize: 18, marginBottom: 'var(--nexus-space-3)' }}>No conversations yet</p>
          <p>Connect with members and start exchanging services to begin messaging.</p>
          <Link to="/members" className="nexus-btn nexus-btn--primary" style={{ marginTop: 'var(--nexus-space-4)', display: 'inline-block' }}>Browse members</Link>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-2)' }} role="list" aria-label="Conversations">
          {conversations.map(conv => (
            <li key={conv.id}>
              <Link
                to={`/messages/${conv.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--nexus-space-4)', padding: 'var(--nexus-space-4)', background: 'var(--nexus-color-surface)', border: '1px solid var(--nexus-color-border)', borderRadius: 8, textDecoration: 'none', color: 'var(--nexus-color-text)', transition: 'border-color 0.15s' }}
              >
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--nexus-color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }} aria-hidden="true">
                  {conv.otherUserName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: conv.unreadCount > 0 ? 700 : 500, fontSize: 16 }}>{conv.otherUserName}</span>
                    <span style={{ fontSize: 12, color: 'var(--nexus-color-text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(conv.lastMessageAt).toLocaleDateString('en-IE')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--nexus-color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                      {conv.lastMessage}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="nexus-badge nexus-badge--primary" style={{ borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 700, background: 'var(--nexus-color-primary)', color: 'white' }} aria-label={`${conv.unreadCount} unread`}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
