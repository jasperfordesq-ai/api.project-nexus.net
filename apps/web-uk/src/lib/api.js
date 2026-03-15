// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5080';
const TENANT_ID = process.env.TENANT_ID || '';
const { cache } = require('./cache');

// Cache TTL for different types of data (in milliseconds)
const CACHE_TTL = {
  COUNTS: 15000,    // 15 seconds for notification/message counts
  PROFILE: 60000    // 1 minute for user profile data
};

// Helper to create a cache key from token
function cacheKey(token, suffix) {
  // Use first 40 chars of token as user identifier to avoid collisions
  return `${token.substring(0, 40)}:${suffix}`;
}

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiOfflineError extends Error {
  constructor(message = 'Unable to connect to the service') {
    super(message);
    this.name = 'ApiOfflineError';
    this.status = 503;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Include X-Tenant-ID header for tenant resolution (required for unauthenticated requests)
  if (TENANT_ID) {
    headers['X-Tenant-ID'] = TENANT_ID;
  }

  const config = {
    ...options,
    headers
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    // Network error - API is offline or unreachable
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message.includes('fetch failed')) {
      throw new ApiOfflineError();
    }
    throw error;
  }

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw new ApiError(
      data.error || data.message || data.title || 'API request failed',
      response.status,
      data
    );
  }

  return data;
}

// Auth
async function login(email, password, tenantSlug) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      tenant_slug: tenantSlug
    })
  });
}

async function validateToken(token) {
  return request('/api/auth/validate', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function register(data) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function refreshToken(refreshToken) {
  return request('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken })
  });
}

async function logout(token) {
  return request('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function verify2fa(token, code) {
  return request('/api/auth/2fa/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code })
  });
}

async function forgotPassword(email, tenantSlug) {
  return request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      email,
      tenant_slug: tenantSlug
    })
  });
}

async function resetPassword(token, newPassword) {
  return request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token,
      new_password: newPassword
    })
  });
}

// Users / Profile
async function getProfile(token) {
  return request('/api/users/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function updateProfile(token, data) {
  return request('/api/users/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getUsers(token) {
  return request('/api/users', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getUser(token, id) {
  return request(`/api/users/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Listings
async function getListings(token, params = {}) {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  if (params.user_id) query.set('user_id', params.user_id);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const queryString = query.toString();
  const endpoint = `/api/listings${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getListing(token, id) {
  return request(`/api/listings/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createListing(token, data) {
  return request('/api/listings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function updateListing(token, id, data) {
  return request(`/api/listings/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function deleteListing(token, id) {
  return request(`/api/listings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Wallet
async function getBalance(token) {
  return request('/api/wallet/balance', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getTransactions(token, params = {}) {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const queryString = query.toString();
  const endpoint = `/api/wallet/transactions${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getTransaction(token, id) {
  return request(`/api/wallet/transactions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function transferCredits(token, receiverId, amount, description) {
  return request('/api/wallet/transfer', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      receiver_id: receiverId,
      amount,
      description
    })
  });
}

// Messages
async function getConversations(token) {
  return request('/api/messages', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getConversation(token, id) {
  return request(`/api/messages/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getUnreadCount(token) {
  // Check cache first
  const key = cacheKey(token, 'msg-unread');
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const result = await request('/api/messages/unread-count', {
    headers: { Authorization: `Bearer ${token}` }
  });

  cache.set(key, result, CACHE_TTL.COUNTS);
  return result;
}

async function sendMessage(token, recipientId, content) {
  return request('/api/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ recipient_id: recipientId, content })
  });
}

async function startConversation(token, recipientId, content) {
  return request('/api/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      recipient_id: recipientId,
      content
    })
  });
}

async function markConversationRead(token, conversationId) {
  const result = await request(`/api/messages/${encodeURIComponent(conversationId)}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Invalidate message unread count cache
  cache.delete(cacheKey(token, 'msg-unread'));

  return result;
}

// Connections
async function getConnections(token, status = null) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/api/connections${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getPendingConnections(token) {
  return request('/api/connections/pending', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function sendConnectionRequest(token, userId) {
  return request('/api/connections', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user_id: userId })
  });
}

async function acceptConnection(token, connectionId) {
  return request(`/api/connections/${encodeURIComponent(connectionId)}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function declineConnection(token, connectionId) {
  return request(`/api/connections/${encodeURIComponent(connectionId)}/decline`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function removeConnection(token, connectionId) {
  return request(`/api/connections/${encodeURIComponent(connectionId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Notifications
async function getNotifications(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.unread_only) query.set('unread_only', 'true');

  const queryString = query.toString();
  const endpoint = `/api/notifications${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getNotification(token, id) {
  return request(`/api/notifications/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getNotificationUnreadCount(token) {
  // Check cache first
  const key = cacheKey(token, 'notif-unread');
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const result = await request('/api/notifications/unread-count', {
    headers: { Authorization: `Bearer ${token}` }
  });

  cache.set(key, result, CACHE_TTL.COUNTS);
  return result;
}

async function markNotificationRead(token, id) {
  const result = await request(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Invalidate notification unread count cache
  cache.delete(cacheKey(token, 'notif-unread'));

  return result;
}

async function markAllNotificationsRead(token) {
  const result = await request('/api/notifications/read-all', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Invalidate notification unread count cache
  cache.delete(cacheKey(token, 'notif-unread'));

  return result;
}

async function deleteNotification(token, id) {
  const result = await request(`/api/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Invalidate notification unread count cache (deleting unread notification changes count)
  cache.delete(cacheKey(token, 'notif-unread'));

  return result;
}

// Groups
async function getGroups(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.search) query.set('search', params.search);

  const queryString = query.toString();
  const endpoint = `/api/groups${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getMyGroups(token) {
  return request('/api/groups/my', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getGroup(token, id) {
  return request(`/api/groups/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createGroup(token, data) {
  return request('/api/groups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function updateGroup(token, id, data) {
  return request(`/api/groups/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function deleteGroup(token, id) {
  return request(`/api/groups/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getGroupMembers(token, groupId) {
  return request(`/api/groups/${encodeURIComponent(groupId)}/members`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function joinGroup(token, groupId) {
  return request(`/api/groups/${encodeURIComponent(groupId)}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function leaveGroup(token, groupId) {
  return request(`/api/groups/${encodeURIComponent(groupId)}/leave`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function addGroupMember(token, groupId, userId) {
  return request(`/api/groups/${encodeURIComponent(groupId)}/members`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user_id: userId })
  });
}

async function removeGroupMember(token, groupId, memberId) {
  return request(`/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function updateGroupMemberRole(token, groupId, memberId, role) {
  return request(`/api/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}/role`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role })
  });
}

async function transferGroupOwnership(token, groupId, newOwnerId) {
  return request(`/api/groups/${encodeURIComponent(groupId)}/transfer-ownership`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ new_owner_id: newOwnerId })
  });
}

// Events
async function getEvents(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.group_id) query.set('group_id', params.group_id);
  if (params.upcoming_only) query.set('upcoming_only', 'true');
  if (params.search) query.set('search', params.search);

  const queryString = query.toString();
  const endpoint = `/api/events${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getMyEvents(token) {
  return request('/api/events/my', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getEvent(token, id) {
  return request(`/api/events/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createEvent(token, data) {
  return request('/api/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function updateEvent(token, id, data) {
  return request(`/api/events/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function cancelEvent(token, id) {
  return request(`/api/events/${encodeURIComponent(id)}/cancel`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function deleteEvent(token, id) {
  return request(`/api/events/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getEventRsvps(token, eventId, status = null) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/api/events/${encodeURIComponent(eventId)}/rsvps${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function rsvpToEvent(token, eventId, status) {
  return request(`/api/events/${encodeURIComponent(eventId)}/rsvp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status })
  });
}

async function removeEventRsvp(token, eventId) {
  return request(`/api/events/${encodeURIComponent(eventId)}/rsvp`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Feed
async function getFeedPosts(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.group_id) query.set('group_id', params.group_id);

  const queryString = query.toString();
  const endpoint = `/api/feed${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getFeedPost(token, id) {
  return request(`/api/feed/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createFeedPost(token, data) {
  return request('/api/feed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function updateFeedPost(token, id, data) {
  return request(`/api/feed/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function deleteFeedPost(token, id) {
  return request(`/api/feed/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function likeFeedPost(token, postId) {
  return request(`/api/feed/${encodeURIComponent(postId)}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function unlikeFeedPost(token, postId) {
  return request(`/api/feed/${encodeURIComponent(postId)}/like`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getFeedComments(token, postId, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const queryString = query.toString();
  const endpoint = `/api/feed/${encodeURIComponent(postId)}/comments${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function addFeedComment(token, postId, content) {
  return request(`/api/feed/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content })
  });
}

async function deleteFeedComment(token, postId, commentId) {
  return request(`/api/feed/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Reports
async function submitReport(token, data) {
  return request('/api/reports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getMyReports(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status) query.set('status', params.status);

  const queryString = query.toString();
  const endpoint = `/api/reports/my${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Gamification
async function getGamificationProfile(token) {
  return request('/api/gamification/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getGamificationProfileByUserId(token, userId) {
  return request(`/api/gamification/profile/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getAllBadges(token) {
  return request('/api/gamification/badges', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getMyBadges(token) {
  return request('/api/gamification/badges/my', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getLeaderboard(token, params = {}) {
  const query = new URLSearchParams();
  if (params.period) query.set('period', params.period);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const queryString = query.toString();
  const endpoint = `/api/gamification/leaderboard${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getXpHistory(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const queryString = query.toString();
  const endpoint = `/api/gamification/xp-history${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Search
async function search(token, query, type = 'all', page = 1, limit = 20) {
  const params = new URLSearchParams();
  params.set('q', query);
  if (type && type !== 'all') params.set('type', type);
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);

  return request(`/api/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function searchSuggestions(token, query, limit = 5) {
  const params = new URLSearchParams();
  params.set('q', query);
  if (limit) params.set('limit', limit);

  return request(`/api/search/suggestions?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function getMembers(token, query = '', page = 1, limit = 20) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);

  const queryString = params.toString();
  return request(`/api/users${queryString ? `?${queryString}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Reviews
async function getUserReviews(token, userId, page = 1, limit = 20) {
  const params = new URLSearchParams();
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);

  const queryString = params.toString();
  return request(`/api/users/${encodeURIComponent(userId)}/reviews${queryString ? `?${queryString}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createUserReview(token, userId, data) {
  return request(`/api/users/${encodeURIComponent(userId)}/reviews`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getListingReviews(token, listingId, page = 1, limit = 20) {
  const params = new URLSearchParams();
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);

  const queryString = params.toString();
  return request(`/api/listings/${encodeURIComponent(listingId)}/reviews${queryString ? `?${queryString}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function createListingReview(token, listingId, data) {
  return request(`/api/listings/${encodeURIComponent(listingId)}/reviews`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getReview(token, reviewId) {
  return request(`/api/reviews/${encodeURIComponent(reviewId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function updateReview(token, reviewId, data) {
  return request(`/api/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function deleteReview(token, reviewId) {
  return request(`/api/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Helper to invalidate all cached data for a user (e.g., on logout)
function invalidateUserCache(token) {
  const prefix = token.substring(0, 40);
  for (const key of cache.cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

// ============================================================================
// Admin API - Requires admin role
// ============================================================================

async function adminGetDashboard(token) {
  return request('/api/admin/dashboard', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminGetUsers(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.role) query.set('role', params.role);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);

  const queryString = query.toString();
  const endpoint = `/api/admin/users${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminGetUser(token, id) {
  return request(`/api/admin/users/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminUpdateUser(token, id, data) {
  return request(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function adminSuspendUser(token, id, reason = null) {
  return request(`/api/admin/users/${encodeURIComponent(id)}/suspend`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason })
  });
}

async function adminActivateUser(token, id) {
  return request(`/api/admin/users/${encodeURIComponent(id)}/activate`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminGetPendingListings(token, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const queryString = query.toString();
  const endpoint = `/api/admin/listings/pending${queryString ? `?${queryString}` : ''}`;

  return request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminApproveListing(token, id) {
  return request(`/api/admin/listings/${encodeURIComponent(id)}/approve`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminRejectListing(token, id, reason) {
  return request(`/api/admin/listings/${encodeURIComponent(id)}/reject`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason })
  });
}

async function adminGetCategories(token) {
  return request('/api/admin/categories', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminCreateCategory(token, data) {
  return request('/api/admin/categories', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function adminUpdateCategory(token, id, data) {
  return request(`/api/admin/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function adminDeleteCategory(token, id) {
  return request(`/api/admin/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminGetConfig(token) {
  return request('/api/admin/config', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminUpdateConfig(token, config) {
  return request('/api/admin/config', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(config)
  });
}

async function adminGetRoles(token) {
  return request('/api/admin/roles', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function adminCreateRole(token, data) {
  return request('/api/admin/roles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function adminUpdateRole(token, id, data) {
  return request(`/api/admin/roles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function adminDeleteRole(token, id) {
  return request(`/api/admin/roles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// Preferences
async function getPreferences(token) {
  return request('/api/preferences', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function updatePreferences(token, data) {
  return request('/api/preferences', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getNotificationPreferences(token) {
  return request('/api/preferences/notifications', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function updateNotificationPreference(token, data) {
  return request('/api/preferences/notifications', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

async function getPrivacyPreferences(token) {
  return request('/api/preferences/privacy', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function updatePrivacyPreferences(token, data) {
  return request('/api/preferences/privacy', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

module.exports = {
  ApiError,
  ApiOfflineError,
  // Cache
  invalidateUserCache,
  // Auth
  login,
  register,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  validateToken,
  verify2fa,
  // Users
  getProfile,
  updateProfile,
  getUsers,
  getUser,
  // Listings
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  // Wallet
  getBalance,
  getTransactions,
  getTransaction,
  transferCredits,
  // Messages
  getConversations,
  getConversation,
  getUnreadCount,
  sendMessage,
  startConversation,
  markConversationRead,
  // Connections
  getConnections,
  getPendingConnections,
  sendConnectionRequest,
  acceptConnection,
  declineConnection,
  removeConnection,
  // Notifications
  getNotifications,
  getNotification,
  getNotificationUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  // Groups
  getGroups,
  getMyGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
  joinGroup,
  leaveGroup,
  addGroupMember,
  removeGroupMember,
  updateGroupMemberRole,
  transferGroupOwnership,
  // Events
  getEvents,
  getMyEvents,
  getEvent,
  createEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
  getEventRsvps,
  rsvpToEvent,
  removeEventRsvp,
  // Feed
  getFeedPosts,
  getFeedPost,
  createFeedPost,
  updateFeedPost,
  deleteFeedPost,
  likeFeedPost,
  unlikeFeedPost,
  getFeedComments,
  addFeedComment,
  deleteFeedComment,
  // Reports
  submitReport,
  getMyReports,
  // Gamification
  getGamificationProfile,
  getGamificationProfileByUserId,
  getAllBadges,
  getMyBadges,
  getLeaderboard,
  getXpHistory,
  // Search
  search,
  searchSuggestions,
  getMembers,
  // Reviews
  getUserReviews,
  createUserReview,
  getListingReviews,
  createListingReview,
  getReview,
  updateReview,
  deleteReview,
  // Admin
  adminGetDashboard,
  adminGetUsers,
  adminGetUser,
  adminUpdateUser,
  adminSuspendUser,
  adminActivateUser,
  adminGetPendingListings,
  adminApproveListing,
  adminRejectListing,
  adminGetCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminGetConfig,
  adminUpdateConfig,
  adminGetRoles,
  adminCreateRole,
  adminUpdateRole,
  adminDeleteRole,
  // Preferences
  getPreferences,
  updatePreferences,
  getNotificationPreferences,
  updateNotificationPreference,
  getPrivacyPreferences,
  updatePrivacyPreferences
};
