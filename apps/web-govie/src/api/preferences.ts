// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  language?: string
  timezone?: string
  emailNotifications?: boolean
  pushNotifications?: boolean
  profileVisibility?: 'public' | 'members' | 'connections'
}

export const preferencesApi = {
  get: () =>
    apiClient.get<UserPreferences>('/api/preferences').then((r) => r.data),

  update: (payload: Partial<UserPreferences>) =>
    apiClient.put<UserPreferences>('/api/preferences', payload).then((r) => r.data),

  language: (language: string) =>
    apiClient.put('/api/preferences/language', { language }).then((r) => r.data),

  theme: (theme: string) =>
    apiClient.put('/api/preferences/display', { theme }).then((r) => r.data),

  notifications: (payload: { email?: boolean; push?: boolean }) =>
    apiClient.put('/api/preferences/notifications', payload).then((r) => r.data),
}
