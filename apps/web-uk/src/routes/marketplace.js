// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { ApiError, callMarketplaceApi } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

const PRICE_TYPES = ['fixed', 'negotiable', 'free', 'contact'];
const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'];
const DELIVERY_METHODS = ['pickup', 'shipping', 'both', 'community_delivery'];
const REPORT_REASONS = ['counterfeit', 'illegal', 'unsafe', 'misleading', 'discrimination', 'ip_violation', 'other'];

const PRICE_TYPE_LABELS = {
  fixed: 'Fixed price',
  negotiable: 'Open to offers',
  free: 'Free to a good home',
  contact: 'Contact for price'
};
const CONDITION_LABELS = {
  new: 'New',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor'
};
const DELIVERY_METHOD_LABELS = {
  pickup: 'Local pickup',
  shipping: 'Shipping',
  both: 'Pickup or shipping',
  community_delivery: 'Community delivery'
};
const REPORT_REASON_LABELS = {
  counterfeit: 'Counterfeit or fake goods',
  illegal: 'Illegal item or activity',
  unsafe: 'Unsafe or dangerous',
  misleading: 'Misleading or a scam',
  discrimination: 'Discriminatory content',
  ip_violation: 'Copies someone else without permission',
  other: 'Something else'
};
const MARKETPLACE_SUCCESS_MESSAGES = {
  saved: 'This item has been saved.',
  unsaved: 'This item has been removed from your saved items.',
  reported: 'Thank you. Your report has been sent to our team.',
  'listing-created': 'Your listing has been published.',
  'listing-saved': 'Your changes were saved.'
};
const MARKETPLACE_ERROR_MESSAGES = {
  'listing-validation': 'Check the listing details and try again.',
  'listing-create-failed': 'Sorry, your listing could not be created. Please try again.',
  'listing-save-failed': 'Sorry, your changes could not be saved. Please try again.',
  'order-failed': 'Sorry, your order could not be placed. Please try again.',
  'offer-amount-invalid': 'Enter an offer amount greater than zero',
  'offer-failed': 'Sorry, your offer could not be sent. Please try again.',
  'report-validation': 'Select a reason for reporting',
  'report-failed': 'Sorry, your report could not be sent.'
};

function tokenFrom(req) {
  return (req.signedCookies && req.signedCookies.token) || req.token || '';
}

function loginRedirect() {
  return '/login?status=auth-required';
}

function requireToken(req, res) {
  const token = tokenFrom(req);
  if (!token) {
    res.redirect(loginRedirect());
    return null;
  }
  return token;
}

function trimmed(value, limit = null) {
  const text = String(value || '').trim();
  return limit === null ? text : text.slice(0, limit);
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, '');
}

function limitText(value, limit = 160) {
  const text = stripHtml(value).trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function decimalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function allowed(value, choices, fallback) {
  const text = trimmed(value);
  return choices.includes(text) ? text : fallback;
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined
    ? result.data
    : result;
}

function rowsFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

function objectFrom(result) {
  const data = dataFrom(result);
  return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
}

async function callMarketplace(token, method, path) {
  return callMarketplaceApi(token, method, path);
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function isForbidden(error) {
  return error instanceof ApiError && error.status === 403;
}

function isNotFound(error) {
  return error instanceof ApiError && error.status === 404;
}

function renderMarketplaceError(error, res, title = 'Marketplace') {
  if (isAuthError(error)) {
    res.redirect(loginRedirect());
    return true;
  }
  if (isForbidden(error)) {
    res.status(403).render('errors/403', { title: 'Access denied' });
    return true;
  }
  if (isNotFound(error)) {
    res.status(404).render('errors/404', { title: 'Page not found' });
    return true;
  }

  res.status(503).render('static-page', {
    title,
    body: 'Marketplace information could not be loaded. Please try again shortly.'
  });
  return true;
}

function safeRelativeOrAbsoluteUrl(value) {
  const url = trimmed(value);
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')
    ? url
    : '';
}

function formatMoney(amount, currency = '') {
  const number = Number(amount);
  if (!Number.isFinite(number)) return '';
  const code = trimmed(currency || 'EUR', 3).toUpperCase() || 'EUR';
  return `${code} ${number.toFixed(2)}`;
}

function formatCredits(amount) {
  const number = Number(amount);
  if (!Number.isFinite(number)) return '';
  return `${number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')} time credits`;
}

function priceLabel(row) {
  const credits = decimalNumber(row.time_credit_price);
  const money = decimalNumber(row.price);
  if (credits > 0) return formatCredits(credits);
  if (money > 0) return formatMoney(money, row.price_currency);
  return 'Free';
}

function priceTagClass(row) {
  const credits = decimalNumber(row.time_credit_price);
  const money = decimalNumber(row.price);
  if (credits <= 0 && money <= 0) return 'govuk-tag--green';
  if (credits > 0) return 'govuk-tag--blue';
  return 'govuk-tag--grey';
}

function imageUrls(row) {
  const urls = [];
  const images = Array.isArray(row.images) ? row.images : [];
  images.forEach((image) => {
    const value = typeof image === 'string' ? image : (image && (image.url || image.thumbnail_url));
    const url = safeRelativeOrAbsoluteUrl(value);
    if (url) urls.push(url);
  });

  const single = row.image && typeof row.image === 'object'
    ? (row.image.url || row.image.thumbnail_url)
    : row.image;
  const singleUrl = safeRelativeOrAbsoluteUrl(single);
  if (singleUrl && !urls.includes(singleUrl)) urls.push(singleUrl);

  return urls;
}

function decorateCategory(category) {
  const row = category && typeof category === 'object' ? category : {};
  const name = trimmed(row.name) || 'Category';
  const slug = trimmed(row.slug);
  return {
    ...row,
    id: positiveInteger(row.id),
    name,
    slug,
    href: slug ? `/marketplace/category/${encodeURIComponent(slug)}` : ''
  };
}

function decorateListing(listing) {
  const row = listing && typeof listing === 'object' ? listing : {};
  const id = positiveInteger(row.id);
  const title = trimmed(row.title) || 'Marketplace';
  const images = imageUrls(row);
  const seller = row.user && typeof row.user === 'object' ? row.user : {};
  const sellerId = positiveInteger(seller.id) || positiveInteger(row.user_id);
  const sellerName = trimmed(seller.name || row.seller_name || row.seller_type);
  const priceType = allowed(row.price_type, PRICE_TYPES, decimalNumber(row.price) > 0 ? 'fixed' : 'free');
  const condition = trimmed(row.condition);
  const deliveryMethod = trimmed(row.delivery_method);

  return {
    ...row,
    id,
    title,
    tagline: stripHtml(row.tagline || ''),
    summary: limitText(row.tagline || row.description || ''),
    description: stripHtml(row.description || ''),
    priceType,
    priceTypeLabel: PRICE_TYPE_LABELS[priceType] || priceType,
    priceLabel: priceLabel(row),
    priceTagClass: priceTagClass(row),
    price: row.price ?? '',
    priceCurrency: trimmed(row.price_currency || 'EUR', 3).toUpperCase() || 'EUR',
    timeCreditPrice: row.time_credit_price ?? '',
    condition,
    conditionLabel: condition ? (CONDITION_LABELS[condition] || condition) : '',
    deliveryMethod,
    deliveryLabel: deliveryMethod ? (DELIVERY_METHOD_LABELS[deliveryMethod] || deliveryMethod) : '',
    categoryId: positiveInteger(row.category_id),
    location: trimmed(row.location),
    quantity: positiveInteger(row.quantity) || 1,
    sellerId,
    sellerName,
    images,
    primaryImage: images[0] || '',
    isOwnItem: Boolean(row.is_owner || row.owned_by_current_user),
    href: id ? `/marketplace/${id}` : '/marketplace'
  };
}

function indexPath(query) {
  const params = new URLSearchParams();
  params.set('limit', '30');

  const search = trimmed(query.q);
  if (search) params.set('q', search);

  const categoryId = positiveInteger(query.category_id);
  if (categoryId !== null) params.set('category_id', String(categoryId));

  const cursor = trimmed(query.cursor);
  if (cursor) params.set('cursor', cursor);

  return `/listings?${params.toString()}`;
}

function statusEntry(status) {
  const key = trimmed(status);
  if (MARKETPLACE_SUCCESS_MESSAGES[key]) {
    return { type: 'success', message: MARKETPLACE_SUCCESS_MESSAGES[key] };
  }
  if (MARKETPLACE_ERROR_MESSAGES[key]) {
    return { type: 'error', message: MARKETPLACE_ERROR_MESSAGES[key] };
  }
  return null;
}

function formOptions() {
  return {
    priceTypes: PRICE_TYPES.map((value) => ({ value, label: PRICE_TYPE_LABELS[value] })),
    conditions: CONDITIONS.map((value) => ({ value, label: CONDITION_LABELS[value] })),
    deliveryMethods: DELIVERY_METHODS.map((value) => ({ value, label: DELIVERY_METHOD_LABELS[value] }))
  };
}

function reportReasons() {
  return REPORT_REASONS.map((value) => ({ value, label: REPORT_REASON_LABELS[value] }));
}

async function loadCategories(token) {
  const result = await callMarketplace(token, 'GET', '/categories');
  return rowsFrom(result).map(decorateCategory);
}

async function loadListing(token, id) {
  const result = await callMarketplace(token, 'GET', `/listings/${id}`);
  const listing = objectFrom(result);
  if (!listing) {
    throw new ApiError('Listing not found', 404);
  }
  return decorateListing(listing);
}

function blankListing() {
  return decorateListing({
    price_type: 'fixed',
    price_currency: 'EUR',
    delivery_method: 'pickup',
    quantity: 1
  });
}

router.get('/', asyncRoute(async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return undefined;

  try {
    const [listingResult, categories] = await Promise.all([
      callMarketplace(token, 'GET', indexPath(req.query)),
      loadCategories(token)
    ]);
    return res.render('marketplace/index', {
      title: 'Marketplace',
      activeNav: 'explore',
      listings: rowsFrom(listingResult).map(decorateListing),
      categories,
      query: trimmed(req.query.q),
      categoryId: positiveInteger(req.query.category_id),
      status: statusEntry(req.query.status)
    });
  } catch (error) {
    return renderMarketplaceError(error, res);
  }
}));

router.get('/create', asyncRoute(async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return undefined;

  try {
    const categories = await loadCategories(token);
    return res.render('marketplace/form', {
      title: 'Create a listing',
      activeNav: 'explore',
      mode: 'create',
      isEdit: false,
      listing: blankListing(),
      categories,
      action: '/marketplace/create',
      submitLabel: 'Publish listing',
      status: statusEntry(req.query.status),
      ...formOptions()
    });
  } catch (error) {
    return renderMarketplaceError(error, res, 'Create a listing');
  }
}));

router.get('/:id(\\d+)/edit', asyncRoute(async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return undefined;

  try {
    const [listing, categories] = await Promise.all([
      loadListing(token, req.params.id),
      loadCategories(token)
    ]);
    return res.render('marketplace/form', {
      title: 'Edit your listing',
      activeNav: 'explore',
      mode: 'edit',
      isEdit: true,
      listing,
      categories,
      action: `/marketplace/${listing.id}/update`,
      submitLabel: 'Save changes',
      status: statusEntry(req.query.status),
      ...formOptions()
    });
  } catch (error) {
    return renderMarketplaceError(error, res, 'Edit your listing');
  }
}));

router.get('/:id(\\d+)/buy', asyncRoute(async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return undefined;

  try {
    const listing = await loadListing(token, req.params.id);
    return res.render('marketplace/buy', {
      title: 'Confirm your purchase',
      activeNav: 'explore',
      item: listing,
      status: statusEntry(req.query.status)
    });
  } catch (error) {
    return renderMarketplaceError(error, res, 'Confirm your purchase');
  }
}));

router.get('/:id(\\d+)/offer', asyncRoute(async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return undefined;

  try {
    const listing = await loadListing(token, req.params.id);
    return res.render('marketplace/offer', {
      title: 'Make an offer',
      activeNav: 'explore',
      item: listing,
      status: statusEntry(req.query.status)
    });
  } catch (error) {
    return renderMarketplaceError(error, res, 'Make an offer');
  }
}));

router.get('/:id(\\d+)/report', asyncRoute(async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return undefined;

  try {
    const listing = await loadListing(token, req.params.id);
    return res.render('marketplace/report', {
      title: 'Report a listing',
      activeNav: 'explore',
      item: listing,
      status: statusEntry(req.query.status),
      reasons: reportReasons()
    });
  } catch (error) {
    return renderMarketplaceError(error, res, 'Report a listing');
  }
}));

router.get('/:id(\\d+)', asyncRoute(async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return undefined;

  try {
    const listing = await loadListing(token, req.params.id);
    return res.render('marketplace/detail', {
      title: listing.title,
      activeNav: 'explore',
      item: listing,
      status: statusEntry(req.query.status)
    });
  } catch (error) {
    return renderMarketplaceError(error, res);
  }
}));

module.exports = router;
