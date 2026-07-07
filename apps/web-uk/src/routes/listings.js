// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  callListingApi,
  createExchangeRequest,
  createComment,
  toggleFeedLike,
  getListingReviews,
  getProfile,
  callWalletApi,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');

const router = express.Router();

function tokenFrom(req) {
  return (req.signedCookies && req.signedCookies.token) || req.token || '';
}

function trimmed(value, limit = null) {
  const text = String(value || '').trim();
  return limit === null ? text : text.slice(0, limit);
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function boundedNumber(value, min, max, fallback = null) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, number));
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined
    ? result.data
    : result;
}

function loginRedirect() {
  return '/login?status=auth-required';
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function apiErrorCode(error) {
  const data = error && error.data && typeof error.data === 'object' ? error.data : {};
  return String(data.code || data.error || '').toUpperCase();
}

function redirectOnAuthError(error, res) {
  if (isAuthError(error)) {
    res.redirect(loginRedirect());
    return true;
  }
  return false;
}

function listingRedirect(id, status, fragment = '') {
  return `/listings/${id}?status=${encodeURIComponent(status)}${fragment}`;
}

async function callListing(token, method, path, data = undefined) {
  if (data === undefined) {
    return callListingApi(token, method, path);
  }

  return callListingApi(token, method, path, data);
}

async function runListingAction(req, res, method, path, data, successRedirect, failureRedirect) {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  try {
    await callListing(token, method, path, data);
    return res.redirect(successRedirect);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(failureRedirect);
  }
}

function listingType(value) {
  const type = trimmed(value).toLowerCase();
  return ['offer', 'request'].includes(type) ? type : 'offer';
}

function generateDescriptionRedirect(listingId, status) {
  const target = listingId === null ? '/listings/new' : `/listings/${listingId}/edit`;
  return `${target}?status=${encodeURIComponent(status)}#description`;
}

function reportPayload(body) {
  const allowedReasons = new Set(['inappropriate', 'safety_concern', 'misleading', 'spam', 'not_timebank_service', 'other']);
  const reason = trimmed(body.reason);
  if (!allowedReasons.has(reason)) {
    return null;
  }

  return {
    reason,
    details: trimmed(body.details, 500) || null
  };
}

function listingOwnerId(listing) {
  return positiveInteger(listing && (listing.user_id || listing.author_id || listing.userId || listing.authorId))
    || positiveInteger(listing && listing.user && listing.user.id);
}

function listingReportStatus(status) {
  const messages = {
    'report-invalid': 'Select a reason for reporting',
    'report-failed': 'We could not submit your report. Please try again.',
    'already-reported': 'You have already reported this listing.'
  };
  const message = messages[trimmed(status)];
  return message ? { type: 'error', message } : null;
}

function listingReportReasons() {
  return [
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'safety_concern', label: 'Safety concern' },
    { value: 'misleading', label: 'Misleading information' },
    { value: 'spam', label: 'Spam or misleading' },
    { value: 'not_timebank_service', label: 'Not a timebank service' },
    { value: 'other', label: 'Other' }
  ];
}

function suggestedExchangeHours(listing) {
  const raw = Number(listing && (listing.hours_estimate ?? listing.estimated_hours));
  const hours = Number.isFinite(raw) && raw > 0 ? raw : 1;
  return Math.max(0.25, Math.min(24, hours));
}

function oneDecimal(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : '';
}

function exchangeRequestStatus(status) {
  const messages = {
    'compliance-failed': 'This exchange needs requirements to be resolved before it can be requested.',
    'exchange-failed': 'The exchange request could not be created.'
  };
  const message = messages[trimmed(status)];
  return message ? { type: 'error', message } : null;
}

function listingAuthorName(listing) {
  return trimmed(listing && (listing.author_name || listing.authorName))
    || trimmed(listing && listing.user && listing.user.name)
    || '';
}

function listingAnalyticsDays(value) {
  const allowed = new Set([7, 14, 30, 60, 90]);
  const days = Number(value);
  return allowed.has(days) ? days : 30;
}

function integerLabel(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number).toLocaleString('en-GB') : '0';
}

function decimalLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return number.toLocaleString('en-GB', { maximumFractionDigits: 1 });
}

function dateParts(value) {
  const text = trimmed(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3])
  };
}

function dateLabel(value, month = 'long') {
  const parts = dateParts(value);
  if (!parts) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month,
    year: month === 'long' ? 'numeric' : undefined,
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(parts.year, parts.month, parts.day)));
}

function contactTypeLabel(value) {
  const labels = {
    message: 'Message',
    phone: 'Phone',
    email: 'Email',
    exchange_request: 'Exchange request'
  };
  const type = trimmed(value);
  if (labels[type]) return labels[type];
  return type
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function analyticsSeries(rows) {
  const series = Array.isArray(rows) ? rows : [];
  const max = series.reduce((highest, row) => Math.max(highest, Number(row && row.count) || 0), 1);
  return series.map((row) => {
    const count = Math.max(0, Number(row && row.count) || 0);
    return {
      dateLabel: dateLabel(row && row.date, 'short'),
      count,
      countLabel: integerLabel(count),
      max
    };
  });
}

function decorateListingAnalytics(result) {
  const data = dataFrom(result) || {};
  const summary = data && typeof data.summary === 'object' && data.summary !== null ? data.summary : {};
  const viewsOverTime = analyticsSeries(data.views_over_time || data.viewsOverTime);
  const contactsOverTime = analyticsSeries(data.contacts_over_time || data.contactsOverTime);
  const contactTypes = (Array.isArray(data.contact_types || data.contactTypes) ? (data.contact_types || data.contactTypes) : [])
    .map((row) => ({
      label: contactTypeLabel(row && (row.contact_type || row.contactType)),
      countLabel: integerLabel(row && row.count)
    }));
  const trend = Number(summary.views_trend_percent ?? summary.viewsTrendPercent ?? 0);

  return {
    hasData: Object.keys(summary).length > 0 || viewsOverTime.length > 0 || contactsOverTime.length > 0,
    summary: {
      totalViews: integerLabel(summary.total_views ?? summary.totalViews),
      uniqueViewers: integerLabel(summary.unique_viewers ?? summary.uniqueViewers),
      totalContacts: integerLabel(summary.total_contacts ?? summary.totalContacts),
      totalSaves: integerLabel(summary.total_saves ?? summary.totalSaves),
      contactRate: decimalLabel(summary.contact_rate ?? summary.contactRate),
      saveRate: decimalLabel(summary.save_rate ?? summary.saveRate),
      trendLabel: trend > 0
        ? `Up ${decimalLabel(Math.abs(trend))}% on the previous 7 days`
        : trend < 0
          ? `Down ${decimalLabel(Math.abs(trend))}% on the previous 7 days`
          : 'No change on the previous 7 days'
    },
    createdAtLabel: dateLabel(data.created_at || data.createdAt),
    expiresAtLabel: dateLabel(data.expires_at || data.expiresAt),
    viewsOverTime,
    contactsOverTime,
    contactTypes
  };
}

async function walletBalanceForExchange(token) {
  try {
    const result = await callWalletApi(token, 'GET', '/balance');
    const data = dataFrom(result) || {};
    const balance = Number(data.balance ?? data.available_balance ?? data.current_balance);
    return Number.isFinite(balance) ? balance : null;
  } catch {
    return null;
  }
}

router.post('/generate-description', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const listingId = positiveInteger(req.body.listing_id);
  const title = trimmed(req.body.title, 255);
  if (title === '') {
    return res.redirect(generateDescriptionRedirect(listingId, 'ai-title-required'));
  }

  const payload = {
    title,
    type: listingType(req.body.type),
    category: trimmed(req.body.category || req.body.category_name || req.body.category_id),
    notes: trimmed(req.body.notes || req.body.description, 5000)
  };

  if (payload.category === '') delete payload.category;
  if (payload.notes === '') delete payload.notes;

  let status = 'ai-generated';
  try {
    await callListing(token, 'POST', '/generate-description', payload);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = error instanceof ApiError && error.status === 403 ? 'ai-disabled' : 'ai-failed';
  }

  return res.redirect(generateDescriptionRedirect(listingId, status));
}));

router.post('/:id(\\d+)/save', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runListingAction(
    req,
    res,
    'POST',
    `/${id}/save`,
    undefined,
    listingRedirect(id, 'listing-saved'),
    listingRedirect(id, 'save-failed')
  );
}));

router.post('/:id(\\d+)/unsave', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runListingAction(
    req,
    res,
    'DELETE',
    `/${id}/save`,
    undefined,
    listingRedirect(id, 'listing-unsaved'),
    listingRedirect(id, 'unsave-failed')
  );
}));

router.post('/:id(\\d+)/renew', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runListingAction(
    req,
    res,
    'POST',
    `/${id}/renew`,
    undefined,
    listingRedirect(id, 'listing-renewed'),
    listingRedirect(id, 'renew-failed')
  );
}));

router.post('/:id(\\d+)/like', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  let status = 'like-failed';
  try {
    const result = await toggleFeedLike(token, {
      target_type: 'listing',
      target_id: id
    });
    const data = dataFrom(result);
    status = data && data.action === 'unliked' ? 'unliked' : 'liked';
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  return res.redirect(listingRedirect(id, status, '#like'));
}));

router.post('/:id(\\d+)/comments', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  const body = trimmed(req.body.body || req.body.content, 5000);
  if (body === '') {
    return res.redirect(`/listings/${id}/comments?status=comment-invalid#add-comment`);
  }

  const parentId = positiveInteger(req.body.parent_id);
  const payload = {
    target_type: 'listing',
    target_id: id,
    content: body
  };
  if (parentId !== null) {
    payload.parent_id = parentId;
  }

  let status = parentId !== null ? 'reply-added' : 'comment-added';
  try {
    await createComment(token, payload);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = error instanceof ApiError && [400, 422].includes(error.status)
      ? 'comment-invalid'
      : 'comment-failed';
  }

  return res.redirect(`/listings/${id}/comments?status=${status}#add-comment`);
}));

router.post('/:listingId(\\d+)/exchange-request', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const listingId = Number(req.params.listingId);
  const prepTime = boundedNumber(req.body.prep_time, 0, 24, null);
  const message = trimmed(req.body.message, 5000);
  const payload = {
    listing_id: listingId,
    proposed_hours: boundedNumber(req.body.proposed_hours, 0.25, 24, 1)
  };
  if (prepTime !== null) {
    payload.prep_time = prepTime;
  }
  if (message !== '') {
    payload.message = message;
  }

  try {
    const result = await createExchangeRequest(token, payload);
    const data = dataFrom(result);
    const exchangeId = positiveInteger(
      data && (data.id || data.exchange_id || (data.exchange && data.exchange.id))
    );
    if (exchangeId !== null) {
      return res.redirect(`/exchanges/${exchangeId}?status=exchange-created`);
    }
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    const code = apiErrorCode(error);
    if (code === 'COMPLIANCE_VIOLATION') {
      return res.redirect(`/listings/${listingId}/exchange-request?status=compliance-failed`);
    }
    if (code === 'FEATURE_DISABLED') {
      return res.redirect(listingRedirect(listingId, 'exchange-disabled'));
    }
  }

  return res.redirect(`/listings/${listingId}/exchange-request?status=exchange-failed`);
}));

router.get('/:listingId(\\d+)/exchange-request', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const listingId = Number(req.params.listingId);
  const [listingResult, profileResult, walletBalance] = await Promise.all([
    callListing(token, 'GET', `/${listingId}`),
    getProfile(token).catch(() => null),
    walletBalanceForExchange(token)
  ]);

  const listing = dataFrom(listingResult) || {};
  const currentUser = dataFrom(profileResult) || {};
  const ownerId = listingOwnerId(listing);
  const currentUserId = positiveInteger(currentUser.id);
  if (ownerId !== null && currentUserId !== null && ownerId === currentUserId) {
    return res.redirect(listingRedirect(listingId, 'own-listing'));
  }

  const suggestedHours = suggestedExchangeHours(listing);
  res.render('listings/exchange-request', {
    title: 'Request an exchange',
    listing: { ...listing, id: listingId },
    listingType: listingType(listing.type),
    authorName: listingAuthorName(listing),
    suggestedHours,
    suggestedHoursLabel: oneDecimal(suggestedHours),
    walletBalance,
    walletBalanceLabel: walletBalance === null ? '' : oneDecimal(walletBalance),
    status: exchangeRequestStatus(req.query.status),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Listing not found' }));

router.get('/:id(\\d+)/analytics', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  const days = listingAnalyticsDays(req.query.days);
  let listingResult;
  let analyticsResult;

  try {
    [listingResult, analyticsResult] = await Promise.all([
      callListing(token, 'GET', `/${id}`),
      callListing(token, 'GET', `/${id}/analytics?days=${days}`)
    ]);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && error.status === 403) {
      return res.status(403).render('errors/403', { title: 'Forbidden' });
    }
    if (error instanceof ApiError && error.status === 404) {
      return res.status(404).render('errors/404', { title: 'Listing not found' });
    }
    if (error instanceof ApiError && error.status === 429) {
      return res.status(429).render('errors/429', { title: 'Too many requests' });
    }
    throw error;
  }

  const listing = dataFrom(listingResult) || {};
  const analyticsData = dataFrom(analyticsResult) || {};
  const listingTitle = trimmed(listing.title || listing.name || analyticsData.title) || 'Listing analytics';

  return res.render('listings/analytics', {
    title: 'Listing analytics',
    listing: { ...listing, id },
    listingTitle,
    days,
    dayOptions: [7, 14, 30, 60, 90],
    analytics: decorateListingAnalytics(analyticsResult)
  });
}, { notFoundTitle: 'Listing not found' }));

router.post('/:id(\\d+)/report', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const payload = reportPayload(req.body);
  if (payload === null) {
    return res.redirect(`/listings/${id}/report?status=report-invalid`);
  }

  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  let status = 'listing-reported';
  try {
    await callListing(token, 'POST', `/${id}/report`, payload);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = error instanceof ApiError && error.status === 409
      ? 'already-reported'
      : 'report-failed';
  }

  return res.redirect(listingRedirect(id, status));
}));

router.get('/:id(\\d+)/report', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  const [listingResult, profileResult] = await Promise.all([
    callListing(token, 'GET', `/${id}`),
    getProfile(token).catch(() => null)
  ]);

  const listing = dataFrom(listingResult) || {};
  const currentUser = dataFrom(profileResult) || {};
  const ownerId = listingOwnerId(listing);
  const currentUserId = positiveInteger(currentUser.id);
  if (ownerId !== null && currentUserId !== null && ownerId === currentUserId) {
    return res.status(403).render('static-page', {
      title: 'Cannot report listing',
      heading: 'Cannot report listing',
      body: 'You cannot report your own listing.'
    });
  }

  res.render('listings/report', {
    title: 'Report a listing',
    listing: { ...listing, id },
    status: listingReportStatus(req.query.status),
    reasons: listingReportReasons(),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Listing not found' }));

router.use(requireAuth);

// List all listings with search/filter/pagination
router.get('/', asyncRoute(async (req, res) => {
  const { search, status, page = 1 } = req.query;
  const params = { search, status, page, limit: 20 };

  const [data, currentUser] = await Promise.all([
    getListings(req.token, params),
    getProfile(req.token)
  ]);

  // Handle both array and paginated response formats
  let listings, pagination;
  if (Array.isArray(data)) {
    listings = data;
    pagination = null;
  } else {
    listings = data.data || data.items || [];
    pagination = {
      currentPage: parseInt(page, 10),
      totalPages: data.pagination?.pages || data.totalPages || Math.ceil((data.pagination?.total || data.total || listings.length) / 20),
      total: data.pagination?.total || data.total || listings.length
    };
  }

  res.render('listings/index', {
    title: 'Listings',
    listings,
    pagination,
    filters: { search, status },
    currentUser,
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// New listing form
router.get('/new', (req, res) => {
  res.render('listings/form', {
    title: 'Create listing',
    listing: null,
    values: null,
    errors: null,
    fieldErrors: {},
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
});

// Create listing
router.post('/new', audit.listingCreate(), asyncRoute(async (req, res) => {
  const { title, description, status, type } = req.body;

  // Basic validation
  const errors = [];
  const fieldErrors = {};

  if (!title || !title.trim()) {
    errors.push({ text: 'Enter a title', href: '#title' });
    fieldErrors.title = 'Enter a title';
  }

  if (!type || !['offer', 'request'].includes(type)) {
    errors.push({ text: 'Select a type', href: '#type' });
    fieldErrors.type = 'Select a type';
  }

  if (!status) {
    errors.push({ text: 'Select a status', href: '#status' });
    fieldErrors.status = 'Select a status';
  }

  if (errors.length > 0) {
    return res.render('listings/form', {
      title: 'Create listing',
      listing: null,
      values: { title, description, status, type },
      errors,
      fieldErrors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await createListing(req.token, { title: title.trim(), description, status, type });

    if (req.flash) {
      req.flash('success', 'Listing created successfully');
    }
    res.redirect('/listings');
  } catch (error) {
    // Handle validation errors from API specifically for form re-render
    if (error instanceof ApiError && error.status === 400) {
      return res.render('listings/form', {
        title: 'Create listing',
        listing: null,
        values: req.body,
        errors: [{ text: error.message }],
        fieldErrors: error.data?.errors || {},
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error; // Re-throw for asyncRoute to handle 401/404/etc
  }
}));

// View listing detail
router.get('/:id', asyncRoute(async (req, res) => {
  const [listing, reviewsResult, currentUser] = await Promise.all([
    getListing(req.token, req.params.id),
    getListingReviews(req.token, req.params.id).catch(() => ({ data: [], summary: null })),
    getProfile(req.token)
  ]);

  const listingOwnerId = listing.user?.id || listing.userId || listing.user_id;
  const can_edit = !!(listingOwnerId && currentUser && String(listingOwnerId) === String(currentUser.id));

  res.render('listings/detail', {
    title: listing.title || listing.name || 'Listing details',
    listing: { ...listing, can_edit },
    reviews: reviewsResult.data || [],
    reviewSummary: reviewsResult.summary || null,
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Listing not found' }));

// Edit listing form
router.get('/:id/edit', asyncRoute(async (req, res) => {
  const [listing, currentUser] = await Promise.all([
    getListing(req.token, req.params.id),
    getProfile(req.token)
  ]);

  // Only the owner may access the edit form
  if (String(listing.user_id || listing.userId || listing.user?.id) !== String(currentUser.id)) {
    return res.redirect('/listings/' + req.params.id);
  }

  res.render('listings/form', {
    title: 'Edit listing',
    listing,
    values: null,
    errors: null,
    fieldErrors: {},
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Listing not found' }));

// Update listing
router.post('/:id/edit', audit.listingUpdate(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { title, description, status, type } = req.body;

  // Basic validation
  const errors = [];
  const fieldErrors = {};

  if (!title || !title.trim()) {
    errors.push({ text: 'Enter a title', href: '#title' });
    fieldErrors.title = 'Enter a title';
  }

  if (!type || !['offer', 'request'].includes(type)) {
    errors.push({ text: 'Select a type', href: '#type' });
    fieldErrors.type = 'Select a type';
  }

  if (!status) {
    errors.push({ text: 'Select a status', href: '#status' });
    fieldErrors.status = 'Select a status';
  }

  if (errors.length > 0) {
    return res.render('listings/form', {
      title: 'Edit listing',
      listing: { id },
      values: { title, description, status, type },
      errors,
      fieldErrors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await updateListing(req.token, id, { title: title.trim(), description, status, type });

    if (req.flash) {
      req.flash('success', 'Listing updated successfully');
    }
    res.redirect('/listings');
  } catch (error) {
    // Handle validation errors from API specifically for form re-render
    if (error instanceof ApiError && error.status === 400) {
      return res.render('listings/form', {
        title: 'Edit listing',
        listing: { id: req.params.id },
        values: req.body,
        errors: [{ text: error.message }],
        fieldErrors: error.data?.errors || {},
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error; // Re-throw for asyncRoute to handle 401/404/etc
  }
}));

// Delete confirmation page
router.get('/:id/delete', asyncRoute(async (req, res) => {
  const [listing, currentUser] = await Promise.all([
    getListing(req.token, req.params.id),
    getProfile(req.token)
  ]);

  // Only the owner may access the delete confirmation page
  if (String(listing.user_id || listing.userId || listing.user?.id) !== String(currentUser.id)) {
    return res.redirect('/listings/' + req.params.id);
  }

  res.render('listings/delete', {
    title: 'Delete listing',
    listing,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Listing not found' }));

// Delete listing
router.post('/:id/delete', audit.listingDelete(), asyncRoute(async (req, res) => {
  await deleteListing(req.token, req.params.id);

  if (req.flash) {
    req.flash('success', 'Listing deleted successfully');
  }
  res.redirect('/listings');
}, { notFoundTitle: 'Listing not found' }));

module.exports = router;
