// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  unsaveSavedItem,
  sendAppreciation,
  reactToAppreciation,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();
const APPRECIATION_REACTIONS = new Set(['heart', 'clap', 'star']);

function appreciationStatus(error) {
  const message = String(error?.message || '');
  if (/cannot_thank_self/i.test(message)) return 'appreciation-self';
  if (/message_too_long/i.test(message)) return 'appreciation-too-long';
  if (/rate_limit/i.test(message)) return 'appreciation-rate-limited';
  return 'appreciation-failed';
}

router.post('/saved/destroy', requireAuth, asyncRoute(async (req, res) => {
  const type = String(req.body.type || '').trim();
  const id = Number(req.body.id);
  let ok = false;

  if (type && Number.isInteger(id) && id > 0) {
    try {
      await unsaveSavedItem(req.token, type, id);
      ok = true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) throw error;
    }
  }

  return res.redirect(`/saved?status=${ok ? 'bookmark-removed' : 'bookmark-failed'}`);
}));

router.post('/users/:userId(\\d+)/appreciations', requireAuth, asyncRoute(async (req, res) => {
  const userId = Number(req.params.userId);
  const message = String(req.body.message || '').trim();
  const isPublic = req.body.is_public === undefined
    ? true
    : ['1', 'on', 'true'].includes(String(req.body.is_public).toLowerCase());

  if (!message) {
    return res.redirect(`/users/${userId}/appreciations?status=appreciation-message-required`);
  }

  let status = 'appreciation-sent';
  try {
    await sendAppreciation(req.token, {
      receiver_id: userId,
      message,
      context_type: 'general',
      is_public: isPublic
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    status = appreciationStatus(error);
  }

  return res.redirect(`/users/${userId}/appreciations?status=${status}`);
}));

router.post('/appreciations/:id(\\d+)/react', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const ownerId = Number(req.body.owner_id);
  const reaction = String(req.body.reaction_type || '').trim();
  const returnOwnerId = Number.isInteger(ownerId) && ownerId > 0 ? ownerId : 0;
  const basePath = returnOwnerId > 0 ? `/users/${returnOwnerId}/appreciations` : '/saved';

  if (!APPRECIATION_REACTIONS.has(reaction)) {
    return res.redirect(`${basePath}?status=reaction-failed#appreciation-${id}`);
  }

  let status = 'reaction-updated';
  try {
    await reactToAppreciation(req.token, id, reaction);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    if (error instanceof ApiError && error.status === 404) throw error;
    status = 'reaction-failed';
  }

  return res.redirect(`${basePath}?status=${status}#appreciation-${id}`);
}));

module.exports = router;
