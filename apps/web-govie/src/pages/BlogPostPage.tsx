// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import DOMPurify from 'dompurify'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface BlogPost { id: number; slug: string; title: string; content: string; excerpt?: string; authorName?: string; publishedAt: string; updatedAt?: string; category?: string; readTimeMinutes?: number; tags?: string[] }

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapBlogPost(raw: any): BlogPost {
  return {
    id: raw.id,
    slug: raw.slug ?? '',
    title: raw.title ?? '',
    content: raw.content ?? '',
    excerpt: raw.excerpt ?? undefined,
    authorName: raw.author_name ?? raw.authorName ?? undefined,
    publishedAt: raw.published_at ?? raw.publishedAt ?? '',
    updatedAt: raw.updated_at ?? raw.updatedAt ?? undefined,
    category: raw.category ?? undefined,
    readTimeMinutes: raw.read_time_minutes ?? raw.readTimeMinutes ?? undefined,
    tags: raw.tags ?? undefined,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get(`/api/blog/posts/${slug}`)
      .then(r => setPost(mapBlogPost(r.data)))
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load post.'))
      .finally(() => setIsLoading(false))
  }, [slug])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading post…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>
  if (!post) return null

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/blog">Blog</Link></li>
          <li aria-current="page">{post.title}</li>
        </ol>
      </nav>

      <article style={{ maxWidth: 720 }}>
        {post.category && (
          <div style={{ marginBottom: 'var(--nexus-space-3)' }}>
            <span className="nexus-badge" style={{ background: 'var(--nexus-color-primary)', color: 'white', padding: '3px 12px', borderRadius: 12, fontSize: 13 }}>
              {post.category}
            </span>
          </div>
        )}

        <h1 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 900, lineHeight: 1.2, marginBottom: 'var(--nexus-space-4)' }}>{post.title}</h1>

        <div style={{ display: 'flex', gap: 'var(--nexus-space-4)', marginBottom: 'var(--nexus-space-6)', fontSize: 14, color: 'var(--nexus-color-text-secondary)', flexWrap: 'wrap', borderBottom: '1px solid var(--nexus-color-border)', paddingBottom: 'var(--nexus-space-4)' }}>
          {post.authorName && <span>By <strong>{post.authorName}</strong></span>}
          <time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString('en-IE', { dateStyle: 'long' })}</time>
          {post.readTimeMinutes && <span>{post.readTimeMinutes} min read</span>}
          {post.updatedAt && post.updatedAt !== post.publishedAt && (
            <span>Updated {new Date(post.updatedAt).toLocaleDateString('en-IE')}</span>
          )}
        </div>

        <div
          style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--nexus-color-text)', marginBottom: 'var(--nexus-space-6)' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
        />

        {post.tags && post.tags.length > 0 && (
          <div style={{ borderTop: '1px solid var(--nexus-color-border)', paddingTop: 'var(--nexus-space-4)', marginBottom: 'var(--nexus-space-6)' }}>
            <span style={{ fontSize: 13, color: 'var(--nexus-color-text-secondary)', marginRight: 'var(--nexus-space-2)' }}>Tags:</span>
            {post.tags.map(tag => (
              <span key={tag} className="nexus-badge" style={{ background: 'var(--nexus-color-surface)', color: 'var(--nexus-color-text)', border: '1px solid var(--nexus-color-border)', padding: '3px 10px', borderRadius: 12, fontSize: 12, marginRight: 'var(--nexus-space-2)' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div style={{ paddingTop: 'var(--nexus-space-4)', borderTop: '1px solid var(--nexus-color-border)' }}>
          <Link to="/blog" className="nexus-btn nexus-btn--secondary">Back to blog</Link>
        </div>
      </article>
    </div>
  )
}
