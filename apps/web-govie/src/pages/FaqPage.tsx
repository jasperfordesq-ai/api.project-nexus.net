// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from 'react'
import { Link } from 'react-router-dom'

const sections = [
  { heading: 'Getting started', items: [
    { q: 'Is Nexus Community free to join?', a: 'Yes. There are no subscription fees, no transaction fees. Time credits are the only currency.' },
    { q: 'Who can join?', a: 'Anyone. You do not need particular skills or qualifications, just time and willingness to help.' },
    { q: 'How do I earn time credits?', a: 'You earn 1 time credit for every hour you spend helping another member.' },
    { q: 'Can I start spending credits before I have earned any?', a: 'New members receive a small starting balance so they can request help straight away.' },
  ]},
  { heading: 'Services and exchanges', items: [
    { q: 'What kinds of services can I offer?', a: 'Any legal service: gardening, tutoring, cooking, childcare, IT support, transport, music lessons, and more.' },
    { q: 'Can I offer online services?', a: 'Yes. Many members offer services online. Mark your listing location as Online.' },
    { q: 'What if an exchange does not go well?', a: 'We encourage direct resolution. If not possible, contact support. Credits only transfer on confirmed completion.' },
  ]},
  { heading: 'Account and privacy', items: [
    { q: 'What personal information do you collect?', a: 'Your name, email, and any profile information you choose to share. No payment details. See our privacy policy.' },
    { q: 'Can I delete my account?', a: 'Yes. Request deletion from your profile settings at any time.' },
    { q: 'Is Nexus Community a government service?', a: 'No. We are independent and not affiliated with any Irish government body.' },
  ]},
  { heading: 'Technical', items: [
    { q: 'Is the software open source?', a: 'Yes. Licensed under AGPL-3.0. Source code is available on request.' },
    { q: 'Can my community run its own instance?', a: 'Yes, the platform is multi-tenant. Contact us to discuss.' },
  ]},
]

function Accordion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid var(--nexus-color-border)' }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: 'var(--nexus-space-4) 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 16, fontWeight: 600, color: 'var(--nexus-color-text)', gap: 'var(--nexus-space-3)' }}>
        <span>{q}</span>
        <span style={{ fontSize: 20, color: 'var(--nexus-color-primary)', flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }} aria-hidden="true">+</span>
      </button>
      {open && <div style={{ paddingBottom: 'var(--nexus-space-4)', lineHeight: 1.8, color: 'var(--nexus-color-text-secondary)' }}>{a}</div>}
    </div>
  )
}

export function FaqPage() {
  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Frequently asked questions</li>
        </ol>
      </nav>
      <div className="nexus-main--narrow">
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, margin: '0 0 var(--nexus-space-3)' }}>Frequently asked questions</h1>
        <p style={{ fontSize: 18, color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-7)', lineHeight: 1.7 }}>
          Cannot find what you need? <Link to="/register">Create an account</Link> and message us directly.
        </p>
        {sections.map((section) => (
          <section key={section.heading} style={{ marginBottom: 'var(--nexus-space-7)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-3)', color: 'var(--nexus-color-primary)' }}>{section.heading}</h2>
            <div>{section.items.map((item) => <Accordion key={item.q} q={item.q} a={item.a} />)}</div>
          </section>
        ))}
      </div>
    </div>
  )
}
