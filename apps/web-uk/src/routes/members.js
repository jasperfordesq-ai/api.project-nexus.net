// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  getUsers,
  getUser,
  getConnections,
  sendConnectionRequest,
  getGamificationProfileByUserId,
  getUserReviews,
  getProfile,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

router.use(requireAuth);

// Members directory - list all users in tenant
router.get('/', asyncRoute(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 20;
  const searchQuery = req.query.search ? req.query.search.trim() : '';

  const [usersResult, connectionsResult] = await Promise.all([
    getUsers(req.token),
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
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}));

// View single user profile
router.get('/:id', asyncRoute(async (req, res) => {
  const { id } = req.params;

  const [user, connectionsResult, gamificationResult, reviewsResult, currentProfile] = await Promise.all([
    getUser(req.token, id),
    getConnections(req.token).catch(() => ({ data: [] })),
    getGamificationProfileByUserId(req.token, id).catch(() => ({ profile: null })),
    getUserReviews(req.token, id).catch(() => ({ data: [], summary: null })),
    getProfile(req.token).catch(() => null)
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
