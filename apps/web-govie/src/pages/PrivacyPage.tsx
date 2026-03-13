// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { Link } from 'react-router-dom'

export function PrivacyPage() {
  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Privacy policy</li>
        </ol>
      </nav>
      <div className="nexus-main--narrow">
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, margin: '0 0 var(--nexus-space-2)' }}>Privacy policy</h1>
        <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-7)', fontSize: 14 }}>Last updated: January 2025</p>
        <div style={{ lineHeight: 1.8 }}>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Who we are</h2>
            <p>Nexus Community is an independent community timebanking platform, not affiliated with any government body.</p>
          </section>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>What data we collect</h2>
            <ul style={{ paddingLeft: 'var(--nexus-space-5)' }}>
              <li><strong>Account data:</strong> name, email, password hash</li>
              <li><strong>Profile data:</strong> bio, location, photo (optional)</li>
              <li><strong>Service listings:</strong> titles, descriptions, tags</li>
              <li><strong>Exchange records:</strong> anonymised credit transfer logs</li>
              <li><strong>Messages:</strong> content you send through the platform</li>
              <li><strong>Usage data:</strong> server logs (IP, browser, pages visited)</li>
            </ul>
          </section>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>How we use your data</h2>
            <ul style={{ paddingLeft: 'var(--nexus-space-5)' }}>
              <li>Operate and maintain the platform</li>
              <li>Enable member connections and exchanges</li>
              <li>Send transactional emails (verification, password reset)</li>
              <li>Detect and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Legal basis</h2>
            <p>Article 6(1)(b) GDPR (contract performance) for account and exchange data; Article 6(1)(f) (legitimate interests) for fraud prevention.</p>
          </section>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Data sharing</h2>
            <p>We do not sell your data. We share only with hosting providers (under DPA) and with courts or law enforcement where legally required.</p>
          </section>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Your rights</h2>
            <p>Under GDPR you have rights of access, correction, erasure, objection, portability, and to complain to the Data Protection Commission (Ireland).</p>
          </section>
          <section style={{ marginBottom: 'var(--nexus-space-6)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Retention</h2>
            <p>Account data is retained while your account is active. Personal identifiers are removed within 30 days of account deletion.</p>
          </section>
          <section>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)' }}>Cookies</h2>
            <p>Only essential authentication cookies are used. See our <Link to="/legal/cookies">cookie policy</Link>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
