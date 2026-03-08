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
  firstName: string
  lastName: string
  tenant_slug: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: UserSummary
}

export interface RefreshRequest {
  refreshToken: string
}

// ─── User ────────────────────────────────────────────────────────────────────

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
  category: string
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
