// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { Link } from 'react-router-dom'

const cookieRows = [
  { name: 'nexus_access_token', purpose: 'Stores your authentication token to keep you signed in', duration: 'Session', type: 'Essential' },
  { name: 'nexus_refresh_token', purpose: 'Allows your session to be extended without re-entering your password', duration: '30 days', type: 'Essential' },
]

export function CookiesPage() {
  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Cookie policy</li>
        </ol>
      </nav>
      <div className="nexus-main--narrow">
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, margin: '0 0 var(--nexus-space-2)' }}>Cookie policy</h1>
        <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-7)', fontSize: 14 }}>Last updated: January 2025</p>
        <div style={{ lineHeight: 1.8 }}>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>What are cookies?</h2>
            <p>Cookies are small text files placed on your device by websites you visit, used to make sites work and remember preferences.</p>
          </section>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Cookies we use</h2>
            <p style={{ marginBottom: 'var(--nexus-space-4)' }}>We use only strictly necessary cookies. No tracking, analytics, or advertising cookies.</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                <thead>
                  <tr style={{ background: 'var(--nexus-color-surface)' }}>
                    {['Name', 'Purpose', 'Duration', 'Type'].map((h) => (
                      <th key={h} style={{ padding: 'var(--nexus-space-3)', textAlign: 'left', borderBottom: '2px solid var(--nexus-color-border)', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cookieRows.map((row, i) => (
                    <tr key={row.name} style={{ background: i % 2 === 0 ? 'white' : 'var(--nexus-color-surface)' }}>
                      <td style={{ padding: 'var(--nexus-space-3)', borderBottom: '1px solid var(--nexus-color-border)', fontFamily: 'monospace', fontSize: 13 }}>{row.name}</td>
                      <td style={{ padding: 'var(--nexus-space-3)', borderBottom: '1px solid var(--nexus-color-border)' }}>{row.purpose}</td>
                      <td style={{ padding: 'var(--nexus-space-3)', borderBottom: '1px solid var(--nexus-color-border)' }}>{row.duration}</td>
                      <td style={{ padding: 'var(--nexus-space-3)', borderBottom: '1px solid var(--nexus-color-border)' }}>{row.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Third-party cookies</h2>
            <p>We do not use third-party scripts or services that set cookies. No social media widgets, advertising, or analytics.</p>
          </section>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>How to control cookies</h2>
            <p>You can control cookies in your browser settings. Disabling essential cookies will prevent you from signing in.</p>
          </section>
          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>More information</h2>
            <p>See our <Link to="/legal/privacy">privacy policy</Link> for full details of how we handle your data.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
