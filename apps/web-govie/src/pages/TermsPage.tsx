// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Link } from 'react-router-dom'

export function TermsPage() {
  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Terms of use</li>
        </ol>
      </nav>
      <div className="nexus-main--narrow">
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, margin: '0 0 var(--nexus-space-2)' }}>Terms of use</h1>
        <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-7)', fontSize: 14 }}>Last updated: January 2025</p>
        <div style={{ lineHeight: 1.8 }}>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>About the platform</h2>
            <p>Nexus Community is independent and not affiliated with any government body. By creating an account you agree to these terms.</p>
          </section>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Your account</h2>
            <ul style={{ paddingLeft: 'var(--nexus-space-5)' }}>
              <li>You must be 18 or older to create an account.</li>
              <li>You are responsible for maintaining the security of your credentials.</li>
              <li>You must provide accurate information during registration.</li>
              <li>One account per person.</li>
            </ul>
          </section>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Acceptable use</h2>
            <p style={{ marginBottom: 'var(--nexus-space-2)' }}>You agree not to:</p>
            <ul style={{ paddingLeft: 'var(--nexus-space-5)' }}>
              <li>offer or request any illegal service</li>
              <li>harass, abuse, or threaten other members</li>
              <li>post false or fraudulent listings</li>
              <li>use automated tools to scrape or abuse the platform</li>
              <li>impersonate another person or organisation</li>
              <li>exchange time credits for cash or monetary value</li>
            </ul>
          </section>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Time credits</h2>
            <p>Time credits have no monetary value and cannot be exchanged for cash. Credits may be adjusted by administrators to correct errors or address misuse.</p>
          </section>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Exchanges</h2>
            <p>Nexus facilitates connections but is not party to any exchange. We accept no liability for the quality or outcome of any service. Members are responsible for their own safety.</p>
          </section>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Disclaimer</h2>
            <p>The platform is provided as-is, without warranty. Use is at your own risk.</p>
          </section>
          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Governing law</h2>
            <p>These terms are governed by the laws of Ireland. Disputes are subject to Irish court jurisdiction.</p>
          </section>
        </div>
        <div style={{ borderTop: '1px solid var(--nexus-color-border)', paddingTop: 'var(--nexus-space-5)', marginTop: 'var(--nexus-space-6)' }}>
          <p style={{ fontSize: 14, color: 'var(--nexus-color-text-secondary)' }}>
            See also: <Link to="/legal/privacy">Privacy policy</Link> | <Link to="/legal/cookies">Cookie policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
