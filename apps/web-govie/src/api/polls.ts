// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export interface Poll {
  id: number; question: string; options: { id: number; text: string; votes: number }[];
  totalVotes: number; myVoteId?: number; expiresAt?: string; createdAt: string
}

export const pollsApi = {
  list: () => apiClient.get<Poll[]>('/api/polls').then(r => r.data),
  get: (id: number) => apiClient.get<Poll>(`/api/polls/${id}`).then(r => r.data),
  vote: (pollId: number, optionId: number) =>
    apiClient.post(`/api/polls/${pollId}/vote`, { optionId }).then(r => r.data),
}
