// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Enter your email address')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address')
      return
    }
    setIsSubmitting(true)
    try {
      await apiClient.post('/api/auth/forgot-password', { email: email.trim().toLowerCase() })
      setSubmitted(true)
    } catch (err) {
      if (isApiError(err)) setError(err.message)
      else setError('Could not process your request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="nexus-container">
        <div className="nexus-main--narrow">
          <div className="nexus-notification nexus-notification--success" role="status">
            If an account with that email exists, we have sent a password reset link.
            Please check your inbox.
          </div>
          <p style={{ marginTop: 'var(--nexus-space-4)' }}>
            <Link to="/login" style={{ color: 'var(--nexus-color-primary)', fontWeight: 700 }}>
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="nexus-container">
      <div className="nexus-main--narrow" style={{ paddingBottom: 0 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, margin: '0 0 var(--nexus-space-3)' }}>
          Forgot your password?
        </h1>
        <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-5)' }}>
          Enter your email address and we will send you a link to reset your password.
        </p>

        {error && (
          <div className="nexus-notification nexus-notification--error" role="alert" style={{ marginBottom: 'var(--nexus-space-4)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="nexus-form" noValidate>
          <div className="nexus-form-group">
            <label htmlFor="email" className="nexus-label">Email address</label>
            <input
              id="email"
              type="email"
              className={`nexus-input${error ? ' nexus-input--error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              spellCheck={false}
            />
          </div>

          <div>
            <button
              type="submit"
              className="nexus-btn nexus-btn--primary"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Sending…' : 'Send reset link'}
            </button>
          </div>

          <p style={{ margin: 0 }}>
            <Link to="/login" style={{ color: 'var(--nexus-color-primary)' }}>
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
