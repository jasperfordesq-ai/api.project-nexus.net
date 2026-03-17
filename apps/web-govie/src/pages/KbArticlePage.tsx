// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

interface KbArticle {
  id: number
  title: string
  content: string
  category?: string
  slug: string
  viewCount: number
  updatedAt: string
  createdAt: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapArticle(raw: any): KbArticle {
  return {
    id: raw.id,
    title: raw.title ?? '',
    content: raw.content ?? '',
    category: raw.category ?? raw.category_name ?? raw.categoryName ?? undefined,
    slug: raw.slug ?? String(raw.id),
    viewCount: raw.view_count ?? raw.viewCount ?? 0,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? '',
    createdAt: raw.created_at ?? raw.createdAt ?? '',
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function KbArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<KbArticle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get(`/api/knowledge/articles/${slug}`)
      .then(r => setArticle(mapArticle(r.data)))
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load article.'))
      .finally(() => setIsLoading(false))
  }, [slug])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading article..." /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>
  if (!article) return null

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/kb">Knowledge Base</Link></li>
          <li aria-current="page">{article.title}</li>
        </ol>
      </nav>

      <article style={{ maxWidth: 740 }}>
        <header style={{ marginBottom: 'var(--nexus-space-5)' }}>
          {article.category && (
            <span className="nexus-badge" style={{ background: '#006B6B', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 4, marginBottom: 'var(--nexus-space-3)', display: 'inline-block' }}>
              {article.category}
            </span>
          )}
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: '0 0 var(--nexus-space-3)' }}>{article.title}</h1>
          <p style={{ fontSize: 13, color: 'var(--nexus-color-text-secondary)', margin: 0 }}>
            Last updated {new Date(article.updatedAt || article.createdAt).toLocaleDateString('en-IE', { dateStyle: 'long' })}
            {article.viewCount > 0 && <> &middot; {article.viewCount} views</>}
          </p>
        </header>

        <div
          style={{ lineHeight: 1.7, fontSize: 16 }}
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </article>
    </div>
  )
}
