// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/*
 * SubmitServicePage — form example using GOV.IE design-system patterns
 *
 * Demonstrates:
 * - Accessible form structure (labels, hints, error messages)
 * - GOV.IE-style form group pattern (one question per page concept)
 * - Inline validation feedback
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listingsApi } from '../api/listings'
import { isApiError } from '../context/AuthContext'

const CATEGORIES = [
  { id: 1, name: 'Education' },
  { id: 2, name: 'Home & Garden' },
  { id: 3, name: 'Tech Support' },
  { id: 4, name: 'Transport' },
  { id: 5, name: 'Cooking' },
  { id: 6, name: 'Creative Arts' },
  { id: 7, name: 'Childcare' },
  { id: 8, name: 'Pets' },
  { id: 9, name: 'Healthcare' },
  { id: 10, name: 'Admin & Office' },
  { id: 11, name: 'Other' },
]

interface FormValues {
  title: string
  description: string
  type: 'offer' | 'request'
  category: string
  creditRate: string
  location: string
  tags: string
}

interface FormErrors {
  title?: string
  description?: string
  type?: string
  category?: string
  creditRate?: string
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}
  if (!values.title.trim()) errors.title = 'Enter a title for your service'
  else if (values.title.trim().length < 5) errors.title = 'Title must be at least 5 characters'
  if (!values.description.trim()) errors.description = 'Enter a description'
  else if (values.description.trim().length < 20) errors.description = 'Description must be at least 20 characters'
  if (!values.type) errors.type = 'Select whether you are offering or requesting'
  if (!values.category) errors.category = 'Select a category'
  const rate = Number(values.creditRate)
  if (!values.creditRate || isNaN(rate) || rate < 0.5 || rate > 10) {
    errors.creditRate = 'Credit rate must be between 0.5 and 10 per hour'
  }
  return errors
}

export function SubmitServicePage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<FormValues>({
    title: '',
    description: '',
    type: 'offer',
    category: '',
    creditRate: '1',
    location: '',
    tags: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const set = (field: keyof FormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    // Clear field error on change
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(values)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      // Move focus to first error
      const firstErrorField = document.querySelector('[aria-invalid="true"]') as HTMLElement | null
      firstErrorField?.focus()
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const listing = await listingsApi.create({
        title: values.title.trim(),
        description: values.description.trim(),
        type: values.type,
        categoryId: values.category ? Number(values.category) : undefined,
        creditRate: Number(values.creditRate),
        location: values.location.trim() || undefined,
        tags: values.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })
      setSubmitted(true)
      setTimeout(() => navigate(`/services/${listing.id}`), 1500)
    } catch (err) {
      if (isApiError(err)) setSubmitError(err.message)
      else setSubmitError('Could not submit your service. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="nexus-container">
        <div className="nexus-notification nexus-notification--success" role="status" aria-live="polite">
          ✓ Your service has been posted! Redirecting…
        </div>
      </div>
    )
  }

  return (
    <div className="nexus-container">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/services">Services</Link></li>
          <li aria-current="page">Post a service</li>
        </ol>
      </nav>

      {/* Error summary (GOV.IE pattern) */}
      {Object.keys(errors).length > 0 && (
        <div
          className="nexus-notification nexus-notification--error"
          role="alert"
          aria-labelledby="error-summary-title"
          tabIndex={-1}
          id="error-summary"
        >
          <h2 id="error-summary-title" style={{ margin: '0 0 var(--nexus-space-2)', fontSize: 18 }}>
            There is a problem
          </h2>
          <ul style={{ margin: 0, paddingLeft: 'var(--nexus-space-4)' }}>
            {Object.entries(errors).map(([field, msg]) => (
              <li key={field}>
                <a href={`#field-${field}`} style={{ color: 'inherit' }}>{msg}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="nexus-main--narrow" style={{ paddingBottom: 0 }}>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: '0 0 var(--nexus-space-2)' }}>
          Post a service
        </h1>
        <p style={{ color: 'var(--nexus-color-text-secondary)', marginBottom: 'var(--nexus-space-6)' }}>
          Tell the community what you can offer or what help you need. All fields are required unless marked optional.
        </p>

        {submitError && (
          <div className="nexus-notification nexus-notification--error" role="alert">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="nexus-form" noValidate>
          {/* Offer / Request toggle */}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="nexus-label" style={{ marginBottom: 'var(--nexus-space-2)' }}>
              Are you offering or requesting?
              {errors.type && <span className="nexus-error-message" role="alert" style={{ display: 'block' }}>{errors.type}</span>}
            </legend>
            <div style={{ display: 'flex', gap: 'var(--nexus-space-3)' }}>
              {(['offer', 'request'] as const).map((t) => (
                <label key={t} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--nexus-space-2)',
                  padding: 'var(--nexus-space-3) var(--nexus-space-4)',
                  border: `2px solid ${values.type === t ? 'var(--nexus-color-primary)' : 'var(--nexus-color-border)'}`,
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: values.type === t ? 'var(--nexus-color-primary-light)' : 'white',
                  fontWeight: values.type === t ? 700 : 400,
                }}>
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={values.type === t}
                    onChange={set('type')}
                    aria-invalid={!!errors.type}
                  />
                  {t === 'offer' ? 'I\'m offering help' : 'I\'m requesting help'}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Title */}
          <div className="nexus-form-group" id="field-title">
            <label htmlFor="title" className="nexus-label">
              Service title
              <span className="nexus-label__hint">A short, clear name for your service</span>
              {errors.title && <span className="nexus-error-message" role="alert" id="title-error">{errors.title}</span>}
            </label>
            <input
              id="title"
              type="text"
              className={`nexus-input${errors.title ? ' nexus-input--error' : ''}`}
              value={values.title}
              onChange={set('title')}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'title-error' : undefined}
              placeholder="e.g. Friendly driving lessons for beginners"
              maxLength={120}
            />
          </div>

          {/* Description */}
          <div className="nexus-form-group" id="field-description">
            <label htmlFor="description" className="nexus-label">
              Description
              <span className="nexus-label__hint">
                Describe what's involved, your experience, and any conditions
              </span>
              {errors.description && <span className="nexus-error-message" role="alert" id="desc-error">{errors.description}</span>}
            </label>
            <textarea
              id="description"
              className={`nexus-textarea${errors.description ? ' nexus-input--error' : ''}`}
              value={values.description}
              onChange={set('description')}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'desc-error' : undefined}
              placeholder="Tell members what you can do, how much experience you have, and any requirements…"
              rows={6}
            />
          </div>

          {/* Category */}
          <div className="nexus-form-group" id="field-category">
            <label htmlFor="category" className="nexus-label">
              Category
              {errors.category && <span className="nexus-error-message" role="alert" id="cat-error">{errors.category}</span>}
            </label>
            <select
              id="category"
              className={`nexus-select${errors.category ? ' nexus-select--error' : ''}`}
              value={values.category}
              onChange={set('category')}
              aria-invalid={!!errors.category}
              aria-describedby={errors.category ? 'cat-error' : undefined}
            >
              <option value="">Select a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Credit rate */}
          <div className="nexus-form-group" id="field-creditRate">
            <label htmlFor="creditRate" className="nexus-label">
              Credit rate (per hour)
              <span className="nexus-label__hint">
                How many time credits per hour? Most services use 1. Range: 0.5–10.
              </span>
              {errors.creditRate && <span className="nexus-error-message" role="alert" id="rate-error">{errors.creditRate}</span>}
            </label>
            <input
              id="creditRate"
              type="number"
              className={`nexus-input${errors.creditRate ? ' nexus-input--error' : ''}`}
              value={values.creditRate}
              onChange={set('creditRate')}
              min={0.5}
              max={10}
              step={0.5}
              style={{ maxWidth: 120 }}
              aria-invalid={!!errors.creditRate}
              aria-describedby={errors.creditRate ? 'rate-error' : undefined}
            />
          </div>

          {/* Location (optional) */}
          <div className="nexus-form-group">
            <label htmlFor="location" className="nexus-label">
              Location <span style={{ fontWeight: 400, color: 'var(--nexus-color-text-secondary)' }}>(optional)</span>
              <span className="nexus-label__hint">Town, area, or "Online" — helps people find nearby services</span>
            </label>
            <input
              id="location"
              type="text"
              className="nexus-input"
              value={values.location}
              onChange={set('location')}
              placeholder="e.g. Skibbereen, Co. Cork"
            />
          </div>

          {/* Tags (optional) */}
          <div className="nexus-form-group">
            <label htmlFor="tags" className="nexus-label">
              Tags <span style={{ fontWeight: 400, color: 'var(--nexus-color-text-secondary)' }}>(optional)</span>
              <span className="nexus-label__hint">Comma-separated keywords to help members find your service</span>
            </label>
            <input
              id="tags"
              type="text"
              className="nexus-input"
              value={values.tags}
              onChange={set('tags')}
              placeholder="e.g. driving, lessons, beginners, Cork"
            />
          </div>

          {/* Submit */}
          <div style={{ paddingTop: 'var(--nexus-space-3)', borderTop: '1px solid var(--nexus-color-border)' }}>
            <button
              type="submit"
              className="nexus-btn nexus-btn--primary"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Posting…' : 'Post service'}
            </button>
            <Link
              to="/services"
              className="nexus-btn nexus-btn--secondary"
              style={{ marginLeft: 'var(--nexus-space-3)' }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
