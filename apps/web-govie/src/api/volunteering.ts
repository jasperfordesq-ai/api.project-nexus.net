// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'
import type { PaginatedResponse, PaginationParams } from './types'

export interface VolunteerOpportunity {
  id: number; title: string; description: string; organizationId?: number;
  credits: number; date?: string; location?: string; tenantId: number
}

export const volunteeringApi = {
  opportunities: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<VolunteerOpportunity>>('/api/volunteer/opportunities', { params }).then(r => r.data),
  logHours: (payload: { hours: number; description: string; date: string }) =>
    apiClient.post('/api/volunteer/hours', payload).then(r => r.data),
  myHours: () => apiClient.get('/api/volunteer/hours').then(r => r.data),
}
