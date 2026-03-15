// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { groupsApi } from '../api/groups'
import { isApiError } from '../context/AuthContext'

export function CreateGroupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [groupType, setGroupType] = useState<'public' | 'private'>('public')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Group name is required.'); return }
    setIsSubmitting(true)
    try {
      const res = await groupsApi.create({ name: name.trim(), description: description.trim(), type: groupType })
      navigate(`/groups/${res.id}`)
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to create group. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/groups">Groups</Link></li>
          <li aria-current="page">Create group</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>Create a group</h1>

      <div style={{ maxWidth: 600 }}>
        {error && <div className="nexus-notification nexus-notification--error" role="alert" style={{ marginBottom: 'var(--nexus-space-4)' }}>{error}</div>}

        <div className="nexus-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
              <label htmlFor="group-name" className="nexus-label">Group name <span aria-hidden="true">*</span></label>
              <input
                id="group-name"
                type="text"
                className="nexus-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. West Cork Gardeners"
                maxLength={100}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
              <label htmlFor="group-description" className="nexus-label">Description</label>
              <textarea
                id="group-description"
                className="nexus-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this group about? What activities do you organise?"
                rows={4}
                maxLength={1000}
                disabled={isSubmitting}
                style={{ resize: 'vertical' }}
              />
            </div>

            <fieldset style={{ border: 'none', padding: 0, marginBottom: 'var(--nexus-space-5)' }}>
              <legend className="nexus-label" style={{ marginBottom: 'var(--nexus-space-2)' }}>Group type</legend>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-2)' }}>
                {[
                  { value: 'public' as const, label: 'Public', desc: 'Anyone can view and join this group' },
                  { value: 'private' as const, label: 'Private', desc: 'Members must be invited by an admin' },
                ].map(opt => (
                  <label key={opt.value} style={{ display: 'flex', gap: 'var(--nexus-space-3)', alignItems: 'flex-start', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="group-type"
                      checked={groupType === opt.value}
                      onChange={() => setGroupType(opt.value)}
                      disabled={isSubmitting}
                      style={{ marginTop: 3 }}
                    />
                    <div>
                      <span style={{ fontWeight: 600 }}>{opt.label}</span>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            <div style={{ display: 'flex', gap: 'var(--nexus-space-3)' }}>
              <button type="submit" className="nexus-btn nexus-btn--primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create group'}
              </button>
              <Link to="/groups" className="nexus-btn nexus-btn--secondary">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
