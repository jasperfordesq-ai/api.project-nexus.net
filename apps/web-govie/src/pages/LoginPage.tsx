// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = (location.state as { from?: { pathname: string } } | undefined)?.from?.pathname ?? '/'

  const validateField = (name: string, value: string) => {
    let error = ''
    switch (name) {
      case 'email':
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Please enter a valid email address'
        break
      case 'password':
        if (value.length > 0 && value.length === 0) error = 'Enter your password'
        break
    }
    setFieldErrors(prev => ({ ...prev, [name]: error }))
  }

  const validate = () => {
    const errs: typeof errors = {}
    if (!email.trim()) errs.email = 'Enter your email address'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address'
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
              className={`nexus-input${errors.email || fieldErrors.email ? ' nexus-input--error' : ''}`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' })) }}
              onBlur={(e) => validateField('email', e.target.value)}
              autoComplete="email"
              aria-invalid={!!(errors.email || fieldErrors.email)}
              aria-describedby={errors.email ? 'email-error' : fieldErrors.email ? 'email-field-error' : undefined}
              spellCheck={false}
            />
            {fieldErrors.email && <span className="nexus-field-error" id="email-field-error">{fieldErrors.email}</span>}
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
              className={`nexus-input${errors.password || fieldErrors.password ? ' nexus-input--error' : ''}`}
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' })) }}
              onBlur={(e) => { if (e.target.value.length === 0 && password.length > 0) setFieldErrors(prev => ({ ...prev, password: 'Enter your password' })) }}
              autoComplete="current-password"
              aria-invalid={!!(errors.password || fieldErrors.password)}
              aria-describedby={errors.password ? 'pw-error' : fieldErrors.password ? 'pw-field-error' : undefined}
            />
            {fieldErrors.password && <span className="nexus-field-error" id="pw-field-error">{fieldErrors.password}</span>}
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
