// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export interface FederatedTenant {
  id: number; name: string; domain: string; logoUrl?: string; memberCount: number
}

export const federationApi = {
  partners: () => apiClient.get<FederatedTenant[]>('/api/federation/external/tenants').then(r => r.data),
  listings: (tenantId: number) =>
    apiClient.get(`/api/federation/external/tenants/${tenantId}/listings`).then(r => r.data),
}
