// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getSavedCollections,
  getSavedCollectionItems,
  createSavedCollection,
  updateSavedCollection,
  deleteSavedCollection,
  deleteSavedItem,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { getRequestIntlLocale } = require('../lib/request-intl-locale');
const { getRequestProfile } = require('../lib/request-profile');

const router = express.Router();

function tokenFrom(req) {
  return (req.signedCookies && req.signedCookies.token) || req.token || '';
}

function loginRedirect() {
  return '/login?status=auth-required';
}

function redirectTo(res, pathname) {
  const urlFor = typeof res.locals.urlFor === 'function' ? res.locals.urlFor : (value) => value;
  return res.redirect(urlFor(pathname));
}

function collectionRedirect(status) {
  return `/me/collections?status=${encodeURIComponent(status)}`;
}

function collectionDetailRedirect(id, status) {
  return `/me/collections/${id}?status=${encodeURIComponent(status)}`;
}

function trimmed(value, limit = null) {
  const text = String(value || '').trim();
  return limit === null ? text : text.slice(0, limit);
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function isChecked(value) {
  return ['1', 'on', 'true', 'yes'].includes(String(value || '').toLowerCase());
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined ? result.data : result;
}

function collectionRows(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function metaFrom(result) {
  if (result && typeof result === 'object' && result.meta && typeof result.meta === 'object') return result.meta;
  const data = dataFrom(result);
  if (data && data.meta && typeof data.meta === 'object') return data.meta;
  return {};
}

function safeColor(value) {
  const color = trimmed(value);
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6366f1';
}

function plural(count, singular, pluralText) {
  if (count === 0) return `No ${pluralText}`;
  if (count === 1) return `1 ${singular}`;
  return `${count} ${pluralText}`;
}

function normalizeCollection(item) {
  const row = item && typeof item === 'object' ? item : {};
  const id = positiveInteger(row.id);
  const count = Number.isFinite(Number(row.items_count ?? row.itemsCount))
    ? Number(row.items_count ?? row.itemsCount)
    : 0;
  return {
    ...row,
    id,
    userId: positiveInteger(row.user_id ?? row.userId),
    name: trimmed(row.name) || 'Collection',
    description: trimmed(row.description),
    color: safeColor(row.color),
    itemsCount: count,
    countLabel: plural(count, 'item', 'items'),
    isPublic: row.is_public === true || row.isPublic === true,
    visibilityLabel: row.is_public === true || row.isPublic === true ? 'Public' : 'Private'
  };
}

function typeLabel(type) {
  const labels = {
    post: 'Post',
    listing: 'Listing',
    event: 'Event',
    group: 'Group',
    article: 'Article',
    marketplace_listing: 'Marketplace listing',
    job: 'Opportunity',
    resource: 'Resource'
  };
  const key = trimmed(type);
  if (labels[key]) return labels[key];
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Saved item';
}

function itemHref(type, id) {
  if (!id) return '';
  const paths = {
    listing: `/listings/${id}`,
    event: `/events/${id}`,
    job: `/jobs/${id}`,
    group: `/groups/${id}`,
    article: `/blog/${id}`,
    resource: `/resources?item=${id}`,
    marketplace_listing: `/marketplace/${id}`,
    post: `/feed?post=${id}`
  };
  return paths[type] || '';
}

function formatSavedDate(value) {
  const raw = trimmed(value);
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(getRequestIntlLocale(), { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function previewTitle(row) {
  const preview = row.preview && typeof row.preview === 'object' ? row.preview : {};
  return trimmed(row.preview_title ?? row.previewTitle ?? preview.title);
}

function normalizeSavedItem(item) {
  const row = item && typeof item === 'object' ? item : {};
  const itemType = trimmed(row.item_type ?? row.itemType);
  const itemId = positiveInteger(row.item_id ?? row.itemId);
  const label = typeLabel(itemType);
  const title = previewTitle(row) || `${label} #${itemId || ''}`.trim();
  const savedOn = formatSavedDate(row.saved_at ?? row.savedAt);
  return {
    ...row,
    id: positiveInteger(row.id),
    itemType,
    itemId,
    typeLabel: label,
    title,
    href: itemHref(itemType, itemId),
    note: trimmed(row.note),
    savedOn
  };
}

function detailPayload(result, fallbackId) {
  const data = dataFrom(result);
  const collection = normalizeCollection((data && data.collection) || {});
  if (!collection.id) collection.id = fallbackId;
  return {
    collection,
    items: collectionRows(data).map(normalizeSavedItem).filter((item) => item.id !== null),
    meta: {
      current_page: Number(metaFrom(result).current_page || 1),
      last_page: Number(metaFrom(result).last_page || 1),
      total: Number(metaFrom(result).total || 0),
      per_page: Number(metaFrom(result).per_page || 20)
    }
  };
}

function statusMessage(status) {
  const messages = {
    'collection-created': 'Collection created.',
    'collection-updated': 'Collection updated.',
    'collection-deleted': 'Collection deleted.',
    'item-removed': 'Item removed from the collection.'
  };
  return messages[trimmed(status)] || '';
}

function errorMessage(status) {
  const messages = {
    'collection-name-required': 'Enter a name for the collection.',
    'collection-failed': 'Sorry, that could not be saved. Please try again.',
    'item-remove-failed': 'Sorry, that item could not be removed.'
  };
  return messages[trimmed(status)] || '';
}

function collectionPayload(body) {
  const payload = {
    name: String(body.name || '').trim(),
    description: String(body.description || '').trim() || null,
    is_public: isChecked(body.is_public)
  };

  if (body.color !== undefined && String(body.color).trim()) {
    payload.color = String(body.color).trim();
  }
  if (body.icon !== undefined && String(body.icon).trim()) {
    payload.icon = String(body.icon).trim();
  }

  return payload;
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function isNotFound(error) {
  return error instanceof ApiError && error.status === 404;
}

router.get('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const status = trimmed(req.query.status);
  const collections = collectionRows(await getSavedCollections(token))
    .map(normalizeCollection)
    .filter((collection) => collection.id !== null);

  return res.render('saved-collections/index', {
    title: 'My collections',
    activeNav: 'saved',
    collections,
    status,
    successMessage: statusMessage(status),
    errorMessage: errorMessage(status)
  });
}, { redirectOn401: loginRedirect() }));

router.get('/:id(\\d+)', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const page = Math.max(1, Number(req.query.page || 1));
  const status = trimmed(req.query.status);
  const [collectionResult, profileResult] = await Promise.all([
    getSavedCollectionItems(token, id, { page, per_page: 20 }),
    getRequestProfile(req, token)
  ]);
  const payload = detailPayload(collectionResult, id);
  const profile = dataFrom(profileResult);
  const currentUserId = positiveInteger(profile && (profile.id ?? profile.user_id));
  const isOwner = currentUserId !== null && payload.collection.userId === currentUserId;

  return res.render('saved-collections/detail', {
    title: payload.collection.name || 'Collection',
    activeNav: 'saved',
    collection: payload.collection,
    items: payload.items,
    meta: payload.meta,
    currentPage: page,
    lastPage: payload.meta.last_page || 1,
    isOwner,
    status,
    successMessage: statusMessage(status),
    errorMessage: errorMessage(status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Collection not found' }));

router.post('/', requireAuth, asyncRoute(async (req, res) => {
  const payload = collectionPayload(req.body);
  if (!payload.name) {
    return redirectTo(res, collectionRedirect('collection-name-required'));
  }

  let status = 'collection-created';
  try {
    await createSavedCollection(req.token, payload);
  } catch (error) {
    if (isAuthError(error)) throw error;
    status = 'collection-failed';
  }

  return redirectTo(res, collectionRedirect(status));
}));

router.post('/:id(\\d+)/update', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const payload = collectionPayload(req.body);
  if (!payload.name) {
    return redirectTo(res, collectionDetailRedirect(id, 'collection-name-required'));
  }

  let status = 'collection-updated';
  try {
    await updateSavedCollection(req.token, id, payload);
  } catch (error) {
    if (isAuthError(error) || isNotFound(error)) throw error;
    status = 'collection-failed';
  }

  return redirectTo(res, collectionDetailRedirect(id, status));
}));

router.post('/:id(\\d+)/delete', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  let status = 'collection-deleted';

  try {
    await deleteSavedCollection(req.token, id);
  } catch (error) {
    if (isAuthError(error) || isNotFound(error)) throw error;
    status = 'collection-failed';
  }

  return redirectTo(res, collectionRedirect(status));
}));

router.post('/:id(\\d+)/items/:itemId(\\d+)/remove', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  let status = 'item-removed';

  try {
    await deleteSavedItem(req.token, itemId);
  } catch (error) {
    if (isAuthError(error)) throw error;
    status = 'item-remove-failed';
  }

  return redirectTo(res, collectionDetailRedirect(id, status));
}));

module.exports = router;
