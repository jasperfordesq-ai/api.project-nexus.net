// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError, useAuth } from '../context/AuthContext'

interface Job { id: number; title: string; organisationName?: string; location?: string; jobType: string; salaryRange?: string; description: string; requirements?: string; createdAt: string; closingDate?: string; applicationCount: number; hasApplied: boolean }

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<Job>(`/api/jobs/${id}`)
      .then(r => setJob(r.data))
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load job.'))
      .finally(() => setIsLoading(false))
  }, [id])

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    setApplying(true)
    try {
      await apiClient.post(`/api/jobs/${id}/apply`, { coverLetter: coverLetter.trim() })
      setJob(j => j ? { ...j, hasApplied: true, applicationCount: j.applicationCount + 1 } : j)
      setActionMsg('Application submitted successfully.')
      setShowForm(false)
    } catch (err) {
      setActionMsg(isApiError(err) ? err.message : 'Failed to submit application.')
    } finally {
      setApplying(false)
    }
  }

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading job…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>
  if (!job) return null

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/jobs">Jobs</Link></li>
          <li aria-current="page">{job.title}</li>
        </ol>
      </nav>

      {actionMsg && <div className="nexus-notification nexus-notification--success" role="status" style={{ marginBottom: 'var(--nexus-space-4)' }}>{actionMsg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--nexus-space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, marginBottom: 'var(--nexus-space-2)' }}>{job.title}</h1>
          {job.organisationName && (
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-4)' }}>{job.organisationName}</p>
          )}

          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--nexus-space-2) var(--nexus-space-4)', marginBottom: 'var(--nexus-space-5)' }}>
            <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Type</dt>
            <dd style={{ margin: 0, fontSize: 14 }}>{job.jobType}</dd>
            {job.location && <>
              <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Location</dt>
              <dd style={{ margin: 0, fontSize: 14 }}>{job.location}</dd>
            </>}
            {job.salaryRange && <>
              <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Salary</dt>
              <dd style={{ margin: 0, fontSize: 14 }}>{job.salaryRange}</dd>
            </>}
            {job.closingDate && <>
              <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Closing</dt>
              <dd style={{ margin: 0, fontSize: 14 }}>{new Date(job.closingDate).toLocaleDateString('en-IE')}</dd>
            </>}
            <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>Applications</dt>
            <dd style={{ margin: 0, fontSize: 14 }}>{job.applicationCount}</dd>
          </dl>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Description</h2>
          <div style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 'var(--nexus-space-5)', whiteSpace: 'pre-wrap' }}>{job.description}</div>

          {job.requirements && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Requirements</h2>
              <div style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 'var(--nexus-space-5)', whiteSpace: 'pre-wrap' }}>{job.requirements}</div>
            </>
          )}

          {user && !job.hasApplied && !showForm && (
            <button className="nexus-btn nexus-btn--primary" onClick={() => setShowForm(true)}>Apply Now</button>
          )}

          {user && job.hasApplied && (
            <span className="nexus-badge" style={{ background: '#D1FAE5', color: '#065F46', padding: '8px 16px', borderRadius: 20, fontSize: 14 }}>Application submitted</span>
          )}

          {!user && (
            <p style={{ color: 'var(--nexus-color-text-secondary)' }}><Link to="/login">Log in</Link> to apply for this position.</p>
          )}
        </div>

        {showForm && (
          <div className="nexus-card">
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Your Application</h2>
            <form onSubmit={handleApply}>
              <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
                <label htmlFor="cover-letter" className="nexus-label">Cover letter</label>
                <textarea
                  id="cover-letter"
                  className="nexus-input"
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  placeholder="Tell us why you are interested in this role…"
                  rows={8}
                  maxLength={3000}
                  disabled={applying}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--nexus-space-3)' }}>
                <button type="submit" className="nexus-btn nexus-btn--primary" disabled={applying}>{applying ? 'Submitting…' : 'Submit application'}</button>
                <button type="button" className="nexus-btn nexus-btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
