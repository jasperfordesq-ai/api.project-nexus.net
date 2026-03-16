// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export interface Skill {
  id: number; name: string; category: string; userCount: number
}

export const skillsApi = {
  list: (params?: { q?: string; category?: string }) =>
    apiClient.get<Skill[]>('/api/skills', { params }).then(r => r.data),
  addToProfile: (skillId: number) =>
    apiClient.post('/api/skills/my', { skillId }).then(r => r.data),
  removeFromProfile: (skillId: number) =>
    apiClient.delete(`/api/skills/my/${skillId}`).then(r => r.data),
}
