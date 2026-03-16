// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface Event { id: number; title: string; description: string; location: string; startsAt: string; endsAt: string; rsvpCount: number; isCancelled: boolean; organizerName?: string; myRsvp?: boolean }
interface Attendee { id: number; userId: number; userName: string; status: string }

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapEvent(raw: any): Event {
  return {
    id: raw.id,
    title: raw.title ?? '',
    description: raw.description ?? '',
    location: raw.location ?? '',
    startsAt: raw.starts_at ?? raw.startsAt ?? '',
    endsAt: raw.ends_at ?? raw.endsAt ?? '',
    rsvpCount: raw.rsvp_count ?? raw.rsvpCount ?? 0,
    isCancelled: raw.is_cancelled ?? raw.isCancelled ?? false,
    organizerName: raw.organizer_name ?? raw.organizerName ?? undefined,
    myRsvp: raw.my_rsvp ?? raw.myRsvp ?? undefined,
  }
}

function mapAttendee(raw: any): Attendee {
  return {
    id: raw.id,
    userId: raw.user_id ?? raw.userId ?? 0,
    userName: raw.user_name ?? raw.userName ?? 'Unknown',
    status: raw.status ?? 'confirmed',
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [actionIsError, setActionIsError] = useState(false)
  const [rsvping, setRsvping] = useState(false)

  useEffect(() => {
    Promise.all([
      apiClient.get(`/api/events/${id}`).then(r => {
        const data = r.data.event ?? r.data
        const event = mapEvent(data)
        const myRsvp = r.data.my_rsvp?.status
        return myRsvp !== undefined ? { ...event, myRsvp: myRsvp !== 'not_attending' } : event
      }),
      apiClient.get(`/api/events/${id}/rsvps`).then(r => {
        const raw = r.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
        const items = raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        return items.map(mapAttendee)
      }).catch(() => [] as Attendee[]),
    ])
      .then(([e, a]) => { setEvent(e); setAttendees(a) })
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load event.'))
      .finally(() => setIsLoading(false))
  }, [id])

  const toggleRsvp = async () => {
    if (!event) return
    setRsvping(true)
    try {
      if (event.myRsvp) {
        await apiClient.delete(`/api/events/${id}/rsvp`)
        setEvent(e => e ? { ...e, myRsvp: false, rsvpCount: e.rsvpCount - 1 } : e)
        setActionIsError(false)
        setActionMsg('Your RSVP has been removed.')
      } else {
        await apiClient.post(`/api/events/${id}/rsvp`)
        setEvent(e => e ? { ...e, myRsvp: true, rsvpCount: e.rsvpCount + 1 } : e)
        setActionIsError(false)
        setActionMsg('You are attending this event.')
      }
    } catch (err) {
      setActionIsError(true)
      setActionMsg(isApiError(err) ? err.message : 'Action failed.')
    } finally {
      setRsvping(false)
    }
  }

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading event…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>
  if (!event) return null

  const isPast = new Date(event.endsAt || event.startsAt) < new Date()

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/events">Events</Link></li>
          <li aria-current="page">{event.title}</li>
        </ol>
      </nav>

      {actionMsg && <div className={`nexus-notification nexus-notification--${actionIsError ? 'error' : 'success'}`} role={actionIsError ? 'alert' : 'status'} style={{ marginBottom: 'var(--nexus-space-4)' }}>{actionMsg}</div>}
      {event.isCancelled && <div className="nexus-notification nexus-notification--error" role="status" style={{ marginBottom: 'var(--nexus-space-4)' }}>This event has been cancelled.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--nexus-space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-4)' }}>{event.title}</h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--nexus-color-text)', marginBottom: 'var(--nexus-space-5)' }}>{event.description}</p>

          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--nexus-space-2) var(--nexus-space-4)', marginBottom: 'var(--nexus-space-5)' }}>
            <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>When</dt>
            <dd style={{ margin: 0, fontSize: 14 }}>
              {new Date(event.startsAt).toLocaleDateString('en-IE', { dateStyle: 'full' })}<br />
              {new Date(event.startsAt).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })} – {new Date(event.endsAt).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
            </dd>
            {event.location && <>
              <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Location</dt>
              <dd style={{ margin: 0, fontSize: 14 }}>{event.location}</dd>
            </>}
            <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Attending</dt>
            <dd style={{ margin: 0, fontSize: 14 }}>{event.rsvpCount} people</dd>
            {event.organizerName && <>
              <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Organiser</dt>
              <dd style={{ margin: 0, fontSize: 14 }}>{event.organizerName}</dd>
            </>}
          </dl>

          {!event.isCancelled && !isPast && (
            <button
              className={`nexus-btn ${event.myRsvp ? 'nexus-btn--secondary' : 'nexus-btn--primary'}`}
              onClick={toggleRsvp}
              disabled={rsvping}
            >
              {rsvping ? '…' : event.myRsvp ? 'Cancel my RSVP' : 'RSVP — I\'m attending'}
            </button>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Attendees ({attendees.length})</h2>
          {attendees.length === 0 ? (
            <p style={{ color: 'var(--nexus-color-text-secondary)' }}>No RSVPs yet. Be the first!</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-2)' }}>
              {attendees.map(a => (
                <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--nexus-space-3)', padding: 'var(--nexus-space-2) 0' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--nexus-color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                    {a.userName.charAt(0).toUpperCase()}
                  </div>
                  <Link to={`/members/${a.userId}`} style={{ fontSize: 14, fontWeight: 500 }}>{a.userName}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
