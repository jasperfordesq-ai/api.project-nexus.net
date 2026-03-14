// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'
import type { PaginatedResponse, PaginationParams } from './types'

export type ExchangeStatus = 'proposed' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'

export interface Exchange {
  id: number
  listingId: number
  listingTitle: string
  proposerId: number
  proposerName: string
  providerId: number
  providerName: string
  creditAmount: number
  status: ExchangeStatus
  message?: string
  scheduledAt?: string
  completedAt?: string
  createdAt: string
  tenantId: number
}

export const exchangesApi = {
  list: (params?: PaginationParams) =>
    apiClient.get('/api/exchanges', { params: { page: params?.page, limit: params?.pageSize } }).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = r.data as any
      const data = raw?.data ?? raw?.items ?? (Array.isArray(raw) ? raw : [])
      const pagination = raw?.pagination
      return {
        items: data.map((e: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          id: e.id,
          listingId: e.listing_id ?? e.listingId ?? 0,
          listingTitle: e.listing_title ?? e.listingTitle ?? '',
          proposerId: e.initiator?.id ?? e.proposerId ?? 0,
          proposerName: e.initiator ? `${e.initiator.first_name ?? ''} ${e.initiator.last_name ?? ''}`.trim() : (e.proposerName ?? ''),
          providerId: e.listing_owner?.id ?? e.providerId ?? 0,
          providerName: e.listing_owner ? `${e.listing_owner.first_name ?? ''} ${e.listing_owner.last_name ?? ''}`.trim() : (e.providerName ?? ''),
          creditAmount: e.agreed_hours ?? e.creditAmount ?? 0,
          status: e.status ?? 'proposed',
          message: e.request_message ?? e.message ?? undefined,
          scheduledAt: e.scheduled_at ?? e.scheduledAt ?? undefined,
          completedAt: e.completed_at ?? e.completedAt ?? undefined,
          createdAt: e.created_at ?? e.createdAt ?? '',
          tenantId: e.tenant_id ?? e.tenantId ?? 0,
        })) as Exchange[],
        totalCount: pagination?.total ?? data.length,
        page: pagination?.page ?? 1,
        pageSize: pagination?.limit ?? data.length,
        totalPages: pagination?.pages ?? 1,
      } as PaginatedResponse<Exchange>
    }),

  get: (id: number) =>
    apiClient.get(`/api/exchanges/${id}`).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = r.data as any
      return {
        id: e.id,
        listingId: e.listing_id ?? e.listingId ?? 0,
        listingTitle: e.listing?.title ?? e.listing_title ?? e.listingTitle ?? '',
        proposerId: e.initiator?.id ?? e.proposerId ?? 0,
        proposerName: e.initiator ? `${e.initiator.first_name ?? ''} ${e.initiator.last_name ?? ''}`.trim() : (e.proposerName ?? ''),
        providerId: e.listing_owner?.id ?? e.providerId ?? 0,
        providerName: e.listing_owner ? `${e.listing_owner.first_name ?? ''} ${e.listing_owner.last_name ?? ''}`.trim() : (e.providerName ?? ''),
        creditAmount: e.agreed_hours ?? e.creditAmount ?? 0,
        status: e.status ?? 'proposed',
        message: e.request_message ?? e.message ?? undefined,
        scheduledAt: e.scheduled_at ?? e.scheduledAt ?? undefined,
        completedAt: e.completed_at ?? e.completedAt ?? undefined,
        createdAt: e.created_at ?? e.createdAt ?? '',
        tenantId: e.tenant_id ?? e.tenantId ?? 0,
      } as Exchange
    }),

  propose: (payload: { listingId: number; message?: string; scheduledAt?: string; agreedHours?: number }) =>
    apiClient.post<Exchange>('/api/exchanges', {
      listing_id: payload.listingId,
      message: payload.message,
      scheduled_at: payload.scheduledAt,
      agreed_hours: payload.agreedHours,
    }).then((r) => r.data),

  accept: (id: number) =>
    apiClient.put<Exchange>(`/api/exchanges/${id}/accept`).then((r) => r.data),

  decline: (id: number) =>
    apiClient.put(`/api/exchanges/${id}/decline`).then((r) => r.data),

  complete: (id: number, actualHours?: number) =>
    apiClient.put(`/api/exchanges/${id}/complete`, { actual_hours: actualHours }).then((r) => r.data),

  cancel: (id: number, reason?: string) =>
    apiClient.put(`/api/exchanges/${id}/cancel`, { reason }).then((r) => r.data),

  dispute: (id: number, reason: string) =>
    apiClient.post(`/api/exchanges/${id}/dispute`, { reason }).then((r) => r.data),
}
