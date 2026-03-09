// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'
import type { UserSummary } from './types'

export interface MatchResult {
  user: UserSummary; matchScore: number; matchReasons: string[]; sharedSkills: string[]
}

export const matchingApi = {
  myMatches: () => apiClient.get<MatchResult[]>('/api/matching/my').then(r => r.data),
  listingMatches: (listingId: number) =>
    apiClient.get<MatchResult[]>(`/api/ai/listings/${listingId}/matches`).then(r => r.data),
}
