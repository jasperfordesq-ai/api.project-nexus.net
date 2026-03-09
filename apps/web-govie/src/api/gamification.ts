// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

import apiClient from './client'

export interface GamificationProfile {
  userId: number
  totalXp: number
  level: number
  nextLevelXp: number
  rank?: number
  badges: Badge[]
  streak?: number
}

export interface Badge {
  id: number
  name: string
  description: string
  iconUrl?: string
  earnedAt?: string
}

export interface LeaderboardEntry {
  rank: number
  userId: number
  userName: string
  avatarUrl?: string
  totalXp: number
  level: number
}

export interface XpHistoryEntry {
  id: number
  amount: number
  reason: string
  createdAt: string
}

export const gamificationApi = {
  profile: () =>
    apiClient.get<GamificationProfile>('/api/gamification/profile').then((r) => r.data),

  userProfile: (userId: number) =>
    apiClient.get<GamificationProfile>(`/api/gamification/profile/${userId}`).then((r) => r.data),

  badges: () =>
    apiClient.get<Badge[]>('/api/gamification/badges').then((r) => r.data),

  myBadges: () =>
    apiClient.get<Badge[]>('/api/gamification/badges/my').then((r) => r.data),

  leaderboard: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<LeaderboardEntry[]>('/api/gamification/leaderboard', { params }).then((r) => r.data),

  xpHistory: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<XpHistoryEntry[]>('/api/gamification/xp-history', { params }).then((r) => r.data),

  summary: () =>
    apiClient.get('/api/gamification/summary').then((r) => r.data),

  challenges: () =>
    apiClient.get('/api/gamification/challenges').then((r) => r.data),

  shop: () =>
    apiClient.get('/api/gamification/shop').then((r) => r.data),

  purchase: (itemId: number) =>
    apiClient.post('/api/gamification/shop/purchase', { itemId }).then((r) => r.data),

  dailyRewardStatus: () =>
    apiClient.get('/api/daily-reward/status').then((r) => r.data),

  claimDailyReward: () =>
    apiClient.post('/api/daily-reward/check').then((r) => r.data),
}
