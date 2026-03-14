// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface Event { id: number; title: string; description: string; location: string; startsAt: string; endsAt: string; rsvpCount: number; isCancelled: boolean }

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
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiClient.get('/api/events', { signal: controller.signal })
      .then(r => {
        const raw = r.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
        const items = raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        setEvents(items.map(mapEvent))
      })
      .catch(err => { if (!controller.signal.aborted) setError(isApiError(err) ? err.message : 'Could not load events.') })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [])

  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  const upcoming = events.filter(e => !e.isCancelled && new Date(e.startsAt) >= new Date())
  const past = events.filter(e => !e.isCancelled && new Date(e.startsAt) < new Date())

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Events</li>
        </ol>
      </nav>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--nexus-space-5)', flexWrap: 'wrap', gap: 'var(--nexus-space-4)' }}>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: 0 }}>Community events</h1>
        <Link to="/events/new" className="nexus-btn nexus-btn--primary">Create event</Link>
      </div>

      <div role="region" aria-label="Events list" aria-busy={isLoading} aria-live="polite">
      {isLoading && (
        <div className="nexus-skeleton-grid" aria-label="Loading events…">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="nexus-skeleton-card">
              <div style={{ display: 'flex', gap: 'var(--nexus-space-4)' }}>
                <div className="nexus-skeleton-line" style={{ width: 56, height: 56, borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="nexus-skeleton-line" style={{ width: '70%', height: '1rem', marginBottom: '0.5rem' }} />
                  <div className="nexus-skeleton-line" style={{ width: '50%', height: '0.8rem', marginBottom: '0.5rem' }} />
                  <div className="nexus-skeleton-line" style={{ width: '30%', height: '0.8rem' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && upcoming.length === 0 && past.length === 0 && (
        <div className="nexus-empty-state">
          <p>No upcoming events. Check back soon!</p>
          <Link to="/events/new" className="nexus-btn nexus-btn--primary">Create the first event</Link>
        </div>
      )}

      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-heading" style={{ marginBottom: 'var(--nexus-space-7)' }}>
          <h2 id="upcoming-heading" style={{ fontSize: 20, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Upcoming events</h2>
          <div className="nexus-cards">
            {upcoming.map(event => (
              <article key={event.id} className="nexus-card">
                <div style={{ display: 'flex', gap: 'var(--nexus-space-4)', alignItems: 'flex-start' }}>
                  <div style={{ textAlign: 'center', background: 'var(--nexus-color-primary)', color: 'white', borderRadius: 8, padding: '8px 14px', flexShrink: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{new Date(event.startsAt).getDate()}</div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {new Date(event.startsAt).toLocaleDateString('en-IE', { month: 'short' })}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 var(--nexus-space-1)', fontSize: 17 }}>
                      <Link to={`/events/${event.id}`}>{event.title}</Link>
                    </h3>
                    {event.location && <p style={{ margin: '0 0 var(--nexus-space-1)', fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>📍 {event.location}</p>}
                    <p style={{ margin: '0 0 var(--nexus-space-1)', fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>
                      {new Date(event.startsAt).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })} – {new Date(event.endsAt).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>{event.rsvpCount} attending</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-heading">
          <h2 id="past-heading" style={{ fontSize: 20, fontWeight: 700, marginBottom: 'var(--nexus-space-4)', color: 'var(--nexus-color-text-secondary)' }}>Past events</h2>
          <div className="nexus-cards" style={{ opacity: 0.7 }}>
            {past.slice(0, 6).map(event => (
              <article key={event.id} className="nexus-card">
                <h3 style={{ fontSize: 16, margin: '0 0 var(--nexus-space-2)' }}>
                  <Link to={`/events/${event.id}`}>{event.title}</Link>
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>
                  {new Date(event.startsAt).toLocaleDateString('en-IE', { dateStyle: 'medium' })} &middot; {event.rsvpCount} attended
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
      </div>{/* end events region */}
    </div>
  )
}
