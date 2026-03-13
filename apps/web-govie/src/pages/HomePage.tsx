// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listingsApi } from '../api/listings'
import type { Listing } from '../api/types'
import { isApiError } from '../context/AuthContext'

const FEATURE_CATEGORIES = [
  { icon: '🔧', label: 'Home & Garden', slug: 'home-garden' },
  { icon: '📚', label: 'Education & Tutoring', slug: 'education' },
  { icon: '🚗', label: 'Transport & Errands', slug: 'transport' },
  { icon: '💻', label: 'Tech Support', slug: 'tech' },
  { icon: '🍳', label: 'Cooking & Meals', slug: 'cooking' },
  { icon: '🎨', label: 'Creative Arts', slug: 'creative' },
  { icon: '👶', label: 'Childcare & Family', slug: 'childcare' },
  { icon: '🐾', label: 'Pet Care', slug: 'pets' },
]

export function HomePage() {
  const [recentListings, setRecentListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    listingsApi
      .list({ page: 1, pageSize: 3 })
      .then((data) => setRecentListings(data.items ?? []))
      .catch((err) => {
        if (isApiError(err)) console.warn('Could not load listings preview:', err.message)
      })
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="nexus-hero" aria-labelledby="hero-heading">
        <div className="nexus-hero__inner">
          <span className="nexus-hero__tag">Community time exchange</span>
          <h1 className="nexus-hero__title" id="hero-heading">
            Share skills.<br />Earn time credits.<br />Build community.
          </h1>
          <p className="nexus-hero__lead">
            Nexus Community connects neighbours who want to help and neighbours who need a hand.
            One hour of your time earns one time credit — spend it on anything another member offers.
          </p>
          <div className="nexus-hero__actions">
            <Link to="/register" className="nexus-btn nexus-btn--primary">
              Join the community
            </Link>
            <Link to="/services" className="nexus-btn nexus-btn--secondary">
              Browse services
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Stats ────────────────────────────────────────────────────────── */}
      <section aria-label="Platform statistics">
        <div className="nexus-container" style={{ paddingTop: 'var(--nexus-space-7)' }}>
          <div className="nexus-stats">
            <div className="nexus-stat">
              <p className="nexus-stat__value">1,240+</p>
              <p className="nexus-stat__label">Active members</p>
            </div>
            <div className="nexus-stat">
              <p className="nexus-stat__value">3,800+</p>
              <p className="nexus-stat__label">Hours exchanged</p>
            </div>
            <div className="nexus-stat">
              <p className="nexus-stat__value">420+</p>
              <p className="nexus-stat__label">Services listed</p>
            </div>
            <div className="nexus-stat">
              <p className="nexus-stat__value">32</p>
              <p className="nexus-stat__label">Skill categories</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Categories ───────────────────────────────────────────────────── */}
      <section className="nexus-section" aria-labelledby="categories-heading">
        <div className="nexus-section-header">
          <h2 className="nexus-section-title" id="categories-heading">
            What can you find?
          </h2>
          <p className="nexus-section-lead">
            Members offer and request help across dozens of everyday categories.
          </p>
        </div>
        <div className="nexus-container">
          <div className="nexus-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            {FEATURE_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/services?category=${cat.slug}`}
                className="nexus-card"
                style={{ textDecoration: 'none', textAlign: 'center', gap: 'var(--nexus-space-2)' }}
              >
                <span style={{ fontSize: 36 }} aria-hidden="true">{cat.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--nexus-color-text)' }}>
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Recent listings ─────────────────────────────────────────────── */}
      {!isLoading && recentListings.length > 0 && (
        <section className="nexus-section" aria-labelledby="recent-heading"
          style={{ background: 'var(--nexus-color-surface)', borderTop: '1px solid var(--nexus-color-border)' }}>
          <div className="nexus-section-header">
            <h2 className="nexus-section-title" id="recent-heading">Recently posted</h2>
            <p className="nexus-section-lead">
              New services added by community members.
            </p>
          </div>
          <div className="nexus-container">
            <div className="nexus-cards">
              {recentListings.map((listing) => (
                <article key={listing.id} className="nexus-card">
                  <div className="nexus-card__type">
                    <span className={`nexus-badge nexus-badge--${listing.type}`}>
                      {listing.type === 'offer' ? 'Offering' : 'Requesting'}
                    </span>
                  </div>
                  <h3 className="nexus-card__title">
                    <Link to={`/services/${listing.id}`}>{listing.title}</Link>
                  </h3>
                  <p className="nexus-card__body">
                    {listing.description.length > 120
                      ? listing.description.slice(0, 120) + '…'
                      : listing.description}
                  </p>
                  <div className="nexus-card__meta">
                    <span className="nexus-card__meta-item">
                      <span aria-hidden="true">⏱</span>
                      <span className={`nexus-badge nexus-badge--credits`}>
                        {listing.creditRate} credit{listing.creditRate !== 1 ? 's' : ''}/hr
                      </span>
                    </span>
                    <span className="nexus-card__meta-item">{listing.category}</span>
                  </div>
                </article>
              ))}
            </div>
            <div style={{ marginTop: 'var(--nexus-space-5)' }}>
              <Link to="/services" className="nexus-btn nexus-btn--secondary">
                View all services →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── How it works ────────────────────────────────────────────────── */}
      <section className="nexus-section" aria-labelledby="how-heading">
        <div className="nexus-section-header">
          <h2 className="nexus-section-title" id="how-heading">How time exchange works</h2>
        </div>
        <div className="nexus-container">
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-5)' }}>
            {[
              { step: '1', title: 'Join for free', body: 'Create your account, add a short bio, and describe the skills you can offer.' },
              { step: '2', title: 'Post a service', body: 'List what you can do — gardening, tutoring, IT help, lifts, cooking — anything goes.' },
              { step: '3', title: 'Exchange and earn', body: 'Help a neighbour for one hour and earn one time credit. Everyone\'s time is valued equally.' },
              { step: '4', title: 'Spend your credits', body: 'Request help from any other member and spend your earned time credits.' },
            ].map((item) => (
              <li key={item.step} style={{ display: 'flex', gap: 'var(--nexus-space-4)', alignItems: 'flex-start' }}>
                <span style={{
                  flexShrink: 0,
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--nexus-color-primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 900,
                }} aria-hidden="true">
                  {item.step}
                </span>
                <div>
                  <h3 style={{ margin: '0 0 var(--nexus-space-1)', fontSize: 20 }}>{item.title}</h3>
                  <p style={{ margin: 0, color: 'var(--nexus-color-text-secondary)', lineHeight: 1.6 }}>{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div style={{ marginTop: 'var(--nexus-space-6)' }}>
            <Link to="/register" className="nexus-btn nexus-btn--primary">
              Get started — it's free
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
