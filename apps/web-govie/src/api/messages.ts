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

export const messagesApi = {
  conversations: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Conversation>>('/api/messages', { params }).then((r) => r.data),

  conversation: (id: number, params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Message>>(`/api/messages/${id}`, { params }).then((r) => r.data),

  send: (payload: { recipientId: number; content: string }) =>
    apiClient.post<Message>('/api/messages', payload).then((r) => r.data),

  markRead: (conversationId: number) =>
    apiClient.put(`/api/messages/${conversationId}/read`).then((r) => r.data),

  unreadCount: () =>
    apiClient.get<{ count: number }>('/api/messages/unread-count').then((r) => r.data),
}
