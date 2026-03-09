// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.
import apiClient from './client'

export const pushNotificationsApi = {
  subscribe: (subscription: PushSubscription) =>
    apiClient.post('/api/push/subscribe', { subscription: JSON.stringify(subscription) }).then(r => r.data),
  unsubscribe: () => apiClient.post('/api/push/unsubscribe').then(r => r.data),
}
