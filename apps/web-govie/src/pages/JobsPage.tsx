// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

interface Job { id: number; title: string; organisationName?: string; location?: string; jobType: string; salaryRange?: string; description: string; createdAt: string; applicationCount: number }

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapJob(raw: any): Job {
  return {
    id: raw.id,
    title: raw.title ?? '',
    organisationName: raw.organisation_name ?? raw.organisationName ?? undefined,
    location: raw.location ?? undefined,
    jobType: raw.job_type ?? raw.jobType ?? '',
    salaryRange: raw.salary_range ?? raw.salaryRange ?? undefined,
    description: raw.description ?? '',
    createdAt: raw.created_at ?? raw.createdAt ?? '',
    applicationCount: raw.application_count ?? raw.applicationCount ?? 0,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const jobTypeColors: Record<string, string> = {
  'full-time': '#059669', 'part-time': '#2563EB', 'volunteer': '#7C3AED', 'contract': '#D97706',
}

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    apiClient.get('/api/jobs', { signal: controller.signal })
      .then(r => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = r.data as any
        const items = raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        setJobs(items.map(mapJob))
      })
      .catch(err => { if (!controller.signal.aborted) setError(isApiError(err) ? err.message : 'Could not load jobs.') })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading jobs…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  const debouncedQuery = useDebouncedValue(query)
  const filtered = jobs.filter(j =>
    debouncedQuery === '' || j.title.toLowerCase().includes(debouncedQuery.toLowerCase()) || (j.organisationName ?? '').toLowerCase().includes(debouncedQuery.toLowerCase())
  )

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Jobs & Volunteering</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-2)' }}>Jobs & Volunteering</h1>
      <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-5)' }}>Paid and voluntary opportunities from community organisations</p>

      <div style={{ marginBottom: 'var(--nexus-space-5)' }}>
        <label htmlFor="job-search" className="nexus-sr-only">Search jobs</label>
        <input
          id="job-search"
          type="search"
          className="nexus-input"
          placeholder="Search by title or organisation…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ maxWidth: 480 }}
        />
      </div>

      <div role="region" aria-label="Jobs list" aria-live="polite">
      {filtered.length === 0 ? (
        <div className="nexus-empty-state">
          <p>{query ? 'No jobs found matching your search.' : 'No jobs posted yet. Check back soon for new opportunities!'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-3)' }}>
          {filtered.map(job => (
            <div key={job.id} className="nexus-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--nexus-space-2)', marginBottom: 'var(--nexus-space-2)' }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 var(--nexus-space-1)' }}>
                    <Link to={`/jobs/${job.id}`} style={{ color: 'inherit' }}>{job.title}</Link>
                  </h2>
                  {job.organisationName && (
                    <span style={{ fontSize: 14, color: 'var(--nexus-color-text-secondary)' }}>{job.organisationName}</span>
                  )}
                </div>
                <span className="nexus-badge" style={{ background: jobTypeColors[job.jobType] ?? '#6B7280', color: 'white', padding: '3px 10px', borderRadius: 12, fontSize: 12, whiteSpace: 'nowrap' }}>
                  {job.jobType}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 'var(--nexus-space-4)', marginBottom: 'var(--nexus-space-3)', fontSize: 13, color: 'var(--nexus-color-text-secondary)', flexWrap: 'wrap' }}>
                {job.location && <span>Location: {job.location}</span>}
                {job.salaryRange && <span>Salary: {job.salaryRange}</span>}
                <span>Posted {new Date(job.createdAt).toLocaleDateString('en-IE')}</span>
                <span>{job.applicationCount} applications</span>
              </div>

              <p style={{ margin: '0 0 var(--nexus-space-3)', fontSize: 14, lineHeight: 1.5, color: 'var(--nexus-color-text)' }}>
                {job.description.length > 200 ? job.description.slice(0, 200) + '…' : job.description}
              </p>

              <Link to={`/jobs/${job.id}`} className="nexus-btn nexus-btn--primary nexus-btn--sm">View & Apply</Link>
            </div>
          ))}
        </div>
      )}
      </div>{/* end jobs region */}
    </div>
  )
}
