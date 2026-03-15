// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import { fullName } from '../api/normalize'
import { isApiError, useAuth } from '../context/AuthContext'

interface WalletBalance { balance: number }
interface Transaction { id: number; amount: number; description: string; createdAt: string; type: string; counterpartName?: string }

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapTransaction(raw: any, currentUserId?: number): Transaction {
  // Backend may return nested sender/receiver objects OR flat sender_id/receiver_id fields
  const sender = raw.sender ?? {}
  const receiver = raw.receiver ?? {}
  const senderId = sender.id ?? raw.sender_id ?? raw.senderId ?? 0
  const receiverId = receiver.id ?? raw.receiver_id ?? raw.receiverId ?? 0
  const isSender = currentUserId != null && senderId === currentUserId
  const counterpart = isSender ? receiver : sender
  const counterpartId = isSender ? receiverId : senderId

  // Determine type: explicit type from backend takes priority, then infer from direction
  let txType: string = raw.type ?? ''
  if (!txType) {
    if (senderId === 0 || receiverId === 0) {
      // System transaction (grant, reward, etc.)
      txType = senderId === 0 ? 'credit' : 'debit'
    } else {
      txType = isSender ? 'debit' : 'credit'
    }
  }

  return {
    id: raw.id,
    amount: raw.amount ?? 0,
    description: raw.description ?? '',
    createdAt: raw.created_at ?? raw.createdAt ?? '',
    type: txType,
    counterpartName: counterpartId ? fullName(counterpart) : (raw.counterpartName ?? raw.counterpart_name ?? undefined),
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function WalletPage() {
  const { user } = useAuth()
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    Promise.all([
      apiClient.get('/api/wallet/balance', { signal }).then(r => r.data).catch(() => ({ balance: 0 })),
      apiClient.get('/api/wallet/transactions', { signal }).then(r => r.data),
    ])
      .then(([b, t]) => {
        if (signal.aborted) return
        setBalance(b as WalletBalance)
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const raw = t as any
        const items: any[] = raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
        setTransactions(items.map((tx: any) => mapTransaction(tx, user?.id)))
        /* eslint-enable @typescript-eslint/no-explicit-any */
      })
      .catch(err => { if (!signal.aborted) setError(isApiError(err) ? err.message : 'Could not load wallet data.') })
      .finally(() => { if (!signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [user?.id])

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading wallet…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  return (
    <div className="nexus-container">
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li aria-current="page">Wallet</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginBottom: 'var(--nexus-space-5)' }}>My wallet</h1>

      {/* Balance card */}
      <section
        aria-labelledby="balance-heading"
        style={{ background: 'var(--nexus-color-primary)', color: 'white', borderRadius: 8, padding: 'var(--nexus-space-6)', marginBottom: 'var(--nexus-space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--nexus-space-4)' }}
      >
        <div>
          <h2 id="balance-heading" style={{ margin: '0 0 var(--nexus-space-2)', fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Time credit balance</h2>
          <p style={{ margin: 0, fontSize: 'clamp(44px, 8vw, 72px)', fontWeight: 900, lineHeight: 1 }}>
            {balance?.balance ?? 0}
            <span style={{ fontSize: 18, fontWeight: 400, marginLeft: 10 }}>credits</span>
          </p>
          <p style={{ margin: 'var(--nexus-space-2) 0 0', fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>1 credit = 1 hour of community exchange</p>
        </div>
        <Link to="/wallet/transfer" className="nexus-btn" style={{ background: 'white', color: 'var(--nexus-color-primary)', fontWeight: 700, padding: '12px 28px', borderRadius: 6, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Transfer credits
        </Link>
      </section>

      {/* Transactions */}
      <section aria-labelledby="tx-heading">
        <h2 id="tx-heading" style={{ fontSize: 22, fontWeight: 700, marginBottom: 'var(--nexus-space-4)' }}>Recent transactions</h2>
        {transactions.length === 0 ? (
          <div className="nexus-card" style={{ textAlign: 'center', color: 'var(--nexus-color-text-secondary)', padding: 'var(--nexus-space-7)' }}>
            No transactions yet. Start by exchanging services with community members.
          </div>
        ) : (
          <div style={{ border: '1px solid var(--nexus-color-border)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }} aria-label="Transaction history">
              <thead style={{ background: 'var(--nexus-color-surface)' }}>
                <tr>
                  {['Date', 'Description', 'With', 'Amount'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 13, color: 'var(--nexus-color-text-secondary)', borderBottom: '1px solid var(--nexus-color-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr key={tx.id} style={{ background: i % 2 === 0 ? 'white' : 'var(--nexus-color-surface)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>{new Date(tx.createdAt).toLocaleDateString('en-IE')}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>{tx.description}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--nexus-color-text-secondary)' }}>{tx.counterpartName ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: tx.amount >= 0 ? 'var(--nexus-color-success)' : 'var(--nexus-color-warning)' }}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
