// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * NEXUS API Client
 * Connects to the ASP.NET Core backend API
 * All types use snake_case to match the API response format
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5080";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "";

// ============================================================================
// Types - All use snake_case to match API responses
// ============================================================================

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "member" | "super_admin";
  tenant_id: number;
  created_at: string;
  bio?: string;
  avatar_url?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface Listing {
  id: number;
  title: string;
  description: string;
  type: "offer" | "request";
  status: "active" | "draft" | "completed" | "cancelled";
  time_credits: number;
  user_id: number;
  user?: User;
  created_at: string;
  updated_at: string;
}

export interface WalletBalance {
  balance: number;
  user_id: number;
}

export interface Transaction {
  id: number;
  sender_id: number;
  receiver_id: number;
  amount: number;
  description: string;
  created_at: string;
  sender?: User;
  receiver?: User;
}

export interface Conversation {
  id: number;
  participant_ids: number[];
  participants?: User[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  read: boolean;
  created_at: string;
  sender?: User;
}

// Connections
export interface Connection {
  id: number;
  requester_id: number;
  recipient_id: number;
  status: "pending" | "accepted" | "rejected";
  requester?: User;
  recipient?: User;
  created_at: string;
  updated_at: string;
}

// Notifications
export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
}

// Groups
export interface Group {
  id: number;
  name: string;
  description: string;
  image_url?: string;
  is_public: boolean;
  member_count: number;
  created_by: number;
  creator?: User;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: number;
  group_id: number;
  user_id: number;
  role: "admin" | "moderator" | "member";
  user?: User;
  joined_at: string;
}

// Events
export interface Event {
  id: number;
  title: string;
  description: string;
  location?: string;
  start_time: string;
  end_time: string;
  max_attendees?: number;
  attendee_count: number;
  organizer_id: number;
  group_id?: number;
  organizer?: User;
  group?: Group;
  is_cancelled?: boolean;
  my_rsvp?: { status: string; responded_at: string } | null;
  rsvp_counts?: { going: number; maybe: number; not_going: number };
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  id: number;
  event_id: number;
  user_id: number;
  status: "going" | "maybe" | "not_going";
  user?: User;
  created_at: string;
}

// Feed / Social Posts
export interface Post {
  id: number;
  author_id: number;
  content: string;
  image_url?: string;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  author?: User;
  group_id?: number;
  group?: Group;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  post_id: number;
  author_id: number;
  content: string;
  author?: User;
  created_at: string;
}

// Gamification
export interface GamificationProfile {
  id: number;
  first_name: string;
  last_name: string;
  total_xp: number;
  level: number;
  xp_to_next_level: number;
  xp_required_for_current_level: number;
  xp_required_for_next_level: number;
  badges_earned: number;
}

export interface Badge {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  is_earned: boolean;
  earned_at?: string;
}

export interface XpTransaction {
  id: number;
  amount: number;
  source: string;
  description: string;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
  };
  period_xp: number;
  total_xp: number;
  level: number;
}

// Reviews
export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string | null;
  reviewer: {
    id: number;
    first_name: string;
    last_name: string;
  };
  target_user?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  target_listing?: {
    id: number;
    title: string;
  };
}

// AI Assistant
export interface AiChatRequest {
  prompt: string;
  context?: string;
  max_tokens?: number;
}

export interface AiChatResponse {
  response: string;
  tokens_used: number;
  model: string;
}

export interface AiStatusResponse {
  available: boolean;
  model: string | null;
  queue_depth: number;
}

// AI Listing Suggestions
export interface ListingSuggestRequest {
  title: string;
  description?: string;
  type?: "offer" | "request";
}

export interface ListingSuggestions {
  improved_title: string;
  improved_description: string;
  suggested_tags: string[];
  estimated_hours: number;
  tips: string[];
}

// AI Matched User
export interface MatchedUser {
  user_id: number;
  name: string;
  level: number;
  match_score: number;
  match_reason: string;
}

// AI Search
export interface SmartSearchRequest {
  query: string;
  max_results?: number;
}

export interface SearchResult {
  listing_id: number;
  title: string;
  description?: string;
  type: string;
  user_name: string;
  relevance: number;
  match_reason: string;
}

// AI Moderation
export interface ModerationRequest {
  content: string;
  content_type?: "listing" | "message" | "post" | "comment" | "profile";
}

export interface ModerationResult {
  is_approved: boolean;
  flagged_issues: string[];
  severity: "none" | "low" | "medium" | "high" | "critical";
  suggestions: string[];
}

// AI Profile Suggestions
export interface ProfileSuggestions {
  suggested_skills: string[];
  bio_suggestion: string;
  next_badge_goal: string;
  tips: string[];
}

// AI Community Insights
export interface CommunityInsights {
  summary: string;
  trending_services: string[];
  skill_gaps: string[];
  recommendations: string[];
  health_score: number;
  total_active_users: number;
  total_active_listings: number;
}

// AI Translation
export interface TranslationRequest {
  text: string;
  target_language: string;
}

export interface TranslationResult {
  original_text: string;
  translated_text: string;
  target_language: string;
}

// AI Conversations (multi-turn with memory)
export interface StartConversationRequest {
  title?: string;
  context?: string;
}

export interface AiSendMessageRequest {
  message: string;
}

export interface AiConversationResponse {
  conversation_id: number;
  response: string;
  tokens_used: number;
  title?: string;
}

export interface AiConversationMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface AiConversationSummary {
  id: number;
  title: string;
  context?: string;
  message_count: number;
  total_tokens_used: number;
  created_at: string;
  last_message_at?: string;
}

// AI Smart Reply Suggestions
export interface SmartReplyRequest {
  last_message: string;
  conversation_context?: string;
  count?: number;
}

export interface ReplySuggestion {
  text: string;
  tone: string;
  intent: string;
}

export interface SmartReplySuggestions {
  suggestions: ReplySuggestion[];
}

// AI Listing Generator
export interface GenerateListingRequest {
  keywords: string;
  type?: "offer" | "request";
}

export interface GeneratedListing {
  title: string;
  description: string;
  suggested_tags: string[];
  estimated_hours: number;
  category?: string;
}

// AI Sentiment Analysis
export interface SentimentRequest {
  text: string;
}

export interface SentimentAnalysis {
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  confidence: number;
  tone: string;
  emotions: string[];
  is_urgent: boolean;
  summary?: string;
}

// AI Bio Generator
export interface GenerateBioRequest {
  interests?: string;
  tone?: string;
}

export interface GeneratedBio {
  short: string;
  medium: string;
  long: string;
  tagline: string;
}

// AI Personalized Challenges
export interface Challenge {
  title: string;
  description: string;
  xp_reward: number;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  target: number;
  unit: string;
}

export interface PersonalizedChallenges {
  challenges: Challenge[];
  motivational_message: string;
}

// AI Conversation Summarizer
export interface SummarizeRequest {
  messages: string[];
}

export interface ConversationSummaryResult {
  summary: string;
  topic?: string;
  status: "ongoing" | "resolved" | "needs_action";
  key_points: string[];
  next_steps?: string;
}

// AI Skill Recommendations
export interface SkillRecommendation {
  skill: string;
  reason: string;
  demand_level: "low" | "medium" | "high";
  related_to_existing: boolean;
  learning_tip?: string;
}

export interface SkillRecommendations {
  recommendations: SkillRecommendation[];
  community_needs: string[];
}

// Exchanges
export interface Exchange {
  id: number;
  listing_id: number;
  requester_id: number;
  provider_id: number;
  status: "requested" | "accepted" | "declined" | "in_progress" | "completed" | "cancelled" | "disputed";
  hours: number;
  description?: string;
  listing?: Listing;
  requester?: User;
  provider?: User;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExchangeRating {
  id: number;
  exchange_id: number;
  rater_id: number;
  rated_user_id: number;
  rating: number;
  comment?: string;
  created_at: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  error: string;
  current_balance?: number;
  requested_amount?: number;
}


// ============================================================================
// Response Normalization Helpers
// The ASP.NET Core backend returns camelCase JSON by default.
// Frontend types use snake_case. These normalizers bridge both formats
// so code works regardless of which format the API returns.
// ============================================================================

function normalizeUser(raw: any): User | undefined {
  if (!raw) return undefined;
  return {
    id: raw.id,
    email: raw.email ?? '',
    first_name: raw.firstName ?? raw.first_name ?? '',
    last_name: raw.lastName ?? raw.last_name ?? '',
    role: raw.role ?? 'member',
    tenant_id: raw.tenantId ?? raw.tenant_id ?? 0,
    created_at: raw.createdAt ?? raw.created_at ?? '',
    bio: raw.bio,
    avatar_url: raw.avatarUrl ?? raw.avatar_url,
  };
}

function normalizeUserRequired(raw: any): User {
  return normalizeUser(raw) ?? {
    id: 0, email: '', first_name: '', last_name: '',
    role: 'member', tenant_id: 0, created_at: '',
  };
}

function normalizeListing(raw: any): Listing {
  if (!raw) return raw;
  return {
    id: raw.id,
    title: raw.title ?? '',
    description: raw.description ?? '',
    type: raw.type ?? 'offer',
    status: raw.status ?? 'active',
    time_credits: raw.timeCredits ?? raw.time_credits ?? 0,
    user_id: raw.userId ?? raw.user_id ?? 0,
    user: normalizeUser(raw.user),
    created_at: raw.createdAt ?? raw.created_at ?? '',
    updated_at: raw.updatedAt ?? raw.updated_at ?? '',
  };
}

function normalizeTransaction(raw: any): Transaction {
  if (!raw) return raw;
  return {
    id: raw.id,
    sender_id: raw.senderId ?? raw.sender_id ?? 0,
    receiver_id: raw.receiverId ?? raw.receiver_id ?? 0,
    amount: raw.amount ?? 0,
    description: raw.description ?? '',
    created_at: raw.createdAt ?? raw.created_at ?? '',
    sender: normalizeUser(raw.sender),
    receiver: normalizeUser(raw.receiver),
  };
}

function normalizeWalletBalance(raw: any): WalletBalance {
  if (!raw) return raw;
  return {
    balance: raw.balance ?? 0,
    user_id: raw.userId ?? raw.user_id ?? 0,
  };
}

function normalizeMessage(raw: any): Message {
  if (!raw) return raw;
  return {
    id: raw.id,
    conversation_id: raw.conversationId ?? raw.conversation_id ?? 0,
    sender_id: raw.senderId ?? raw.sender_id ?? 0,
    content: raw.content ?? '',
    read: raw.read ?? raw.isRead ?? false,
    created_at: raw.createdAt ?? raw.created_at ?? '',
    sender: normalizeUser(raw.sender),
  };
}

function normalizeConversation(raw: any): Conversation {
  if (!raw) return raw;
  return {
    id: raw.id,
    participant_ids: raw.participantIds ?? raw.participant_ids ?? [],
    participants: (raw.participants ?? []).map((p: any) => normalizeUser(p)).filter(Boolean) as User[],
    last_message: raw.lastMessage ?? raw.last_message ? normalizeMessage(raw.lastMessage ?? raw.last_message) : undefined,
    unread_count: raw.unreadCount ?? raw.unread_count ?? 0,
    created_at: raw.createdAt ?? raw.created_at ?? '',
    updated_at: raw.updatedAt ?? raw.updated_at ?? '',
  };
}

function normalizeConnection(raw: any): Connection {
  if (!raw) return raw;
  return {
    id: raw.id,
    requester_id: raw.requesterId ?? raw.requester_id ?? 0,
    recipient_id: raw.recipientId ?? raw.recipient_id ?? 0,
    status: raw.status ?? 'pending',
    requester: normalizeUser(raw.requester),
    recipient: normalizeUser(raw.recipient),
    created_at: raw.createdAt ?? raw.created_at ?? '',
    updated_at: raw.updatedAt ?? raw.updated_at ?? '',
  };
}

function normalizeNotification(raw: any): Notification {
  if (!raw) return raw;
  return {
    id: raw.id,
    user_id: raw.userId ?? raw.user_id ?? 0,
    type: raw.type ?? '',
    title: raw.title ?? '',
    message: raw.message ?? '',
    read: raw.read ?? raw.isRead ?? false,
    data: raw.data,
    created_at: raw.createdAt ?? raw.created_at ?? '',
  };
}

function normalizeGroup(raw: any): Group {
  if (!raw) return raw;
  return {
    id: raw.id,
    name: raw.name ?? '',
    description: raw.description ?? '',
    image_url: raw.imageUrl ?? raw.image_url,
    is_public: raw.isPublic ?? raw.is_public ?? true,
    member_count: raw.memberCount ?? raw.member_count ?? 0,
    created_by: raw.createdBy ?? raw.created_by ?? 0,
    creator: normalizeUser(raw.creator),
    created_at: raw.createdAt ?? raw.created_at ?? '',
    updated_at: raw.updatedAt ?? raw.updated_at ?? '',
  };
}

function normalizeGroupMember(raw: any): GroupMember {
  if (!raw) return raw;
  return {
    id: raw.id,
    group_id: raw.groupId ?? raw.group_id ?? 0,
    user_id: raw.userId ?? raw.user_id ?? 0,
    role: raw.role ?? 'member',
    user: normalizeUser(raw.user),
    joined_at: raw.joinedAt ?? raw.joined_at ?? '',
  };
}

function normalizeEvent(raw: any): Event {
  if (!raw) return raw;
  // Backend returns created_by (object) not organizer, and rsvp_count not attendee_count
  const createdBy = raw.created_by ?? raw.createdBy;
  return {
    id: raw.id,
    title: raw.title ?? '',
    description: raw.description ?? '',
    location: raw.location,
    start_time: raw.startsAt ?? raw.startTime ?? raw.starts_at ?? raw.start_time ?? '',
    end_time: raw.endsAt ?? raw.endTime ?? raw.ends_at ?? raw.end_time ?? '',
    max_attendees: raw.maxAttendees ?? raw.max_attendees,
    attendee_count: raw.rsvp_count ?? raw.rsvpCount ?? raw.attendeeCount ?? raw.attendee_count ?? 0,
    organizer_id: createdBy?.id ?? raw.organizerId ?? raw.organizer_id ?? 0,
    group_id: raw.groupId ?? raw.group_id ?? raw.group?.id,
    organizer: normalizeUser(raw.organizer ?? createdBy),
    group: raw.group ? normalizeGroup(raw.group) : undefined,
    is_cancelled: raw.isCancelled ?? raw.is_cancelled ?? false,
    my_rsvp: raw._my_rsvp ?? undefined,
    rsvp_counts: raw.rsvp_counts ?? raw.rsvpCounts ?? undefined,
    created_at: raw.createdAt ?? raw.created_at ?? '',
    updated_at: raw.updatedAt ?? raw.updated_at ?? '',
  };
}

function normalizeEventAttendee(raw: any): EventAttendee {
  if (!raw) return raw;
  return {
    id: raw.id,
    event_id: raw.eventId ?? raw.event_id ?? 0,
    user_id: raw.userId ?? raw.user_id ?? 0,
    status: raw.status ?? 'going',
    user: normalizeUser(raw.user),
    created_at: raw.createdAt ?? raw.created_at ?? '',
  };
}

function normalizeExchange(raw: any): Exchange {
  if (!raw) return raw;
  return {
    id: raw.id,
    listing_id: raw.listingId ?? raw.listing_id ?? 0,
    requester_id: raw.requesterId ?? raw.requester_id ?? 0,
    provider_id: raw.providerId ?? raw.provider_id ?? 0,
    status: raw.status ?? 'requested',
    hours: raw.hours ?? 0,
    description: raw.description,
    listing: raw.listing ? normalizeListing(raw.listing) : undefined,
    requester: normalizeUser(raw.requester),
    provider: normalizeUser(raw.provider),
    started_at: raw.startedAt ?? raw.started_at,
    completed_at: raw.completedAt ?? raw.completed_at,
    created_at: raw.createdAt ?? raw.created_at ?? '',
    updated_at: raw.updatedAt ?? raw.updated_at ?? '',
  };
}

function normalizeExchangeRating(raw: any): ExchangeRating {
  if (!raw) return raw;
  return {
    id: raw.id,
    exchange_id: raw.exchangeId ?? raw.exchange_id ?? 0,
    rater_id: raw.raterId ?? raw.rater_id ?? 0,
    rated_user_id: raw.ratedUserId ?? raw.rated_user_id ?? 0,
    rating: raw.rating ?? 0,
    comment: raw.comment,
    created_at: raw.createdAt ?? raw.created_at ?? '',
  };
}

function normalizeGamificationProfile(raw: any): GamificationProfile {
  if (!raw) return { id: 0, first_name: '', last_name: '', total_xp: 0, level: 0, xp_to_next_level: 0, xp_required_for_current_level: 0, xp_required_for_next_level: 0, badges_earned: 0 };
  return {
    id: raw.id ?? raw.userId ?? 0,
    first_name: raw.firstName ?? raw.first_name ?? '',
    last_name: raw.lastName ?? raw.last_name ?? '',
    total_xp: raw.totalXp ?? raw.total_xp ?? 0,
    level: raw.level ?? 0,
    xp_to_next_level: raw.xpToNextLevel ?? raw.xp_to_next_level ?? 0,
    xp_required_for_current_level: raw.xpRequiredForCurrentLevel ?? raw.xp_required_for_current_level ?? 0,
    xp_required_for_next_level: raw.xpRequiredForNextLevel ?? raw.xp_required_for_next_level ?? 0,
    badges_earned: raw.badgesEarned ?? raw.badges_earned ?? 0,
  };
}

function normalizeBadge(raw: any): Badge {
  if (!raw) return { id: 0, slug: '', name: '', description: '', icon: '', xp_reward: 0, is_earned: false };
  return {
    id: raw.id,
    slug: raw.slug ?? '',
    name: raw.name ?? '',
    description: raw.description ?? '',
    icon: raw.icon ?? '',
    xp_reward: raw.xpReward ?? raw.xp_reward ?? 0,
    is_earned: raw.isEarned ?? raw.is_earned ?? false,
    earned_at: raw.earnedAt ?? raw.earned_at,
  };
}

function normalizeXpTransaction(raw: any): XpTransaction {
  if (!raw) return raw;
  return {
    id: raw.id,
    amount: raw.amount ?? 0,
    source: raw.source ?? '',
    description: raw.description ?? '',
    created_at: raw.createdAt ?? raw.created_at ?? '',
  };
}

function normalizeLeaderboardEntry(raw: any): LeaderboardEntry {
  if (!raw) return raw;
  return {
    rank: raw.rank ?? 0,
    user: {
      id: raw.user?.id ?? 0,
      first_name: raw.user?.firstName ?? raw.user?.first_name ?? '',
      last_name: raw.user?.lastName ?? raw.user?.last_name ?? '',
    },
    period_xp: raw.periodXp ?? raw.period_xp ?? 0,
    total_xp: raw.totalXp ?? raw.total_xp ?? 0,
    level: raw.level ?? 0,
  };
}

function normalizeReview(raw: any): Review {
  if (!raw) return raw;
  return {
    id: raw.id,
    rating: raw.rating ?? 0,
    comment: raw.comment ?? null,
    created_at: raw.createdAt ?? raw.created_at ?? '',
    updated_at: raw.updatedAt ?? raw.updated_at ?? null,
    reviewer: {
      id: raw.reviewer?.id ?? 0,
      first_name: raw.reviewer?.firstName ?? raw.reviewer?.first_name ?? '',
      last_name: raw.reviewer?.lastName ?? raw.reviewer?.last_name ?? '',
    },
    target_user: (raw.targetUser ?? raw.target_user) ? {
      id: (raw.targetUser ?? raw.target_user)?.id ?? 0,
      first_name: (raw.targetUser ?? raw.target_user)?.firstName ?? (raw.targetUser ?? raw.target_user)?.first_name ?? '',
      last_name: (raw.targetUser ?? raw.target_user)?.lastName ?? (raw.targetUser ?? raw.target_user)?.last_name ?? '',
    } : undefined,
    target_listing: (raw.targetListing ?? raw.target_listing) ? {
      id: (raw.targetListing ?? raw.target_listing)?.id ?? 0,
      title: (raw.targetListing ?? raw.target_listing)?.title ?? '',
    } : undefined,
  };
}

function normalizePost(raw: any): Post {
  return {
    id: raw.id,
    author_id: raw.user?.id ?? raw.author?.id ?? raw.authorId ?? raw.author_id ?? 0,
    content: raw.content ?? '',
    image_url: raw.imageUrl ?? raw.image_url,
    like_count: raw.likeCount ?? raw.like_count ?? 0,
    comment_count: raw.commentCount ?? raw.comment_count ?? 0,
    is_liked: raw.isLiked ?? raw.is_liked ?? false,
    author: normalizeUser(raw.user ?? raw.author),
    group_id: raw.groupId ?? raw.group_id ?? raw.group?.id,
    group: raw.group ? normalizeGroup(raw.group) : undefined,
    created_at: raw.createdAt ?? raw.created_at ?? '',
    updated_at: raw.updatedAt ?? raw.updated_at ?? '',
  };
}

function normalizeComment(raw: any): Comment {
  return {
    id: raw.id,
    post_id: raw.postId ?? raw.post_id ?? 0,
    author_id: raw.user?.id ?? raw.author?.id ?? raw.authorId ?? raw.author_id ?? 0,
    content: raw.content ?? '',
    author: normalizeUser(raw.user ?? raw.author),
    created_at: raw.createdAt ?? raw.created_at ?? '',
  };
}

/** Normalize a paginated response, applying a normalizer to each item in data[] */
function normalizePaginated<T>(raw: any, normalizer: (item: any) => T): PaginatedResponse<T> {
  return {
    data: (raw?.data ?? []).map(normalizer),
    pagination: {
      page: raw?.pagination?.page ?? 1,
      limit: raw?.pagination?.limit ?? 20,
      total: raw?.pagination?.total ?? 0,
      total_pages: raw?.pagination?.totalPages ?? raw?.pagination?.total_pages ?? raw?.pagination?.pages ?? 0,
    },
  };
}

/** Normalize an AuthResponse (login/register) */
function normalizeAuthResponse(raw: any): AuthResponse {
  return {
    access_token: raw.accessToken ?? raw.access_token ?? raw.token ?? '',
    refresh_token: raw.refreshToken ?? raw.refresh_token ?? undefined,
    token_type: raw.tokenType ?? raw.token_type ?? 'Bearer',
    expires_in: raw.expiresIn ?? raw.expires_in ?? 0,
    user: normalizeUserRequired(raw.user),
  };
}

// ============================================================================
// Token Management
// ============================================================================

const TOKEN_KEY = "nexus_token";
const REFRESH_TOKEN_KEY = "nexus_refresh_token";
const USER_KEY = "nexus_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem(USER_KEY);
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function setStoredUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

// ============================================================================
// Fetch Wrapper
// ============================================================================

// Default request timeout in milliseconds (30 seconds)
const DEFAULT_TIMEOUT = 30000;

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string, timeout: number = DEFAULT_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = timeout;
  }

  /**
   * Attempt to refresh the access token using the stored refresh token.
   * Returns true if refresh succeeded, false otherwise.
   */
  private async tryRefreshToken(): Promise<boolean> {
    // Deduplicate concurrent refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) return false;

        const raw = await response.json();
        const newAccessToken = raw.accessToken ?? raw.access_token ?? raw.token;
        const newRefreshToken = raw.refreshToken ?? raw.refresh_token;

        if (newAccessToken) {
          setToken(newAccessToken);
          if (newRefreshToken) {
            setRefreshToken(newRefreshToken);
          }
          if (raw.user) {
            setStoredUser(normalizeUserRequired(raw.user));
          }
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout?: number
  ): Promise<T> {
    const token = getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    // Always send tenant ID header for unauthenticated requests (FAQs, legal, translations, etc.)
    if (TENANT_ID) {
      (headers as Record<string, string>)["X-Tenant-ID"] = TENANT_ID;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeout ?? this.defaultTimeout
    );

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

    if (response.status === 401) {
      // For auth endpoints (login, register, refresh), let the 401 fall through
      // to the generic !response.ok handler so the caller can display
      // the actual API error message (e.g. "Invalid credentials").
      const isAuthEndpoint = endpoint.startsWith("/api/auth/login") ||
        endpoint.startsWith("/api/auth/register") ||
        endpoint.startsWith("/api/auth/refresh");

      if (!isAuthEndpoint) {
        // Try refreshing the token before giving up
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // Retry the original request with the new token
          const retryToken = getToken();
          const retryHeaders: HeadersInit = {
            ...options.headers,
            "Content-Type": "application/json",
          };
          if (retryToken) {
            (retryHeaders as Record<string, string>)["Authorization"] = `Bearer ${retryToken}`;
          }
          if (TENANT_ID) {
            (retryHeaders as Record<string, string>)["X-Tenant-ID"] = TENANT_ID;
          }
          const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: retryHeaders,
          });
          if (retryResponse.ok) {
            if (retryResponse.status === 204) return {} as T;
            return retryResponse.json();
          }
        }

        // Refresh failed or retry failed - log out
        removeToken();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("Session expired");
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "An unexpected error occurred",
      }));
      throw new Error(
        error.error || error.title || error.detail || "An unexpected error occurred"
      );
    }

      // Handle empty responses (204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timed out. Please try again.");
      }
      throw error;
    }
  }

  private buildQueryString(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return query ? `?${query}` : "";
  }

  // ==========================================================================
  // Authentication
  // ==========================================================================

  async login(
    email: string,
    password: string,
    tenantSlug: string
  ): Promise<AuthResponse> {
    const raw = await this.request<any>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        tenant_slug: tenantSlug,
      }),
    });

    const response = normalizeAuthResponse(raw);
    setToken(response.access_token);
    if (response.refresh_token) {
      setRefreshToken(response.refresh_token);
    }
    setStoredUser(response.user);

    return response;
  }

  async validateToken(): Promise<User> {
    const raw = await this.request<any>("/api/auth/validate");
    return normalizeUserRequired(raw);
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>("/api/auth/logout", { method: "POST" });
    } catch {
      // Server-side logout is best-effort; always clear local state
    }
    removeToken();
  }

  async register(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    tenant_slug: string;
  }): Promise<AuthResponse> {
    const raw = await this.request<any>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    const response = normalizeAuthResponse(raw);
    setToken(response.access_token);
    if (response.refresh_token) {
      setRefreshToken(response.refresh_token);
    }
    setStoredUser(response.user);

    return response;
  }

  async requestPasswordReset(email: string, tenantSlug: string): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email, tenant_slug: tenantSlug }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  // ==========================================================================
  // Users
  // ==========================================================================

  async getUsers(): Promise<User[]> {
    const raw = await this.request<any[]>("/api/users");
    return (raw ?? []).map((u: any) => normalizeUserRequired(u));
  }

  async getUser(id: number): Promise<User> {
    const raw = await this.request<any>(`/api/users/${id}`);
    return normalizeUserRequired(raw);
  }

  async getCurrentUser(): Promise<User> {
    const raw = await this.request<any>("/api/users/me");
    return normalizeUserRequired(raw);
  }

  async updateCurrentUser(data: {
    first_name?: string;
    last_name?: string;
  }): Promise<User> {
    const raw = await this.request<any>("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    const user = normalizeUserRequired(raw);
    setStoredUser(user);
    return user;
  }

  async getMembers(params?: {
    page?: number;
    limit?: number;
    q?: string;
  }): Promise<PaginatedResponse<User>> {
    const query = this.buildQueryString(params || {});
    const raw = await this.request<any>(`/api/users${query}`);
    return normalizePaginated(raw, normalizeUserRequired);
  }

  // ==========================================================================
  // Listings
  // ==========================================================================

  async getListings(params?: {
    type?: "offer" | "request";
    status?: "active" | "draft" | "completed" | "cancelled";
    user_id?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Listing>> {
    const query = this.buildQueryString(params || {});
    const raw = await this.request<any>(`/api/listings${query}`);
    return normalizePaginated(raw, normalizeListing);
  }

  async getListing(id: number): Promise<Listing> {
    const raw = await this.request<any>(`/api/listings/${id}`);
    return normalizeListing(raw);
  }

  async createListing(data: {
    title: string;
    description: string;
    type: "offer" | "request";
    time_credits: number;
    status?: "active" | "draft";
  }): Promise<Listing> {
    const raw = await this.request<any>("/api/listings", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return normalizeListing(raw);
  }

  async updateListing(
    id: number,
    data: Partial<{
      title: string;
      description: string;
      type: "offer" | "request";
      time_credits: number;
      status: "active" | "draft" | "completed" | "cancelled";
    }>
  ): Promise<Listing> {
    const raw = await this.request<any>(`/api/listings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return normalizeListing(raw);
  }

  async deleteListing(id: number): Promise<void> {
    return this.request<void>(`/api/listings/${id}`, {
      method: "DELETE",
    });
  }

  // ==========================================================================
  // Wallet
  // ==========================================================================

  async getBalance(): Promise<WalletBalance> {
    const raw = await this.request<any>("/api/wallet/balance");
    return normalizeWalletBalance(raw);
  }

  async getTransactions(params?: {
    type?: "sent" | "received" | "all";
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Transaction>> {
    const query = this.buildQueryString(params || {});
    const raw = await this.request<any>(`/api/wallet/transactions${query}`);
    return normalizePaginated(raw, normalizeTransaction);
  }

  async getTransaction(id: number): Promise<Transaction> {
    const raw = await this.request<any>(`/api/wallet/transactions/${id}`);
    return normalizeTransaction(raw);
  }

  async transfer(data: {
    receiver_id: number;
    amount: number;
    description: string;
  }): Promise<Transaction> {
    const raw = await this.request<any>("/api/wallet/transfer", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return normalizeTransaction(raw);
  }

  // ==========================================================================
  // Messages
  // ==========================================================================

  async getConversations(): Promise<Conversation[]> {
    const raw = await this.request<any>("/api/messages");
    // Handle both array and paginated response formats
    const items = Array.isArray(raw) ? raw : (raw?.data ?? []);
    return items.map(normalizeConversation);
  }

  async getConversation(
    id: number
  ): Promise<Conversation & { messages: Message[] }> {
    const raw = await this.request<any>(`/api/messages/${id}`);
    const conv = normalizeConversation(raw);
    return {
      ...conv,
      messages: (raw.messages ?? []).map(normalizeMessage),
    };
  }

  async getUnreadMessageCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>("/api/messages/unread-count");
  }

  async sendMessage(data: {
    receiver_id?: number;
    conversation_id?: number;
    content: string;
  }): Promise<Message> {
    const raw = await this.request<any>("/api/messages", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return normalizeMessage(raw);
  }

  async markConversationAsRead(id: number): Promise<void> {
    return this.request<void>(`/api/messages/${id}/read`, {
      method: "PUT",
    });
  }

  // ==========================================================================
  // Connections
  // ==========================================================================

  async getConnections(params?: {
    status?: "pending" | "accepted" | "rejected";
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Connection>> {
    const query = this.buildQueryString(params || {});
    const raw = await this.request<any>(`/api/connections${query}`);
    return normalizePaginated(raw, normalizeConnection);
  }

  async getConnection(id: number): Promise<Connection> {
    const raw = await this.request<any>(`/api/connections/${id}`);
    return normalizeConnection(raw);
  }

  async sendConnectionRequest(recipientId: number): Promise<Connection> {
    const raw = await this.request<any>("/api/connections", {
      method: "POST",
      body: JSON.stringify({ user_id: recipientId }),
    });
    return normalizeConnection(raw);
  }

  async respondToConnection(
    id: number,
    status: "accepted" | "rejected"
  ): Promise<Connection> {
    // Backend has separate /accept and /decline endpoints
    const action = status === "accepted" ? "accept" : "decline";
    const raw = await this.request<any>(`/api/connections/${id}/${action}`, {
      method: "PUT",
    });
    return normalizeConnection(raw);
  }

  async removeConnection(id: number): Promise<void> {
    return this.request<void>(`/api/connections/${id}`, {
      method: "DELETE",
    });
  }

  // ==========================================================================
  // Notifications
  // ==========================================================================

  async getNotifications(params?: {
    unread_only?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Notification>> {
    const query = this.buildQueryString(params || {});
    const raw = await this.request<any>(`/api/notifications${query}`);
    return normalizePaginated(raw, normalizeNotification);
  }

  async getUnreadNotificationCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>("/api/notifications/unread-count");
  }

  async markNotificationAsRead(id: number): Promise<void> {
    return this.request<void>(`/api/notifications/${id}/read`, {
      method: "PUT",
    });
  }

  async markAllNotificationsAsRead(): Promise<void> {
    return this.request<void>("/api/notifications/read-all", {
      method: "PUT",
    });
  }

  // ==========================================================================
  // Groups
  // ==========================================================================

  async getGroups(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Group>> {
    const query = this.buildQueryString(params || {});
    const raw = await this.request<any>(`/api/groups${query}`);
    return normalizePaginated(raw, normalizeGroup);
  }

  async getGroup(id: number): Promise<Group> {
    const raw = await this.request<any>(`/api/groups/${id}`);
    return normalizeGroup(raw);
  }

  async createGroup(data: {
    name: string;
    description: string;
    is_public?: boolean;
    image_url?: string;
  }): Promise<Group> {
    const raw = await this.request<any>("/api/groups", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return normalizeGroup(raw);
  }

  async updateGroup(
    id: number,
    data: Partial<{
      name: string;
      description: string;
      is_public: boolean;
      image_url: string;
    }>
  ): Promise<Group> {
    const raw = await this.request<any>(`/api/groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return normalizeGroup(raw);
  }

  async deleteGroup(id: number): Promise<void> {
    return this.request<void>(`/api/groups/${id}`, {
      method: "DELETE",
    });
  }

  async joinGroup(id: number): Promise<GroupMember> {
    const raw = await this.request<any>(`/api/groups/${id}/join`, {
      method: "POST",
    });
    return normalizeGroupMember(raw);
  }

  async leaveGroup(id: number): Promise<void> {
    return this.request<void>(`/api/groups/${id}/leave`, {
      method: "DELETE",
    });
  }

  async getGroupMembers(
    groupId: number
  ): Promise<PaginatedResponse<GroupMember>> {
    const raw = await this.request<any>(`/api/groups/${groupId}/members`);
    return normalizePaginated(raw, normalizeGroupMember);
  }

  async updateGroupMemberRole(
    groupId: number,
    userId: number,
    role: "admin" | "moderator" | "member"
  ): Promise<GroupMember> {
    const raw = await this.request<any>(
      `/api/groups/${groupId}/members/${userId}`,
      {
        method: "PUT",
        body: JSON.stringify({ role }),
      }
    );
    return normalizeGroupMember(raw);
  }

  async removeGroupMember(groupId: number, userId: number): Promise<void> {
    return this.request<void>(`/api/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
    });
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  async getEvents(params?: {
    status?: "upcoming" | "past" | "all";
    group_id?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Event>> {
    const query = this.buildQueryString(params || {});
    const raw = await this.request<any>(`/api/events${query}`);
    return normalizePaginated(raw, normalizeEvent);
  }

  async getEvent(id: number): Promise<Event> {
    const raw = await this.request<any>(`/api/events/${id}`);
    // Backend returns { event: {...}, my_rsvp: {...} } wrapper
    const eventData = raw?.event ?? raw;
    const myRsvp = raw?.my_rsvp ?? raw?.myRsvp;
    const event = normalizeEvent(eventData);
    if (myRsvp) {
      event.my_rsvp = {
        status: myRsvp.status,
        responded_at: myRsvp.respondedAt ?? myRsvp.responded_at ?? '',
      };
    }
    return event;
  }

  async createEvent(data: {
    title: string;
    description: string;
    location?: string;
    start_time: string;
    end_time: string;
    max_attendees?: number;
    group_id?: number;
    image_url?: string;
  }): Promise<Event> {
    // Backend expects starts_at/ends_at, not start_time/end_time
    const payload = {
      title: data.title,
      description: data.description,
      location: data.location,
      starts_at: data.start_time,
      ends_at: data.end_time,
      max_attendees: data.max_attendees,
      group_id: data.group_id,
      image_url: data.image_url,
    };
    const raw = await this.request<any>("/api/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    // Backend returns { success, message, event: {...} }
    return normalizeEvent(raw?.event ?? raw);
  }

  async updateEvent(
    id: number,
    data: Partial<{
      title: string;
      description: string;
      location: string;
      start_time: string;
      end_time: string;
      max_attendees: number;
      image_url: string;
    }>
  ): Promise<Event> {
    // Backend expects starts_at/ends_at
    const payload: Record<string, unknown> = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.description !== undefined) payload.description = data.description;
    if (data.location !== undefined) payload.location = data.location;
    if (data.start_time !== undefined) payload.starts_at = data.start_time;
    if (data.end_time !== undefined) payload.ends_at = data.end_time;
    if (data.max_attendees !== undefined) payload.max_attendees = data.max_attendees;
    if (data.image_url !== undefined) payload.image_url = data.image_url;
    const raw = await this.request<any>(`/api/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    // Backend returns { success, message, event: {...} }
    return normalizeEvent(raw?.event ?? raw);
  }

  async cancelEvent(id: number): Promise<void> {
    return this.request<void>(`/api/events/${id}/cancel`, {
      method: "PUT",
    });
  }

  async deleteEvent(id: number): Promise<void> {
    return this.request<void>(`/api/events/${id}`, {
      method: "DELETE",
    });
  }

  async rsvpToEvent(
    id: number,
    status: "going" | "maybe" | "not_going"
  ): Promise<EventAttendee> {
    const raw = await this.request<any>(`/api/events/${id}/rsvp`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    // Backend returns { success, message, rsvp: { event_id, status, responded_at } }
    return normalizeEventAttendee(raw?.rsvp ?? raw);
  }

  async cancelRsvp(id: number): Promise<void> {
    return this.request<void>(`/api/events/${id}/rsvp`, {
      method: "DELETE",
    });
  }

  async getEventAttendees(
    eventId: number
  ): Promise<PaginatedResponse<EventAttendee>> {
    const raw = await this.request<any>(`/api/events/${eventId}/rsvps`);
    // Backend returns flat { id, firstName, lastName, status, responded_at }
    // where id is the user's ID (not a separate RSVP ID)
    const normalizer = (item: any): EventAttendee => ({
      id: item.id,
      event_id: eventId,
      user_id: item.id,
      status: item.status ?? 'going',
      user: {
        id: item.id,
        email: '',
        first_name: item.firstName ?? item.first_name ?? '',
        last_name: item.lastName ?? item.last_name ?? '',
        role: 'member',
        tenant_id: 0,
        created_at: '',
      },
      created_at: item.respondedAt ?? item.responded_at ?? '',
    });
    // Backend wraps in { data: [...] } without pagination
    const items = raw?.data ?? raw ?? [];
    return {
      data: Array.isArray(items) ? items.map(normalizer) : [],
      pagination: { page: 1, limit: 100, total: Array.isArray(items) ? items.length : 0, total_pages: 1 },
    };
  }

  // ==========================================================================
  // Feed / Social Posts
  // ==========================================================================

  async getFeed(params?: {
    group_id?: number;
    user_id?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Post>> {
    const query = this.buildQueryString(params || {});
    const raw = await this.request<any>(`/api/feed${query}`);
    return normalizePaginated(raw, normalizePost);
  }

  async getPost(id: number): Promise<Post> {
    const raw = await this.request<any>(`/api/feed/${id}`);
    return normalizePost(raw);
  }

  async createPost(data: {
    content: string;
    image_url?: string;
    group_id?: number;
  }): Promise<Post> {
    const raw = await this.request<any>("/api/feed", {
      method: "POST",
      body: JSON.stringify(data),
    });
    // Backend returns { success, message, post: {...} }
    return normalizePost(raw?.post ?? raw);
  }

  async updatePost(
    id: number,
    data: Partial<{
      content: string;
      image_url: string;
    }>
  ): Promise<Post> {
    const raw = await this.request<any>(`/api/feed/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return normalizePost(raw?.post ?? raw);
  }

  async deletePost(id: number): Promise<void> {
    return this.request<void>(`/api/feed/${id}`, {
      method: "DELETE",
    });
  }

  async likePost(id: number): Promise<void> {
    return this.request<void>(`/api/feed/${id}/like`, {
      method: "POST",
    });
  }

  async unlikePost(id: number): Promise<void> {
    return this.request<void>(`/api/feed/${id}/like`, {
      method: "DELETE",
    });
  }

  async getPostComments(postId: number): Promise<Comment[]> {
    const res = await this.request<any>(`/api/feed/${postId}/comments`);
    return (res?.data ?? []).map(normalizeComment);
  }

  async addComment(postId: number, content: string): Promise<Comment> {
    const raw = await this.request<any>(`/api/feed/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    return normalizeComment(raw?.comment ?? raw);
  }

  async deleteComment(postId: number, commentId: number): Promise<void> {
    return this.request<void>(`/api/feed/${postId}/comments/${commentId}`, {
      method: "DELETE",
    });
  }

  // ==========================================================================
  // Gamification
  // ==========================================================================

  async getGamificationProfile(): Promise<{
    profile: GamificationProfile;
    recent_xp: XpTransaction[];
  }> {
    const raw = await this.request<any>("/api/gamification/profile");
    return {
      profile: normalizeGamificationProfile(raw.profile ?? raw),
      recent_xp: (raw.recentXp ?? raw.recent_xp ?? []).map(normalizeXpTransaction),
    };
  }

  async getUserGamificationProfile(userId: number): Promise<{
    profile: GamificationProfile;
  }> {
    const raw = await this.request<any>(`/api/gamification/profile/${userId}`);
    return {
      profile: normalizeGamificationProfile(raw.profile ?? raw),
    };
  }

  async getAllBadges(): Promise<{
    data: Badge[];
    summary: {
      total: number;
      earned: number;
      progress_percent: number;
    };
  }> {
    const raw = await this.request<any>("/api/gamification/badges");
    return {
      data: (raw.data ?? []).map(normalizeBadge),
      summary: {
        total: raw.summary?.total ?? 0,
        earned: raw.summary?.earned ?? 0,
        progress_percent: raw.summary?.progressPercent ?? raw.summary?.progress_percent ?? 0,
      },
    };
  }

  async getMyBadges(): Promise<Badge[]> {
    const raw = await this.request<any[]>("/api/gamification/badges/my");
    return (raw ?? []).map(normalizeBadge);
  }

  async getLeaderboard(params?: {
    period?: "all" | "week" | "month" | "year";
    page?: number;
    limit?: number;
  }): Promise<
    PaginatedResponse<LeaderboardEntry> & {
      current_user_rank: number;
      period: string;
    }
  > {
    const query = this.buildQueryString(params || {});
    const raw = await this.request<any>(`/api/gamification/leaderboard${query}`);
    const paginated = normalizePaginated(raw, normalizeLeaderboardEntry);
    return {
      ...paginated,
      current_user_rank: raw.currentUserRank ?? raw.current_user_rank ?? 0,
      period: raw.period ?? '',
    };
  }

  async getXpHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<XpTransaction>> {
    const query = this.buildQueryString(params || {});
    const raw = await this.request<any>(`/api/gamification/xp-history${query}`);
    return normalizePaginated(raw, normalizeXpTransaction);
  }

  // ==========================================================================
  // Reviews
  // ==========================================================================

  async getUserReviews(
    userId: number,
    params?: { page?: number; limit?: number }
  ): Promise<{
    data: Review[];
    summary: { average_rating: number; total_reviews: number };
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const query = this.buildQueryString(params || {});
    const raw = await this.request<any>(`/api/users/${userId}/reviews${query}`);
    return {
      data: (raw.data ?? []).map(normalizeReview),
      summary: {
        average_rating: raw.summary?.averageRating ?? raw.summary?.average_rating ?? 0,
        total_reviews: raw.summary?.totalReviews ?? raw.summary?.total_reviews ?? 0,
      },
      pagination: raw.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 },
    };
  }

  async createUserReview(
    userId: number,
    data: { rating: number; comment?: string }
  ): Promise<Review> {
    const raw = await this.request<any>(`/api/users/${userId}/reviews`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return normalizeReview(raw);
  }

  async getListingReviews(
    listingId: number,
    params?: { page?: number; limit?: number }
  ): Promise<{
    data: Review[];
    summary: { average_rating: number; total_reviews: number };
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const query = this.buildQueryString(params || {});
    const raw = await this.request<any>(`/api/listings/${listingId}/reviews${query}`);
    return {
      data: (raw.data ?? []).map(normalizeReview),
      summary: {
        average_rating: raw.summary?.averageRating ?? raw.summary?.average_rating ?? 0,
        total_reviews: raw.summary?.totalReviews ?? raw.summary?.total_reviews ?? 0,
      },
      pagination: raw.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 },
    };
  }

  async createListingReview(
    listingId: number,
    data: { rating: number; comment?: string }
  ): Promise<Review> {
    const raw = await this.request<any>(`/api/listings/${listingId}/reviews`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return normalizeReview(raw);
  }

  async getReview(id: number): Promise<Review> {
    const raw = await this.request<any>(`/api/reviews/${id}`);
    return normalizeReview(raw);
  }

  async updateReview(
    id: number,
    data: { rating?: number; comment?: string }
  ): Promise<Review> {
    const raw = await this.request<any>(`/api/reviews/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return normalizeReview(raw);
  }

  async deleteReview(id: number): Promise<void> {
    return this.request<void>(`/api/reviews/${id}`, {
      method: "DELETE",
    });
  }

  async getPendingReviews(): Promise<Exchange[]> {
    const raw = await this.request<any[]>("/api/reviews/pending");
    return (raw ?? []).map(normalizeExchange);
  }

  async getUserTrustScore(userId: number): Promise<{
    user_id: number;
    trust_score: number;
    total_reviews: number;
    average_rating: number;
  }> {
    return this.request(`/api/reviews/user/${userId}/trust`);
  }

  // ==========================================================================
  // Health
  // ==========================================================================

  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>("/health");
  }

  // ==========================================================================
  // AI Assistant
  // ==========================================================================

  async aiChat(
    prompt: string,
    context?: string,
    maxTokens?: number
  ): Promise<AiChatResponse> {
    return this.request<AiChatResponse>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        context,
        max_tokens: maxTokens,
      }),
    });
  }

  async aiStatus(): Promise<AiStatusResponse> {
    return this.request<AiStatusResponse>("/api/ai/status");
  }

  async aiSuggestListing(
    data: ListingSuggestRequest
  ): Promise<ListingSuggestions> {
    return this.request<ListingSuggestions>("/api/ai/listings/suggest", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async aiGetListingMatches(
    listingId: number,
    maxResults?: number
  ): Promise<MatchedUser[]> {
    const query = maxResults ? `?maxResults=${maxResults}` : "";
    return this.request<MatchedUser[]>(
      `/api/ai/listings/${listingId}/matches${query}`
    );
  }

  async aiSearch(data: SmartSearchRequest): Promise<SearchResult[]> {
    return this.request<SearchResult[]>("/api/ai/search", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async aiModerate(data: ModerationRequest): Promise<ModerationResult> {
    return this.request<ModerationResult>("/api/ai/moderate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async aiGetProfileSuggestions(): Promise<ProfileSuggestions> {
    return this.request<ProfileSuggestions>("/api/ai/profile/suggestions");
  }

  async aiGetUserSuggestions(userId: number): Promise<ProfileSuggestions> {
    return this.request<ProfileSuggestions>(
      `/api/ai/users/${userId}/suggestions`
    );
  }

  async aiGetCommunityInsights(): Promise<CommunityInsights> {
    return this.request<CommunityInsights>("/api/ai/community/insights");
  }

  async aiTranslate(data: TranslationRequest): Promise<TranslationResult> {
    return this.request<TranslationResult>("/api/ai/translate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // AI Conversations (multi-turn with memory)
  async aiStartConversation(
    data: StartConversationRequest = {}
  ): Promise<AiConversationSummary> {
    return this.request<AiConversationSummary>("/api/ai/conversations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async aiSendMessage(
    conversationId: number,
    message: string
  ): Promise<AiConversationResponse> {
    return this.request<AiConversationResponse>(
      `/api/ai/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ message }),
      }
    );
  }

  async aiGetConversationHistory(
    conversationId: number,
    limit: number = 50
  ): Promise<AiConversationMessage[]> {
    return this.request<AiConversationMessage[]>(
      `/api/ai/conversations/${conversationId}/messages?limit=${limit}`
    );
  }

  async aiListConversations(limit: number = 20): Promise<AiConversationSummary[]> {
    return this.request<AiConversationSummary[]>(
      `/api/ai/conversations?limit=${limit}`
    );
  }

  async aiArchiveConversation(conversationId: number): Promise<void> {
    return this.request<void>(`/api/ai/conversations/${conversationId}`, {
      method: "DELETE",
    });
  }

  // AI Smart Reply Suggestions
  async aiGetSmartReplies(
    data: SmartReplyRequest
  ): Promise<SmartReplySuggestions> {
    return this.request<SmartReplySuggestions>("/api/ai/replies/suggest", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // AI Listing Generator
  async aiGenerateListing(
    data: GenerateListingRequest
  ): Promise<GeneratedListing> {
    return this.request<GeneratedListing>("/api/ai/listings/generate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // AI Sentiment Analysis
  async aiAnalyzeSentiment(data: SentimentRequest): Promise<SentimentAnalysis> {
    return this.request<SentimentAnalysis>("/api/ai/sentiment", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // AI Bio Generator
  async aiGenerateBio(data: GenerateBioRequest = {}): Promise<GeneratedBio> {
    return this.request<GeneratedBio>("/api/ai/bio/generate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // AI Personalized Challenges
  async aiGetChallenges(count: number = 3): Promise<PersonalizedChallenges> {
    return this.request<PersonalizedChallenges>(
      `/api/ai/challenges?count=${count}`
    );
  }

  // AI Conversation Summarizer
  async aiSummarizeConversation(
    data: SummarizeRequest
  ): Promise<ConversationSummaryResult> {
    return this.request<ConversationSummaryResult>("/api/ai/summarize", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // AI Skill Recommendations
  async aiGetSkillRecommendations(): Promise<SkillRecommendations> {
    return this.request<SkillRecommendations>("/api/ai/skills/recommend");
  }

  // ==========================================================================
  // Search API
  // ==========================================================================

  async search(params: {
    q: string;
    type?: "all" | "listings" | "users" | "groups" | "events";
    page?: number;
    limit?: number;
  }): Promise<{
    listings: Listing[];
    users: User[];
    groups: Group[];
    events: Event[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const query = this.buildQueryString(params);
    return this.request(`/api/search${query}`);
  }

  async searchSuggestions(
    q: string,
    limit: number = 5
  ): Promise<Array<{ text: string; type: string; id: number }>> {
    return this.request(
      `/api/search/suggestions?q=${encodeURIComponent(q)}&limit=${limit}`
    );
  }

  // ==========================================================================
  // Breach Notifications
  // ==========================================================================

  async getBreachNotifications(): Promise<{
    id: number;
    title: string;
    description: string;
    severity: string;
    created_at: string;
    acknowledged: boolean;
  }[]> {
    return this.request("/api/gdpr/breach-notifications");
  }

  async acknowledgeBreachNotification(breachId: number): Promise<void> {
    return this.request<void>(`/api/gdpr/breach-notifications/${breachId}/acknowledge`, {
      method: "POST",
    });
  }

  // ==========================================================================
  // Cookie Consent
  // ==========================================================================

  async getCookieConsent(): Promise<{
    analytics: boolean;
    marketing: boolean;
    functional: boolean;
  }> {
    return this.request("/api/gdpr/cookie-consent");
  }

  async updateCookieConsent(data: {
    analytics?: boolean;
    marketing?: boolean;
    functional?: boolean;
  }): Promise<void> {
    return this.request<void>("/api/gdpr/cookie-consent", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ==========================================================================
  // Notification Polling & Config
  // ==========================================================================

  async pollNotifications(): Promise<{ count: number; latest: Notification[] }> {
    return this.request("/api/notifications/poll");
  }

  async getNotificationConfig(): Promise<Record<string, { email: boolean; push: boolean; in_app: boolean }>> {
    return this.request("/api/notifications/config");
  }

  async updateNotificationConfig(data: Record<string, { email?: boolean; push?: boolean; in_app?: boolean }>): Promise<void> {
    return this.request<void>("/api/notifications/config", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ==========================================================================
  // Admin API - Requires admin role
  // ==========================================================================

  async adminGetDashboard(): Promise<AdminDashboard> {
    return this.request<AdminDashboard>("/api/admin/dashboard");
  }

  async adminGetUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<AdminUser>> {
    const query = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<AdminUser>>(`/api/admin/users${query}`);
  }

  async adminGetUser(id: number): Promise<AdminUserDetails> {
    return this.request<AdminUserDetails>(`/api/admin/users/${id}`);
  }

  async adminUpdateUser(
    id: number,
    data: { role?: string; first_name?: string; last_name?: string; email?: string }
  ): Promise<{ success: boolean; message: string; user: AdminUser }> {
    return this.request(`/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async adminSuspendUser(
    id: number,
    reason?: string
  ): Promise<{ success: boolean; message: string; user: AdminUser }> {
    return this.request(`/api/admin/users/${id}/suspend`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    });
  }

  async adminActivateUser(
    id: number
  ): Promise<{ success: boolean; message: string; user: AdminUser }> {
    return this.request(`/api/admin/users/${id}/activate`, {
      method: "PUT",
    });
  }

  async adminGetPendingListings(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<AdminPendingListing>> {
    const query = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<AdminPendingListing>>(
      `/api/admin/listings/pending${query}`
    );
  }

  async adminApproveListing(
    id: number
  ): Promise<{ success: boolean; message: string; listing: AdminPendingListing }> {
    return this.request(`/api/admin/listings/${id}/approve`, {
      method: "PUT",
    });
  }

  async adminRejectListing(
    id: number,
    reason: string
  ): Promise<{ success: boolean; message: string; listing: AdminPendingListing }> {
    return this.request(`/api/admin/listings/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    });
  }

  async adminGetCategories(): Promise<{ data: AdminCategory[] }> {
    return this.request("/api/admin/categories");
  }

  async adminCreateCategory(data: {
    name: string;
    description?: string;
    slug?: string;
    parent_category_id?: number;
    sort_order?: number;
    is_active?: boolean;
  }): Promise<{ success: boolean; message: string; category: AdminCategory }> {
    return this.request("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async adminUpdateCategory(
    id: number,
    data: {
      name?: string;
      description?: string;
      slug?: string;
      parent_category_id?: number;
      sort_order?: number;
      is_active?: boolean;
    }
  ): Promise<{ success: boolean; message: string; category: AdminCategory }> {
    return this.request(`/api/admin/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async adminDeleteCategory(id: number): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/admin/categories/${id}`, {
      method: "DELETE",
    });
  }

  async adminGetConfig(): Promise<{ data: TenantConfig[]; config: Record<string, string> }> {
    return this.request("/api/admin/config");
  }

  async adminUpdateConfig(
    config: { key: string; value: string }[]
  ): Promise<{ success: boolean; message: string; created: string[]; updated: string[] }> {
    // Convert array to Record for API
    const configObj: Record<string, string> = {};
    config.forEach((item) => {
      configObj[item.key] = item.value;
    });
    return this.request("/api/admin/config", {
      method: "PUT",
      body: JSON.stringify({ config: configObj }),
    });
  }

  async adminGetRoles(): Promise<{ data: AdminRole[] }> {
    return this.request("/api/admin/roles");
  }

  async adminCreateRole(data: {
    name: string;
    description?: string;
    permissions?: string[];
  }): Promise<{ success: boolean; message: string; role: AdminRole }> {
    // Convert permissions array to JSON string for API
    const payload = {
      ...data,
      permissions: data.permissions ? JSON.stringify(data.permissions) : undefined,
    };
    return this.request("/api/admin/roles", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async adminUpdateRole(
    id: number,
    data: { name?: string; description?: string; permissions?: string[] }
  ): Promise<{ success: boolean; message: string; role: AdminRole }> {
    // Convert permissions array to JSON string for API
    const payload = {
      ...data,
      permissions: data.permissions ? JSON.stringify(data.permissions) : undefined,
    };
    return this.request(`/api/admin/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async adminDeleteRole(id: number): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/admin/roles/${id}`, {
      method: "DELETE",
    });
  }

  // ==========================================================================
  // Voice Messages
  // ==========================================================================

  async sendVoiceMessage(conversationId: number, audioBlob: Blob): Promise<{ id: number }> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "voice.webm");
    return this.request(`/api/messages/conversations/${conversationId}/voice`, {
      method: "POST",
      body: formData,
      headers: {},
    });
  }

  async getVoiceMessage(messageId: number): Promise<{
    id: number;
    audio_url: string;
    duration_seconds: number;
    transcript?: string;
  }> {
    return this.request(`/api/messages/voice/${messageId}`);
  }

  // ==========================================================================
  // Push Notifications
  // ==========================================================================

  async registerPushSubscription(subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }): Promise<void> {
    return this.request<void>("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
    });
  }

  async unregisterPushSubscription(endpoint: string): Promise<void> {
    return this.request<void>("/api/push/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint }),
    });
  }

  async getPushSettings(): Promise<{
    enabled: boolean;
    categories: {
      messages: boolean;
      exchanges: boolean;
      connections: boolean;
      listings: boolean;
      events: boolean;
    };
  }> {
    return this.request("/api/push/settings");
  }

  async updatePushSettings(data: unknown): Promise<void> {
    return this.request<void>("/api/push/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ==========================================================================
  // Federation
  // ==========================================================================

  async getFederatedInstances(): Promise<{
    id: number;
    name: string;
    domain: string;
    status: string;
    member_count: number;
    connected_at: string;
  }[]> {
    return this.request("/api/federation/instances");
  }

  async getFederatedProfile(instanceId: number, userId: number): Promise<{
    id: number;
    first_name: string;
    last_name: string;
    instance_name: string;
    instance_domain: string;
  }> {
    return this.request(`/api/federation/instances/${instanceId}/users/${userId}`);
  }

  // ==========================================================================
  // Insurance Certificates
  // ==========================================================================

  async getMyCertificates(): Promise<{
    id: number;
    type: string;
    provider: string;
    policy_number: string;
    valid_from: string;
    valid_until: string;
    status: string;
    document_url?: string;
  }[]> {
    return this.request("/api/insurance/certificates");
  }

  async uploadCertificate(data: FormData): Promise<{ id: number }> {
    return this.request("/api/insurance/certificates", {
      method: "POST",
      body: data,
      headers: {},
    });
  }

  async deleteCertificate(id: number): Promise<void> {
    return this.request<void>(`/api/insurance/certificates/${id}`, { method: "DELETE" });
  }


  // ==========================================================================
  // GDPR / Compliance
  // ==========================================================================

  async getMyDataExports(): Promise<{
    id: number;
    status: string;
    requested_at: string;
    completed_at?: string;
    download_url?: string;
  }[]> {
    return this.request("/api/gdpr/exports");
  }

  async requestDataExport(): Promise<{ id: number }> {
    return this.request("/api/gdpr/exports", { method: "POST" });
  }

  async requestAccountDeletion(data: { reason?: string }): Promise<void> {
    return this.request<void>("/api/gdpr/delete-account", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getConsentSettings(): Promise<{
    marketing_emails: boolean;
    analytics: boolean;
    third_party_sharing: boolean;
    updated_at: string;
  }> {
    return this.request("/api/gdpr/consent");
  }

  async updateConsentSettings(data: {
    marketing_emails?: boolean;
    analytics?: boolean;
    third_party_sharing?: boolean;
  }): Promise<void> {
    return this.request<void>("/api/gdpr/consent", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ==========================================================================
  // User Preferences
  // ==========================================================================

  async getUserPreferences(): Promise<{
    email_notifications: boolean;
    push_notifications: boolean;
    theme: string;
    language: string;
    timezone: string;
    visibility: string;
    show_online_status: boolean;
    show_location: boolean;
  }> {
    return this.request("/api/preferences");
  }

  async updateUserPreferences(data: unknown): Promise<void> {
    return this.request<void>("/api/preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ==========================================================================
  // Legal Documents
  // ==========================================================================

  async getLegalDocuments(): Promise<{
    id: number;
    title: string;
    type: string;
    version: string;
    effective_date: string;
    requires_acceptance: boolean;
    accepted: boolean;
  }[]> {
    return this.request("/api/legal/documents");
  }

  async getLegalDocument(id: number): Promise<{
    id: number;
    title: string;
    type: string;
    version: string;
    content: string;
    effective_date: string;
    requires_acceptance: boolean;
    accepted: boolean;
  }> {
    return this.request(`/api/legal/documents/${id}`);
  }

  async acceptLegalDocument(id: number): Promise<void> {
    return this.request<void>(`/api/legal/documents/${id}/accept`, { method: "POST" });
  }

  // ==========================================================================
  // Content Reporting
  // ==========================================================================

  async reportContent(data: {
    content_type: string;
    content_id: number;
    reason: string;
    details?: string;
  }): Promise<{ id: number }> {
    return this.request("/api/reports", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMyReports(): Promise<{
    id: number;
    content_type: string;
    content_id: number;
    reason: string;
    status: string;
    created_at: string;
  }[]> {
    return this.request("/api/reports/my");
  }

  // ==========================================================================
  // Newsletter
  // ==========================================================================

  async getNewsletterSubscription(): Promise<{
    subscribed: boolean;
    email: string;
    preferences: string[];
  }> {
    return this.request("/api/newsletter/subscription");
  }

  async updateNewsletterSubscription(data: {
    subscribed: boolean;
    preferences?: string[];
  }): Promise<void> {
    return this.request<void>("/api/newsletter/subscription", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }


  // ==========================================================================
  // Polls
  // ==========================================================================

  async getPolls(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedResponse<{
    id: number;
    question: string;
    description?: string;
    options: { id: number; text: string; votes: number }[];
    total_votes: number;
    status: string;
    ends_at?: string;
    created_by: { id: number; first_name: string; last_name: string };
    created_at: string;
    user_voted_option_id?: number;
  }>> {
    const query = this.buildQueryString(params || {});
    return this.request(`/api/polls${query}`);
  }

  async getPoll(id: number): Promise<{
    id: number;
    question: string;
    description?: string;
    options: { id: number; text: string; votes: number }[];
    total_votes: number;
    status: string;
    ends_at?: string;
    created_by: { id: number; first_name: string; last_name: string };
    created_at: string;
    user_voted_option_id?: number;
  }> {
    return this.request(`/api/polls/${id}`);
  }

  async votePoll(pollId: number, optionId: number): Promise<void> {
    return this.request<void>(`/api/polls/${pollId}/vote`, {
      method: "POST",
      body: JSON.stringify({ option_id: optionId }),
    });
  }

  // ==========================================================================
  // Goals & Milestones
  // ==========================================================================

  async getGoals(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<{
    id: number;
    title: string;
    description: string;
    target_value: number;
    current_value: number;
    unit: string;
    status: string;
    deadline?: string;
    milestones: { id: number; title: string; completed: boolean }[];
    created_at: string;
  }>> {
    const query = this.buildQueryString(params || {});
    return this.request(`/api/goals${query}`);
  }

  async getGoal(id: number): Promise<{
    id: number;
    title: string;
    description: string;
    target_value: number;
    current_value: number;
    unit: string;
    status: string;
    deadline?: string;
    milestones: { id: number; title: string; completed: boolean; completed_at?: string }[];
    contributors: { id: number; first_name: string; last_name: string; contribution: number }[];
    created_at: string;
  }> {
    return this.request(`/api/goals/${id}`);
  }

  async contributeToGoal(id: number, data: { amount: number }): Promise<void> {
    return this.request<void>(`/api/goals/${id}/contribute`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ==========================================================================
  // Ideas & Challenges
  // ==========================================================================

  async getIdeas(params?: {
    page?: number;
    limit?: number;
    status?: string;
    sort?: string;
  }): Promise<PaginatedResponse<{
    id: number;
    title: string;
    description: string;
    category?: string;
    status: string;
    upvotes: number;
    downvotes: number;
    comment_count: number;
    user_vote?: string;
    submitted_by: { id: number; first_name: string; last_name: string };
    created_at: string;
  }>> {
    const query = this.buildQueryString(params || {});
    return this.request(`/api/ideas${query}`);
  }

  async getIdea(id: number): Promise<{
    id: number;
    title: string;
    description: string;
    category?: string;
    status: string;
    upvotes: number;
    downvotes: number;
    user_vote?: string;
    comments: {
      id: number;
      content: string;
      user: { id: number; first_name: string; last_name: string };
      created_at: string;
    }[];
    submitted_by: { id: number; first_name: string; last_name: string };
    created_at: string;
  }> {
    return this.request(`/api/ideas/${id}`);
  }

  async voteIdea(id: number, vote: "up" | "down"): Promise<void> {
    return this.request<void>(`/api/ideas/${id}/vote`, {
      method: "POST",
      body: JSON.stringify({ vote }),
    });
  }

  async commentOnIdea(id: number, content: string): Promise<void> {
    return this.request<void>(`/api/ideas/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  async submitIdea(data: {
    title: string;
    description: string;
    category?: string;
  }): Promise<{ id: number }> {
    return this.request("/api/ideas", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ==========================================================================
  // Blog & CMS (user-facing)
  // ==========================================================================

  async getBlogPosts(params?: {
    page?: number;
    limit?: number;
    category?: string;
  }): Promise<PaginatedResponse<{
    id: number;
    title: string;
    slug: string;
    excerpt?: string;
    cover_image_url?: string;
    category?: string;
    author: { id: number; first_name: string; last_name: string };
    published_at: string;
  }>> {
    const query = this.buildQueryString(params || {});
    return this.request(`/api/blog${query}`);
  }

  async getBlogPost(slug: string): Promise<{
    id: number;
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    cover_image_url?: string;
    category?: string;
    author: { id: number; first_name: string; last_name: string };
    published_at: string;
  }> {
    return this.request(`/api/blog/${slug}`);
  }

  // ==========================================================================
  // Knowledge Base / FAQ
  // ==========================================================================

  async getKBCategories(): Promise<{
    id: number;
    name: string;
    description?: string;
    article_count: number;
  }[]> {
    return this.request("/api/kb/categories");
  }

  async getKBArticles(params?: {
    category_id?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<{
    id: number;
    title: string;
    excerpt?: string;
    category: string;
    helpful_count: number;
    created_at: string;
  }>> {
    const query = this.buildQueryString(params || {});
    return this.request(`/api/kb/articles${query}`);
  }

  async getKBArticle(id: number): Promise<{
    id: number;
    title: string;
    content: string;
    category: string;
    helpful_count: number;
    related_articles: { id: number; title: string }[];
    created_at: string;
    updated_at: string;
  }> {
    return this.request(`/api/kb/articles/${id}`);
  }

  async markKBArticleHelpful(id: number): Promise<void> {
    return this.request<void>(`/api/kb/articles/${id}/helpful`, { method: "POST" });
  }


  // ==========================================================================
  // Organisations
  // ==========================================================================

  async getOrganisations(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<{
    id: number;
    name: string;
    description: string;
    logo_url?: string;
    website?: string;
    member_count: number;
    created_at: string;
  }>> {
    const query = this.buildQueryString(params || {});
    return this.request(`/api/organisations${query}`);
  }

  async getOrganisation(id: number): Promise<{
    id: number;
    name: string;
    description: string;
    logo_url?: string;
    website?: string;
    email?: string;
    phone?: string;
    address?: string;
    member_count: number;
    members: { id: number; first_name: string; last_name: string; role: string }[];
    created_at: string;
  }> {
    return this.request(`/api/organisations/${id}`);
  }

  async joinOrganisation(id: number): Promise<void> {
    return this.request<void>(`/api/organisations/${id}/join`, { method: "POST" });
  }

  async leaveOrganisation(id: number): Promise<void> {
    return this.request<void>(`/api/organisations/${id}/leave`, { method: "POST" });
  }

  // ==========================================================================
  // Jobs
  // ==========================================================================

  async getJobs(params?: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
  }): Promise<PaginatedResponse<{
    id: number;
    title: string;
    description: string;
    organisation_name?: string;
    type: string;
    location?: string;
    hours_per_week?: number;
    time_credits_per_hour?: number;
    status: string;
    created_at: string;
    posted_by: { id: number; first_name: string; last_name: string };
  }>> {
    const query = this.buildQueryString(params || {});
    return this.request(`/api/jobs${query}`);
  }

  async getJob(id: number): Promise<{
    id: number;
    title: string;
    description: string;
    requirements?: string;
    organisation_name?: string;
    type: string;
    location?: string;
    hours_per_week?: number;
    time_credits_per_hour?: number;
    status: string;
    applications_count: number;
    created_at: string;
    posted_by: { id: number; first_name: string; last_name: string };
  }> {
    return this.request(`/api/jobs/${id}`);
  }

  async applyForJob(id: number, data: { cover_message?: string }): Promise<void> {
    return this.request<void>(`/api/jobs/${id}/apply`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMyJobApplications(): Promise<{
    id: number;
    job_id: number;
    job_title: string;
    status: string;
    applied_at: string;
  }[]> {
    return this.request("/api/jobs/my-applications");
  }

  // ==========================================================================
  // Volunteering
  // ==========================================================================

  async getVolunteeringOpportunities(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<{
    id: number;
    title: string;
    description: string;
    organisation_name?: string;
    location?: string;
    date?: string;
    hours_needed?: number;
    volunteers_needed?: number;
    volunteers_signed_up: number;
    status: string;
    created_at: string;
  }>> {
    const query = this.buildQueryString(params || {});
    return this.request(`/api/volunteering/opportunities${query}`);
  }

  async getVolunteeringOpportunity(id: number): Promise<{
    id: number;
    title: string;
    description: string;
    organisation_name?: string;
    location?: string;
    date?: string;
    hours_needed?: number;
    volunteers_needed?: number;
    volunteers_signed_up: number;
    volunteers: { id: number; first_name: string; last_name: string }[];
    status: string;
    created_at: string;
  }> {
    return this.request(`/api/volunteering/opportunities/${id}`);
  }

  async applyToVolunteer(id: number): Promise<void> {
    return this.request<void>(`/api/volunteering/opportunities/${id}/apply`, {
      method: "POST",
    });
  }

  async logVolunteerHours(data: {
    opportunity_id: number;
    hours: number;
    notes?: string;
  }): Promise<void> {
    return this.request<void>("/api/volunteering/hours", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMyVolunteerHours(): Promise<{
    id: number;
    opportunity_id: number;
    opportunity_title: string;
    hours: number;
    notes?: string;
    logged_at: string;
  }[]> {
    return this.request("/api/volunteering/my-hours");
  }


  // ==========================================================================
  // Skills & Endorsements
  // ==========================================================================

  async getSkillCatalog(): Promise<{ id: number; name: string; category: string }[]> {
    return this.request("/api/skills");
  }

  async getUserSkills(userId: number): Promise<{
    id: number;
    skill_id: number;
    skill_name: string;
    proficiency: string;
    endorsement_count: number;
  }[]> {
    return this.request(`/api/skills/users/${userId}`);
  }

  async addMySkill(data: { skill_id: number; proficiency?: string }): Promise<void> {
    return this.request<void>("/api/skills/my", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async removeMySkill(skillId: number): Promise<void> {
    return this.request<void>(`/api/skills/my/${skillId}`, { method: "DELETE" });
  }

  async endorseSkill(userId: number, skillId: number): Promise<void> {
    return this.request<void>(`/api/skills/users/${userId}/${skillId}/endorse`, {
      method: "POST",
    });
  }

  async removeEndorsement(userId: number, skillId: number): Promise<void> {
    return this.request<void>(`/api/skills/users/${userId}/${skillId}/endorse`, {
      method: "DELETE",
    });
  }

  async getTopEndorsed(): Promise<{
    user_id: number;
    first_name: string;
    last_name: string;
    total_endorsements: number;
  }[]> {
    return this.request("/api/skills/top-endorsed");
  }

  async getSkillSuggestions(): Promise<{ id: number; name: string; category: string }[]> {
    return this.request("/api/skills/suggestions");
  }

  // ==========================================================================
  // Smart Matching
  // ==========================================================================

  async getMatches(): Promise<{
    id: number;
    matched_user_id: number;
    score: number;
    factors: Record<string, number>;
    matched_user: { id: number; first_name: string; last_name: string };
    status: string;
    created_at: string;
  }[]> {
    return this.request("/api/matching");
  }

  async computeMatches(): Promise<{ success: boolean; matches_found: number }> {
    return this.request("/api/matching/compute", { method: "POST" });
  }

  async getMatchDetail(id: number): Promise<{
    id: number;
    matched_user_id: number;
    score: number;
    factors: Record<string, number>;
    matched_user: { id: number; first_name: string; last_name: string };
  }> {
    return this.request(`/api/matching/${id}`);
  }

  async respondToMatch(id: number, response: string): Promise<void> {
    return this.request<void>(`/api/matching/${id}/respond`, {
      method: "PUT",
      body: JSON.stringify({ response }),
    });
  }

  async getMatchPreferences(): Promise<Record<string, unknown>> {
    return this.request("/api/matching/preferences");
  }

  async updateMatchPreferences(prefs: unknown): Promise<void> {
    return this.request<void>("/api/matching/preferences", {
      method: "PUT",
      body: JSON.stringify(prefs),
    });
  }

  // ==========================================================================
  // Member Availability
  // ==========================================================================

  async getMyAvailability(): Promise<{
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }[]> {
    return this.request("/api/availability");
  }

  async addAvailabilitySlot(data: {
    day_of_week: number;
    start_time: string;
    end_time: string;
  }): Promise<void> {
    return this.request<void>("/api/availability", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async bulkSetAvailability(slots: {
    day_of_week: number;
    start_time: string;
    end_time: string;
  }[]): Promise<void> {
    return this.request<void>("/api/availability/bulk", {
      method: "PUT",
      body: JSON.stringify({ slots }),
    });
  }

  async getMyExceptions(): Promise<{
    id: number;
    date: string;
    is_available: boolean;
    note?: string;
  }[]> {
    return this.request("/api/availability/exceptions");
  }

  async addException(data: {
    date: string;
    is_available: boolean;
    note?: string;
  }): Promise<void> {
    return this.request<void>("/api/availability/exceptions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ==========================================================================
  // NexusScore
  // ==========================================================================

  async getMyNexusScore(): Promise<{
    userId: number;
    score: number;
    tier: string;
    exchange_score: number;
    review_score: number;
    engagement_score: number;
    reliability_score: number;
    tenure_score: number;
    last_calculated_at: string;
  }> {
    return this.request("/api/nexus-score/me");
  }

  async getNexusScore(userId: number): Promise<{
    userId: number;
    score: number;
    tier: string;
    exchange_score: number;
    review_score: number;
    engagement_score: number;
    reliability_score: number;
    tenure_score: number;
  }> {
    return this.request(`/api/nexus-score/${userId}`);
  }

  async recalculateNexusScore(): Promise<void> {
    return this.request<void>("/api/nexus-score/recalculate", { method: "POST" });
  }

  async getNexusScoreLeaderboard(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<{
    userId: number;
    score: number;
    tier: string;
    user: { id: number; first_name: string; last_name: string };
  }>> {
    const query = this.buildQueryString(params || {});
    return this.request(`/api/nexus-score/leaderboard${query}`);
  }

  async getNexusScoreHistory(): Promise<{
    score: number;
    calculated_at: string;
  }[]> {
    return this.request("/api/nexus-score/history");
  }

  // ==========================================================================
  // Location/Geo
  // ==========================================================================

  async updateMyLocation(data: { latitude: number; longitude: number }): Promise<void> {
    return this.request<void>("/api/location/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getMyLocation(): Promise<{
    latitude: number;
    longitude: number;
    updated_at: string;
  }> {
    return this.request("/api/location/me");
  }

  async getNearbyUsers(params?: { radius?: number; limit?: number }): Promise<{
    id: number;
    first_name: string;
    last_name: string;
    distance_km: number;
  }[]> {
    const query = this.buildQueryString(params || {});
    return this.request(`/api/location/nearby/users${query}`);
  }

  async getNearbyListings(params?: { radius?: number; limit?: number }): Promise<{
    id: number;
    title: string;
    type: string;
    distance_km: number;
  }[]> {
    const query = this.buildQueryString(params || {});
    return this.request(`/api/location/nearby/listings${query}`);
  }


  // ==========================================================================
  // Two-Factor Authentication
  // ==========================================================================

  async get2FAStatus(): Promise<{
    enabled: boolean;
    has_backup_codes: boolean;
  }> {
    return this.request("/api/auth/2fa/status");
  }

  async setup2FA(): Promise<{
    secret: string;
    qr_code_url: string;
    manual_entry_key: string;
  }> {
    return this.request("/api/auth/2fa/setup", { method: "POST" });
  }

  async verify2FASetup(code: string): Promise<{
    success: boolean;
    backup_codes?: string[];
  }> {
    return this.request("/api/auth/2fa/verify-setup", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  async verify2FA(code: string): Promise<{ success: boolean }> {
    return this.request("/api/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  async disable2FA(code: string): Promise<{ success: boolean }> {
    return this.request("/api/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  // ==========================================================================
  // Passkeys (WebAuthn)
  // ==========================================================================

  async getPasskeys(): Promise<{
    id: number;
    name: string;
    created_at: string;
    last_used_at?: string;
  }[]> {
    return this.request("/api/passkeys");
  }

  async deletePasskey(id: number): Promise<void> {
    return this.request<void>("/api/passkeys/" + id, { method: "DELETE" });
  }

  async renamePasskey(id: number, name: string): Promise<void> {
    return this.request<void>("/api/passkeys/" + id, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  }

  // ==========================================================================
  // Sessions
  // ==========================================================================

  async getSessions(): Promise<{
    data: {
      id: number;
      ip_address: string;
      user_agent: string;
      device_info: string;
      is_current: boolean;
      created_at: string;
      last_activity_at: string;
      expires_at: string;
    }[];
    total: number;
  }> {
    return this.request("/api/sessions");
  }

  async terminateSession(id: number): Promise<void> {
    return this.request<void>("/api/sessions/" + id, { method: "DELETE" });
  }

  async terminateAllOtherSessions(): Promise<void> {
    return this.request<void>("/api/sessions", { method: "DELETE" });
  }


  // ==========================================================================
  // Onboarding
  // ==========================================================================

  async getOnboardingSteps(): Promise<{
    data: { id: number; key: string; title: string; description: string; sort_order: number; xp_reward: number }[];
  }> {
    return this.request("/api/onboarding/steps");
  }

  async getOnboardingProgress(): Promise<{
    data: {
      completed_steps: { step_id: number; key: string; completed_at: string }[];
      total_steps: number;
      completed_count: number;
      completion_percentage: number;
    };
  }> {
    return this.request("/api/onboarding/progress");
  }

  async completeOnboardingStep(stepKey: string): Promise<{ success: boolean }> {
    return this.request("/api/onboarding/complete", {
      method: "POST",
      body: JSON.stringify({ step_key: stepKey }),
    });
  }


  // ==========================================================================
  // Exchanges
  // ==========================================================================

  async getExchanges(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Exchange>> {
    const query = this.buildQueryString(params || {});
    const raw = await this.request<any>(`/api/exchanges${query}`);
    return normalizePaginated(raw, normalizeExchange);
  }

  async getExchange(id: number): Promise<Exchange> {
    const raw = await this.request<any>(`/api/exchanges/${id}`);
    return normalizeExchange(raw);
  }

  async createExchange(data: {
    listing_id: number;
    hours: number;
    description?: string;
  }): Promise<Exchange> {
    const raw = await this.request<any>("/api/exchanges", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return normalizeExchange(raw);
  }

  async acceptExchange(id: number): Promise<Exchange> {
    const raw = await this.request<any>(`/api/exchanges/${id}/accept`, { method: "PUT" });
    return normalizeExchange(raw);
  }

  async declineExchange(id: number): Promise<Exchange> {
    const raw = await this.request<any>(`/api/exchanges/${id}/decline`, { method: "PUT" });
    return normalizeExchange(raw);
  }

  async startExchange(id: number): Promise<Exchange> {
    const raw = await this.request<any>(`/api/exchanges/${id}/start`, { method: "PUT" });
    return normalizeExchange(raw);
  }

  async completeExchange(id: number): Promise<Exchange> {
    const raw = await this.request<any>(`/api/exchanges/${id}/complete`, { method: "PUT" });
    return normalizeExchange(raw);
  }

  async cancelExchange(id: number): Promise<Exchange> {
    const raw = await this.request<any>(`/api/exchanges/${id}/cancel`, { method: "PUT" });
    return normalizeExchange(raw);
  }

  async disputeExchange(id: number): Promise<Exchange> {
    const raw = await this.request<any>(`/api/exchanges/${id}/dispute`, { method: "PUT" });
    return normalizeExchange(raw);
  }

  async rateExchange(
    id: number,
    data: { rating: number; comment?: string }
  ): Promise<ExchangeRating> {
    const raw = await this.request<any>(`/api/exchanges/${id}/rate`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return normalizeExchangeRating(raw);
  }

  async getExchangesByListing(listingId: number): Promise<Exchange[]> {
    const raw = await this.request<any[]>(`/api/exchanges/by-listing/${listingId}`);
    return (raw ?? []).map(normalizeExchange);
  }


  // ==========================================================================
  // Gamification V2 (Challenges, Streaks, Seasons, Daily Rewards)
  // ==========================================================================

  async getChallenges(): Promise<any[]> {
    return this.request<any[]>("/api/gamification/challenges");
  }

  async joinChallenge(challengeId: number): Promise<void> {
    return this.request<void>(`/api/gamification/challenges/${challengeId}/join`, { method: "POST" });
  }

  async getChallengeProgress(challengeId: number): Promise<any> {
    return this.request<any>(`/api/gamification/challenges/${challengeId}/progress`);
  }

  async getStreak(): Promise<any> {
    return this.request<any>("/api/gamification/streak");
  }

  async claimDailyReward(): Promise<any> {
    return this.request<any>("/api/gamification/daily-reward", { method: "POST" });
  }

  async getSeasons(): Promise<any[]> {
    return this.request<any[]>("/api/gamification/seasons");
  }

  async getCurrentSeason(): Promise<any> {
    return this.request<any>("/api/gamification/seasons/current");
  }

  async getSeasonLeaderboard(seasonId: number): Promise<any[]> {
    return this.request<any[]>(`/api/gamification/seasons/${seasonId}/leaderboard`);
  }

  async getAchievements(): Promise<any[]> {
    return this.request<any[]>("/api/gamification/achievements");
  }

  async getGamificationStats(): Promise<any> {
    return this.request<any>("/api/gamification/stats");
  }


  // ==========================================================================
  // Listing Extended Features (favorites, tags, analytics, featured, renew)
  // ==========================================================================

  async toggleListingFavorite(listingId: number): Promise<void> {
    return this.request<void>(`/api/listings/${listingId}/favorite`, { method: "POST" });
  }

  async getFavoriteListings(): Promise<any[]> {
    return this.request<any[]>("/api/listings/favorites");
  }

  async getListingTags(): Promise<string[]> {
    return this.request<string[]>("/api/listings/tags");
  }

  async getListingAnalytics(listingId: number): Promise<any> {
    return this.request<any>(`/api/listings/${listingId}/analytics`);
  }

  async getFeaturedListings(): Promise<any[]> {
    return this.request<any[]>("/api/listings/featured");
  }

  async renewListing(listingId: number): Promise<void> {
    return this.request<void>(`/api/listings/${listingId}/renew`, { method: "POST" });
  }


  // ==========================================================================
  // Wallet Extended Features (categories, limits, donations, alerts, export)
  // ==========================================================================

  async getWalletCategories(): Promise<any[]> {
    return this.request<any[]>("/api/wallet/categories");
  }

  async getWalletLimits(): Promise<any> {
    return this.request<any>("/api/wallet/limits");
  }

  async makeDonation(data: { recipient_id: number; amount: number; message?: string }): Promise<any> {
    return this.request<any>("/api/wallet/donate", { method: "POST", body: JSON.stringify(data) });
  }

  async getWalletAlerts(): Promise<any[]> {
    return this.request<any[]>("/api/wallet/features/alerts");
  }

  async updateWalletAlert(alertId: number, data: any): Promise<void> {
    return this.request<void>(`/api/wallet/alerts/${alertId}`, { method: "PUT", body: JSON.stringify(data) });
  }

  async exportWalletHistory(format: string): Promise<Blob> {
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (TENANT_ID) headers["X-Tenant-ID"] = TENANT_ID;
    const response = await fetch(`${this.baseUrl}/api/wallet/features/export?format=${format}`, { headers });
    if (!response.ok) throw new Error(`Export failed with status ${response.status}`);
    return response.blob();
  }


  // ==========================================================================
  // Group Extended Features (announcements, discussions, files)
  // ==========================================================================

  async getGroupAnnouncements(groupId: number): Promise<any[]> {
    return this.request<any[]>(`/api/groups/${groupId}/announcements`);
  }

  async createGroupAnnouncement(groupId: number, data: { title: string; content: string }): Promise<any> {
    return this.request<any>(`/api/groups/${groupId}/announcements`, { method: "POST", body: JSON.stringify(data) });
  }

  async getGroupDiscussions(groupId: number): Promise<any[]> {
    return this.request<any[]>(`/api/groups/${groupId}/discussions`);
  }

  async createGroupDiscussion(groupId: number, data: { title: string; content: string }): Promise<any> {
    return this.request<any>(`/api/groups/${groupId}/discussions`, { method: "POST", body: JSON.stringify(data) });
  }

  async replyToDiscussion(groupId: number, discussionId: number, data: { content: string }): Promise<any> {
    return this.request<any>(`/api/groups/${groupId}/discussions/${discussionId}/replies`, { method: "POST", body: JSON.stringify(data) });
  }

  async getGroupFiles(groupId: number): Promise<any[]> {
    return this.request<any[]>(`/api/groups/${groupId}/files`);
  }

  async uploadGroupFile(groupId: number, formData: FormData): Promise<any> {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (TENANT_ID) headers["X-Tenant-ID"] = TENANT_ID;
    const response = await fetch(`${this.baseUrl}/api/groups/${groupId}/files`, { method: "POST", headers, body: formData });
    if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);
    return response.json();
  }


  // ==========================================================================
  // Feed Extended Features (ranked, trending, bookmarks, shares)
  // ==========================================================================

  async getRankedFeed(page: number = 1): Promise<any> {
    return this.request<any>(`/api/feed/ranked?page=${page}`);
  }

  async getTrendingPosts(hours: number = 24, limit: number = 20): Promise<Post[]> {
    const raw = await this.request<any>(`/api/feed/trending?hours=${hours}&limit=${limit}`);
    return (raw?.data ?? []).map(normalizePost);
  }

  async bookmarkPost(postId: number): Promise<void> {
    return this.request<void>(`/api/feed/${postId}/bookmark`, { method: "POST" });
  }

  async unbookmarkPost(postId: number): Promise<void> {
    return this.request<void>(`/api/feed/${postId}/bookmark`, { method: "DELETE" });
  }

  async getBookmarkedPosts(page: number = 1, limit: number = 20): Promise<Post[]> {
    const raw = await this.request<any>(`/api/feed/bookmarks?page=${page}&limit=${limit}`);
    return (raw?.data ?? [])
      .filter((b: any) => b?.post)
      .map((b: any) => normalizePost(b.post));
  }

  async sharePost(postId: number, data?: { message?: string }): Promise<void> {
    return this.request<void>(`/api/feed/posts/${postId}/share`, { method: "POST", body: JSON.stringify(data || {}) });
  }


  // ==========================================================================
  // CMS Pages
  // ==========================================================================

  async getCmsPages(): Promise<any[]> {
    return this.request<any[]>("/api/cms/pages");
  }

  async getCmsPage(slug: string): Promise<any> {
    return this.request<any>(`/api/cms/pages/${slug}`);
  }


  // ==========================================================================
  // Member Activity
  // ==========================================================================

  async getMemberActivity(memberId: number): Promise<any[]> {
    return this.request<any[]>(`/api/members/${memberId}/activity`);
  }

  async getMyActivity(): Promise<any[]> {
    return this.request<any[]>("/api/members/me/activity");
  }

  async getActivityFeed(page: number = 1): Promise<any> {
    return this.request<any>(`/api/activity/feed?page=${page}`);
  }


  // ==========================================================================
  // Verification Badges
  // ==========================================================================

  async getVerificationStatus(): Promise<any> {
    return this.request<any>("/api/verification/status");
  }

  async requestVerification(type: string, data: FormData): Promise<any> {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (TENANT_ID) headers["X-Tenant-ID"] = TENANT_ID;
    const response = await fetch(`${this.baseUrl}/api/verification/request?type=${type}`, { method: "POST", headers, body: data });
    if (!response.ok) throw new Error("Verification request failed");
    return response.json();
  }

  async getVerificationBadges(memberId: number): Promise<any[]> {
    return this.request<any[]>(`/api/members/${memberId}/badges`);
  }


  // ==========================================================================
  // System Announcements
  // ==========================================================================

  async getSystemAnnouncements(): Promise<any[]> {
    return this.request<any[]>("/api/announcements");
  }

  async dismissAnnouncement(id: number): Promise<void> {
    return this.request<void>(`/api/announcements/${id}/dismiss`, { method: "POST" });
  }


  // ==========================================================================
  // Translation / i18n
  // ==========================================================================

  async getTranslations(locale: string): Promise<Record<string, string>> {
    return this.request<Record<string, string>>(`/api/i18n/translations/${locale}`);
  }

  async getSupportedLanguages(): Promise<any[]> {
    return this.request<any[]>("/api/i18n/languages");
  }

  async setLanguagePreference(locale: string): Promise<void> {
    return this.request<void>("/api/i18n/preference", { method: "PUT", body: JSON.stringify({ locale }) });
  }


  // ==========================================================================
  // File Uploads
  // ==========================================================================

  async uploadFile(formData: FormData, category?: string): Promise<any> {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (TENANT_ID) headers["X-Tenant-ID"] = TENANT_ID;
    const url = category ? `${this.baseUrl}/api/files/upload?category=${category}` : `${this.baseUrl}/api/files/upload`;
    const response = await fetch(url, { method: "POST", headers, body: formData });
    if (!response.ok) throw new Error("Upload failed");
    return response.json();
  }

  async getMyFiles(): Promise<any[]> {
    return this.request<any[]>("/api/files/my");
  }

  async deleteFile(fileId: number): Promise<void> {
    return this.request<void>(`/api/files/${fileId}`, { method: "DELETE" });
  }


  // ==========================================================================
  // Event Reminders
  // ==========================================================================

  async getEventReminders(eventId: number): Promise<any[]> {
    const raw = await this.request<any>(`/api/events/${eventId}/reminders`);
    return raw?.data ?? [];
  }

  async setEventReminder(eventId: number, data: { minutes_before: number; reminder_type?: string }): Promise<any> {
    const raw = await this.request<any>(`/api/events/${eventId}/reminders`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return raw?.reminder ?? raw;
  }

  async removeEventReminder(eventId: number, reminderId: number): Promise<void> {
    return this.request<void>(`/api/events/${eventId}/reminders/${reminderId}`, {
      method: "DELETE",
    });
  }

  async getMyEventReminders(): Promise<any[]> {
    const raw = await this.request<any>("/api/users/me/reminders");
    return raw?.data ?? [];
  }


  // ==========================================================================
  // Organisation Wallets
  // ==========================================================================

  async getOrgWallet(orgId: number): Promise<any> {
    return this.request<any>(`/api/organisations/${orgId}/wallet`);
  }

  async getOrgTransactions(orgId: number): Promise<any[]> {
    return this.request<any[]>(`/api/organisations/${orgId}/wallet/transactions`);
  }

  async orgTransfer(orgId: number, data: { recipient_id: number; amount: number; description?: string }): Promise<any> {
    return this.request<any>(`/api/organisations/${orgId}/wallet/transfer`, { method: "POST", body: JSON.stringify(data) });
  }



  // ==========================================================================
  // Volunteer Availability
  // ==========================================================================

  async getVolunteerAvailability(opportunityId: number): Promise<any[]> {
    return this.request<any[]>(`/api/volunteering/${opportunityId}/availability`);
  }

  async setVolunteerAvailability(opportunityId: number, data: { slots: any[] }): Promise<void> {
    return this.request<void>(`/api/volunteering/${opportunityId}/availability`, { method: "PUT", body: JSON.stringify(data) });
  }



  // ==========================================================================
  // Semantic Search
  // ==========================================================================

  async semanticSearch(query: string, filters?: any): Promise<any> {
    return this.request<any>("/api/search/semantic", { method: "POST", body: JSON.stringify({ query, ...filters }) });
  }


  // ==========================================================================
  // FAQ (Knowledge Base Extended)
  // ==========================================================================

  async getFaqCategories(): Promise<any[]> {
    return this.request<any[]>("/api/kb/faq/categories");
  }

  async getFaqByCategory(categoryId: number): Promise<any[]> {
    return this.request<any[]>(`/api/kb/faq/categories/${categoryId}`);
  }

  async voteFaqHelpful(faqId: number, helpful: boolean): Promise<void> {
    return this.request<void>(`/api/kb/faq/${faqId}/vote`, { method: "POST", body: JSON.stringify({ helpful }) });
  }



  // ==========================================================================
  // Blog Extended (categories, featured)
  // ==========================================================================

  async getBlogCategories(): Promise<any[]> {
    return this.request<any[]>("/api/blog/categories");
  }

  async getBlogByCategory(categorySlug: string): Promise<any[]> {
    return this.request<any[]>(`/api/blog/categories/${categorySlug}/posts`);
  }

  async getFeaturedBlogPosts(): Promise<any[]> {
    return this.request<any[]>("/api/blog/featured");
  }


  // ==========================================================================
  // Polls Extended
  // ==========================================================================

  async getPollResults(pollId: number): Promise<any> {
    return this.request<any>(`/api/polls/${pollId}/results`);
  }

  async closePoll(pollId: number): Promise<void> {
    return this.request<void>(`/api/polls/${pollId}/close`, { method: "POST" });
  }


  // ==========================================================================
  // Goals Extended
  // ==========================================================================

  async getGoalMilestones(goalId: number): Promise<any[]> {
    return this.request<any[]>(`/api/goals/${goalId}/milestones`);
  }

  async updateMilestone(goalId: number, milestoneId: number, data: any): Promise<any> {
    return this.request<any>(`/api/goals/${goalId}/milestones/${milestoneId}`, { method: "PUT", body: JSON.stringify(data) });
  }


  // ==========================================================================
  // Jobs Extended
  // ==========================================================================

  async getJobApplications(jobId: number): Promise<any[]> {
    return this.request<any[]>(`/api/jobs/${jobId}/applications`);
  }

  async withdrawJobApplication(jobId: number): Promise<void> {
    return this.request<void>(`/api/jobs/${jobId}/withdraw`, { method: "POST" });
  }


  // ==========================================================================
  // Volunteering Extended
  // ==========================================================================

  async getVolunteerHours(): Promise<any> {
    return this.request<any>("/api/volunteering/hours");
  }

  async getVolunteerCertificate(opportunityId: number): Promise<Blob> {
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (TENANT_ID) headers["X-Tenant-ID"] = TENANT_ID;
    const response = await fetch(`${this.baseUrl}/api/volunteering/${opportunityId}/certificate`, { headers });
    return response.blob();
  }

}

// ============================================================================
// Admin Types
// ============================================================================

export interface AdminDashboard {
  users: {
    total: number;
    active: number;
    suspended: number;
    new_last_30_days: number;
  };
  listings: {
    total: number;
    active: number;
    pending_review: number;
  };
  transactions: {
    total: number;
    last_30_days: number;
    total_credits_transferred: number;
  };
  community: {
    categories: number;
    groups: number;
    upcoming_events: number;
  };
}

export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
}

export interface AdminUserDetails {
  user: AdminUser & {
    suspended_by_user_id: number | null;
    total_xp: number;
    level: number;
  };
  stats: {
    listings: number;
    transactions: number;
    connections: number;
  };
}

export interface AdminPendingListing {
  id: number;
  title: string;
  description: string;
  type: string;
  status: string;
  location: string | null;
  estimated_hours: number | null;
  credits_per_hour: number;
  category: string | null;
  created_at: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface TenantConfig {
  id: number;
  key: string;
  value: string;
  updated_at: string | null;
}

export interface AdminCategory {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  parent_category_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  listing_count?: number;
}

export interface AdminConfigItem {
  id: number;
  key: string;
  value: string;
  updated_at: string | null;
}

export interface AdminRole {
  id: number;
  name: string;
  description: string | null;
  permissions: string[] | null;
  is_system: boolean;
  created_at: string;
  updated_at: string | null;
}

// Export singleton instance
export const api = new ApiClient(API_BASE);
