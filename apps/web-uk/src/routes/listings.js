// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getListings,
  getListing,
  getPublicListing,
  createListing,
  updateListing,
  deleteListing,
  getListingReviews,
  getProfile,
  ApiError,
  ApiOfflineError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');

const router = express.Router();
const LOCAL_DEFAULT_TENANT_SLUG = 'hour-timebank';

router.use(requireAuth);

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  if (payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
}

function unwrapObject(payload) {
  if (!payload || typeof payload !== 'object') return {};
  return payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? payload.data
    : payload;
}

function unwrapMeta(payload) {
  if (!payload || typeof payload !== 'object') return {};
  return payload.meta || payload.pagination || payload.data?.meta || {};
}

function firstPresent(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '');
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function truncate(value, maxLength = 220) {
  const clean = stripHtml(value);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3).trim()}...`;
}

function normalizeListing(listing) {
  const type = firstPresent(listing.type, listing.listing_type, 'offer') === 'request' ? 'request' : 'offer';
  const user = listing.user && typeof listing.user === 'object' ? listing.user : {};
  const serviceType = firstPresent(listing.service_type, listing.serviceType);

  return {
    ...listing,
    id: listing.id,
    type,
    typeLabel: type === 'request' ? 'Request' : 'Offer',
    typeClass: type === 'request' ? 'govuk-tag--purple' : 'govuk-tag--blue',
    title: firstPresent(listing.title, listing.name, 'Untitled listing'),
    description: truncate(firstPresent(listing.description, listing.summary, listing.content, '')),
    imageUrl: firstPresent(listing.image_url, listing.imageUrl),
    authorName: firstPresent(user.name, user.full_name, user.firstName, user.first_name, listing.author_name),
    categoryName: firstPresent(listing.category_name, listing.category?.name),
    location: firstPresent(listing.location, listing.address),
    hoursEstimate: firstPresent(listing.hours_estimate, listing.hoursEstimate),
    serviceType,
    serviceTypeLabel: serviceType === 'remote' ? 'Remote' : serviceType === 'in_person' ? 'In person' : '',
    isFeatured: !!firstPresent(listing.is_featured, listing.featured),
    can_edit: listing.can_edit
  };
}

function normalizeListingDetail(listing) {
  const normalized = normalizeListing(listing);
  const user = listing.user && typeof listing.user === 'object' ? listing.user : {};
  const rawDescription = firstPresent(listing.description, listing.summary, listing.content, '');
  const authorName = firstPresent(normalized.authorName, listing.author_name, user.name);

  return {
    ...normalized,
    ...listing,
    description: stripHtml(rawDescription),
    authorName,
    authorId: firstPresent(listing.user_id, listing.author_id, user.id),
    authorAvatar: firstPresent(listing.author_avatar, user.avatar_url, user.avatarUrl),
    authorTagline: firstPresent(listing.author_tagline, user.tagline),
    authorReviewsCount: Number(firstPresent(listing.author_reviews_count, 0)) || 0,
    authorExchangesCount: Number(firstPresent(listing.author_exchanges_count, 0)) || 0,
    authorVerified: !!firstPresent(listing.author_verified, user.verified),
    createdAt: firstPresent(listing.created_at, listing.createdAt),
    expiresAt: firstPresent(listing.expires_at, listing.expiresAt),
    statusValue: firstPresent(listing.status, ''),
    statusLabel: firstPresent(listing.status, ''),
    likesCount: Number(firstPresent(listing.likes_count, listing.like_count, 0)) || 0,
    commentsCount: Number(firstPresent(listing.comments_count, 0)) || 0,
    shareUrl: `/listings/${listing.id}`,
    images: Array.isArray(listing.images) ? listing.images : [],
    skillTags: Array.isArray(listing.skill_tags)
      ? listing.skill_tags.map(tag => firstPresent(tag.name, tag.tag, tag)).filter(Boolean)
      : []
  };
}

function normalizeResultCount(count) {
  const numeric = Number(count);
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
}

function allow(value, allowedValues, fallback) {
  return allowedValues.includes(value) ? value : fallback;
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

async function getListingWithTenantFallback(req) {
  try {
    return await getListing(req.token, req.params.id);
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

    return getPublicListing(req.params.id, tenantSlug);
  }
}

// List all listings with search/filter/pagination
router.get('/', asyncRoute(async (req, res) => {
  const filters = {
    search: typeof req.query.q === 'string' ? req.query.q.trim() : (typeof req.query.search === 'string' ? req.query.search.trim() : ''),
    type: allow(req.query.type, ['offer', 'request'], ''),
    category_id: typeof req.query.category_id === 'string' ? req.query.category_id.trim() : '',
    hours: allow(req.query.hours, ['any', 'quick', 'short', 'half_day', 'full_day'], 'any'),
    service: allow(req.query.service, ['any', 'remote', 'in_person'], 'any'),
    posted: allow(req.query.posted, ['any', '1', '7', '30'], 'any'),
    sort: allow(req.query.sort, ['newest', 'recommended'], 'newest'),
    near: allow(req.query.near, ['any', '5', '10', '25', '50'], 'any'),
    cursor: typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '',
    per_page: 20
  };
  const hasFilters = !!(
    filters.search ||
    filters.type ||
    filters.category_id ||
    filters.hours !== 'any' ||
    filters.service !== 'any' ||
    filters.posted !== 'any' ||
    filters.near !== 'any' ||
    filters.sort !== 'newest'
  );

  const [data, currentUser] = await Promise.all([
    getListings(req.token, filters),
    getProfile(req.token).catch(() => null)
  ]);
  const meta = unwrapMeta(data);
  const listings = unwrapList(data).map(normalizeListing);
  const totalItems = normalizeResultCount(firstPresent(meta.total_items, meta.total, data.total, listings.length));

  res.render('listings/index', {
    title: 'Listings',
    listings,
    items: listings,
    categories: [],
    meta: {
      ...meta,
      total_items: totalItems,
      has_more: !!firstPresent(meta.has_more, meta.hasMore),
      cursor: firstPresent(meta.cursor, meta.next_cursor, '')
    },
    filters,
    hasFilters,
    currentUser,
    isAuthenticated: true,
    moduleDisabled: false,
    error: false,
    communityName: res.locals.tenant?.name || res.locals.tenantSlug || 'Project NEXUS Accessible',
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
  const [listingResult, reviewsResult, currentUser] = await Promise.all([
    getListingWithTenantFallback(req),
    getListingReviews(req.token, req.params.id).catch(() => ({ data: [], summary: null })),
    getProfile(req.token).catch(() => null)
  ]);
  const listing = normalizeListingDetail(unwrapObject(listingResult));

  const listingOwnerId = listing.user?.id || listing.userId || listing.user_id;
  const can_edit = !!(listingOwnerId && currentUser && String(listingOwnerId) === String(currentUser.id));

  res.render('listings/detail', {
    title: listing.title || listing.name || 'Listing details',
    listing: { ...listing, can_edit },
    reviews: unwrapList(reviewsResult),
    reviewSummary: reviewsResult.summary || null,
    isAuthenticated: true,
    isOwner: can_edit,
    requiresAuth: false,
    exchangeWorkflowEnabled: false,
    directMessagingEnabled: true,
    shareUrl: `${req.protocol}://${req.get('host')}/listings/${listing.id}`,
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
