// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  getConnections,
  getPendingConnections,
  acceptConnection,
  declineConnection,
  removeConnection,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { validateReturnUrl } = require('../lib/urlValidator');

const router = express.Router();

router.use(requireAuth);

// List connections (with optional status filter)
router.get('/', asyncRoute(async (req, res) => {
  const { status } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 20;

  const result = await getConnections(req.token, status);
  const allConnections = result.connections || [];

  // Client-side pagination
  const total = allConnections.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const connections = allConnections.slice(offset, offset + limit);

  res.render('connections/index', {
    title: 'Connections',
    connections,
    currentStatus: status || 'all',
    pagination: {
      page,
      limit,
      total,
      totalPages: totalPages
    },
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// Pending connection requests
router.get('/pending', asyncRoute(async (req, res) => {
  const result = await getPendingConnections(req.token);

  res.render('connections/pending', {
    title: 'Pending requests',
    incoming: result.incoming || [],
    outgoing: result.outgoing || [],
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// Accept connection request
router.post('/:id/accept', asyncRoute(async (req, res) => {
  const { id } = req.params;

  try {
    await acceptConnection(req.token, id);

    if (req.flash) {
      req.flash('success', 'Connection accepted');
    }
    res.redirect('/connections/pending');
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message);
      }
      return res.redirect('/connections/pending');
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// Decline connection request
router.post('/:id/decline', asyncRoute(async (req, res) => {
  const { id } = req.params;

  try {
    await declineConnection(req.token, id);

    if (req.flash) {
      req.flash('success', 'Connection declined');
    }
    res.redirect('/connections/pending');
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message);
      }
      return res.redirect('/connections/pending');
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// Remove connection or cancel pending request
router.post('/:id/remove', asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { return_url } = req.body;
  const safeReturnUrl = validateReturnUrl(return_url, '/connections');

  try {
    await removeConnection(req.token, id);

    if (req.flash) {
      req.flash('success', 'Connection removed');
    }
    res.redirect(safeReturnUrl);
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message);
      }
      return res.redirect(safeReturnUrl);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

module.exports = router;
