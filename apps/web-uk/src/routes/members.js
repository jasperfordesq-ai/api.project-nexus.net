// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  getMembers,
  getUser,
  getConnections,
  getConnectionStatus,
  sendConnectionRequest,
  getGamificationProfileByUserId,
  getUserReviews,
  getProfile,
  ApiError,
  ApiOfflineError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

router.use(requireAuth);

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
}

function unwrapMeta(payload, fallback = {}) {
  if (!payload || typeof payload !== 'object') return fallback;
  return payload.meta || payload.pagination || payload.data?.meta || fallback;
}

function unwrapEntity(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) return payload.data;
  if (payload.user && typeof payload.user === 'object' && !Array.isArray(payload.user)) return payload.user;
  if (payload.profile && typeof payload.profile === 'object' && !Array.isArray(payload.profile)) return payload.profile;
  return payload;
}

function allow(value, allowedValues, fallback) {
  return allowedValues.includes(value) ? value : fallback;
}

function normalizeMember(member) {
  const rawName = String(member.name || '').trim();
  const nameParts = rawName.split(/\s+/).filter(Boolean);
  const firstName = member.first_name || member.firstName || nameParts[0] || '';
  const lastName = member.last_name || member.lastName || nameParts.slice(1).join(' ');
  const name = String(rawName || `${firstName} ${lastName}` || '').trim();

  return {
    ...member,
    id: member.id,
    first_name: firstName,
    last_name: lastName,
    firstName,
    lastName,
    name: name || firstName || 'Unknown member',
    displayName: name || firstName || 'Unknown member',
    avatar: member.avatar || member.avatar_url || member.avatarUrl || '',
    tagline: member.tagline || member.bio || '',
    location: member.location || '',
    rating: member.rating,
    total_hours_given: Number(member.total_hours_given ?? member.hours_given ?? 0) || 0,
    total_hours_received: Number(member.total_hours_received ?? member.hours_received ?? 0) || 0,
    identity_verified: !!(member.identity_verified || member.id_verified || member.is_verified),
    level: Number(member.level || 0) || 0,
    connection_state: member.connection_state || member.connectionState || 'none',
    badges: Array.isArray(member.badges)
      ? member.badges
      : (Array.isArray(member.showcased_badges) ? member.showcased_badges : [])
  };
}

function memberFilters(req) {
  return {
    q: typeof req.query.q === 'string' ? req.query.q.trim() : (typeof req.query.search === 'string' ? req.query.search.trim() : ''),
    sort: allow(req.query.sort, ['name', 'joined', 'rating', 'hours_given'], 'name'),
    order: allow(String(req.query.order || '').toUpperCase(), ['ASC', 'DESC'], 'ASC'),
    limit: 20,
    offset: Math.max(parseInt(req.query.offset, 10) || 0, 0)
  };
}

function normalizeConnectionStatus(payload) {
  const statusPayload = unwrapEntity(payload);
  if (!statusPayload || typeof statusPayload !== 'object') return null;

  const status = statusPayload.status;
  const connectionId = statusPayload.connection_id || statusPayload.connectionId || statusPayload.id || null;

  if (status === 'connected' || status === 'accepted') {
    return { id: connectionId, status: 'accepted', is_requester: false };
  }

  if (status === 'pending_sent') {
    return { id: connectionId, status: 'pending', is_requester: true };
  }

  if (status === 'pending_received') {
    return { id: connectionId, status: 'pending', is_requester: false };
  }

  return null;
}

// Members directory - list all users in tenant
router.get('/', asyncRoute(async (req, res) => {
  const filters = memberFilters(req);
  let payload = null;
  let error = false;

  try {
    payload = await getMembers(req.token, filters);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      throw err;
    }
    if (!(err instanceof ApiError) && !(err instanceof ApiOfflineError)) {
      throw err;
    }
    error = true;
  }

  const meta = unwrapMeta(payload, {
    total_items: 0,
    offset: filters.offset,
    per_page: filters.limit,
    has_more: false
  });
  const users = error ? [] : unwrapList(payload).map(normalizeMember);
  const totalItems = Number(meta.total_items ?? meta.total ?? users.length) || 0;
  const hasFilters = !!(filters.q || filters.sort !== 'name' || filters.order !== 'ASC');

  res.render('members/index', {
    title: 'Community members',
    users,
    items: users,
    meta: {
      ...meta,
      total_items: totalItems,
      offset: Number(meta.offset ?? filters.offset) || 0,
      per_page: Number(meta.per_page ?? filters.limit) || filters.limit,
      has_more: !!(meta.has_more || meta.hasMore)
    },
    filters,
    hasFilters,
    error,
    communityName: res.locals.tenant?.name || res.locals.tenantSlug || 'Project NEXUS Accessible',
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}));

// View single user profile
router.get('/:id', asyncRoute(async (req, res) => {
  const { id } = req.params;

  const [userResult, connectionsResult, connectionStatusResult, gamificationResult, reviewsResult, currentProfileResult] = await Promise.all([
    getUser(req.token, id),
    getConnections(req.token).catch(() => ({ data: [] })),
    getConnectionStatus(req.token, id).catch(() => null),
    getGamificationProfileByUserId(req.token, id).catch(() => ({ profile: null })),
    getUserReviews(req.token, id).catch(() => ({ data: [], summary: null })),
    getProfile(req.token).catch(() => null)
  ]);

  const user = normalizeMember(unwrapEntity(userResult) || {});
  const currentProfile = unwrapEntity(currentProfileResult);

  if (!user.id) {
    return res.status(404).render('errors/404', { title: 'User not found' });
  }

  const connections = connectionsResult.items || connectionsResult.data || connectionsResult.connections || [];
  const connectionsArr = Array.isArray(connections) ? connections : [];

  // Find connection with this user
  const listConnection = connectionsArr.find(conn => {
    const otherUser = conn.otherUser || conn.other_user;
    return otherUser && otherUser.id === parseInt(id);
  });
  const connection = normalizeConnectionStatus(connectionStatusResult) || listConnection;

  const isOwnProfile = currentProfile && (currentProfile.id == id || currentProfile.id === parseInt(id, 10));

  // Normalize is_requester to handle both snake_case and camelCase API responses
  if (connection) {
    connection.is_requester = connection.is_requester ?? connection.isRequester ?? false;
  }

  res.render('members/profile', {
    title: user.displayName,
    user,
    connection,
    isOwnProfile,
    gamification: gamificationResult.profile || null,
    reviews: unwrapList(reviewsResult),
    reviewSummary: reviewsResult.summary || reviewsResult.data?.summary || null,
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}, { notFoundTitle: 'User not found' }));

// Send connection request from member profile
router.post('/:id/connect', asyncRoute(async (req, res) => {
  const { id } = req.params;

  try {
    const result = await sendConnectionRequest(req.token, id);

    if (req.flash) {
      req.flash('success', result.message || 'Connection request sent');
    }
    res.redirect(`/members/${id}`);
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message);
      }
      return res.redirect(`/members/${id}`);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

module.exports = router;
