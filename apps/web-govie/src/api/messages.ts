// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams } from './types'

export interface Conversation {
  id: number
  otherUserId: number
  otherUserName: string
  otherUserAvatarUrl?: string
  lastMessage?: string
  lastMessageAt?: string
  unreadCount: number
  tenantId: number
}

export interface Message {
  id: number
  conversationId: number
  senderId: number
  senderName: string
  content: string
  isRead: boolean
  sentAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConversation(raw: any): Conversation {
  const participant = raw?.participant ?? raw?.other_user
  return {
    id: raw.id,
    otherUserId: participant?.id ?? raw.otherUserId ?? raw.other_user_id,
    otherUserName: participant
      ? `${participant.first_name ?? participant.firstName ?? ''} ${participant.last_name ?? participant.lastName ?? ''}`.trim()
      : raw.otherUserName ?? '',
    otherUserAvatarUrl: participant?.avatar_url ?? participant?.avatarUrl ?? raw.otherUserAvatarUrl,
    lastMessage: raw.last_message ?? raw.lastMessage,
    lastMessageAt: raw.last_message_at ?? raw.lastMessageAt,
    unreadCount: raw.unread_count ?? raw.unreadCount ?? 0,
    tenantId: raw.tenant_id ?? raw.tenantId,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessage(raw: any): Message {
  const sender = raw?.sender
  return {
    id: raw.id,
    conversationId: raw.conversation_id ?? raw.conversationId,
    senderId: sender?.id ?? raw.senderId ?? raw.sender_id,
    senderName: sender
      ? `${sender.first_name ?? sender.firstName ?? ''} ${sender.last_name ?? sender.lastName ?? ''}`.trim()
      : raw.senderName ?? '',
    content: raw.content,
    isRead: raw.is_read ?? raw.isRead ?? false,
    sentAt: raw.created_at ?? raw.createdAt ?? raw.sentAt ?? raw.sent_at,
  }
}

export const messagesApi = {
  conversations: (params?: PaginationParams) =>
    apiClient.get('/api/messages', { params: { page: params?.page, limit: params?.pageSize } }).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = r.data as any
      const data = raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
      const pagination = raw?.pagination
      return {
        items: data.map(mapConversation),
        totalCount: pagination?.total ?? data.length,
        page: pagination?.page ?? 1,
        pageSize: pagination?.limit ?? data.length,
        totalPages: pagination?.pages ?? 1,
      } as PaginatedResponse<Conversation>
    }),

  conversation: (id: number, params?: PaginationParams) =>
    apiClient.get(`/api/messages/${id}`, { params: { page: params?.page, limit: params?.pageSize } }).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = r.data as any
      const messages = raw?.messages ?? raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
      const pagination = raw?.pagination
      return {
        items: messages.map(mapMessage),
        totalCount: pagination?.total ?? messages.length,
        page: pagination?.page ?? 1,
        pageSize: pagination?.limit ?? messages.length,
        totalPages: pagination?.pages ?? 1,
      } as PaginatedResponse<Message>
    }),

  send: (payload: { recipientId: number; content: string }) =>
    apiClient.post<Message>('/api/messages', {
      recipient_id: payload.recipientId,
      content: payload.content,
    }).then((r) => mapMessage(r.data)),

  markRead: (conversationId: number) =>
    apiClient.put(`/api/messages/${conversationId}/read`).then((r) => r.data),

  unreadCount: () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiClient.get('/api/messages/unread-count').then((r) => {
      const raw = r.data as any
      return { count: raw?.unread_count ?? raw?.count ?? 0 }
    }),
}
