// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import apiClient from '../api/client'
import { fullName } from '../api/normalize'
import { isApiError } from '../context/AuthContext'

interface Connection { id: number; userId: number; name: string; role: string; createdAt: string }
interface PendingRequest { id: number; senderId: number; senderName: string; createdAt: string }

type Tab = 'connections' | 'pending'

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapConnection(raw: any): Connection {
  const other = raw.other_user ?? raw.otherUser ?? raw.connectedUser ?? {}
  return { id: raw.id, userId: other.id ?? raw.userId ?? 0, name: fullName(other), role: other.role ?? 'member', createdAt: raw.created_at ?? raw.createdAt ?? '' }
}
function mapPending(raw: any): PendingRequest {
  const sender = raw.from_user ?? raw.fromUser ?? raw.sender ?? {}
  return { id: raw.id, senderId: sender.id ?? raw.senderId ?? 0, senderName: fullName(sender), createdAt: raw.created_at ?? raw.createdAt ?? '' }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function ConnectionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('connections')
  const [connections, setConnections] = useState<Connection[]>([])
  const [pending, setPending] = useState<PendingRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [actionIsError, setActionIsError] = useState(false)
  const inviteSent = useRef(false)

  // Auto-send connection request if ?invite=<userId> is present
  const inviteUserId = searchParams.get('invite')
  useEffect(() => {
    if (inviteUserId && !inviteSent.current) {
      inviteSent.current = true
      apiClient.post('/api/connections', { user_id: Number(inviteUserId) })
        .then(() => { setActionIsError(false); setActionMsg('Connection request sent.'); setSearchParams({}) })
        .catch(err => { setActionIsError(true); setActionMsg(isApiError(err) ? err.message : 'Could not send connection request.') })
    }
  }, [inviteUserId])

  useEffect(() => {
    Promise.all([
      apiClient.get('/api/connections').then(r => {
        const raw = r.data as any
        const items = raw?.connections ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        return items.map(mapConnection)
      }),
      apiClient.get('/api/connections/pending').then(r => {
        const raw = r.data as any
        const incoming = raw?.incoming ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        return incoming.map(mapPending)
      }).catch(() => [] as PendingRequest[]),
    ])
      .then(([c, p]) => { setConnections(c); setPending(p) })
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load connections.'))
      .finally(() => setIsLoading(false))
  }, [])

  const acceptRequest = async (id: number) => {
    try {
      const res = await apiClient.put(`/api/connections/${id}/accept`)
      setActionIsError(false)
      setActionMsg('Connection accepted.')
      const accepted = pending.find(r => r.id === id)
      setPending(p => p.filter(r => r.id !== id))
      if (accepted) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = res.data as any
        const newConn: Connection = raw?.id
          ? mapConnection(raw)
          : { id, userId: accepted.senderId, name: accepted.senderName, role: 'member', createdAt: new Date().toISOString() }
        setConnections(c => [...c, newConn])
      }
    } catch (err) {
      setActionIsError(true)
      setActionMsg(isApiError(err) ? err.message : 'Action failed.')
    }
  }

  const declineRequest = async (id: number) => {
    try {
      await apiClient.put(`/api/connections/${id}/decline`)
      setActionIsError(false)
      setActionMsg('Request declined.')
      setPending(p => p.filter(r => r.id !== id))
    } catch (err) {
      setActionIsError(true)
      setActionMsg(isApiError(err) ? err.message : 'Action failed.')
    }
  }

  const removeConnection = async (id: number) => {
    if (!confirm('Remove this connection?')) return
    try {
      await apiClient.delete(`/api/connections/${id}`)
      setActionIsError(false)
      setActionMsg('Connection removed.')
      setConnections(c => c.filter(conn => conn.id !== id))
    } catch (err) {
      setActionIsError(true)
      setActionMsg(isApiError(err) ? err.message : 'Action failed.')
    }
  }

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading connections…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Connections</li>
        </ol>
      </nav>
      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>Connections</h1>

      {actionMsg && <div className={`nexus-notification nexus-notification--${actionIsError ? 'error' : 'success'}`} role={actionIsError ? 'alert' : 'status'} style={{ marginBottom: 'var(--nexus-space-4)' }}>{actionMsg}</div>}

      {/* Tabs */}
      <div role="tablist" style={{ display: 'flex', gap: 0, marginBottom: 'var(--nexus-space-5)', borderBottom: '2px solid var(--nexus-color-border)' }}>
        {(['connections', 'pending'] as Tab[]).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={{ padding: '10px 20px', border: 'none', background: 'none', fontWeight: tab === t ? 700 : 400, borderBottom: tab === t ? '3px solid var(--nexus-color-primary)' : '3px solid transparent', marginBottom: -2, cursor: 'pointer', color: tab === t ? 'var(--nexus-color-primary)' : 'var(--nexus-color-text)', fontSize: 16 }}
          >
            {t === 'connections' ? `My connections (${connections.length})` : `Pending (${pending.length})`}
          </button>
        ))}
      </div>

      {tab === 'connections' && (
        connections.length === 0 ? (
          <div className="nexus-card" style={{ textAlign: 'center', padding: 'var(--nexus-space-7)', color: 'var(--nexus-color-text-secondary)' }}>
            No connections yet. <Link to="/members">Browse members</Link> to connect with your community.
          </div>
        ) : (
          <div className="nexus-cards">
            {connections.map(conn => (
              <div key={conn.id} className="nexus-card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--nexus-space-4)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--nexus-color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }} aria-hidden="true">
                  {conn.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <Link to={`/members/${conn.userId}`} style={{ fontWeight: 700, fontSize: 16 }}>{conn.name}</Link>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>{conn.role}</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--nexus-space-2)' }}>
                  <Link to={`/messages?user=${conn.userId}`} className="nexus-btn nexus-btn--secondary nexus-btn--sm">Message</Link>
                  <button className="nexus-btn nexus-btn--secondary nexus-btn--sm" onClick={() => removeConnection(conn.id)} style={{ color: 'var(--nexus-color-warning)' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'pending' && (
        pending.length === 0 ? (
          <div className="nexus-card" style={{ textAlign: 'center', padding: 'var(--nexus-space-7)', color: 'var(--nexus-color-text-secondary)' }}>
            No pending connection requests.
          </div>
        ) : (
          <div className="nexus-cards">
            {pending.map(req => (
              <div key={req.id} className="nexus-card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--nexus-space-4)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--nexus-color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }} aria-hidden="true">
                  {req.senderName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{req.senderName}</span>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>
                    Sent {new Date(req.createdAt).toLocaleDateString('en-IE')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--nexus-space-2)' }}>
                  <button className="nexus-btn nexus-btn--primary nexus-btn--sm" onClick={() => acceptRequest(req.id)}>Accept</button>
                  <button className="nexus-btn nexus-btn--secondary nexus-btn--sm" onClick={() => declineRequest(req.id)}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
