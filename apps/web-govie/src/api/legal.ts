// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export interface LegalDocument {
  id: number; type: string; version: string; content: string;
  effectiveDate: string; hasAccepted: boolean
}

export const legalApi = {
  get: (type: string) => apiClient.get<LegalDocument>(`/api/legal/documents/${type}`).then(r => r.data),
  accept: (id: number, version: string) =>
    apiClient.post(`/api/legal/documents/${id}/accept`, { version }).then(r => r.data),
}
