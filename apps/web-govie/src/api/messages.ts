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
    apiClient.get('/api/messages', { params: { page: params?.page, limit: params?.pageSize } }).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = r.data as any
      const data = raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
      const pagination = raw?.pagination
      return {
        items: data,
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
        items: messages,
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
    }).then((r) => r.data),

  markRead: (conversationId: number) =>
    apiClient.put(`/api/messages/${conversationId}/read`).then((r) => r.data),

  unreadCount: () =>
    apiClient.get<{ count: number }>('/api/messages/unread-count').then((r) => r.data),
}
