// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export const deliverablesApi = {
  list: () => apiClient.get('/api/deliverables').then(r => r.data),
  get: (id: number) => apiClient.get(`/api/deliverables/${id}`).then(r => r.data),
  create: (payload: Record<string, unknown>) =>
    apiClient.post('/api/deliverables', payload).then(r => r.data),
}
