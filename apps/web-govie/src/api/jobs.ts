// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'
import type { PaginatedResponse, PaginationParams } from './types'

export interface Job {
  id: number; title: string; description: string; category: string; creditRate?: number;
  location?: string; remoteOk: boolean; userId: number; userName: string;
  closingDate?: string; status: string; applicantCount: number; createdAt: string; tenantId: number
}

export const jobsApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Job>>('/api/jobs', { params }).then(r => r.data),
  get: (id: number) => apiClient.get<Job>(`/api/jobs/${id}`).then(r => r.data),
  create: (payload: Partial<Job>) => apiClient.post<Job>('/api/jobs', payload).then(r => r.data),
  update: (id: number, payload: Partial<Job>) => apiClient.put<Job>(`/api/jobs/${id}`, payload).then(r => r.data),
  delete: (id: number) => apiClient.delete(`/api/jobs/${id}`).then(r => r.data),
  apply: (id: number, message?: string) => apiClient.post(`/api/jobs/${id}/apply`, { message }).then(r => r.data),
  savedJobs: () => apiClient.get('/api/jobs/saved').then(r => r.data),
  save: (id: number) => apiClient.post(`/api/jobs/${id}/save`).then(r => r.data),
  unsave: (id: number) => apiClient.delete(`/api/jobs/${id}/save`).then(r => r.data),
}
