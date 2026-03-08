// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isApiError, useAuth } from '../context/AuthContext'

interface FormValues {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  agreeTerms: boolean
}

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  confirmPassword?: string
  agreeTerms?: string
  form?: string
}

function validate(values: FormValues): FormErrors {
  const e: FormErrors = {}
  if (!values.firstName.trim()) e.firstName = 'Enter your first name'
  if (!values.lastName.trim()) e.lastName = 'Enter your last name'
  if (!values.email.trim()) e.email = 'Enter your email address'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) e.email = 'Enter a valid email address'
  if (!values.password) e.password = 'Enter a password'
  else if (values.password.length < 8) e.password = 'Password must be at least 8 characters'
  if (values.password !== values.confirmPassword) e.confirmPassword = 'Passwords do not match'
  if (!values.agreeTerms) e.agreeTerms = 'You must agree to the terms to continue'
  return e
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [values, setValues] = useState<FormValues>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const set =
    (field: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
      setValues((v) => ({ ...v, [field]: value }))
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(values)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setIsSubmitting(true)
    setErrors({})
    try {
      await register(values.email, values.password, values.firstName, values.lastName)
      navigate('/', { replace: true })
    } catch (err) {
      if (isApiError(err)) {
        if (err.statusCode === 409) {
          setErrors({ email: 'An account with this email address already exists' })
        } else {
          setErrors({ form: err.message })
        }
      } else {
        setErrors({ form: 'Registration failed. Please try again.' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasErrors = Object.keys(errors).filter((k) => k !== 'form').length > 0

  return (
    <div className="nexus-container">
      <div className="nexus-main--narrow" style={{ paddingBottom: 0 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, margin: '0 0 var(--nexus-space-5)' }}>
          Join Nexus Community
        </h1>
        <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-5)' }}>
          Create your free account and start exchanging skills with your community.
        </p>

        {/* Error summary */}
        {hasErrors && (
          <div className="nexus-notification nexus-notification--error" role="alert">
            <strong>There is a problem</strong>
            <ul style={{ margin: 'var(--nexus-space-2) 0 0', paddingLeft: 'var(--nexus-space-4)' }}>
              {Object.entries(errors)
                .filter(([k]) => k !== 'form')
                .map(([field, msg]) => (
                  <li key={field}>
                    <a href={`#field-${field}`} style={{ color: 'inherit' }}>{msg}</a>
                  </li>
                ))}
            </ul>
          </div>
        )}
        {errors.form && (
          <div className="nexus-notification nexus-notification--error" role="alert">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="nexus-form" noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--nexus-space-4)' }}>
            <div className="nexus-form-group" id="field-firstName">
              <label htmlFor="firstName" className="nexus-label">
                First name
                {errors.firstName && <span className="nexus-error-message" role="alert">{errors.firstName}</span>}
              </label>
              <input
                id="firstName"
                type="text"
                className={`nexus-input${errors.firstName ? ' nexus-input--error' : ''}`}
                value={values.firstName}
                onChange={set('firstName')}
                autoComplete="given-name"
                aria-invalid={!!errors.firstName}
                style={{ maxWidth: '100%' }}
              />
            </div>
            <div className="nexus-form-group" id="field-lastName">
              <label htmlFor="lastName" className="nexus-label">
                Last name
                {errors.lastName && <span className="nexus-error-message" role="alert">{errors.lastName}</span>}
              </label>
              <input
                id="lastName"
                type="text"
                className={`nexus-input${errors.lastName ? ' nexus-input--error' : ''}`}
                value={values.lastName}
                onChange={set('lastName')}
                autoComplete="family-name"
                aria-invalid={!!errors.lastName}
                style={{ maxWidth: '100%' }}
              />
            </div>
          </div>

          <div className="nexus-form-group" id="field-email">
            <label htmlFor="reg-email" className="nexus-label">
              Email address
              {errors.email && <span className="nexus-error-message" role="alert">{errors.email}</span>}
            </label>
            <input
              id="reg-email"
              type="email"
              className={`nexus-input${errors.email ? ' nexus-input--error' : ''}`}
              value={values.email}
              onChange={set('email')}
              autoComplete="email"
              aria-invalid={!!errors.email}
            />
          </div>

          <div className="nexus-form-group" id="field-password">
            <label htmlFor="reg-password" className="nexus-label">
              Password
              <span className="nexus-label__hint">At least 8 characters</span>
              {errors.password && <span className="nexus-error-message" role="alert">{errors.password}</span>}
            </label>
            <input
              id="reg-password"
              type="password"
              className={`nexus-input${errors.password ? ' nexus-input--error' : ''}`}
              value={values.password}
              onChange={set('password')}
              autoComplete="new-password"
              aria-invalid={!!errors.password}
            />
          </div>

          <div className="nexus-form-group" id="field-confirmPassword">
            <label htmlFor="confirmPassword" className="nexus-label">
              Confirm password
              {errors.confirmPassword && <span className="nexus-error-message" role="alert">{errors.confirmPassword}</span>}
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={`nexus-input${errors.confirmPassword ? ' nexus-input--error' : ''}`}
              value={values.confirmPassword}
              onChange={set('confirmPassword')}
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
            />
          </div>

          <div className="nexus-form-group" id="field-agreeTerms" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 'var(--nexus-space-3)' }}>
            <input
              id="agreeTerms"
              type="checkbox"
              checked={values.agreeTerms}
              onChange={set('agreeTerms')}
              aria-invalid={!!errors.agreeTerms}
              style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0 }}
            />
            <div>
              <label htmlFor="agreeTerms" style={{ cursor: 'pointer' }}>
                I agree to the{' '}
                <Link to="/legal/terms" target="_blank">terms of use</Link>
                {' '}and{' '}
                <Link to="/legal/privacy" target="_blank">privacy policy</Link>
              </label>
              {errors.agreeTerms && <span className="nexus-error-message" role="alert" style={{ display: 'block' }}>{errors.agreeTerms}</span>}
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="nexus-btn nexus-btn--primary"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </div>

          <p style={{ margin: 0, color: 'var(--nexus-color-text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 700 }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
