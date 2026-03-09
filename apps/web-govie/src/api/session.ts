// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export interface ActiveSession {
  id: string; device: string; browser: string; ip: string;
  location?: string; lastActiveAt: string; isCurrent: boolean
}

export const sessionApi = {
  list: () => apiClient.get<ActiveSession[]>('/api/sessions').then(r => r.data),
  revoke: (sessionId: string) =>
    apiClient.delete(`/api/sessions/${sessionId}`).then(r => r.data),
  revokeAll: () => apiClient.delete('/api/sessions').then(r => r.data),
}
