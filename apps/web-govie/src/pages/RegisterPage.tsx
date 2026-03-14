// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateField = (name: string, value: string) => {
    let error = ''
    switch (name) {
      case 'firstName':
        if (!value.trim()) error = 'Enter your first name'
        break
      case 'lastName':
        if (!value.trim()) error = 'Enter your last name'
        break
      case 'email':
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Please enter a valid email address'
        break
      case 'password':
        if (value.length > 0 && value.length < 8) error = 'Password must be at least 8 characters'
        break
      case 'confirmPassword':
        if (value && value !== values.password) error = 'Passwords do not match'
        break
    }
    setFieldErrors(prev => ({ ...prev, [name]: error }))
  }

  const set =
    (field: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
      setValues((v) => ({ ...v, [field]: value }))
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
      if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: '' }))
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
                {errors.firstName && <span className="nexus-error-message" role="alert" id="firstName-error">{errors.firstName}</span>}
              </label>
              <input
                id="firstName"
                type="text"
                className={`nexus-input${errors.firstName || fieldErrors.firstName ? ' nexus-input--error' : ''}`}
                value={values.firstName}
                onChange={set('firstName')}
                onBlur={(e) => validateField('firstName', e.target.value)}
                autoComplete="given-name"
                aria-invalid={!!(errors.firstName || fieldErrors.firstName)}
                aria-describedby={errors.firstName ? 'firstName-error' : fieldErrors.firstName ? 'firstName-field-error' : undefined}
                style={{ maxWidth: '100%' }}
              />
              {fieldErrors.firstName && <span className="nexus-field-error" id="firstName-field-error">{fieldErrors.firstName}</span>}
            </div>
            <div className="nexus-form-group" id="field-lastName">
              <label htmlFor="lastName" className="nexus-label">
                Last name
                {errors.lastName && <span className="nexus-error-message" role="alert" id="lastName-error">{errors.lastName}</span>}
              </label>
              <input
                id="lastName"
                type="text"
                className={`nexus-input${errors.lastName || fieldErrors.lastName ? ' nexus-input--error' : ''}`}
                value={values.lastName}
                onChange={set('lastName')}
                onBlur={(e) => validateField('lastName', e.target.value)}
                autoComplete="family-name"
                aria-invalid={!!(errors.lastName || fieldErrors.lastName)}
                aria-describedby={errors.lastName ? 'lastName-error' : fieldErrors.lastName ? 'lastName-field-error' : undefined}
                style={{ maxWidth: '100%' }}
              />
              {fieldErrors.lastName && <span className="nexus-field-error" id="lastName-field-error">{fieldErrors.lastName}</span>}
            </div>
          </div>

          <div className="nexus-form-group" id="field-email">
            <label htmlFor="reg-email" className="nexus-label">
              Email address
              {errors.email && <span className="nexus-error-message" role="alert" id="email-error">{errors.email}</span>}
            </label>
            <input
              id="reg-email"
              type="email"
              className={`nexus-input${errors.email || fieldErrors.email ? ' nexus-input--error' : ''}`}
              value={values.email}
              onChange={set('email')}
              onBlur={(e) => validateField('email', e.target.value)}
              autoComplete="email"
              aria-invalid={!!(errors.email || fieldErrors.email)}
              aria-describedby={errors.email ? 'email-error' : fieldErrors.email ? 'email-field-error' : undefined}
            />
            {fieldErrors.email && <span className="nexus-field-error" id="email-field-error">{fieldErrors.email}</span>}
          </div>

          <div className="nexus-form-group" id="field-password">
            <label htmlFor="reg-password" className="nexus-label">
              Password
              <span className="nexus-label__hint">At least 8 characters</span>
              {errors.password && <span className="nexus-error-message" role="alert" id="password-error">{errors.password}</span>}
            </label>
            <input
              id="reg-password"
              type="password"
              className={`nexus-input${errors.password || fieldErrors.password ? ' nexus-input--error' : ''}`}
              value={values.password}
              onChange={set('password')}
              onBlur={(e) => validateField('password', e.target.value)}
              autoComplete="new-password"
              aria-invalid={!!(errors.password || fieldErrors.password)}
              aria-describedby={errors.password ? 'password-error' : fieldErrors.password ? 'password-field-error' : undefined}
            />
            {fieldErrors.password && <span className="nexus-field-error" id="password-field-error">{fieldErrors.password}</span>}
          </div>

          <div className="nexus-form-group" id="field-confirmPassword">
            <label htmlFor="confirmPassword" className="nexus-label">
              Confirm password
              {errors.confirmPassword && <span className="nexus-error-message" role="alert" id="confirmPassword-error">{errors.confirmPassword}</span>}
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={`nexus-input${errors.confirmPassword || fieldErrors.confirmPassword ? ' nexus-input--error' : ''}`}
              value={values.confirmPassword}
              onChange={set('confirmPassword')}
              onBlur={(e) => validateField('confirmPassword', e.target.value)}
              autoComplete="new-password"
              aria-invalid={!!(errors.confirmPassword || fieldErrors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : fieldErrors.confirmPassword ? 'confirmPassword-field-error' : undefined}
            />
            {fieldErrors.confirmPassword && <span className="nexus-field-error" id="confirmPassword-field-error">{fieldErrors.confirmPassword}</span>}
          </div>

          <div className="nexus-form-group" id="field-agreeTerms" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 'var(--nexus-space-3)' }}>
            <input
              id="agreeTerms"
              type="checkbox"
              checked={values.agreeTerms}
              onChange={set('agreeTerms')}
              aria-invalid={!!errors.agreeTerms}
              aria-describedby={errors.agreeTerms ? 'agreeTerms-error' : undefined}
              style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0 }}
            />
            <div>
              <label htmlFor="agreeTerms" style={{ cursor: 'pointer' }}>
                I agree to the{' '}
                <Link to="/legal/terms" target="_blank">terms of use</Link>
                {' '}and{' '}
                <Link to="/legal/privacy" target="_blank">privacy policy</Link>
              </label>
              {errors.agreeTerms && <span className="nexus-error-message" role="alert" id="agreeTerms-error" style={{ display: 'block' }}>{errors.agreeTerms}</span>}
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
