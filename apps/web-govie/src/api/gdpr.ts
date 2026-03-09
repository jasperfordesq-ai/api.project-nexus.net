// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export const gdprApi = {
  exportData: () => apiClient.post('/api/gdpr/export').then(r => r.data),
  deleteAccount: (password: string) =>
    apiClient.post('/api/gdpr/delete', { password }).then(r => r.data),
  consentStatus: () => apiClient.get('/api/cookie-consent').then(r => r.data),
  updateConsent: (payload: Record<string, boolean>) =>
    apiClient.post('/api/cookie-consent', payload).then(r => r.data),
}
