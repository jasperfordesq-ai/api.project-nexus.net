// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export interface OnboardingStep {
  id: string; title: string; description: string; isCompleted: boolean; order: number
}

export const onboardingApi = {
  steps: () => apiClient.get<OnboardingStep[]>('/api/onboarding/steps').then(r => r.data),
  progress: () => apiClient.get('/api/onboarding/progress').then(r => r.data),
  complete: (stepId: string) =>
    apiClient.post(`/api/onboarding/steps/${stepId}/complete`).then(r => r.data),
  reset: () => apiClient.post('/api/onboarding/reset').then(r => r.data),
}
