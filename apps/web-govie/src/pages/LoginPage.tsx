// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isApiError, useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = (location.state as { from?: { pathname: string } } | undefined)?.from?.pathname ?? '/'

  const validate = () => {
    const errs: typeof errors = {}
    if (!email.trim()) errs.email = 'Enter your email address'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address'
    if (!password) errs.password = 'Enter your password'
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      if (isApiError(err)) {
        if (err.statusCode === 401) {
          setErrors({ form: 'Email address or password is incorrect' })
        } else {
          setErrors({ form: err.message })
        }
      } else {
        setErrors({ form: 'Could not sign in. Please try again.' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="nexus-container">
      <div className="nexus-main--narrow" style={{ paddingBottom: 0 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, margin: '0 0 var(--nexus-space-5)' }}>
          Sign in
        </h1>

        {errors.form && (
          <div className="nexus-notification nexus-notification--error" role="alert">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="nexus-form" noValidate>
          {/* Email */}
          <div className="nexus-form-group">
            <label htmlFor="email" className="nexus-label">
              Email address
              {errors.email && (
                <span className="nexus-error-message" role="alert" id="email-error">
                  {errors.email}
                </span>
              )}
            </label>
            <input
              id="email"
              type="email"
              className={`nexus-input${errors.email ? ' nexus-input--error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              spellCheck={false}
            />
          </div>

          {/* Password */}
          <div className="nexus-form-group">
            <label htmlFor="password" className="nexus-label">
              Password
              {errors.password && (
                <span className="nexus-error-message" role="alert" id="pw-error">
                  {errors.password}
                </span>
              )}
            </label>
            <input
              id="password"
              type="password"
              className={`nexus-input${errors.password ? ' nexus-input--error' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'pw-error' : undefined}
            />
          </div>

          <div>
            <button
              type="submit"
              className="nexus-btn nexus-btn--primary"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </div>

          <p style={{ margin: 0 }}>
            <Link to="/forgot-password" style={{ color: 'var(--nexus-color-primary)' }}>
              Forgot your password?
            </Link>
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid var(--nexus-color-border)' }} />

          <p style={{ margin: 0, color: 'var(--nexus-color-text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ fontWeight: 700 }}>
              Join Nexus Community — it's free
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
