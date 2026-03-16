// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { fullName } from '../api/normalize'
import { isApiError, useAuth } from '../context/AuthContext'

interface Message {
  id: number
  senderId: number
  senderName: string
  content: string
  createdAt: string
  isRead: boolean
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapMessage(raw: any): Message {
  const sender = raw.sender ?? {}
  return {
    id: raw.id,
    senderId: sender.id ?? raw.sender_id ?? raw.senderId ?? 0,
    senderName: sender.id ? fullName(sender) : (raw.senderName ?? 'Unknown'),
    content: raw.content ?? '',
    createdAt: raw.created_at ?? raw.createdAt ?? '',
    isRead: raw.is_read ?? raw.isRead ?? false,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [participantId, setParticipantId] = useState<number>(0)
  const [participantName, setParticipantName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(() => {
    return apiClient.get(`/api/messages/${id}`)
      .then(r => {
        const raw = r.data as any // eslint-disable-line @typescript-eslint/no-explicit-any
        // Backend returns { messages: [...], participant: {...}, ... }
        const items = raw?.messages ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
        setMessages(items.map(mapMessage))
        const p = raw?.participant ?? raw?.other_user ?? raw?.otherUser
        if (p?.id) {
          setParticipantId(p.id)
          setParticipantName(fullName(p))
        }
      })
      .catch(err => setError(isApiError(err) ? err.message : 'Could not load conversation.'))
  }, [id])

  useEffect(() => {
    fetchMessages().finally(() => setIsLoading(false))
    // Mark as read
    apiClient.put(`/api/messages/${id}/read`).catch(() => {})
  }, [id, fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Determine the other participant's user ID for sending replies.
  // Prefer participant info from the API response; fall back to scanning message senders.
  const otherUserId = participantId > 0
    ? participantId
    : (messages.find(m => m.senderId !== user?.id && m.senderId !== 0)?.senderId ?? 0)
  const canSend = otherUserId > 0 && otherUserId !== user?.id

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !canSend) return
    setIsSending(true)
    setSendError(null)
    try {
      // Backend POST /api/messages expects { recipient_id, content }
      await apiClient.post('/api/messages', { recipient_id: otherUserId, content: newMessage.trim() })
      setNewMessage('')
      await fetchMessages()
    } catch (err) {
      setSendError(isApiError(err) ? err.message : 'Failed to send message.')
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) return <div className="nexus-loading"><span className="nexus-spinner" aria-label="Loading conversation…" /></div>
  if (error) return <div className="nexus-container"><div className="nexus-notification nexus-notification--error" role="alert">{error}</div></div>

  const otherName = participantName || messages.find(m => m.senderId !== user?.id)?.senderName || 'Conversation'

  return (
    <div className="nexus-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', maxHeight: 'calc(100dvh - 160px)' }}>
      <nav aria-label="Breadcrumb">
        <ol className="nexus-breadcrumbs">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/messages">Messages</Link></li>
          <li aria-current="page">{otherName}</li>
        </ol>
      </nav>

      <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 900, marginBottom: 'var(--nexus-space-4)' }}>{otherName}</h1>

      {/* Message list */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Messages"
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--nexus-space-3)', paddingBottom: 'var(--nexus-space-4)' }}
      >
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--nexus-color-text-secondary)', marginTop: 'var(--nexus-space-6)' }}>No messages yet. Say hello!</p>
        )}
        {messages.map(msg => {
          const isOwn = msg.senderId === user?.id
          return (
            <div
              key={msg.id}
              style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}
            >
              <div style={{
                maxWidth: '70%',
                padding: '10px 16px',
                borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: isOwn ? 'var(--nexus-color-primary)' : 'var(--nexus-color-surface)',
                color: isOwn ? 'white' : 'var(--nexus-color-text)',
                border: isOwn ? 'none' : '1px solid var(--nexus-color-border)',
                fontSize: 15,
              }}>
                <p style={{ margin: 0 }}>{msg.content}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--nexus-color-text-secondary)', textAlign: 'right' }}>
                  {new Date(msg.createdAt).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!canSend ? (
        <div className="nexus-notification nexus-notification--warning" role="status" style={{ marginTop: 'var(--nexus-space-3)' }}>
          Unable to determine the other participant. You cannot reply to this conversation.
        </div>
      ) : (
        <div style={{ paddingTop: 'var(--nexus-space-3)', borderTop: '1px solid var(--nexus-color-border)' }}>
          {sendError && (
            <div className="nexus-notification nexus-notification--error" role="alert" style={{ marginBottom: 'var(--nexus-space-2)' }}>
              {sendError}
            </div>
          )}
          <form onSubmit={handleSend} style={{ display: 'flex', gap: 'var(--nexus-space-3)' }}>
            <label htmlFor="message-input" className="nexus-sr-only">Type a message</label>
            <input
              id="message-input"
              type="text"
              className="nexus-input"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type a message…"
              disabled={isSending}
              style={{ flex: 1 }}
              maxLength={2000}
            />
            <button type="submit" className="nexus-btn nexus-btn--primary" disabled={isSending || !newMessage.trim()}>
              {isSending ? '…' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
