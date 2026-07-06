// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { performExchangeAction, rateExchange, ApiError } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();
const EXCHANGE_ACTIONS = new Set(['accept', 'decline', 'start', 'complete', 'confirm', 'cancel']);

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function isNotFound(error) {
  return error instanceof ApiError && error.status === 404;
}

function actionPayload(action, body) {
  if (action === 'decline' || action === 'cancel') {
    return { reason: String(body.reason || '').trim() };
  }
  if (action === 'confirm') {
    const rawHours = Number(body.hours);
    const hours = Number.isFinite(rawHours) ? Math.max(0.25, Math.min(24, rawHours)) : 0.25;
    return { hours };
  }
  return {};
}

router.post('/:id(\\d+)', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const action = String(req.body.action || '').trim();
  let status = 'exchange-action-failed';

  if (EXCHANGE_ACTIONS.has(action)) {
    try {
      await performExchangeAction(req.token, id, action, actionPayload(action, req.body));
      status = 'exchange-updated';
    } catch (error) {
      if (isAuthError(error) || isNotFound(error)) throw error;
    }
  }

  return res.redirect(`/exchanges/${id}?status=${status}`);
}));

router.post('/:id(\\d+)/rate', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const rating = Number(req.body.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.redirect(`/exchanges/${id}?status=rating-invalid`);
  }

  let status = 'rating-submitted';
  try {
    await rateExchange(req.token, id, {
      rating,
      comment: String(req.body.comment || '').trim() || null
    });
  } catch (error) {
    if (isAuthError(error) || isNotFound(error)) throw error;
    status = 'rating-failed';
  }

  return res.redirect(`/exchanges/${id}?status=${status}`);
}));

module.exports = router;
