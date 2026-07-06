// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  createMemberPremiumCheckout,
  createMemberPremiumPortal,
  cancelMemberPremium,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

function tokenFrom(req) {
  return req.signedCookies.token || '';
}

function normaliseInterval(value) {
  const raw = String(value || '').trim();
  return raw === 'yearly' || raw === 'year' ? 'yearly' : 'monthly';
}

function positiveInteger(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data && typeof result.data === 'object'
    ? result.data
    : result;
}

function externalUrlFrom(result, key) {
  const value = dataFrom(result) && dataFrom(result)[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : '';
}

function redirectAuthIfNeeded(error, res) {
  if (error instanceof ApiError && error.status === 401) {
    res.redirect('/login?status=auth-required');
    return true;
  }
  return false;
}

router.post('/subscribe', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const tierId = positiveInteger(req.body.tier_id);
  if (tierId === null) {
    return res.redirect('/premium?status=subscribe-failed');
  }

  try {
    const result = await createMemberPremiumCheckout(token, {
      tier_id: tierId,
      interval: normaliseInterval(req.body.interval),
      return_url: '/premium/return?status=success'
    });
    const checkoutUrl = externalUrlFrom(result, 'checkout_url');
    if (checkoutUrl !== '') {
      return res.redirect(checkoutUrl);
    }
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
  }

  return res.redirect('/premium?status=subscribe-failed');
}));

router.post('/portal', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  try {
    const result = await createMemberPremiumPortal(token, {
      return_url: '/premium/manage'
    });
    const portalUrl = externalUrlFrom(result, 'portal_url');
    if (portalUrl !== '') {
      return res.redirect(portalUrl);
    }
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
  }

  return res.redirect('/premium/manage?status=portal-failed');
}));

router.post('/cancel', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let status = 'cancel-scheduled';
  try {
    await cancelMemberPremium(token);
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    status = 'cancel-failed';
  }

  return res.redirect(`/premium/manage?status=${status}`);
}));

module.exports = router;
