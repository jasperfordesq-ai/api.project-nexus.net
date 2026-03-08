// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Link } from 'react-router-dom'

export function AboutPage() {
  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">About</li>
        </ol>
      </nav>

      <div className="nexus-main--narrow">
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, margin: '0 0 var(--nexus-space-5)' }}>
          About Nexus Community
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-6)' }}>
          Nexus Community is a timebanking platform that helps people in local communities exchange skills
          and services without money. You earn time credits by helping others, and spend them when you
          need help yourself.
        </p>

        <section aria-labelledby="mission-heading" style={{ marginBottom: 'var(--nexus-space-7)' }}>
          <h2 id="mission-heading" style={{ fontSize: 26, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Our mission</h2>
          <p style={{ lineHeight: 1.8, marginBottom: 'var(--nexus-space-4)' }}>
            We believe that every person has something valuable to offer. Nexus Community exists to unlock that
            value, connecting people who need help with people who can provide it, using time as the currency.
          </p>
          <p style={{ lineHeight: 1.8 }}>
            One hour of your time equals one time credit, regardless of the service. A piano lesson is worth the
            same as garden maintenance or IT support. This equal-value principle is at the heart of everything we do.
          </p>
        </section>

        <section aria-labelledby="origin-heading" style={{ marginBottom: 'var(--nexus-space-7)' }}>
          <h2 id="origin-heading" style={{ fontSize: 26, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Origins</h2>
          <p style={{ lineHeight: 1.8, marginBottom: 'var(--nexus-space-4)' }}>
            Nexus Community was founded to support local timebanking initiatives. The platform is informed by
            social impact research commissioned by the West Cork Development Partnership, which demonstrated the
            measurable community benefit of structured skill-exchange networks.
          </p>
          <p style={{ lineHeight: 1.8 }}>
            The software is free and open source, licensed under the GNU Affero General Public License v3 (AGPL-3.0).
            Any community can run their own instance.
          </p>
        </section>

        <section aria-labelledby="team-heading" style={{ marginBottom: 'var(--nexus-space-7)' }}>
          <h2 id="team-heading" style={{ fontSize: 26, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Founders</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--nexus-space-4)' }}>
            {[
              { name: 'Jasper Ford', role: 'Creator and primary author' },
              { name: 'Mary Casey', role: 'Co-founder' },
            ].map((person) => (
              <div key={person.name} style={{
                background: 'var(--nexus-color-surface)',
                border: '1px solid var(--nexus-color-border)',
                borderRadius: 8,
                padding: 'var(--nexus-space-5)',
              }}>
                <p style={{ fontWeight: 700, fontSize: 18, margin: '0 0 4px' }}>{person.name}</p>
                <p style={{ margin: 0, color: 'var(--nexus-color-text-secondary)', fontSize: 14 }}>{person.role}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="acknowledgements-heading" style={{ marginBottom: 'var(--nexus-space-7)' }}>
          <h2 id="acknowledgements-heading" style={{ fontSize: 26, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Acknowledgements</h2>
          <p style={{ lineHeight: 1.8, marginBottom: 'var(--nexus-space-3)' }}>We gratefully acknowledge the support of:</p>
          <ul style={{ lineHeight: 1.8, paddingLeft: 'var(--nexus-space-5)' }}>
            <li>West Cork Development Partnership</li>
            <li>Fergal Conlon, SICAP Manager</li>
          </ul>
        </section>

        <div style={{ borderTop: '1px solid var(--nexus-color-border)', paddingTop: 'var(--nexus-space-6)' }}>
          <p style={{ marginBottom: 'var(--nexus-space-4)' }}>Ready to get started?</p>
          <div style={{ display: 'flex', gap: 'var(--nexus-space-3)', flexWrap: 'wrap' }}>
            <Link to="/register" className="nexus-btn nexus-btn--primary">Join for free</Link>
            <Link to="/how-it-works" className="nexus-btn nexus-btn--secondary">How it works</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
