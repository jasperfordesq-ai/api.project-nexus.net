// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export interface Goal {
  id: number; title: string; description?: string; targetDate?: string;
  progress: number; isCompleted: boolean; milestones: { id: number; title: string; isCompleted: boolean }[]
}

export const goalsApi = {
  list: () => apiClient.get<Goal[]>('/api/goals').then(r => r.data),
  create: (payload: { title: string; description?: string; targetDate?: string }) =>
    apiClient.post<Goal>('/api/goals', payload).then(r => r.data),
  /** Update progress value toward the goal target. */
  updateProgress: (id: number, value: number) =>
    apiClient.put(`/api/goals/${id}/progress`, { value }).then(r => r.data),
  /** Complete a specific milestone on the goal. */
  completeMilestone: (id: number, milestoneId: number) =>
    apiClient.put(`/api/goals/${id}/milestones/${milestoneId}/complete`).then(r => r.data),
  /** Abandon (soft-delete) a goal. */
  abandon: (id: number) => apiClient.put(`/api/goals/${id}/abandon`).then(r => r.data),
}
