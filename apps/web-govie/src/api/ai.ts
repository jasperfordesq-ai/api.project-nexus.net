// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'

export interface AiConversation {
  id: number
  title?: string
  createdAt: string
  messageCount: number
}

export interface AiMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export const aiApi = {
  status: () =>
    apiClient.get<{ available: boolean; model?: string }>('/api/ai/status').then((r) => r.data),

  chat: (message: string, conversationId?: number) =>
    apiClient.post<{ reply: string; conversationId: number }>('/api/ai/chat', { message, conversationId }).then((r) => r.data),

  conversations: () =>
    apiClient.get<AiConversation[]>('/api/ai/conversations').then((r) => r.data),

  createConversation: () =>
    apiClient.post<AiConversation>('/api/ai/conversations').then((r) => r.data),

  messages: (conversationId: number) =>
    apiClient.get<AiMessage[]>(`/api/ai/conversations/${conversationId}/messages`).then((r) => r.data),

  sendMessage: (conversationId: number, content: string) =>
    apiClient.post<AiMessage>(`/api/ai/conversations/${conversationId}/messages`, { content }).then((r) => r.data),

  archiveConversation: (id: number) =>
    apiClient.delete(`/api/ai/conversations/${id}`).then((r) => r.data),

  skillRecommendations: () =>
    apiClient.get('/api/ai/skills/recommend').then((r) => r.data),

  challenges: () =>
    apiClient.get('/api/ai/challenges').then((r) => r.data),

  profileSuggestions: () =>
    apiClient.get('/api/ai/profile/suggestions').then((r) => r.data),

  generateBio: () =>
    apiClient.post('/api/ai/bio/generate').then((r) => r.data),

  generateListing: (keywords: string) =>
    apiClient.post('/api/ai/listings/generate', { keywords }).then((r) => r.data),
}
