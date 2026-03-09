// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { isApiError } from '../context/AuthContext'

export function TransferPage() {
  const navigate = useNavigate()
  const [recipientId, setRecipientId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!recipientId || !amount || Number(amount) <= 0) {
      setError('Please provide a valid recipient ID and amount.')
      return
    }
    setIsSubmitting(true)
    try {
      await apiClient.post('/api/wallet/transfer', {
        recipientId: Number(recipientId),
        amount: Number(amount),
        description: description.trim() || 'Credit transfer',
      })
      setSuccess(true)
      setTimeout(() => navigate('/wallet'), 2000)
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Transfer failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/wallet">Wallet</Link></li>
          <li aria-current="page">Transfer credits</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>Transfer credits</h1>

      <div style={{ maxWidth: 540 }}>
        {success && (
          <div className="nexus-notification nexus-notification--success" role="status" style={{ marginBottom: 'var(--nexus-space-4)' }}>
            Transfer successful! Redirecting to your wallet…
          </div>
        )}
        {error && (
          <div className="nexus-notification nexus-notification--error" role="alert" style={{ marginBottom: 'var(--nexus-space-4)' }}>
            {error}
          </div>
        )}

        <div className="nexus-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
              <label htmlFor="recipient-id" className="nexus-label">Recipient member ID <span aria-hidden="true">*</span></label>
              <input
                id="recipient-id"
                type="number"
                className="nexus-input"
                value={recipientId}
                onChange={e => setRecipientId(e.target.value)}
                placeholder="e.g. 42"
                min={1}
                required
                disabled={isSubmitting || success}
              />
              <p style={{ margin: 'var(--nexus-space-1) 0 0', fontSize: 13, color: 'var(--nexus-color-text-secondary)' }}>
                You can find a member's ID on their profile page.
              </p>
            </div>

            <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-4)' }}>
              <label htmlFor="amount" className="nexus-label">Amount (credits) <span aria-hidden="true">*</span></label>
              <input
                id="amount"
                type="number"
                className="nexus-input"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 2"
                min={1}
                step={1}
                required
                disabled={isSubmitting || success}
                style={{ maxWidth: 160 }}
              />
            </div>

            <div className="nexus-form-group" style={{ marginBottom: 'var(--nexus-space-5)' }}>
              <label htmlFor="description" className="nexus-label">Description (optional)</label>
              <input
                id="description"
                type="text"
                className="nexus-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Thanks for the gardening help"
                maxLength={200}
                disabled={isSubmitting || success}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--nexus-space-3)' }}>
              <button
                type="submit"
                className="nexus-btn nexus-btn--primary"
                disabled={isSubmitting || success}
              >
                {isSubmitting ? 'Sending…' : 'Send credits'}
              </button>
              <Link to="/wallet" className="nexus-btn nexus-btn--secondary">Cancel</Link>
            </div>
          </form>
        </div>

        <div className="nexus-notification nexus-notification--info" style={{ marginTop: 'var(--nexus-space-4)' }}>
          <strong>Note:</strong> Transfers are immediate and cannot be reversed. Please double-check the recipient ID before sending.
        </div>
      </div>
    </div>
  )
}
