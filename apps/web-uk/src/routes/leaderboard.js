// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { callGamificationApi, ApiError } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

const LEADERBOARD_TYPES = [
  ['credits_earned', 'Time credits earned'],
  ['credits_spent', 'Time credits spent'],
  ['vol_hours', 'Volunteer hours'],
  ['badges', 'Badges earned'],
  ['xp', 'Experience points'],
  ['connections', 'Connections made'],
  ['reviews', 'Reviews given'],
  ['posts', 'Posts created'],
  ['streak', 'Login streak']
];

const LEADERBOARD_PERIODS = [
  ['all_time', 'All time'],
  ['month', 'This month'],
  ['week', 'This week']
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

function boolFrom(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  return false;
}

function textFrom(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function formatInteger(value) {
  return intFrom(value).toLocaleString('en-GB');
}

function formatDecimal(value) {
  return numberFrom(value).toLocaleString('en-GB', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function selectedOption(options, requested, fallback) {
  return options.some(([value]) => value === requested) ? requested : fallback;
}

function normalizeRows(result) {
  const payload = payloadFrom(result);
  const rows = Array.isArray(payload) ? payload : [];

  return rows.map((row) => {
    const object = objectFrom(row);
    const user = objectFrom(object.user);
    const userId = intFrom(user.id ?? object.user_id);
    const scoreDisplay = textFrom(object.score_display ?? object.formatted_score);

    return {
      rank: intFrom(object.rank ?? object.position),
      userId,
      name: textFrom(user.name ?? object.name ?? `${textFrom(object.first_name)} ${textFrom(object.last_name)}`.trim(), 'Unknown member'),
      href: userId > 0 ? `/members/${userId}` : '',
      isCurrentUser: boolFrom(object.is_current_user),
      scoreLabel: scoreDisplay || formatInteger(object.score)
    };
  }).filter((row) => row.rank > 0);
}

function normalizeImpact(result) {
  const impact = objectFrom(payloadFrom(result));
  return {
    hasValues: Object.keys(impact).length > 0,
    totalMembers: formatInteger(impact.total_members),
    totalExchanges: formatInteger(impact.total_exchanges),
    totalVolunteerHours: formatDecimal(impact.total_volunteer_hours),
    totalListings: formatInteger(impact.total_listings),
    totalConnections: formatInteger(impact.total_connections),
    totalBadgesAwarded: formatInteger(impact.total_badges_awarded)
  };
}

function redirectAuthIfNeeded(error, res) {
  if (error instanceof ApiError && error.status === 401) {
    res.redirect(loginRedirect());
    return true;
  }
  return false;
}

router.get('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  const selectedType = selectedOption(LEADERBOARD_TYPES, textFrom(req.query.type), 'credits_earned');
  const selectedPeriod = selectedOption(LEADERBOARD_PERIODS, textFrom(req.query.period), 'all_time');

  let leaderboardPayload;
  let impactPayload;
  try {
    [leaderboardPayload, impactPayload] = await Promise.all([
      callGamificationApi(token, 'GET', `/leaderboard?type=${encodeURIComponent(selectedType)}&period=${encodeURIComponent(selectedPeriod)}&limit=20`),
      callGamificationApi(token, 'GET', '/community-dashboard')
    ]);
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    leaderboardPayload = { data: [] };
    impactPayload = { data: {} };
  }

  return res.render('leaderboard/index', {
    title: 'Leaderboard',
    activeNav: 'leaderboard',
    communityName: res.locals.tenantName || res.locals.serviceName || 'this community',
    leaderboard: {
      rows: normalizeRows(leaderboardPayload),
      type: selectedType,
      period: selectedPeriod,
      types: LEADERBOARD_TYPES.map(([value, label]) => ({ value, label })),
      periods: LEADERBOARD_PERIODS.map(([value, label]) => ({ value, label })),
      impact: normalizeImpact(impactPayload)
    }
  });
}));

module.exports = router;
