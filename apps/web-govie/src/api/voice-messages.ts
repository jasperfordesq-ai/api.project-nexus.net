// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export interface VoiceMessage {
  id: number; conversationId: number; audioUrl: string;
  durationSeconds: number; isRead: boolean; createdAt: string
}

export const voiceMessagesApi = {
  list: (conversationId: number) =>
    apiClient.get<VoiceMessage[]>(`/api/voice-messages/${conversationId}`).then(r => r.data),
  create: (conversationId: number, audioBlob: Blob) => {
    const form = new FormData()
    form.append('audio', audioBlob, 'voice.webm')
    form.append('conversationId', String(conversationId))
    return apiClient.post<VoiceMessage>('/api/voice-messages', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },
}
