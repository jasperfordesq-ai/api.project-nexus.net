// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { fullName } from '../api/normalize'
import { isApiError, useAuth } from '../context/AuthContext'

interface Post { id: number; authorId: number; authorName: string; content: string; likeCount: number; commentCount: number; isLiked: boolean; createdAt: string }

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapPost(raw: any): Post {
  return {
    id: raw.id,
    authorId: raw.user?.id ?? raw.authorId ?? 0,
    authorName: raw.user ? fullName(raw.user) : (raw.authorName ?? 'Unknown'),
    content: raw.content ?? '',
    likeCount: raw.like_count ?? raw.likeCount ?? 0,
    commentCount: raw.comment_count ?? raw.commentCount ?? 0,
    isLiked: raw.is_liked ?? raw.isLiked ?? false,
    createdAt: raw.created_at ?? raw.createdAt ?? '',
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function FeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newPost, setNewPost] = useState('')
  const [isPosting, setIsPosting] = useState(false)

  const fetchFeed = () => apiClient.get('/api/feed').then(r => {
    const raw = r.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const items = raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
    setPosts(items.map(mapPost))
  })

  useEffect(() => {
    fetchFeed()
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load feed.'))
      .finally(() => setIsLoading(false))
  }, [])

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.trim()) return
    setIsPosting(true)
    try {
      await apiClient.post('/api/feed', { content: newPost.trim() })
      setNewPost('')
      await fetchFeed()
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to post.')
    } finally {
      setIsPosting(false)
    }
  }

  const toggleLike = async (post: Post) => {
    try {
      if (post.isLiked) {
        await apiClient.delete(`/api/feed/${post.id}/like`)
      } else {
        await apiClient.post(`/api/feed/${post.id}/like`)
      }
      setPosts(ps => ps.map(p => p.id === post.id ? { ...p, isLiked: !p.isLiked, likeCount: p.likeCount + (p.isLiked ? -1 : 1) } : p))
    } catch (_) { /* like toggle failed — non-critical, UI stays in sync since update is after await */ }
  }

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading feed…" /></div>

  return (
    <div className="nexus-container" style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>Community feed</h1>

      {error && <div className="nexus-notification nexus-notification--error" role="alert" style={{ marginBottom: 'var(--nexus-space-4)' }}>{error}</div>}

      {/* Compose box */}
      {user && (
        <div className="nexus-card" style={{ marginBottom: 'var(--nexus-space-5)' }}>
          <form onSubmit={submitPost}>
            <div style={{ display: 'flex', gap: 'var(--nexus-space-3)', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--nexus-color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }} aria-hidden="true">
                {(user.firstName ?? 'M').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="new-post" className="nexus-sr-only">Write a post</label>
                <textarea
                  id="new-post"
                  className="nexus-input"
                  value={newPost}
                  onChange={e => setNewPost(e.target.value)}
                  placeholder="Share something with the community…"
                  rows={3}
                  maxLength={2000}
                  disabled={isPosting}
                  style={{ resize: 'vertical', width: '100%' }}
                />
                <div style={{ textAlign: 'right', marginTop: 'var(--nexus-space-2)' }}>
                  <button type="submit" className="nexus-btn nexus-btn--primary" disabled={isPosting || !newPost.trim()}>
                    {isPosting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="nexus-card" style={{ textAlign: 'center', padding: 'var(--nexus-space-7)', color: 'var(--nexus-color-text-secondary)' }}>
          Nothing in the feed yet. Be the first to post!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-4)' }} role="feed" aria-label="Community feed">
          {posts.map(post => (
            <article key={post.id} className="nexus-card">
              <div style={{ display: 'flex', gap: 'var(--nexus-space-3)', alignItems: 'center', marginBottom: 'var(--nexus-space-3)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--nexus-color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }} aria-hidden="true">
                  {post.authorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <Link to={`/members/${post.authorId}`} style={{ fontWeight: 700, fontSize: 15 }}>{post.authorName}</Link>
                  <time style={{ display: 'block', fontSize: 12, color: 'var(--nexus-color-text-secondary)' }} dateTime={post.createdAt}>
                    {new Date(post.createdAt).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })}
                  </time>
                </div>
              </div>
              <p style={{ margin: '0 0 var(--nexus-space-3)', lineHeight: 1.6 }}>{post.content}</p>
              <div style={{ display: 'flex', gap: 'var(--nexus-space-4)', borderTop: '1px solid var(--nexus-color-border)', paddingTop: 'var(--nexus-space-3)' }}>
                <button
                  onClick={() => toggleLike(post)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: post.isLiked ? 'var(--nexus-color-primary)' : 'var(--nexus-color-text-secondary)', fontSize: 14, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                  aria-pressed={post.isLiked}
                >
                  {post.isLiked ? '♥' : '♡'} {post.likeCount}
                </button>
                <span style={{ fontSize: 14, color: 'var(--nexus-color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  💬 {post.commentCount}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
