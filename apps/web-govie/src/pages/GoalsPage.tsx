// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface Goal {
  id: number
  title: string
  description: string
  targetValue: number
  currentValue: number
  unit: string
  status: string
  deadline?: string
  milestones: { id: number; title: string; isComplete: boolean }[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapGoal(raw: any): Goal {
  const milestones = (raw.milestones ?? []).map((m: any) => ({
    id: m.id,
    title: m.title ?? '',
    isComplete: m.is_complete ?? m.isComplete ?? false,
  }))
  return {
    id: raw.id,
    title: raw.title ?? '',
    description: raw.description ?? '',
    targetValue: raw.target_value ?? raw.targetValue ?? 0,
    currentValue: raw.current_value ?? raw.currentValue ?? 0,
    unit: raw.unit ?? '',
    status: raw.status ?? 'active',
    deadline: raw.deadline ?? undefined,
    milestones,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiClient.get('/api/goals', { signal: controller.signal })
      .then(r => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = r.data as any
        const items = raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        setGoals(items.map(mapGoal))
      })
      .catch(err => { if (!controller.signal.aborted) setError(isApiError(err) ? err.message : 'Could not load goals.') })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading goals..." /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  const statusColor: Record<string, string> = { active: '#059669', completed: '#6B7280', paused: '#D97706' }

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Community Goals</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-2)' }}>Community Goals</h1>
      <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-5)' }}>Track and contribute to shared community objectives</p>

      {goals.length === 0 ? (
        <div className="nexus-empty-state">
          <p>No community goals yet. Check back soon!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-4)' }}>
          {goals.map(goal => {
            const progress = goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0
            return (
              <article key={goal.id} className="nexus-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--nexus-space-2)' }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{goal.title}</h2>
                  <span className="nexus-badge" style={{ background: statusColor[goal.status] ?? '#64748b', color: 'white', padding: '2px 10px', borderRadius: 12, fontSize: 12 }}>
                    {goal.status}
                  </span>
                </div>

                <p style={{ margin: '0 0 var(--nexus-space-3)', fontSize: 14, color: 'var(--nexus-color-text-secondary)' }}>{goal.description}</p>

                {/* Progress bar */}
                <div style={{ marginBottom: 'var(--nexus-space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                    <span style={{ fontWeight: 700 }}>{progress}%</span>
                  </div>
                  <div style={{ background: 'var(--nexus-color-border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div
                      style={{ width: `${progress}%`, height: '100%', background: 'var(--nexus-color-primary)', borderRadius: 4, transition: 'width 0.5s' }}
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${goal.title} progress`}
                    />
                  </div>
                </div>

                {goal.deadline && (
                  <p style={{ margin: '0 0 var(--nexus-space-2)', fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>
                    Deadline: {new Date(goal.deadline).toLocaleDateString('en-IE', { dateStyle: 'medium' })}
                  </p>
                )}

                {goal.milestones.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--nexus-color-border)', paddingTop: 'var(--nexus-space-3)', marginTop: 'var(--nexus-space-2)' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 var(--nexus-space-2)' }}>Milestones</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {goal.milestones.map(m => (
                        <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--nexus-space-2)', fontSize: 14, padding: '4px 0' }}>
                          <span style={{ color: m.isComplete ? 'var(--nexus-color-success)' : 'var(--nexus-color-text-secondary)' }} aria-hidden="true">
                            {m.isComplete ? '[x]' : '[ ]'}
                          </span>
                          <span style={{ textDecoration: m.isComplete ? 'line-through' : 'none', color: m.isComplete ? 'var(--nexus-color-text-secondary)' : 'var(--nexus-color-text)' }}>
                            {m.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
