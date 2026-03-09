// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams } from './types'

export interface Event {
  id: number
  title: string
  description: string
  location?: string
  startsAt: string
  endsAt: string
  maxAttendees?: number
  rsvpCount: number
  isCancelled: boolean
  organizerId: number
  organizerName: string
  myRsvpStatus?: 'attending' | 'not_attending'
  tenantId: number
}

export interface EventRsvp {
  userId: number
  userName: string
  status: 'attending'
  rsvpAt: string
}

export const eventsApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Event>>('/api/events', { params }).then((r) => r.data),

  my: () =>
    apiClient.get<Event[]>('/api/events/my').then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Event>(`/api/events/${id}`).then((r) => r.data),

  create: (payload: Partial<Event>) =>
    apiClient.post<Event>('/api/events', payload).then((r) => r.data),

  update: (id: number, payload: Partial<Event>) =>
    apiClient.put<Event>(`/api/events/${id}`, payload).then((r) => r.data),

  cancel: (id: number) =>
    apiClient.put(`/api/events/${id}/cancel`).then((r) => r.data),

  rsvps: (id: number) =>
    apiClient.get<EventRsvp[]>(`/api/events/${id}/rsvps`).then((r) => r.data),

  rsvp: (id: number) =>
    apiClient.post(`/api/events/${id}/rsvp`).then((r) => r.data),

  cancelRsvp: (id: number) =>
    apiClient.delete(`/api/events/${id}/rsvp`).then((r) => r.data),
}
