// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

interface KbArticle {
  id: number
  title: string
  excerpt?: string
  category?: string
  slug: string
  updatedAt: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapArticle(raw: any): KbArticle {
  return {
    id: raw.id,
    title: raw.title ?? '',
    excerpt: raw.excerpt ?? raw.summary ?? undefined,
    category: raw.category ?? raw.category_name ?? raw.categoryName ?? undefined,
    slug: raw.slug ?? String(raw.id),
    updatedAt: raw.updated_at ?? raw.updatedAt ?? '',
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const ITEMS_PER_PAGE = 12

export function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KbArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    apiClient.get('/api/knowledge-base/articles', { signal: controller.signal })
      .then(r => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = r.data as any
        const items = raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        setArticles(items.map(mapArticle))
      })
      .catch(err => { if (!controller.signal.aborted) setError(isApiError(err) ? err.message : 'Could not load articles.') })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [])

  const debouncedQuery = useDebouncedValue(query)
  const filtered = articles.filter(a =>
    debouncedQuery === '' ||
    a.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
    (a.category ?? '').toLowerCase().includes(debouncedQuery.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1) }, [debouncedQuery])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading knowledge base..." /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  // Group by category for display
  const categories = [...new Set(filtered.map(a => a.category).filter(Boolean))] as string[]

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Knowledge Base</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-2)' }}>Knowledge Base</h1>
      <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-5)' }}>Guides, how-tos and help articles for the community</p>

      <div style={{ marginBottom: 'var(--nexus-space-5)' }}>
        <label htmlFor="kb-search" className="nexus-sr-only">Search articles</label>
        <input
          id="kb-search"
          type="search"
          className="nexus-input"
          placeholder="Search articles..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ maxWidth: 480 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="nexus-empty-state">
          <p>{query ? 'No articles matching your search.' : 'No knowledge base articles available yet.'}</p>
        </div>
      ) : query ? (
        // Flat list when searching
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-3)' }}>
          {paginated.map(article => (
            <Link
              key={article.id}
              to={`/kb/${article.slug}`}
              style={{ display: 'block', padding: 'var(--nexus-space-4)', background: 'var(--nexus-color-surface)', border: '1px solid var(--nexus-color-border)', borderRadius: 8, textDecoration: 'none', color: 'var(--nexus-color-text)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{article.title}</h3>
                  {article.excerpt && <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--nexus-color-text-secondary)' }}>{article.excerpt.slice(0, 150)}{(article.excerpt?.length ?? 0) > 150 ? '...' : ''}</p>}
                </div>
                {article.category && (
                  <span className="nexus-badge" style={{ background: '#006B6B', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 4, flexShrink: 0 }}>
                    {article.category}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        // Grouped by category when not searching
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-6)' }}>
          {categories.map(cat => {
            const catArticles = filtered.filter(a => a.category === cat)
            return (
              <section key={cat} aria-labelledby={`cat-${cat}`}>
                <h2 id={`cat-${cat}`} style={{ fontSize: 20, fontWeight: 700, marginBottom: 'var(--nexus-space-3)', borderBottom: '2px solid var(--nexus-color-primary)', paddingBottom: 'var(--nexus-space-2)' }}>
                  {cat}
                </h2>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {catArticles.map(article => (
                    <li key={article.id} style={{ borderBottom: '1px solid var(--nexus-color-border)' }}>
                      <Link
                        to={`/kb/${article.slug}`}
                        style={{ display: 'block', padding: 'var(--nexus-space-3) 0', textDecoration: 'none', color: 'var(--nexus-color-text)' }}
                      >
                        <span style={{ fontSize: 15, fontWeight: 500 }}>{article.title}</span>
                        {article.excerpt && <span style={{ display: 'block', fontSize: 13, color: 'var(--nexus-color-text-secondary)', marginTop: 2 }}>{article.excerpt.slice(0, 100)}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}

          {/* Uncategorized */}
          {filtered.filter(a => !a.category).length > 0 && (
            <section aria-labelledby="cat-uncategorized">
              <h2 id="cat-uncategorized" style={{ fontSize: 20, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Other</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {filtered.filter(a => !a.category).map(article => (
                  <li key={article.id} style={{ borderBottom: '1px solid var(--nexus-color-border)' }}>
                    <Link to={`/kb/${article.slug}`} style={{ display: 'block', padding: 'var(--nexus-space-3) 0', textDecoration: 'none', color: 'var(--nexus-color-text)', fontSize: 15, fontWeight: 500 }}>
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="nexus-pagination" aria-label="Pagination" style={{ marginTop: 'var(--nexus-space-5)' }}>
          <button className="nexus-btn nexus-btn--secondary nexus-btn--sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span style={{ fontSize: 14, color: 'var(--nexus-color-text-secondary)' }}>Page {page} of {totalPages}</span>
          <button className="nexus-btn nexus-btn--secondary nexus-btn--sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </nav>
      )}
    </div>
  )
}
