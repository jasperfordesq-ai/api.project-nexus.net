// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export interface Announcement {
  id: number; title: string; content: string; type: string;
  startsAt: string; endsAt?: string; isDismissable: boolean
}

export const announcementsApi = {
  active: () => apiClient.get<Announcement[]>('/api/announcements').then(r => r.data),
  dismiss: (id: number) => apiClient.post(`/api/announcements/${id}/dismiss`).then(r => r.data),
}
