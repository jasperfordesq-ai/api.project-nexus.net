// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export interface Plan {
  id: number; name: string; description: string; price: number; currency: string;
  billingCycle: string; features: string[]; isCurrentPlan?: boolean
}

export const membershipApi = {
  plans: () => apiClient.get<Plan[]>('/api/subscriptions/plans').then(r => r.data),
  current: () => apiClient.get('/api/subscriptions/my').then(r => r.data),
  subscribe: (planId: number) =>
    apiClient.post('/api/subscriptions/subscribe', { planId }).then(r => r.data),
  cancel: () => apiClient.post('/api/subscriptions/cancel').then(r => r.data),
}
