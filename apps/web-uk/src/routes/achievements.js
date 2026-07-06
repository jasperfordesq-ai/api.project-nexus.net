// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  claimDailyReward,
  claimGamificationChallenge,
  purchaseGamificationShopItem,
  updateGamificationShowcase,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

function tokenFrom(req) {
  return req.signedCookies.token || '';
}

function positiveInteger(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function badgeKeysFrom(body) {
  const raw = body.badge_keys || body['badge_keys[]'] || [];
  const values = Array.isArray(raw) ? raw : [raw];
  return values.map((value) => String(value || '').trim()).filter(Boolean);
}

function redirectAuthIfNeeded(error, res) {
  if (error instanceof ApiError && error.status === 401) {
    res.redirect('/login?status=auth-required');
    return true;
  }
  return false;
}

router.post('/daily-reward', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let status = 'daily-reward-claimed';
  try {
    await claimDailyReward(token);
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    status = 'daily-reward-failed';
  }

  return res.redirect(`/achievements?status=${status}`);
}));

router.post('/challenges/:id(\\d+)/claim', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let status = 'challenge-claimed';
  try {
    await claimGamificationChallenge(token, Number(req.params.id));
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    status = 'challenge-claim-failed';
  }

  return res.redirect(`/achievements?status=${status}`);
}));

router.post('/shop/purchase', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const itemId = positiveInteger(req.body.item_id);
  let status = 'purchase-failed';
  if (itemId !== null) {
    try {
      await purchaseGamificationShopItem(token, itemId);
      status = 'purchased';
    } catch (error) {
      if (redirectAuthIfNeeded(error, res)) return undefined;
    }
  }

  return res.redirect(`/achievements/shop?status=${status}`);
}));

router.post('/showcase', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const badgeKeys = badgeKeysFrom(req.body);
  let status = 'showcase-failed';
  if (badgeKeys.length > 5) {
    status = 'showcase-too-many';
  } else {
    try {
      await updateGamificationShowcase(token, badgeKeys);
      status = 'showcase-updated';
    } catch (error) {
      if (redirectAuthIfNeeded(error, res)) return undefined;
      if (error instanceof ApiError && error.status === 400) {
        status = 'showcase-not-owned';
      }
    }
  }

  return res.redirect(`/achievements/showcase?status=${status}`);
}));

module.exports = router;
