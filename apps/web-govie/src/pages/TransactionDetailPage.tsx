// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { walletApi } from '../api/wallet'
import { isApiError } from '../context/AuthContext'
import type { Transaction } from '../api/types'

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tx, setTx] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    walletApi.transaction(Number(id))
      .then(setTx)
      .catch((err) => {
        if (isApiError(err)) setError(err.message)
        else setError('Could not load transaction.')
      })
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading…" /></div>
  if (error || !tx) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error ?? 'Transaction not found.'}</div></div>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = tx as any
  const createdAt: string = raw.created_at ?? raw.createdAt ?? ''
  const relatedUserName: string | undefined = raw.related_user_name ?? raw.relatedUserName ?? undefined
  const isCredit = tx.type === 'credit' || (tx.type !== 'debit' && tx.amount >= 0)

  return (
    <div className="nexus-container" style={{ maxWidth: 560 }}>
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/wallet">Wallet</Link></li>
          <li aria-current="page">Transaction #{tx.id}</li>
        </ol>
      </nav>
      <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>Transaction details</h1>
      <div className="nexus-card">
        <div style={{ textAlign: 'center', padding: 'var(--nexus-space-5)', marginBottom: 'var(--nexus-space-4)', background: isCredit ? '#d1fae5' : '#fef3c7', borderRadius: 8 }}>
          <p style={{ margin: '0 0 var(--nexus-space-1)', fontSize: 48, fontWeight: 900, color: isCredit ? '#15803d' : '#b45309' }}>
            {isCredit ? '+' : '-'}{Math.abs(tx.amount)}
          </p>
          <p style={{ margin: 0, fontSize: 14, color: isCredit ? '#15803d' : '#b45309', fontWeight: 600 }}>
            time credits {isCredit ? 'received' : 'sent'}
          </p>
        </div>
        <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: 'var(--nexus-space-3) var(--nexus-space-4)', fontSize: 15 }}>
          <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)' }}>Description</dt>
          <dd style={{ margin: 0 }}>{tx.description}</dd>
          <dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)' }}>Date</dt>
          <dd style={{ margin: 0 }}>{new Date(createdAt).toLocaleString('en-IE', { dateStyle: 'full', timeStyle: 'short' })}</dd>
          {tx.type && <><dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)' }}>Type</dt><dd style={{ margin: 0, textTransform: 'capitalize' }}>{tx.type}</dd></>}
          {relatedUserName && <><dt style={{ fontWeight: 600, color: 'var(--nexus-color-text-secondary)' }}>{isCredit ? 'From' : 'To'}</dt><dd style={{ margin: 0 }}>{relatedUserName}</dd></>}
        </dl>
      </div>
      <div style={{ marginTop: 'var(--nexus-space-5)' }}>
        <Link to="/wallet" className="nexus-btn nexus-btn--secondary">Back to wallet</Link>
      </div>
    </div>
  )
}
