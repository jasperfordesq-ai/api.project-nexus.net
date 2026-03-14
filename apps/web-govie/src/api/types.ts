// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

// API response and domain types — mirrors the ASP.NET backend DTOs

export interface ApiError {
  message: string
  statusCode?: number
  errors?: Record<string, string[]>
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
  tenant_slug: string
}

export interface RegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  tenant_slug: string
}

/** Raw auth response from backend (snake_case) */
export interface RawAuthResponse {
  success: boolean
  requires_2fa: boolean
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: {
    id: number
    email: string
    first_name: string
    last_name: string
    role: string
    tenant_id: number
    tenant_slug?: string
    created_at?: string
  }
}

/** Raw refresh response from backend (snake_case) */
export interface RawRefreshResponse {
  success: boolean
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

/** Normalized auth result for internal use (camelCase) */
export interface AuthResult {
  accessToken: string
  refreshToken: string
  user: UserSummary
}

// ─── User ────────────────────────────────────────────────────────────────────

/** User object — matches camelCase serialization from entity endpoints */
export interface UserSummary {
  id: number
  email: string
  firstName: string
  lastName: string
  role: 'member' | 'admin' | 'moderator'
  tenantId: number
  avatarUrl?: string
  createdAt: string
}

export interface UserProfile extends UserSummary {
  bio?: string
  location?: string
  skills?: string[]
  languages?: string[]
  balance?: number
  totalExchanges?: number
}

// ─── Listings ────────────────────────────────────────────────────────────────

export type ListingType = 'offer' | 'request'
export type ListingStatus = 'active' | 'inactive' | 'pending' | 'archived'

export interface Listing {
  id: number
  title: string
  description: string
  type: ListingType
  status: ListingStatus
  category: string
  categoryId?: number
  creditRate: number
  userId: number
  userName: string
  userAvatarUrl?: string
  tenantId: number
  createdAt: string
  updatedAt: string
  viewCount: number
  tags?: string[]
  location?: string
}

export interface CreateListingRequest {
  title: string
  description: string
  type: ListingType
  category?: string
  categoryId?: number
  creditRate: number
  tags?: string[]
  location?: string
}

export interface UpdateListingRequest extends Partial<CreateListingRequest> {
  status?: ListingStatus
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  search?: string
  category?: string
  type?: ListingType
  sortBy?: string
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface WalletBalance {
  balance: number
  currency: string
  tenantId: number
}

export interface Transaction {
  id: number
  type: 'credit' | 'debit' | 'transfer'
  amount: number
  description: string
  createdAt: string
  relatedUserId?: number
  relatedUserName?: string
}
