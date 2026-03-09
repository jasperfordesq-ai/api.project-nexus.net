// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export const newsletterApi = {
  subscribe: (email: string) =>
    apiClient.post('/api/newsletter/subscribe', { email }).then(r => r.data),
  unsubscribe: (token?: string) =>
    apiClient.post('/api/newsletter/unsubscribe', { token }).then(r => r.data),
  status: () => apiClient.get('/api/newsletter/status').then(r => r.data),
}
