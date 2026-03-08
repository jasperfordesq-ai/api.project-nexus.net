// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Link } from 'react-router-dom'

const steps = [
  { number: '01', title: 'Create a free account', body: 'Sign up with your name and email. It takes less than two minutes and there is no subscription fee.' },
  { number: '02', title: 'Browse or post a service', body: 'Search for help you need, or post a listing describing what you can offer. You set the credit rate — most services use 1 credit per hour.' },
  { number: '03', title: 'Connect and exchange', body: 'Message a member directly to agree a time that suits you both. Complete the exchange, and credits move automatically.' },
  { number: '04', title: 'Earn credits, spend credits', body: 'Every hour you give earns 1 time credit. Spend your credits whenever you need support from the community.' },
]

const faqs = [
  { q: 'Is it really free?', a: 'Yes. There are no fees to join or to exchange services. Time credits are the only currency.' },
  { q: 'What if I need more help than I can give?', a: 'New members start with a small credit balance to get them going. The community understands that contributions ebb and flow over time.' },
  { q: 'What kinds of services are exchanged?', a: 'Anything legal and community-appropriate: gardening, childcare, tutoring, cooking, IT help, music lessons, transport, and much more.' },
  { q: 'Is my data safe?', a: 'We store only what we need to run the platform. We never sell your data. See our privacy policy for full details.' },
]

export function HowItWorksPage() {
  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">How it works</li>
        </ol>
      </nav>

      <div className="nexus-main--narrow">
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, margin: '0 0 var(--nexus-space-3)' }}>
          How Nexus Community works
        </h1>
        <p style={{ fontSize: 18, color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-7)', lineHeight: 1.7 }}>
          Time is the only currency. One hour of your help equals one time credit, no matter what you do.
        </p>

        <section aria-labelledby="steps-heading" style={{ marginBottom: 'var(--nexus-space-8)' }}>
          <h2 id="steps-heading" className="nexus-sr-only">Four steps to get started</h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-5)' }}>
            {steps.map((step) => (
              <li key={step.number} style={{
                display: 'grid',
                gridTemplateColumns: '64px 1fr',
                gap: 'var(--nexus-space-5)',
                alignItems: 'start',
                background: 'var(--nexus-color-surface)',
                border: '1px solid var(--nexus-color-border)',
                borderRadius: 8,
                padding: 'var(--nexus-space-5)',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'var(--nexus-color-primary)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 900, flexShrink: 0,
                }} aria-hidden="true">{step.number}</div>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 var(--nexus-space-2)' }}>{step.title}</h3>
                  <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--nexus-color-text-secondary)' }}>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="credits-heading" style={{
          background: 'var(--nexus-color-primary)', borderRadius: 8,
          padding: 'var(--nexus-space-6)', color: 'white', marginBottom: 'var(--nexus-space-8)',
        }}>
          <h2 id="credits-heading" style={{ fontSize: 24, fontWeight: 700, margin: '0 0 var(--nexus-space-4)', color: 'white' }}>
            The time credit principle
          </h2>
          <p style={{ margin: '0 0 var(--nexus-space-3)', lineHeight: 1.7, color: 'rgba(255,255,255,0.9)' }}>
            Every hour of service is worth exactly 1 time credit, regardless of what the service is.
            A senior developer's hour is worth the same as a gardener's hour.
          </p>
          <p style={{ margin: 0, lineHeight: 1.7, color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>
            This is not a valuation of your skills. It is a recognition that your time is equally precious.
          </p>
        </section>

        <section aria-labelledby="faq-heading" style={{ marginBottom: 'var(--nexus-space-7)' }}>
          <h2 id="faq-heading" style={{ fontSize: 26, fontWeight: 700, marginBottom: 'var(--nexus-space-5)' }}>Common questions</h2>
          <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-4)' }}>
            {faqs.map((item) => (
              <div key={item.q} style={{ borderLeft: '4px solid var(--nexus-color-primary)', paddingLeft: 'var(--nexus-space-4)' }}>
                <dt style={{ fontWeight: 700, fontSize: 17, marginBottom: 'var(--nexus-space-2)' }}>{item.q}</dt>
                <dd style={{ margin: 0, lineHeight: 1.7, color: 'var(--nexus-color-text-secondary)' }}>{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div style={{ borderTop: '1px solid var(--nexus-color-border)', paddingTop: 'var(--nexus-space-6)' }}>
          <div style={{ display: 'flex', gap: 'var(--nexus-space-3)', flexWrap: 'wrap' }}>
            <Link to="/register" className="nexus-btn nexus-btn--primary">Get started, it is free</Link>
            <Link to="/services" className="nexus-btn nexus-btn--secondary">Browse services</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
