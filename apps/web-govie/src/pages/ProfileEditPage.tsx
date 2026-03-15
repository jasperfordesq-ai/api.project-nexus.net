// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

export function ProfileEditPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')

  useEffect(() => {
    apiClient.get('/api/users/me')
      .then(r => {
        const p = r.data as Record<string, unknown>
        setFirstName((p.first_name ?? p.firstName ?? '') as string)
        setLastName((p.last_name ?? p.lastName ?? '') as string)
        setBio((p.bio ?? '') as string)
        setLocation((p.location ?? '') as string)
      })
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load profile.'))
      .finally(() => setIsLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaveMsg(null)

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.patch('/api/users/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim() || null,
        location: location.trim() || null,
      })
      // Update cached user in localStorage so header/other pages reflect the change
      try {
        const stored = localStorage.getItem('nexus:user')
        if (stored) {
          const user = JSON.parse(stored)
          user.firstName = firstName.trim()
          user.lastName = lastName.trim()
          localStorage.setItem('nexus:user', JSON.stringify(user))
        }
      } catch { /* non-critical */ }
      setSaveMsg('Profile updated successfully.')
      setTimeout(() => navigate('/profile'), 1500)
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to update profile.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading profile…" /></div>

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/profile">Profile</Link></li>
          <li aria-current="page">Edit profile</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>
        Edit profile
      </h1>

      {error && <div className="nexus-notification nexus-notification--error" role="alert" style={{ marginBottom: 'var(--nexus-space-4)' }}>{error}</div>}
      {saveMsg && <div className="nexus-notification nexus-notification--success" role="status" style={{ marginBottom: 'var(--nexus-space-4)' }}>{saveMsg}</div>}

      <div style={{ maxWidth: 560 }}>
        <div className="nexus-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
              <label htmlFor="first-name" className="nexus-label">First name <span aria-hidden="true">*</span></label>
              <input
                id="first-name"
                type="text"
                className="nexus-input"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>

            <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
              <label htmlFor="last-name" className="nexus-label">Last name <span aria-hidden="true">*</span></label>
              <input
                id="last-name"
                type="text"
                className="nexus-input"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>

            <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
              <label htmlFor="bio" className="nexus-label">
                About you <span style={{ fontWeight: 400, color: 'var(--nexus-color-text-secondary)' }}>(optional)</span>
              </label>
              <textarea
                id="bio"
                className="nexus-input"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell the community a bit about yourself…"
                rows={4}
                maxLength={500}
                disabled={isSubmitting}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-5)' }}>
              <label htmlFor="location" className="nexus-label">
                Location <span style={{ fontWeight: 400, color: 'var(--nexus-color-text-secondary)' }}>(optional)</span>
              </label>
              <input
                id="location"
                type="text"
                className="nexus-input"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Skibbereen, Co. Cork"
                maxLength={200}
                disabled={isSubmitting}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--nexus-space-3)' }}>
              <button type="submit" className="nexus-btn nexus-btn--primary" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </button>
              <Link to="/profile" className="nexus-btn nexus-btn--secondary">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
