// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export const contactApi = {
  submit: (payload: { name: string; email: string; subject: string; message: string }) =>
    apiClient.post('/api/contact', payload).then(r => r.data),
}
