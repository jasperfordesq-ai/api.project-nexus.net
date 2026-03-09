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
  update: (id: number, payload: Partial<Goal>) =>
    apiClient.put<Goal>(`/api/goals/${id}`, payload).then(r => r.data),
  complete: (id: number) => apiClient.put(`/api/goals/${id}/complete`).then(r => r.data),
  delete: (id: number) => apiClient.delete(`/api/goals/${id}`).then(r => r.data),
}
