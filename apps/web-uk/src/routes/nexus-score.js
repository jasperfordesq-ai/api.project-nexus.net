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

const BREAKDOWN_CATEGORIES = [
  { key: 'engagement', label: 'Engagement' },
  { key: 'quality', label: 'Quality' },
  { key: 'volunteer', label: 'Volunteering' },
  { key: 'activity', label: 'Activity' },
  { key: 'badges', label: 'Badges' },
  { key: 'impact', label: 'Impact' }
];

function tokenFrom(req) {
  return (req.signedCookies && req.signedCookies.token) || req.token || '';
}

function loginRedirect() {
  return '/login?status=auth-required';
}

function urlFor(res, pathname) {
  return typeof res.locals?.urlFor === 'function' ? res.locals.urlFor(pathname) : pathname;
}

function redirectTo(res, pathname) {
  return res.redirect(urlFor(res, pathname));
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

function clampPercentage(value) {
  return Math.max(0, Math.min(100, Math.round(numberFrom(value))));
}

function labelFromInsight(value) {
  if (typeof value === 'string') {
    return value.trim();
  }

  const insight = objectFrom(value);
  return textFrom(insight.message ?? insight.text ?? insight.tip);
}

function normalizeBreakdownRows(breakdown) {
  const object = objectFrom(breakdown);
  return BREAKDOWN_CATEGORIES.map((category) => {
    const row = objectFrom(object[category.key]);
    if (!Object.keys(row).length) {
      return null;
    }

    const score = Math.round(numberFrom(row.score));
    const max = Math.round(numberFrom(row.max));
    const percentage = clampPercentage(row.percentage);

    return {
      label: category.label,
      scoreLabel: `${formatInteger(score)} / ${formatInteger(max)}`,
      percentage,
      progressLabel: `${category.label}: ${percentage}%`
    };
  }).filter(Boolean);
}

function normalizeScoreOverview(result) {
  const payload = objectFrom(payloadFrom(result));
  const hasScore = Object.prototype.hasOwnProperty.call(payload, 'total_score') && payload.total_score !== null;
  const total = Math.round(numberFrom(payload.total_score));
  const max = intFrom(payload.max_score) || 1000;
  const tier = objectFrom(payload.tier);
  const tierName = textFrom(tier.name) || (typeof payload.tier === 'string' ? textFrom(payload.tier) : '');
  const tierIcon = textFrom(tier.icon);
  const scoreLabel = `${tierIcon ? `${tierIcon} ` : ''}${formatInteger(total)} out of ${formatInteger(max)}`;
  const hasPercentile = payload.percentile !== null && payload.percentile !== undefined && payload.percentile !== '';
  const insights = (Array.isArray(payload.insights) ? payload.insights : []).map(labelFromInsight).filter(Boolean);

  return {
    hasScore,
    scoreLabel,
    tierName,
    percentileLabel: hasPercentile ? `Top ${intFrom(payload.percentile)}% in this community` : '',
    breakdownRows: normalizeBreakdownRows(payload.breakdown),
    insights
  };
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
    redirectTo(res, loginRedirect());
    return true;
  }
  return false;
}

router.get('/tiers', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return redirectTo(res, loginRedirect());
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

router.get('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return redirectTo(res, loginRedirect());
  }

  let scorePayload;
  try {
    scorePayload = await callGamificationApi(token, 'GET', '/nexus-score');
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    scorePayload = { data: {} };
  }

  return res.render('nexus-score/index', {
    title: 'NEXUS score',
    activeNav: 'nexus_score',
    communityName: res.locals.tenantName || res.locals.serviceName || 'this community',
    nexusScore: normalizeScoreOverview(scorePayload)
  });
}));

module.exports = router;
