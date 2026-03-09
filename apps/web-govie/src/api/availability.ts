// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export interface AvailabilitySlot {
  dayOfWeek: number; startTime: string; endTime: string
}

export const availabilityApi = {
  get: () => apiClient.get<AvailabilitySlot[]>('/api/availability').then(r => r.data),
  update: (slots: AvailabilitySlot[]) =>
    apiClient.put<AvailabilitySlot[]>('/api/availability', { slots }).then(r => r.data),
  userAvailability: (userId: number) =>
    apiClient.get<AvailabilitySlot[]>(`/api/availability/${userId}`).then(r => r.data),
}
