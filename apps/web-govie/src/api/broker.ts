// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export const brokerApi = {
  services: (params?: Record<string, unknown>) =>
    apiClient.get('/api/broker/services', { params }).then(r => r.data),
  request: (payload: Record<string, unknown>) =>
    apiClient.post('/api/broker/requests', payload).then(r => r.data),
  myRequests: () => apiClient.get('/api/broker/requests/my').then(r => r.data),
}
