// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getProfile,
  getExchangeConfig,
  getExchanges,
  getExchange,
  getExchangeRatings,
  performExchangeAction,
  rateExchange,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();
const EXCHANGE_ACTIONS = new Set(['accept', 'decline', 'start', 'complete', 'confirm', 'cancel']);
const TAB_STATUS = {
  active: 'active',
  needs_confirmation: 'needs_confirmation',
  completed: 'completed'
};
const STATUS_LABELS = {
  active: 'Active',
  pending_provider: 'Pending provider',
  pending_broker: 'Pending broker',
  accepted: 'Accepted',
  in_progress: 'In progress',
  pending_confirmation: 'Pending confirmation',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
  declined: 'Declined',
  expired: 'Expired'
};
const RISK_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  unknown: 'Unknown'
};

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

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined ? result.data : result;
}

function collectionFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

function metaFrom(result) {
  const data = dataFrom(result);
  const meta = (result && result.meta) || (data && data.meta) || {};
  return {
    hasMore: Boolean(meta.has_more || meta.hasMore || (data && data.has_more)),
    cursor: meta.cursor || meta.next_cursor || meta.nextCursor || (data && data.cursor) || ''
  };
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function statusLabel(status) {
  const key = String(status || '').trim();
  return STATUS_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Unknown';
}

function statusTagClass(status) {
  switch (status) {
    case 'completed':
      return 'govuk-tag--green';
    case 'in_progress':
      return 'govuk-tag--blue';
    case 'accepted':
      return 'govuk-tag--turquoise';
    case 'pending_provider':
    case 'pending_broker':
    case 'pending_confirmation':
      return 'govuk-tag--yellow';
    case 'disputed':
      return 'govuk-tag--red';
    case 'cancelled':
    case 'declined':
    case 'expired':
      return 'govuk-tag--grey';
    default:
      return 'govuk-tag--grey';
  }
}

function hoursText(value) {
  const hours = numberOrNull(value);
  if (hours === null) return '';
  return `${Number.isInteger(hours) ? hours : hours.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} hours`;
}

function normalizeExchange(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const listing = raw.listing && typeof raw.listing === 'object' ? raw.listing : {};
  const requester = raw.requester && typeof raw.requester === 'object' ? raw.requester : {};
  const provider = raw.provider && typeof raw.provider === 'object' ? raw.provider : {};
  const status = String(raw.status || 'pending_provider');

  return {
    id: positiveInteger(raw.id),
    listingId: positiveInteger(raw.listing_id || listing.id),
    listingTitle: String(raw.listing_title || listing.title || 'Exchange detail'),
    requesterId: positiveInteger(raw.requester_id || requester.id),
    providerId: positiveInteger(raw.provider_id || provider.id),
    requesterName: String(raw.requester_name || requester.name || 'Unknown member'),
    providerName: String(raw.provider_name || provider.name || 'Unknown member'),
    proposedHours: numberOrNull(raw.proposed_hours),
    prepTime: numberOrNull(raw.prep_time),
    finalHours: numberOrNull(raw.final_hours),
    proposedHoursText: hoursText(raw.proposed_hours),
    prepTimeText: hoursText(raw.prep_time),
    finalHoursText: hoursText(raw.final_hours),
    status,
    statusLabel: statusLabel(status),
    statusTagClass: statusTagClass(status),
    riskLabel: RISK_LABELS[String(raw.risk_level || 'unknown')] || statusLabel(raw.risk_level),
    message: String(raw.requester_notes || raw.message || ''),
    requesterConfirmedAt: raw.requester_confirmed_at || '',
    providerConfirmedAt: raw.provider_confirmed_at || '',
    createdAt: raw.created_at || '',
    history: Array.isArray(raw.status_history) ? raw.status_history : (Array.isArray(raw.history) ? raw.history : [])
  };
}

function normalizeRating(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const name = String(`${raw.rater_first_name || ''} ${raw.rater_last_name || ''}`).trim()
    || raw.rater_name
    || raw.rater_username
    || 'Unknown member';
  return {
    id: raw.id || `${name}-${raw.rating || ''}`,
    name,
    rating: Number(raw.rating) || 0,
    comment: String(raw.comment || '')
  };
}

function userIdFromProfile(profile) {
  const data = dataFrom(profile);
  return positiveInteger(data && (data.id || data.user_id || (data.user && data.user.id)));
}

function selectedTab(value) {
  const tab = String(value || 'all');
  return Object.prototype.hasOwnProperty.call(TAB_STATUS, tab) ? tab : 'all';
}

function exchangeListQuery(query) {
  const tab = selectedTab(query.tab);
  const params = { per_page: 20 };
  if (TAB_STATUS[tab]) {
    params.status = TAB_STATUS[tab];
  } else if (query.status_filter) {
    params.status = String(query.status_filter);
  }
  if (query.cursor) {
    params.cursor = String(query.cursor);
  }
  return { tab, params };
}

router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const { tab, params } = exchangeListQuery(req.query);
  const [configResult, exchangesResult] = await Promise.all([
    getExchangeConfig(req.token),
    getExchanges(req.token, params)
  ]);
  const config = dataFrom(configResult) || {};
  const meta = metaFrom(exchangesResult);

  return res.render('exchanges/index', {
    title: 'Exchanges',
    activeNav: 'explore',
    activeTab: tab,
    workflowEnabled: config.workflow_enabled !== false && config.enabled !== false,
    exchanges: collectionFrom(exchangesResult).map(normalizeExchange).filter((exchange) => exchange.id !== null),
    meta,
    filters: params
  });
}));

router.get('/:id(\\d+)', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const [profileResult, exchangeResult] = await Promise.all([
    getProfile(req.token),
    getExchange(req.token, id)
  ]);
  const exchange = normalizeExchange(dataFrom(exchangeResult));
  const currentUserId = userIdFromProfile(profileResult);
  let ratings = [];
  let canReview = false;

  if (exchange.status === 'completed') {
    const ratingsResult = dataFrom(await getExchangeRatings(req.token, id)) || {};
    ratings = collectionFrom(ratingsResult.ratings ? { data: ratingsResult.ratings } : ratingsResult).map(normalizeRating);
    canReview = ratingsResult.has_rated === false || ratingsResult.hasRated === false;
  }

  return res.render('exchanges/detail', {
    title: exchange.listingTitle,
    activeNav: 'explore',
    exchange,
    currentUserId,
    status: String(req.query.status || ''),
    ratings,
    canReview
  });
}));

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
