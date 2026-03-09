// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export interface InsuranceCert {
  id: number; userId: number; type: string; provider: string;
  policyNumber: string; expiresAt: string; status: string; uploadedAt: string
}

export const insuranceApi = {
  my: () => apiClient.get<InsuranceCert[]>('/api/insurance').then(r => r.data),
  upload: (payload: FormData) =>
    apiClient.post<InsuranceCert>('/api/insurance', payload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data),
}
