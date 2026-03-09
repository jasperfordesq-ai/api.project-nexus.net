// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export const reportsApi = {
  reportContent: (payload: { type: string; targetId: number; reason: string; details?: string }) =>
    apiClient.post('/api/feed/report', payload).then(r => r.data),
}
