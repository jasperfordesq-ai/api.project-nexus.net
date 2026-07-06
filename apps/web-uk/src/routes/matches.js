// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { dismissMatch, ApiError } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();
const MATCH_REASONS = new Set(['not_relevant', 'too_far', 'already_done', 'not_interested', 'other']);
const BOARD_SOURCES = new Set(['all', 'listing', 'group', 'volunteering', 'event']);

function reasonFrom(body) {
  const reason = String(body.reason || '').trim();
  return MATCH_REASONS.has(reason) ? reason : 'not_relevant';
}

function sourceFrom(body) {
  const source = String(body.source || '').trim();
  return BOARD_SOURCES.has(source) ? source : 'all';
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

router.post('/:id(\\d+)/dismiss', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);

  try {
    await dismissMatch(req.token, id, reasonFrom(req.body));
  } catch (error) {
    if (isAuthError(error)) throw error;
  }

  return res.redirect('/matches?status=match-dismissed');
}));

router.post('/board/:listingId(\\d+)/dismiss', requireAuth, asyncRoute(async (req, res) => {
  const listingId = Number(req.params.listingId);
  let status = 'match-dismissed';

  try {
    await dismissMatch(req.token, listingId, reasonFrom(req.body));
  } catch (error) {
    if (isAuthError(error)) throw error;
    status = 'match-dismiss-failed';
  }

  return res.redirect(`/matches/board?source=${sourceFrom(req.body)}&status=${status}#matches-top`);
}));

module.exports = router;
