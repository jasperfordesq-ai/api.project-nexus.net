// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  getUsers,
  getUser,
  getUserV2,
  getMemberVerificationBadges,
  getMembersV2,
  getMembersNearby,
  getConnections,
  getMemberConnectionStatus,
  sendMemberConnectionRequest,
  acceptMemberConnection,
  declineMemberConnection,
  removeMemberConnection,
  blockMember,
  unblockMember,
  endorseMemberSkill,
  removeMemberEndorsement,
  transferWalletCredits,
  createReview,
  getGamificationProfileByUserId,
  getUserReviews,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { getRequestIntlLocale } = require('../lib/request-intl-locale');
const { getRequestProfile } = require('../lib/request-profile');

const router = express.Router();

const LOGIN_AUTH_REQUIRED_PATH = '/login?status=auth-required';
const MEMBERS_PATH = '/members';
const BLOCKED_MEMBERS_PATH = '/profile/blocked?status=member-unblocked';
const MEMBER_CONNECTION_ACTIONS = new Set(['connect', 'accept', 'decline', 'cancel', 'remove']);
const MEMBER_ENDORSEMENT_ACTIONS = new Set(['endorse', 'remove']);

function tokenFrom(req) {
  return req.signedCookies.token || '';
}

function memberUrl(id, status) {
  return `${MEMBERS_PATH}/${id}?status=${encodeURIComponent(status)}`;
}

function redirectTo(res, pathname) {
  const urlFor = typeof res.locals.urlFor === 'function' ? res.locals.urlFor : (value) => value;
  return res.redirect(urlFor(pathname));
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function isNotFound(error) {
  return error instanceof ApiError && error.status === 404;
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data && typeof result.data === 'object'
    ? result.data
    : result;
}

function positiveInteger(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function boundedInteger(value, fallback, min = 0, max = 1000) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function connectionIdFrom(current) {
  return positiveInteger(current.connection_id || current.connectionId || current.id);
}

function rowsFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

function metaFrom(result) {
  return result && result.meta && typeof result.meta === 'object' ? result.meta : {};
}

function memberName(member) {
  const explicit = String(member.name || '').trim();
  if (explicit) return explicit;
  const first = String(member.first_name || member.firstName || '').trim();
  const last = String(member.last_name || member.lastName || '').trim();
  return `${first} ${last}`.trim() || 'A community member';
}

function connectionLabel(state) {
  const labels = {
    connected: 'Connected',
    pending_sent: 'Request sent',
    pending_received: 'Wants to connect'
  };
  return labels[state] || '';
}

function normalizeDiscoverMember(member) {
  const score = Number(member.community_rank_score);
  const rankPercent = Number.isFinite(score) ? Math.round(score * 100) : null;
  const level = boundedInteger(member.level, 0, 0, 1000);
  const rating = Number(member.rating);
  const given = boundedInteger(member.total_hours_given ?? member.hours_given, 0, 0, Number.MAX_SAFE_INTEGER);
  const received = boundedInteger(member.total_hours_received ?? member.hours_received, 0, 0, Number.MAX_SAFE_INTEGER);

  return {
    id: positiveInteger(member.id) || 0,
    name: memberName(member),
    initial: memberName(member).slice(0, 1).toUpperCase() || 'M',
    avatar: String(member.avatar || member.avatar_url || member.avatarUrl || '').trim(),
    tagline: String(member.tagline || '').trim(),
    rankPercent,
    location: String(member.location || '').trim(),
    hoursGivenLabel: `${given} hour${given === 1 ? '' : 's'} given`,
    hoursReceivedLabel: `${received} hour${received === 1 ? '' : 's'} received`,
    ratingLabel: Number.isFinite(rating) && rating > 0 ? `${rating.toFixed(1)} out of 5` : '',
    isVerified: !!(member.is_verified || member.identity_verified),
    level,
    levelLabel: level > 0 ? `Level ${level}` : '',
    connectionLabel: connectionLabel(member.connection_state || member.connectionState)
  };
}

function numericCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeNearbyMember(member) {
  const normalized = normalizeDiscoverMember(member);
  const distance = Number(member.distance);
  return {
    ...normalized,
    distanceLabel: Number.isFinite(distance) ? `${distance.toFixed(1)} km away` : ''
  };
}

function decimalLabel(value, fallback = '0.0') {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : fallback;
}

function integerLabel(value, fallback = '0') {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.trunc(number)) : fallback;
}

function titleLabel(value) {
  const raw = String(value || '').replace(/_/g, ' ').trim();
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function dateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(getRequestIntlLocale(), { day: 'numeric', month: 'long', year: 'numeric' });
}

function normalizeInsightsProfile(profile) {
  const stats = profile && typeof profile.stats === 'object' && profile.stats !== null ? profile.stats : {};
  const nexusScore = profile && typeof profile.nexus_score === 'object' && profile.nexus_score !== null
    ? profile.nexus_score
    : null;
  const badges = Array.isArray(profile.badges)
    ? profile.badges
    : (Array.isArray(profile.showcased_badges) ? profile.showcased_badges : []);

  return {
    displayName: memberName(profile || {}),
    nexusScore: nexusScore
      ? {
          scoreLabel: decimalLabel(nexusScore.total_score, ''),
          tierLabel: titleLabel(nexusScore.tier),
          percentile: boundedInteger(nexusScore.percentile, 0, 0, 100)
        }
      : null,
    stats: {
      hoursGiven: decimalLabel(profile.total_hours_given ?? stats.total_hours_given),
      hoursReceived: decimalLabel(profile.total_hours_received ?? stats.total_hours_received),
      listingsCount: integerLabel(stats.listings_count),
      groupsCount: integerLabel(profile.groups_count ?? stats.groups_count),
      eventsAttended: integerLabel(profile.events_attended ?? stats.events_attended),
      connectionsCount: integerLabel(stats.connections_count),
      reviewsCount: integerLabel(stats.reviews_count),
      rating: profile.rating ?? stats.average_rating,
      ratingLabel: Number.isFinite(Number(profile.rating ?? stats.average_rating))
        ? decimalLabel(profile.rating ?? stats.average_rating)
        : '',
      level: integerLabel(profile.level, '1'),
      xp: integerLabel(profile.xp)
    },
    badges: badges.slice(0, 12).map((badge) => ({
      name: String(badge.name || badge.badge_name || badge.badge_key || '').trim(),
      icon: String(badge.icon || '').trim()
    })).filter((badge) => badge.name)
  };
}

function normalizeVerificationBadges(result) {
  return rowsFrom(result).map((badge) => {
    const type = String(badge.badge_type || badge.type || '').trim();
    return {
      label: String(badge.label || titleLabel(type) || 'Verified').trim(),
      grantedLabel: dateLabel(badge.granted_at || badge.created_at || badge.verified_at)
    };
  }).filter((badge) => badge.label);
}

function redirectAuthIfNeeded(error, res) {
  if (isAuthError(error)) {
    redirectTo(res, LOGIN_AUTH_REQUIRED_PATH);
    return true;
  }
  return false;
}

function transferFailureStatus(error) {
  const message = error instanceof Error ? error.message : '';
  const code = error instanceof ApiError && error.data && typeof error.data === 'object'
    ? String(error.data.error || error.data.code || '')
    : '';

  if (code === 'INSUFFICIENT_FUNDS' || message.includes('Insufficient')) {
    return 'transfer-insufficient';
  }
  if (message.includes('yourself')) {
    return 'transfer-self';
  }
  return 'transfer-failed';
}

router.post('/:id(\\d+)/connection', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return redirectTo(res, LOGIN_AUTH_REQUIRED_PATH);
  }

  const action = String(req.body.action || '').trim();
  let status = 'connection-failed';

  if (MEMBER_CONNECTION_ACTIONS.has(action)) {
    try {
      const current = dataFrom(await getMemberConnectionStatus(token, id)) || {};
      const currentStatus = String(current.status || 'none');
      const connectionId = connectionIdFrom(current);

      if (action === 'connect' && currentStatus === 'none') {
        await sendMemberConnectionRequest(token, id);
        status = 'connection-sent';
      } else if (action === 'accept' && currentStatus === 'pending_received' && connectionId !== null) {
        await acceptMemberConnection(token, connectionId);
        status = 'connection-accepted';
      } else if (action === 'decline' && currentStatus === 'pending_received' && connectionId !== null) {
        await declineMemberConnection(token, connectionId);
        status = 'connection-declined';
      } else if (action === 'cancel' && currentStatus === 'pending_sent' && connectionId !== null) {
        await removeMemberConnection(token, connectionId);
        status = 'connection-cancelled';
      } else if (action === 'remove' && currentStatus === 'connected' && connectionId !== null) {
        await removeMemberConnection(token, connectionId);
        status = 'connection-removed';
      }
    } catch (error) {
      if (redirectAuthIfNeeded(error, res)) return undefined;
      if (isNotFound(error)) throw error;
      status = 'connection-failed';
    }
  }

  return redirectTo(res, memberUrl(id, status));
}));

router.post('/:id(\\d+)/endorse', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return redirectTo(res, LOGIN_AUTH_REQUIRED_PATH);
  }

  const skillName = String(req.body.skill_name || '').trim();
  const action = String(req.body.action || '').trim();
  let status = 'endorsement-failed';

  if (skillName !== '' && MEMBER_ENDORSEMENT_ACTIONS.has(action)) {
    try {
      if (action === 'endorse') {
        await endorseMemberSkill(token, id, { skill_name: skillName });
        status = 'endorsement-added';
      } else {
        await removeMemberEndorsement(token, id, skillName);
        status = 'endorsement-removed';
      }
    } catch (error) {
      if (redirectAuthIfNeeded(error, res)) return undefined;
      if (isNotFound(error)) throw error;
      status = 'endorsement-failed';
    }
  }

  return redirectTo(res, memberUrl(id, status));
}));

router.post('/:id(\\d+)/block', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return redirectTo(res, LOGIN_AUTH_REQUIRED_PATH);
  }

  let status = 'member-blocked';
  try {
    await blockMember(token, id, String(req.body.reason || '').trim());
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    if (isNotFound(error)) throw error;
    status = error instanceof ApiError && error.status === 400 ? 'block-self' : 'block-failed';
  }

  return redirectTo(res, memberUrl(id, status));
}));

router.post('/:id(\\d+)/unblock', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return redirectTo(res, LOGIN_AUTH_REQUIRED_PATH);
  }

  try {
    await unblockMember(token, id);
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    if (isNotFound(error)) throw error;
  }

  if (String(req.body.from || '').trim() === 'list') {
    return redirectTo(res, BLOCKED_MEMBERS_PATH);
  }
  return redirectTo(res, memberUrl(id, 'member-unblocked'));
}));

router.post('/:id(\\d+)/review', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return redirectTo(res, LOGIN_AUTH_REQUIRED_PATH);
  }

  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return redirectTo(res, memberUrl(id, 'review-invalid'));
  }

  let status = 'review-submitted';
  try {
    await createReview(token, {
      receiver_id: id,
      rating,
      comment: String(req.body.comment || '').trim() || null
    });
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    if (isNotFound(error)) throw error;
    if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
      status = 'review-invalid';
    } else if (error instanceof ApiError && error.status === 409) {
      status = 'review-duplicate';
    } else {
      status = 'review-failed';
    }
  }

  return redirectTo(res, memberUrl(id, status));
}));

router.post('/:id(\\d+)/transfer', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return redirectTo(res, LOGIN_AUTH_REQUIRED_PATH);
  }

  const amount = Number(req.body.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return redirectTo(res, memberUrl(id, 'transfer-failed'));
  }

  let status = 'transfer-sent';
  try {
    await transferWalletCredits(token, {
      recipient: id,
      amount,
      description: String(req.body.note || '').trim().slice(0, 255),
      idempotency_key: String(req.body.idempotency_key || '').trim()
    });
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    if (isNotFound(error)) throw error;
    status = transferFailureStatus(error);
  }

  return redirectTo(res, memberUrl(id, status));
}));

router.get('/discover', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return redirectTo(res, LOGIN_AUTH_REQUIRED_PATH);
  }

  const search = String(req.query.q || '').trim().slice(0, 100);
  const limit = boundedInteger(req.query.limit, 20, 1, 100);
  const offset = boundedInteger(req.query.offset, 0, 0, 100000);

  let members = [];
  let totalItems = 0;
  let hasMore = false;
  let errorMessage = null;

  try {
    const result = await getMembersV2(token, {
      q: search,
      sort: 'communityrank',
      limit,
      offset
    });
    const meta = metaFrom(result);
    members = rowsFrom(result).map(normalizeDiscoverMember).filter((member) => member.id > 0);
    totalItems = boundedInteger(meta.total_items, members.length, 0, Number.MAX_SAFE_INTEGER);
    hasMore = !!meta.has_more;
  } catch {
    errorMessage = 'Sorry, there is a problem loading recommended members.';
  }

  res.render('members/discover', {
    title: 'Recommended members',
    activeNav: 'members',
    alphaActiveNav: 'members',
    communityName: res.locals.tenantName || res.locals.serviceName || 'this community',
    members,
    search,
    totalItems,
    totalItemsLabel: `${totalItems} member${totalItems === 1 ? '' : 's'}`,
    hasMore,
    nextHref: hasMore ? `/members/discover${search ? `?q=${encodeURIComponent(search)}&` : '?'}offset=${offset + limit}` : '',
    errorMessage
  });
}));

router.get('/nearby', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return redirectTo(res, LOGIN_AUTH_REQUIRED_PATH);
  }

  const search = String(req.query.q || '').trim().slice(0, 100);
  const radius = boundedInteger(req.query.radius, 25, 5, 100);
  const limit = boundedInteger(req.query.limit, 24, 1, 100);
  const offset = boundedInteger(req.query.offset, 0, 0, 100000);

  let members = [];
  let hasMore = false;
  let errorMessage = null;
  let hasLocation = false;

  try {
    const profile = dataFrom(await getRequestProfile(req, token)) || {};
    const lat = numericCoordinate(profile.latitude ?? profile.lat);
    const lon = numericCoordinate(profile.longitude ?? profile.lon ?? profile.lng);

    if (lat !== null && lon !== null) {
      hasLocation = true;
      const result = await getMembersNearby(token, {
        lat,
        lon,
        q: search,
        radius_km: radius,
        limit,
        offset
      });
      const meta = metaFrom(result);
      members = rowsFrom(result).map(normalizeNearbyMember).filter((member) => member.id > 0);
      hasMore = !!meta.has_more;
    }
  } catch {
    errorMessage = 'Nearby members could not be loaded. Try again.';
  }

  res.render('members/nearby', {
    title: 'Members near me',
    activeNav: 'members',
    alphaActiveNav: 'members',
    communityName: res.locals.tenantName || res.locals.serviceName || 'this community',
    members,
    search,
    radius,
    radiusOptions: [5, 10, 25, 50, 100],
    hasLocation,
    hasMore,
    nextHref: hasMore ? `/members/nearby${search ? `?q=${encodeURIComponent(search)}&` : '?'}radius=${radius}&offset=${offset + limit}` : '',
    errorMessage
  });
}));

router.get('/:id(\\d+)/insights', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return redirectTo(res, LOGIN_AUTH_REQUIRED_PATH);
  }

  try {
    const [viewerResult, profileResult, verificationResult] = await Promise.all([
      getRequestProfile(req, token),
      getUserV2(token, id),
      getMemberVerificationBadges(token, id).catch(() => ({ data: [] }))
    ]);
    const viewer = dataFrom(viewerResult) || {};
    const profile = dataFrom(profileResult) || {};
    const normalized = normalizeInsightsProfile(profile);
    const isOwnProfile = Number(viewer.id) === id;

    res.render('members/insights', {
      title: `Reputation and recognition - ${normalized.displayName}`,
      activeNav: isOwnProfile ? 'profile' : 'members',
      alphaActiveNav: isOwnProfile ? 'profile' : 'members',
      memberId: id,
      isOwnProfile,
      displayName: normalized.displayName,
      nexusScore: normalized.nexusScore,
      insightsStats: normalized.stats,
      verificationBadges: normalizeVerificationBadges(verificationResult),
      earnedBadges: normalized.badges
    });
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    throw error;
  }
}));

// Members directory - list all users in tenant
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 20;
  const searchQuery = req.query.search ? req.query.search.trim() : '';
  let memberErrorMessage = null;

  const [usersResult, connectionsResult] = await Promise.all([
    getUsers(req.token).catch((error) => {
      if (error instanceof ApiError && error.status === 401) {
        throw error;
      }
      memberErrorMessage = 'Sorry, there is a problem loading members.';
      return { data: [] };
    }),
    getConnections(req.token).catch(() => ({ data: [] }))
  ]);

  let allUsers = usersResult.items || usersResult.data || usersResult.users || usersResult || [];
  // Ensure allUsers is always an array
  if (!Array.isArray(allUsers)) {
    allUsers = [];
  }
  const connections = connectionsResult.items || connectionsResult.data || connectionsResult.connections || [];
  // Ensure connections is always an array
  const connectionsList = Array.isArray(connections) ? connections : [];

  // Build a map of connection status by user ID
  const connectionMap = {};
  connectionsList.forEach(conn => {
    const otherUser = conn.otherUser || conn.other_user;
    if (otherUser) {
      connectionMap[otherUser.id] = {
        id: conn.id,
        status: conn.status,
        isRequester: conn.isRequester || conn.is_requester
      };
    }
  });

  // Apply search filter
  if (searchQuery) {
    const searchLower = searchQuery.toLowerCase();
    allUsers = allUsers.filter(user => {
      const firstName = (user.first_name || user.firstName || '').toLowerCase();
      const lastName = (user.last_name || user.lastName || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`;
      return firstName.includes(searchLower) ||
             lastName.includes(searchLower) ||
             fullName.includes(searchLower) ||
             email.includes(searchLower);
    });
  }

  // Client-side pagination
  const total = allUsers.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const users = allUsers.slice(offset, offset + limit);

  res.render('members/index', {
    title: 'Community members',
    users,
    connectionMap,
    searchQuery,
    pagination: {
      page,
      limit,
      total,
      totalPages: totalPages
    },
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: memberErrorMessage || (req.flash ? req.flash('error')[0] : null)
  });
}));

// View single user profile
router.get('/:id', requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;

  const [user, connectionsResult, gamificationResult, reviewsResult, currentProfile] = await Promise.all([
    getUser(req.token, id),
    getConnections(req.token).catch(() => ({ data: [] })),
    getGamificationProfileByUserId(req.token, id).catch(() => ({ profile: null })),
    getUserReviews(req.token, id).catch(() => ({ data: [], summary: null })),
    getRequestProfile(req, req.token).catch(() => null)
  ]);

  if (!user) {
    return res.status(404).render('errors/404', { title: 'User not found' });
  }

  const connections = connectionsResult.items || connectionsResult.data || connectionsResult.connections || [];
  const connectionsArr = Array.isArray(connections) ? connections : [];

  // Find connection with this user
  const connection = connectionsArr.find(conn => {
    const otherUser = conn.otherUser || conn.other_user;
    return otherUser && otherUser.id === parseInt(id);
  });

  const isOwnProfile = currentProfile && (currentProfile.id == id || currentProfile.id === parseInt(id, 10));

  // Normalize is_requester to handle both snake_case and camelCase API responses
  if (connection) {
    connection.is_requester = connection.is_requester ?? connection.isRequester ?? false;
  }

  res.render('members/profile', {
    title: `${user.first_name || user.firstName} ${user.last_name || user.lastName}`,
    user,
    connection,
    isOwnProfile,
    gamification: gamificationResult.profile || null,
    reviews: reviewsResult.data || [],
    reviewSummary: reviewsResult.summary || null,
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}, { notFoundTitle: 'User not found' }));

module.exports = router;
