// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface Group { id: number; name: string; description: string; memberCount: number; isPublic: boolean; createdAt: string; isMember: boolean }
interface Member { id: number; userId: number; name: string; role: string; joinedAt: string }

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapGroup(raw: any): Group {
  return {
    id: raw.id,
    name: raw.name ?? '',
    description: raw.description ?? '',
    memberCount: raw.member_count ?? raw.memberCount ?? 0,
    isPublic: !(raw.is_private ?? raw.isPrivate ?? false),
    createdAt: raw.created_at ?? raw.createdAt ?? '',
    isMember: raw.is_member ?? raw.isMember ?? false,
  }
}

function mapMember(raw: any): Member {
  const user = raw.user ?? {}
  return {
    id: raw.id ?? 0,
    userId: user.id ?? raw.user_id ?? raw.userId ?? raw.id ?? 0,
    name: raw.first_name
      ? `${raw.first_name} ${raw.last_name || ''}`.trim()
      : (user.first_name
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : (raw.name ?? raw.userName ?? raw.user_name ?? 'Unknown')),
    role: raw.role ?? 'member',
    joinedAt: raw.joined_at ?? raw.joinedAt ?? raw.created_at ?? raw.createdAt ?? '',
  }
}

function extractItems(raw: any): any[] {
  return raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [actionIsError, setActionIsError] = useState(false)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    Promise.all([
      apiClient.get(`/api/groups/${id}`).then(r => {
        const data = r.data.group ?? r.data
        const isMember = r.data.my_membership !== null && r.data.my_membership !== undefined
        const group = mapGroup(data)
        return { ...group, isMember: isMember || group.isMember }
      }),
      apiClient.get(`/api/groups/${id}/members`).then(r => extractItems(r.data).map(mapMember)).catch(() => [] as Member[]),
    ])
      .then(([g, m]) => { setGroup(g); setMembers(m) })
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load group.'))
      .finally(() => setIsLoading(false))
  }, [id])

  const toggleMembership = async () => {
    if (!group) return
    setJoining(true)
    try {
      if (group.isMember) {
        await apiClient.delete(`/api/groups/${id}/leave`)
        setGroup(g => g ? { ...g, isMember: false, memberCount: g.memberCount - 1 } : g)
        setActionIsError(false)
        setActionMsg('You have left the group.')
      } else {
        await apiClient.post(`/api/groups/${id}/join`)
        setGroup(g => g ? { ...g, isMember: true, memberCount: g.memberCount + 1 } : g)
        setActionIsError(false)
        setActionMsg('You have joined the group.')
      }
    } catch (err) {
      setActionIsError(true)
      setActionMsg(isApiError(err) ? err.message : 'Action failed.')
    } finally {
      setJoining(false)
    }
  }

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading group…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>
  if (!group) return null

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/groups">Groups</Link></li>
          <li aria-current="page">{group.name}</li>
        </ol>
      </nav>

      {actionMsg && <div className={`nexus-notification nexus-notification--${actionIsError ? 'error' : 'success'}`} role={actionIsError ? 'alert' : 'status'} style={{ marginBottom: 'var(--nexus-space-4)' }}>{actionMsg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--nexus-space-5)', marginBottom: 'var(--nexus-space-6)' }}>
        <div>
          <div style={{ display: 'flex', gap: 'var(--nexus-space-3)', alignItems: 'center', marginBottom: 'var(--nexus-space-3)' }}>
            <span className="nexus-badge" style={{ background: group.isPublic ? '#006B6B' : '#64748b', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>
              {group.isPublic ? 'Public' : 'Private'}
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-3)' }}>{group.name}</h1>
          <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-4)' }}>{group.description}</p>
          <p style={{ fontSize: 14, color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-5)' }}>
            {group.memberCount} member{group.memberCount !== 1 ? 's' : ''} &middot; Created {new Date(group.createdAt).toLocaleDateString('en-IE', { year: 'numeric', month: 'long' })}
          </p>
          {group.isPublic && (
            <button className={`nexus-btn ${group.isMember ? 'nexus-btn--secondary' : 'nexus-btn--primary'}`} onClick={toggleMembership} disabled={joining}>
              {joining ? '…' : group.isMember ? 'Leave group' : 'Join group'}
            </button>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Members ({members.length})</h2>
      {members.length === 0 ? (
        <p style={{ color: 'var(--nexus-color-text-secondary)' }}>No members listed.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--nexus-space-3)' }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--nexus-space-3)', padding: 'var(--nexus-space-3)', background: 'var(--nexus-color-surface)', border: '1px solid var(--nexus-color-border)', borderRadius: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--nexus-color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <Link to={`/members/${m.userId}`} style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</Link>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--nexus-color-text-secondary)' }}>{m.role}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
