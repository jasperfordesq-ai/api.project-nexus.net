// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  getResources,
  deleteResource,
  reorderResources,
  createComment,
  deleteComment,
  toggleReaction,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();
const RESOURCE_REACTIONS = new Set(['like', 'love', 'laugh', 'wow', 'sad', 'celebrate']);

function tokenFrom(req) {
  return (req.signedCookies && req.signedCookies.token) || '';
}

function trimmed(value, limit = null) {
  const text = String(value || '').trim();
  return limit === null ? text : text.slice(0, limit);
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function isNotFound(error) {
  return error instanceof ApiError && error.status === 404;
}

function isForbidden(error) {
  return error instanceof ApiError && error.status === 403;
}

function redirectAuthIfNeeded(error, res) {
  if (isAuthError(error)) {
    res.redirect('/login?status=auth-required');
    return true;
  }
  return false;
}

function commentsRedirect(resourceId, status, fragment = 'comments') {
  const suffix = fragment ? `#${fragment}` : '';
  return `/resources/${resourceId}/comments?status=${encodeURIComponent(status)}${suffix}`;
}

function libraryRedirect(req, status = '') {
  const params = new URLSearchParams();
  const q = trimmed(req.body.q);
  const categoryId = positiveInteger(req.body.category_id);
  const reorder = trimmed(req.body.reorder);

  if (q) params.set('q', q);
  if (categoryId !== null) params.set('category_id', String(categoryId));
  if (reorder === '1') params.set('reorder', '1');
  if (status) params.set('status', status);

  const query = params.toString();
  return `/resources/library${query ? `?${query}` : ''}`;
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined
    ? result.data
    : result;
}

function resourceItemsFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

function resourceHref(resource) {
  const rawPath = trimmed(resource.file_path || resource.url || resource.file_url);
  if (!rawPath) return '';
  if (/^https?:\/\//i.test(rawPath) || rawPath.startsWith('/')) {
    return rawPath;
  }
  return `/${rawPath.replace(/^\/+/, '')}`;
}

function resourceType(resource) {
  const explicitType = trimmed(resource.file_type).toUpperCase();
  if (explicitType) return explicitType;

  const path = trimmed(resource.file_path || resource.url || resource.file_url);
  const match = path.match(/\.([a-z0-9]+)(?:[?#].*)?$/i);
  return match ? match[1].toUpperCase() : '';
}

function truncate(value, length) {
  const text = trimmed(value);
  if (text.length <= length) return text;
  return `${text.slice(0, Math.max(0, length - 3))}...`;
}

function normalizeResource(resource) {
  const item = resource && typeof resource === 'object' ? resource : {};
  return {
    id: positiveInteger(item.id),
    title: trimmed(item.title) || 'Resources',
    description: truncate(item.description, 200),
    type: resourceType(item),
    href: resourceHref(item)
  };
}

router.get('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const resourcesQuery = trimmed(req.query && req.query.q);
  const params = { per_page: 30 };
  if (resourcesQuery) {
    params.search = resourcesQuery;
  }

  const result = await getResources(token, params);
  const resources = resourceItemsFrom(result).map(normalizeResource);

  return res.render('resources/index', {
    title: 'Resources',
    activeNav: 'explore',
    resources,
    resourcesQuery
  });
}, { redirectOn401: '/login?status=auth-required', notFoundTitle: 'Resources' }));

function normalizeOrderItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const id = positiveInteger(item.id);
      const sortOrder = Number(item.sort_order);
      if (id === null || !Number.isInteger(sortOrder)) return null;
      return { id, sort_order: sortOrder };
    })
    .filter(Boolean);
}

function parseSubmittedItems(value) {
  if (Array.isArray(value)) {
    return normalizeOrderItems(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    try {
      return normalizeOrderItems(JSON.parse(value));
    } catch {
      return [];
    }
  }

  if (value && typeof value === 'object') {
    return normalizeOrderItems(Object.values(value));
  }

  return [];
}

async function buildReorderItems(token, body) {
  const submitted = parseSubmittedItems(body.items);
  if (submitted.length > 0) {
    return submitted;
  }

  const resourceId = positiveInteger(body.resource_id);
  const direction = trimmed(body.direction);
  if (resourceId === null || !['up', 'down'].includes(direction)) {
    return [];
  }

  const result = await getResources(token, { per_page: 50 });
  const rows = resourceItemsFrom(result)
    .map((resource, index) => ({
      id: positiveInteger(resource.id),
      sort_order: Number.isInteger(Number(resource.sort_order)) ? Number(resource.sort_order) : index
    }))
    .filter((resource) => resource.id !== null)
    .sort((left, right) => {
      if (left.sort_order !== right.sort_order) return left.sort_order - right.sort_order;
      return right.id - left.id;
    });

  const index = rows.findIndex((resource) => resource.id === resourceId);
  if (index === -1) {
    throw new ApiError('Resource not found', 404);
  }

  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= rows.length) {
    return null;
  }

  [rows[index], rows[swapWith]] = [rows[swapWith], rows[index]];
  return rows.map((resource, position) => ({
    id: resource.id,
    sort_order: position
  }));
}

router.post('/upload', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  return res.redirect('/resources/upload?status=resource-upload-failed');
}));

router.post('/reorder', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  try {
    const items = await buildReorderItems(token, req.body);
    if (items === null) {
      return res.redirect(libraryRedirect(req));
    }
    if (items.length === 0) {
      return res.redirect(libraryRedirect(req, 'resource-reorder-failed'));
    }

    await reorderResources(token, { items });
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    if (isNotFound(error) || isForbidden(error)) throw error;
    return res.redirect(libraryRedirect(req, 'resource-reorder-failed'));
  }

  return res.redirect(libraryRedirect(req));
}));

router.post('/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  try {
    await deleteResource(token, id);
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    if (isNotFound(error) || isForbidden(error)) throw error;
    return res.redirect('/resources/library?status=resource-delete-failed');
  }

  return res.redirect('/resources/library?status=resource-deleted');
}));

router.post('/:id(\\d+)/react', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const emoji = trimmed(req.body.emoji);
  let status = 'reaction-failed';

  if (RESOURCE_REACTIONS.has(emoji)) {
    try {
      const result = await toggleReaction(token, {
        target_type: 'resource',
        target_id: id,
        reaction_type: emoji
      });
      const action = result && result.data && result.data.action;
      status = action === 'removed' ? 'reaction-removed' : 'reaction-added';
    } catch (error) {
      if (redirectAuthIfNeeded(error, res)) return undefined;
      if (isNotFound(error)) throw error;
      status = 'reaction-failed';
    }
  }

  return res.redirect(commentsRedirect(id, status, 'resource-reactions'));
}));

router.post('/:id(\\d+)/comments/add', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const body = trimmed(req.body.body, 5000);
  const parentId = positiveInteger(req.body.parent_id);
  if (body === '') {
    return res.redirect(commentsRedirect(id, 'comment-invalid'));
  }

  let status = parentId !== null ? 'reply-added' : 'comment-added';
  try {
    await createComment(token, {
      target_type: 'resource',
      target_id: id,
      content: body,
      parent_id: parentId
    });
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    if (isNotFound(error)) throw error;
    status = 'comment-failed';
  }

  return res.redirect(commentsRedirect(id, status));
}));

router.post('/:id(\\d+)/comments/:commentId(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  const commentId = Number(req.params.commentId);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let status = 'comment-deleted';
  try {
    await deleteComment(token, commentId);
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    status = 'comment-delete-failed';
  }

  return res.redirect(commentsRedirect(id, status));
}));

module.exports = router;
