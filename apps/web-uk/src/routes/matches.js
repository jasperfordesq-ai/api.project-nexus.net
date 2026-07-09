// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { callMatchesApi, dismissMatch, ApiError } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();
const MATCH_REASONS = new Set(['not_relevant', 'too_far', 'already_done', 'not_interested', 'other']);
const BOARD_SOURCES = new Set(['all', 'listing', 'group', 'volunteering', 'event']);
const SOURCE_MODULES = {
  all: ['listings', 'groups', 'volunteering', 'events'],
  listing: ['listings'],
  group: ['groups'],
  volunteering: ['volunteering'],
  event: ['events']
};
const SOURCE_LABELS = {
  all: 'All matches',
  listing: 'Listings',
  group: 'Groups',
  volunteering: 'Volunteering',
  event: 'Events'
};
const MODULE_LABELS = {
  listing: 'Listing',
  group: 'Group',
  volunteering: 'Volunteering',
  event: 'Event'
};

function redirectTo(res, pathname) {
  const urlFor = typeof res.locals.urlFor === 'function' ? res.locals.urlFor : (value) => value;
  return res.redirect(urlFor(pathname));
}

function reasonFrom(body) {
  const reason = String(body.reason || '').trim();
  return MATCH_REASONS.has(reason) ? reason : 'not_relevant';
}

function sourceFrom(body) {
  const source = String(body.source || '').trim();
  return BOARD_SOURCES.has(source) ? source : 'all';
}

function sourceFromQuery(query) {
  const source = String(query.source || '').trim();
  return BOARD_SOURCES.has(source) ? source : 'all';
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function dataFrom(result) {
  return result && Object.prototype.hasOwnProperty.call(result, 'data') ? result.data : result;
}

function matchesFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.matches)) return data.matches;
  if (data && data.data && Array.isArray(data.data.matches)) return data.data.matches;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function percentFrom(value) {
  const score = Number(value || 0);
  if (!Number.isFinite(score) || score <= 0) return 0;
  return score > 1 ? Math.min(100, Math.round(score)) : Math.round(score * 100);
}

function moduleKey(value) {
  const module = String(value || 'listing').trim();
  if (module === 'listings') return 'listing';
  if (module === 'groups') return 'group';
  if (module === 'events') return 'event';
  return BOARD_SOURCES.has(module) && module !== 'all' ? module : 'listing';
}

function trimmed(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function normalizeReasons(value) {
  return Array.isArray(value)
    ? value.map((reason) => trimmed(reason)).filter(Boolean)
    : [];
}

function normalizeMatch(match = {}) {
  const module = moduleKey(match.module || match.source_type || match.sourceType);
  const listingId = Number(match.listing_id || match.listingId || (module === 'listing' ? match.id : 0)) || 0;
  const groupId = Number(match.group_id || match.groupId || (module === 'group' ? match.id : 0)) || 0;
  const eventId = Number(match.event_id || match.eventId || (module === 'event' ? match.id : 0)) || 0;
  const organizationId = Number(match.organization_id || match.organizationId || 0) || 0;
  const pct = percentFrom(match.pct ?? match.match_score ?? match.matchScore ?? match.score);

  return {
    id: match.id || listingId || groupId || eventId || organizationId,
    module,
    moduleLabel: MODULE_LABELS[module] || 'Listing',
    listingId,
    groupId,
    eventId,
    organizationId,
    title: trimmed(match.title, 'View match'),
    description: trimmed(match.description),
    type: match.type === 'request' ? 'request' : 'offer',
    typeLabel: match.type === 'request' ? 'Looking for' : 'Offering',
    category: trimmed(match.category_name || match.categoryName || match.category),
    userName: trimmed(match.user_name || match.userName || match.name, 'Unknown member'),
    pct,
    reasons: normalizeReasons(match.match_reasons || match.matchReasons || match.reasons),
    createdAt: match.created_at || match.createdAt || ''
  };
}

function statsFor(matches) {
  const total = matches.length;
  const avgScore = total > 0
    ? Math.round(matches.reduce((sum, item) => sum + item.pct, 0) / total)
    : 0;
  const sourceCounts = { listing: 0, group: 0, volunteering: 0, event: 0 };
  matches.forEach((match) => {
    if (Object.prototype.hasOwnProperty.call(sourceCounts, match.module)) {
      sourceCounts[match.module] += 1;
    }
  });

  return {
    total,
    avgScore,
    hotMatches: matches.filter((item) => item.pct >= 80).length,
    sourceTypes: Object.values(sourceCounts).filter((count) => count > 0).length,
    sourceCounts
  };
}

function matchesApiPath(limit, source = 'all') {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('modules', (SOURCE_MODULES[source] || SOURCE_MODULES.all).join(','));
  return `/all?${params.toString()}`;
}

function matchesStatusMessage(status) {
  if (status === 'match-dismissed') return { type: 'success', text: 'This match has been hidden.' };
  if (status === 'match-dismiss-failed') return { type: 'error', text: 'We could not hide this match. Please try again.' };
  return null;
}

function boardStatusMessage(status) {
  if (status === 'match-dismissed') return { type: 'success', text: 'Match hidden. We will show you fewer like it.' };
  if (status === 'match-dismiss-failed') return { type: 'error', text: 'Sorry, that match could not be hidden. Please try again.' };
  return null;
}

router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const activeSource = sourceFromQuery(req.query);
  const result = await callMatchesApi(req.token, 'GET', matchesApiPath(30, activeSource));
  const matches = matchesFrom(result).map(normalizeMatch);
  const stats = statsFor(matches);

  res.render('matches/index', {
    title: 'Your matches',
    activeSource,
    sourceLabels: SOURCE_LABELS,
    matches,
    stats,
    statusMessage: matchesStatusMessage(req.query.status),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.get('/board', requireAuth, asyncRoute(async (req, res) => {
  const activeSource = sourceFromQuery(req.query);
  const result = await callMatchesApi(req.token, 'GET', matchesApiPath(50, 'all'));
  const matches = matchesFrom(result).map(normalizeMatch);
  const stats = statsFor(matches);
  const visibleMatches = activeSource === 'all'
    ? matches
    : matches.filter((match) => match.module === activeSource);

  res.render('matches/board', {
    title: 'Your matches',
    activeSource,
    sourceLabels: SOURCE_LABELS,
    matches: visibleMatches,
    stats,
    statusMessage: boardStatusMessage(req.query.status),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.post('/:id(\\d+)/dismiss', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);

  try {
    await dismissMatch(req.token, id, reasonFrom(req.body));
  } catch (error) {
    if (isAuthError(error)) throw error;
  }

  return redirectTo(res, '/matches?status=match-dismissed');
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

  return redirectTo(res, `/matches/board?source=${sourceFrom(req.body)}&status=${status}#matches-top`);
}));

module.exports = router;
