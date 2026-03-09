// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

export function CreateEventPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) { setError('Event title is required.'); return }
    if (!startsAt) { setError('Start date and time is required.'); return }
    if (!endsAt) { setError('End date and time is required.'); return }
    if (new Date(endsAt) <= new Date(startsAt)) { setError('End time must be after start time.'); return }
    setIsSubmitting(true)
    try {
      const res = await apiClient.post<{ id: number }>('/api/events', {
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || null,
        startsAt,
        endsAt,
      })
      navigate(`/events/${res.data.id}`)
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to create event.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/events">Events</Link></li>
          <li aria-current="page">Create event</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>Create an event</h1>

      <div style={{ maxWidth: 600 }}>
        {error && <div className="nexus-notification nexus-notification--error" role="alert" style={{ marginBottom: 'var(--nexus-space-4)' }}>{error}</div>}

        <div className="nexus-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
              <label htmlFor="event-title" className="nexus-label">Title <span aria-hidden="true">*</span></label>
              <input id="event-title" type="text" className="nexus-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Community Skill Share Morning" maxLength={200} required disabled={isSubmitting} />
            </div>

            <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
              <label htmlFor="event-desc" className="nexus-label">Description</label>
              <textarea id="event-desc" className="nexus-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="What will happen at this event?" rows={4} maxLength={2000} disabled={isSubmitting} style={{ resize: 'vertical' }} />
            </div>

            <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
              <label htmlFor="event-location" className="nexus-label">Location</label>
              <input id="event-location" type="text" className="nexus-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Skibbereen Community Centre or Online" maxLength={300} disabled={isSubmitting} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--nexus-space-4)', marginBottom: 'var(--nexus-space-5)' }}>
              <div className="nexus-form-group">
                <label htmlFor="starts-at" className="nexus-label">Start date & time <span aria-hidden="true">*</span></label>
                <input id="starts-at" type="datetime-local" className="nexus-input" value={startsAt} onChange={e => setStartsAt(e.target.value)} required disabled={isSubmitting} />
              </div>
              <div className="nexus-form-group">
                <label htmlFor="ends-at" className="nexus-label">End date & time <span aria-hidden="true">*</span></label>
                <input id="ends-at" type="datetime-local" className="nexus-input" value={endsAt} onChange={e => setEndsAt(e.target.value)} required disabled={isSubmitting} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--nexus-space-3)' }}>
              <button type="submit" className="nexus-btn nexus-btn--primary" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create event'}</button>
              <Link to="/events" className="nexus-btn nexus-btn--secondary">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
