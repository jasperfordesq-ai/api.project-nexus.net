// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

interface BlogPost { id: number; slug: string; title: string; excerpt?: string; authorName?: string; publishedAt: string; category?: string; readTimeMinutes?: number }

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapBlogPost(raw: any): BlogPost {
  return {
    id: raw.id,
    slug: raw.slug ?? '',
    title: raw.title ?? '',
    excerpt: raw.excerpt ?? undefined,
    authorName: raw.author_name ?? raw.authorName ?? undefined,
    publishedAt: raw.published_at ?? raw.publishedAt ?? '',
    category: raw.category ?? undefined,
    readTimeMinutes: raw.read_time_minutes ?? raw.readTimeMinutes ?? undefined,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const ITEMS_PER_PAGE = 12

export function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const debouncedQuery = useDebouncedValue(query)

  useEffect(() => {
    const controller = new AbortController()
    apiClient.get('/api/blog/posts', { signal: controller.signal })
      .then(r => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = r.data as any
        const items = raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        setPosts(items.map(mapBlogPost))
      })
      .catch(err => { if (!controller.signal.aborted) setError(isApiError(err) ? err.message : 'Could not load blog posts.') })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [])

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1) }, [debouncedQuery])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading blog…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  const filtered = posts.filter(p =>
    debouncedQuery === '' || p.title.toLowerCase().includes(debouncedQuery.toLowerCase()) || (p.category ?? '').toLowerCase().includes(debouncedQuery.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginatedPosts = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Blog & News</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-2)' }}>Blog & News</h1>
      <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-5)' }}>Stories, guides and updates from our community</p>

      <div style={{ marginBottom: 'var(--nexus-space-5)' }}>
        <label htmlFor="blog-search" className="nexus-sr-only">Search posts</label>
        <input
          id="blog-search"
          type="search"
          className="nexus-input"
          placeholder="Search posts…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="nexus-card" style={{ textAlign: 'center', padding: 'var(--nexus-space-7)', color: 'var(--nexus-color-text-secondary)' }}>
          No posts found{query ? ' matching your search' : ''}.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-4)' }}>
          {paginatedPosts.map(post => (
            <article key={post.id} className="nexus-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--nexus-space-2)', marginBottom: 'var(--nexus-space-2)' }}>
                <div>
                  {post.category && (
                    <span className="nexus-badge" style={{ background: 'var(--nexus-color-primary)', color: 'white', padding: '2px 10px', borderRadius: 12, fontSize: 12, marginBottom: 'var(--nexus-space-2)', display: 'inline-block' }}>
                      {post.category}
                    </span>
                  )}
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 var(--nexus-space-1)' }}>
                    <Link to={`/blog/${post.slug}`} style={{ color: 'inherit' }}>{post.title}</Link>
                  </h2>
                </div>
              </div>

              {post.excerpt && (
                <p style={{ margin: '0 0 var(--nexus-space-3)', fontSize: 15, lineHeight: 1.6, color: 'var(--nexus-color-text)' }}>{post.excerpt}</p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>
                <div>
                  {post.authorName && <span>By {post.authorName}</span>}
                  <span style={{ margin: '0 var(--nexus-space-2)' }}>·</span>
                  <time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString('en-IE', { dateStyle: 'medium' })}</time>
                  {post.readTimeMinutes && <><span style={{ margin: '0 var(--nexus-space-2)' }}>·</span>{post.readTimeMinutes} min read</>}
                </div>
                <Link to={`/blog/${post.slug}`} className="nexus-btn nexus-btn--secondary nexus-btn--sm">Read more</Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <nav className="nexus-pagination" aria-label="Pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </nav>
      )}
    </div>
  )
}
