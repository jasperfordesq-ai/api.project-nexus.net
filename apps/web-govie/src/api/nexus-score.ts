// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export interface NexusScore {
  userId: number; score: number; tier: string; rank?: number;
  dimensions: { name: string; score: number; weight: number }[]
}

export const nexusScoreApi = {
  my: () => apiClient.get<NexusScore>('/api/nexus-score').then(r => r.data),
  user: (id: number) => apiClient.get<NexusScore>(`/api/nexus-score/${id}`).then(r => r.data),
  leaderboard: () => apiClient.get('/api/nexus-score/leaderboard').then(r => r.data),
}
