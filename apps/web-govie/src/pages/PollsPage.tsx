// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError, useAuth } from '../context/AuthContext'

interface PollOption {
  id: number
  text: string
  voteCount: number
}

interface Poll {
  id: number
  question: string
  description?: string
  type: string
  options: PollOption[]
  totalVotes: number
  hasVoted: boolean
  votedOptionId?: number
  endsAt?: string
  createdAt: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapPoll(raw: any): Poll {
  const options = (raw.options ?? []).map((o: any) => ({
    id: o.id,
    text: o.text ?? o.option_text ?? '',
    voteCount: o.vote_count ?? o.voteCount ?? 0,
  }))
  return {
    id: raw.id,
    question: raw.question ?? raw.title ?? '',
    description: raw.description ?? undefined,
    type: raw.type ?? 'single',
    options,
    totalVotes: raw.total_votes ?? raw.totalVotes ?? options.reduce((s: number, o: PollOption) => s + o.voteCount, 0),
    hasVoted: raw.has_voted ?? raw.hasVoted ?? false,
    votedOptionId: raw.voted_option_id ?? raw.votedOptionId ?? undefined,
    endsAt: raw.ends_at ?? raw.endsAt ?? undefined,
    createdAt: raw.created_at ?? raw.createdAt ?? '',
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function PollsPage() {
  const { user } = useAuth()
  const [polls, setPolls] = useState<Poll[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [votingId, setVotingId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiClient.get('/api/polls', { signal: controller.signal })
      .then(r => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = r.data as any
        const items = raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        setPolls(items.map(mapPoll))
      })
      .catch(err => { if (!controller.signal.aborted) setError(isApiError(err) ? err.message : 'Could not load polls.') })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [])

  const vote = async (pollId: number, optionId: number) => {
    if (!user) return
    setVotingId(pollId)
    try {
      await apiClient.post(`/api/polls/${pollId}/vote`, { option_ids: [optionId] })
      setPolls(ps => ps.map(p => {
        if (p.id !== pollId) return p
        return {
          ...p,
          hasVoted: true,
          votedOptionId: optionId,
          totalVotes: p.totalVotes + 1,
          options: p.options.map(o => o.id === optionId ? { ...o, voteCount: o.voteCount + 1 } : o),
        }
      }))
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to vote.')
    } finally {
      setVotingId(null)
    }
  }

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading polls..." /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  const active = polls.filter(p => !p.endsAt || new Date(p.endsAt) >= new Date())
  const closed = polls.filter(p => p.endsAt && new Date(p.endsAt) < new Date())

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Polls</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-2)' }}>Community Polls</h1>
      <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-5)' }}>Have your say on community decisions</p>

      {polls.length === 0 ? (
        <div className="nexus-empty-state">
          <p>No polls available at the moment.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section aria-labelledby="active-polls" style={{ marginBottom: 'var(--nexus-space-7)' }}>
              <h2 id="active-polls" style={{ fontSize: 20, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Active polls</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-4)' }}>
                {active.map(poll => (
                  <article key={poll.id} className="nexus-card">
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 var(--nexus-space-2)' }}>{poll.question}</h3>
                    {poll.description && <p style={{ margin: '0 0 var(--nexus-space-3)', color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>{poll.description}</p>}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-2)' }}>
                      {poll.options.map(opt => {
                        const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0
                        const isVoted = poll.votedOptionId === opt.id
                        return (
                          <div key={opt.id} style={{ position: 'relative' }}>
                            {poll.hasVoted ? (
                              <div style={{ padding: 'var(--nexus-space-3)', border: `1px solid ${isVoted ? 'var(--nexus-color-primary)' : 'var(--nexus-color-border)'}`, borderRadius: 6, background: isVoted ? 'var(--nexus-color-primary-light)' : 'var(--nexus-color-surface)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <span style={{ fontSize: 14, fontWeight: isVoted ? 700 : 400 }}>{opt.text} {isVoted && '(your vote)'}</span>
                                  <span style={{ fontSize: 13, fontWeight: 700 }}>{pct}%</span>
                                </div>
                                <div style={{ background: 'var(--nexus-color-border)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--nexus-color-primary)', borderRadius: 4, transition: 'width 0.3s' }} />
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => vote(poll.id, opt.id)}
                                disabled={votingId === poll.id}
                                style={{ width: '100%', textAlign: 'left', padding: 'var(--nexus-space-3)', border: '1px solid var(--nexus-color-border)', borderRadius: 6, background: 'var(--nexus-color-surface)', cursor: 'pointer', fontSize: 14 }}
                              >
                                {opt.text}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div style={{ marginTop: 'var(--nexus-space-3)', fontSize: 13, color: 'var(--nexus-color-text-secondary)', display: 'flex', gap: 'var(--nexus-space-4)' }}>
                      <span>{poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}</span>
                      {poll.endsAt && <span>Ends {new Date(poll.endsAt).toLocaleDateString('en-IE', { dateStyle: 'medium' })}</span>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {closed.length > 0 && (
            <section aria-labelledby="closed-polls">
              <h2 id="closed-polls" style={{ fontSize: 20, fontWeight: 700, marginBottom: 'var(--nexus-space-4)', color: 'var(--nexus-color-text-secondary)' }}>Closed polls</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-3)', opacity: 0.7 }}>
                {closed.map(poll => (
                  <article key={poll.id} className="nexus-card">
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 var(--nexus-space-2)' }}>{poll.question}</h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>
                      {poll.totalVotes} total votes -- ended {poll.endsAt ? new Date(poll.endsAt).toLocaleDateString('en-IE') : ''}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
