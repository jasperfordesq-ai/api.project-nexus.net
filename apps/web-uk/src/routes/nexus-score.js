// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { callGamificationApi, ApiError } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

const TIERS = [
  { key: 'novice', name: 'Novice', min: 0 },
  { key: 'beginner', name: 'Beginner', min: 200 },
  { key: 'developing', name: 'Developing', min: 300 },
  { key: 'intermediate', name: 'Intermediate', min: 400 },
  { key: 'proficient', name: 'Proficient', min: 500 },
  { key: 'advanced', name: 'Advanced', min: 600 },
  { key: 'expert', name: 'Expert', min: 700 },
  { key: 'elite', name: 'Elite', min: 800 },
  { key: 'legendary', name: 'Legendary', min: 900 }
];

function tokenFrom(req) {
  return (req.signedCookies && req.signedCookies.token) || req.token || '';
}

function loginRedirect() {
  return '/login?status=auth-required';
}

function objectFrom(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function payloadFrom(result) {
  if (result && Object.prototype.hasOwnProperty.call(result, 'data')) {
    return result.data;
  }
  return result || {};
}

function intFrom(value) {
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) ? numeric : 0;
}

function numberFrom(value) {
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function textFrom(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function formatInteger(value) {
  return intFrom(value).toLocaleString('en-GB');
}

function normalizeTierScore(result) {
  const payload = objectFrom(payloadFrom(result));
  const hasScore = Object.prototype.hasOwnProperty.call(payload, 'total_score') && payload.total_score !== null;
  const total = Math.round(numberFrom(payload.total_score));
  const max = intFrom(payload.max_score) || 1000;
  const tier = objectFrom(payload.tier);
  const currentTierName = textFrom(tier.name) || (typeof payload.tier === 'string' ? textFrom(payload.tier) : '');
  let currentIndex = 0;

  TIERS.forEach((tierRow, index) => {
    if (total >= tierRow.min) {
      currentIndex = index;
    }
  });

  const nextTier = TIERS[currentIndex + 1] || null;
  const pointsToNext = nextTier ? Math.max(0, nextTier.min - total) : 0;

  return {
    hasScore,
    scoreLabel: `Your score: ${formatInteger(total)} of ${formatInteger(max)}`,
    currentTierLabel: currentTierName ? `Current tier: ${currentTierName}` : '',
    nextTierLabel: nextTier ? `${formatInteger(pointsToNext)} points to ${nextTier.name}` : 'You have reached the top tier.',
    rows: TIERS.map((tierRow, index) => {
      const isCurrent = index === currentIndex;
      const isReached = total >= tierRow.min;
      const statusLabel = isCurrent ? 'Current' : (isReached ? 'Reached' : 'Locked');
      const statusClass = isCurrent ? 'govuk-tag--blue' : (isReached ? 'govuk-tag--green' : 'govuk-tag--grey');

      return {
        name: tierRow.name,
        thresholdLabel: formatInteger(tierRow.min),
        isCurrent,
        statusLabel,
        statusClass
      };
    })
  };
}

function redirectAuthIfNeeded(error, res) {
  if (error instanceof ApiError && error.status === 401) {
    res.redirect(loginRedirect());
    return true;
  }
  return false;
}

router.get('/tiers', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  let scorePayload;
  try {
    scorePayload = await callGamificationApi(token, 'GET', '/nexus-score');
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    scorePayload = { data: {} };
  }

  return res.render('nexus-score/tiers', {
    title: 'NEXUS tier ladder',
    activeNav: 'nexus_score',
    communityName: res.locals.tenantName || res.locals.serviceName || 'this community',
    tierScore: normalizeTierScore(scorePayload)
  });
}));

module.exports = router;
