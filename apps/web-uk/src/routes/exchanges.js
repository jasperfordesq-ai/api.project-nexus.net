// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getProfile,
  getListing,
  getPublicListing,
  getExchangeConfig,
  checkExchangeForListing,
  getExchanges,
  getExchange,
  getExchangeRatings,
  createExchangeRequest,
  performExchangeAction,
  rateExchange,
  ApiError,
  ApiOfflineError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();
const LOCAL_DEFAULT_TENANT_SLUG = 'hour-timebank';

router.use(requireAuth);

function firstPresent(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '') ?? null;
}

function unwrapObject(payload) {
  if (!payload || typeof payload !== 'object') return {};
  return payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? payload.data
    : payload;
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
}

function unwrapMeta(payload) {
  if (!payload || typeof payload !== 'object') return {};
  return payload.meta || payload.pagination || payload.data?.meta || {};
}

function unwrapRatings(payload) {
  const data = unwrapObject(payload);
  if (Array.isArray(data)) return { ratings: data, hasRated: false };
  return {
    ratings: Array.isArray(data.ratings) ? data.ratings : [],
    hasRated: !!firstPresent(data.has_rated, data.hasRated, false)
  };
}

function tenantSlugForRequest(req) {
  return String(
    req.signedCookies?.tenant_slug ||
    req.cookies?.tenant_slug ||
    process.env.ACCESSIBLE_TENANT_SLUG ||
    process.env.DEFAULT_TENANT_SLUG ||
    process.env.TENANT_SLUG ||
    (process.env.NODE_ENV === 'production' ? '' : LOCAL_DEFAULT_TENANT_SLUG) ||
    ''
  ).trim();
}

async function getListingWithTenantFallback(req, listingId) {
  try {
    return await getListing(req.token, listingId);
  } catch (error) {
    if (!(error instanceof ApiError) && !(error instanceof ApiOfflineError)) {
      throw error;
    }

    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }

    const tenantSlug = tenantSlugForRequest(req);
    if (!tenantSlug) {
      throw error;
    }

    return getPublicListing(listingId, tenantSlug);
  }
}

function toNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampHours(value, fallback) {
  const number = toNumber(value, fallback);
  if (number === null) return fallback;
  return Math.max(0.25, Math.min(24, number));
}

function normalizeListingForRequest(listing = {}) {
  const user = listing.user && typeof listing.user === 'object' ? listing.user : {};
  const type = firstPresent(listing.type, listing.listing_type, 'offer') === 'request' ? 'request' : 'offer';
  const hours = firstPresent(listing.hours_estimate, listing.estimated_hours, listing.hoursEstimate);

  return {
    ...listing,
    id: listing.id,
    title: firstPresent(listing.title, listing.name, 'Untitled listing'),
    type,
    typeLabel: type === 'request' ? 'Request' : 'Offer',
    categoryName: firstPresent(listing.category_name, listing.category?.name),
    location: firstPresent(listing.location, listing.address),
    hoursEstimate: hours,
    authorName: firstPresent(listing.author_name, user.name, user.full_name),
    suggestedHours: clampHours(hours, 1)
  };
}

function labelFromKey(value, fallback = '') {
  const key = String(value || fallback || '').replace(/_/g, ' ').trim();
  const lower = key.toLowerCase();
  return lower ? lower.charAt(0).toUpperCase() + lower.slice(1) : '';
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
    case 'expired':
    case 'declined':
      return 'govuk-tag--grey';
    default:
      return 'govuk-tag--grey';
  }
}

function normalizeExchange(exchange = {}, currentUserId = null) {
  const listing = exchange.listing && typeof exchange.listing === 'object' ? exchange.listing : {};
  const requester = exchange.requester && typeof exchange.requester === 'object' ? exchange.requester : {};
  const provider = exchange.provider && typeof exchange.provider === 'object' ? exchange.provider : {};
  const requesterId = toNumber(firstPresent(exchange.requester_id, requester.id), 0);
  const providerId = toNumber(firstPresent(exchange.provider_id, provider.id), 0);
  const status = firstPresent(exchange.status, 'pending_provider');
  const isRequester = currentUserId !== null && requesterId === Number(currentUserId);
  const isProvider = currentUserId !== null && providerId === Number(currentUserId);
  const hasRequesterConfirmed = !!exchange.requester_confirmed_at;
  const hasProviderConfirmed = !!exchange.provider_confirmed_at;
  const viewerConfirmed = (isRequester && hasRequesterConfirmed) || (isProvider && hasProviderConfirmed);
  const actionNeeded = status === 'pending_provider' && isProvider
    ? 'respond'
    : (['in_progress', 'pending_confirmation'].includes(status) && !viewerConfirmed ? 'confirm' : null);

  return {
    ...exchange,
    id: exchange.id,
    listingId: firstPresent(exchange.listing_id, listing.id),
    listingTitle: firstPresent(exchange.listing_title, listing.title, 'Exchange details'),
    requesterId,
    providerId,
    requesterName: firstPresent(exchange.requester_name, requester.name, 'Unknown member'),
    providerName: firstPresent(exchange.provider_name, provider.name, 'Unknown member'),
    proposedHours: toNumber(exchange.proposed_hours, 0),
    prepTime: toNumber(exchange.prep_time, null),
    finalHours: toNumber(exchange.final_hours, null),
    riskLevel: firstPresent(exchange.risk_level, 'unknown'),
    riskLabel: labelFromKey(firstPresent(exchange.risk_level, 'unknown'), 'Unknown'),
    message: firstPresent(exchange.message, exchange.requester_notes),
    status,
    statusLabel: labelFromKey(status, 'Pending provider'),
    statusClass: statusTagClass(status),
    isRequester,
    isProvider,
    roleText: isRequester ? 'You are the requester for this exchange.' : 'You are the provider for this exchange.',
    otherUserId: isRequester ? providerId : requesterId,
    otherName: isRequester ? firstPresent(exchange.provider_name, provider.name, 'Unknown member') : firstPresent(exchange.requester_name, requester.name, 'Unknown member'),
    hasRequesterConfirmed,
    hasProviderConfirmed,
    canAccept: isProvider && status === 'pending_provider',
    canDecline: isProvider && status === 'pending_provider',
    canStart: (isProvider || isRequester) && status === 'accepted',
    canComplete: (isProvider || isRequester) && status === 'in_progress',
    canConfirm: (isRequester || isProvider) && ['in_progress', 'pending_confirmation'].includes(status) && !viewerConfirmed,
    canCancel: (isRequester || isProvider) && ['pending_provider', 'pending_broker', 'accepted'].includes(status),
    actionNeeded,
    createdAt: exchange.created_at,
    history: Array.isArray(exchange.status_history)
      ? exchange.status_history.map(entry => ({
        ...entry,
        statusLabel: labelFromKey(firstPresent(entry.new_status, entry.old_status, status), status),
        actorName: firstPresent(entry.actor_name, entry.actor?.name)
      }))
      : []
  };
}

function statusForTab(tab) {
  switch (tab) {
    case 'active':
      return 'active';
    case 'needs_confirmation':
      return 'needs_confirmation';
    case 'completed':
      return 'completed';
    case 'all':
    default:
      return '';
  }
}

function flashValue(req, key) {
  return req.flash ? req.flash(key)[0] : null;
}

function statusMessage(status) {
  switch (status) {
    case 'exchange-created':
      return 'Exchange request sent.';
    case 'exchange-updated':
      return 'Exchange updated.';
    case 'rating-submitted':
      return 'Review submitted.';
    case 'exchange-action-failed':
      return 'Exchange action failed. Try again.';
    case 'rating-failed':
      return 'Review could not be submitted. Try again.';
    case 'rating-invalid':
      return 'Select a rating from 1 to 5.';
    default:
      return '';
  }
}

router.get('/', asyncRoute(async (req, res) => {
  const tab = ['all', 'active', 'needs_confirmation', 'completed'].includes(req.query.tab) ? req.query.tab : 'all';
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  const status = statusForTab(tab);

  let workflowEnabled = true;
  let exchanges = [];
  let meta = {};
  let errorMessage = null;
  let currentUserId = null;

  const currentUser = await Promise.resolve(getProfile(req.token)).catch(() => null);
  currentUserId = toNumber(firstPresent(currentUser?.id, currentUser?.data?.id), null);

  try {
    const [configPayload, exchangesPayload] = await Promise.all([
      getExchangeConfig(req.token).catch(() => ({ data: { exchange_workflow_enabled: true } })),
      getExchanges(req.token, { status, per_page: 20, cursor })
    ]);
    workflowEnabled = unwrapObject(configPayload).exchange_workflow_enabled !== false;
    exchanges = unwrapList(exchangesPayload).map(exchange => normalizeExchange(exchange, currentUserId));
    meta = unwrapMeta(exchangesPayload);
  } catch (error) {
    if (error instanceof ApiError || error instanceof ApiOfflineError) {
      errorMessage = 'Exchange items could not be loaded. Try again.';
    } else {
      throw error;
    }
  }

  res.render('exchanges/index', {
    title: 'Exchanges',
    workflowEnabled,
    activeTab: tab,
    exchanges,
    items: exchanges,
    meta,
    errorMessage,
    successMessage: flashValue(req, 'success'),
    statusMessage: statusMessage(req.query.status),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.get('/request/:listingId', asyncRoute(async (req, res) => {
  const listingPayload = await getListingWithTenantFallback(req, req.params.listingId);
  const listing = normalizeListingForRequest(unwrapObject(listingPayload));
  const activeExchange = unwrapObject(await checkExchangeForListing(req.token, req.params.listingId).catch(() => ({ data: null })));

  res.render('exchanges/request', {
    title: 'Request exchange',
    listing,
    activeExchange: activeExchange?.id ? activeExchange : null,
    errors: [],
    fieldErrors: {},
    values: {
      proposed_hours: listing.suggestedHours,
      prep_time: '',
      message: ''
    },
    status: req.query.status || '',
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.post('/request/:listingId', asyncRoute(async (req, res) => {
  const proposedHours = clampHours(req.body.proposed_hours, null);
  const prepTime = req.body.prep_time === '' || req.body.prep_time === undefined ? null : clampHours(req.body.prep_time, 0);
  const message = String(req.body.message || '').trim();
  const errors = [];
  const fieldErrors = {};

  if (proposedHours === null) {
    errors.push({ text: 'Enter proposed hours', href: '#proposed_hours' });
    fieldErrors.proposed_hours = 'Enter proposed hours';
  }

  if (errors.length > 0) {
    const listingPayload = await getListingWithTenantFallback(req, req.params.listingId);
    return res.status(400).render('exchanges/request', {
      title: 'Request exchange',
      listing: normalizeListingForRequest(unwrapObject(listingPayload)),
      activeExchange: null,
      errors,
      fieldErrors,
      values: {
        proposed_hours: req.body.proposed_hours,
        prep_time: req.body.prep_time,
        message
      },
      status: '',
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    const payload = await createExchangeRequest(req.token, req.params.listingId, {
      proposed_hours: proposedHours,
      prep_time: prepTime,
      message
    });
    const exchange = unwrapObject(payload);
    return res.redirect(`/exchanges/${exchange.id}?status=exchange-created`);
  } catch (error) {
    if (!(error instanceof ApiError) && !(error instanceof ApiOfflineError)) {
      throw error;
    }

    const listingPayload = await getListingWithTenantFallback(req, req.params.listingId);
    return res.status(error.status === 403 ? 403 : 400).render('exchanges/request', {
      title: 'Request exchange',
      listing: normalizeListingForRequest(unwrapObject(listingPayload)),
      activeExchange: null,
      errors: [{ text: error.message || 'Exchange request failed', href: '#proposed_hours' }],
      fieldErrors: {},
      values: {
        proposed_hours: req.body.proposed_hours,
        prep_time: req.body.prep_time,
        message
      },
      status: 'exchange-failed',
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const [exchangePayload, profilePayload, ratingsPayload] = await Promise.all([
    getExchange(req.token, id),
    Promise.resolve(getProfile(req.token)).catch(() => null),
    getExchangeRatings(req.token, id).catch(() => ({ data: { ratings: [], has_rated: false } }))
  ]);
  const currentUserId = toNumber(firstPresent(profilePayload?.id, profilePayload?.data?.id), null);
  const exchange = normalizeExchange(unwrapObject(exchangePayload), currentUserId);
  const ratings = unwrapRatings(ratingsPayload);

  res.render('exchanges/detail', {
    title: exchange.listingTitle,
    exchange,
    ratings: ratings.ratings,
    canReview: exchange.status === 'completed' && !ratings.hasRated,
    status: req.query.status || '',
    successMessage: flashValue(req, 'success'),
    statusMessage: statusMessage(req.query.status),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.post('/:id', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const action = String(req.body.action || '').trim();
  const actionPayload = (() => {
    switch (action) {
      case 'decline':
      case 'cancel':
        return { reason: String(req.body.reason || '').trim() };
      case 'confirm':
        return { hours: clampHours(req.body.hours, 0) };
      default:
        return {};
    }
  })();

  try {
    if (!['accept', 'decline', 'start', 'complete', 'confirm', 'cancel'].includes(action)) {
      return res.redirect(`/exchanges/${id}?status=exchange-action-failed`);
    }

    await performExchangeAction(req.token, id, action, actionPayload);
    return res.redirect(`/exchanges/${id}?status=exchange-updated`);
  } catch (error) {
    if (error instanceof ApiError || error instanceof ApiOfflineError) {
      return res.redirect(`/exchanges/${id}?status=exchange-action-failed`);
    }
    throw error;
  }
}));

router.post('/:id/rate', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const rating = parseInt(req.body.rating, 10);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.redirect(`/exchanges/${id}?status=rating-invalid#rating`);
  }

  try {
    await rateExchange(req.token, id, {
      rating,
      comment: String(req.body.comment || '').trim()
    });
    return res.redirect(`/exchanges/${id}?status=rating-submitted`);
  } catch (error) {
    if (error instanceof ApiError || error instanceof ApiOfflineError) {
      return res.redirect(`/exchanges/${id}?status=rating-failed#rating`);
    }
    throw error;
  }
}));

module.exports = router;
