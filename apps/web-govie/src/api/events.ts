// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams } from './types'

/** Safely extract an array from backend response variants */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractItems(raw: any): any[] {
  return raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
}

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

function toEventPayload(payload: Partial<Event>): Record<string, unknown> {
  return {
    ...(payload.title !== undefined && { title: payload.title }),
    ...(payload.description !== undefined && { description: payload.description }),
    ...(payload.location !== undefined && { location: payload.location }),
    ...(payload.startsAt !== undefined && { starts_at: payload.startsAt }),
    ...(payload.endsAt !== undefined && { ends_at: payload.endsAt }),
    ...(payload.maxAttendees !== undefined && { max_attendees: payload.maxAttendees }),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvent(raw: any): Event {
  const createdBy = raw?.created_by ?? raw?.createdBy
  return {
    ...raw,
    organizerId: createdBy?.id ?? raw.organizerId ?? raw.organizer_id,
    organizerName: createdBy
      ? `${createdBy.first_name ?? createdBy.firstName ?? ''} ${createdBy.last_name ?? createdBy.lastName ?? ''}`.trim()
      : raw.organizerName ?? raw.organizer_name ?? '',
    startsAt: raw.starts_at ?? raw.startsAt,
    endsAt: raw.ends_at ?? raw.endsAt,
    rsvpCount: raw.rsvp_count ?? raw.rsvpCount ?? (raw.rsvp_counts ? (raw.rsvp_counts.going ?? 0) + (raw.rsvp_counts.maybe ?? 0) : 0),
    isCancelled: raw.is_cancelled ?? raw.isCancelled ?? false,
    maxAttendees: raw.max_attendees ?? raw.maxAttendees,
    myRsvpStatus: raw.my_rsvp_status ?? raw.my_rsvp ?? raw.myRsvpStatus,
    tenantId: raw.tenant_id ?? raw.tenantId,
  }
}

export const eventsApi = {
  list: (params?: PaginationParams) =>
    apiClient.get('/api/events', { params }).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = r.data as any
      const items = extractItems(raw)
      const pagination = raw?.pagination
      return {
        items: items.map(mapEvent),
        totalCount: pagination?.total ?? raw?.totalCount ?? items.length,
        page: pagination?.page ?? raw?.page ?? 1,
        pageSize: pagination?.limit ?? raw?.pageSize ?? items.length,
        totalPages: pagination?.pages ?? raw?.totalPages ?? 1,
      } as PaginatedResponse<Event>
    }),

  my: () =>
    apiClient.get('/api/events/my').then((r) => extractItems(r.data).map(mapEvent)),

  get: (id: number) =>
    apiClient.get(`/api/events/${id}`).then((r) => mapEvent(r.data)),

  create: (payload: Partial<Event>) =>
    apiClient.post<Event>('/api/events', toEventPayload(payload)).then((r) => mapEvent(r.data)),

  update: (id: number, payload: Partial<Event>) =>
    apiClient.put<Event>(`/api/events/${id}`, toEventPayload(payload)).then((r) => mapEvent(r.data)),

  cancel: (id: number) =>
    apiClient.put(`/api/events/${id}/cancel`).then((r) => r.data),

  rsvps: (id: number) =>
    apiClient.get(`/api/events/${id}/rsvps`).then((r) => extractItems(r.data) as EventRsvp[]),

  rsvp: (id: number, status: string = 'going') =>
    apiClient.post(`/api/events/${id}/rsvp`, { status }).then((r) => r.data),

  cancelRsvp: (id: number) =>
    apiClient.delete(`/api/events/${id}/rsvp`).then((r) => r.data),
}
