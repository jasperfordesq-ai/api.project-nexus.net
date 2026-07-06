// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  getResources,
  getResourceCategories,
  getResourceCategoryTree,
  getProfile,
  getComments,
  getReactionSummary,
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
const RESOURCE_REACTION_LABELS = {
  like: 'Like',
  love: 'Love',
  laugh: 'Haha',
  wow: 'Wow',
  sad: 'Sad',
  celebrate: 'Celebrate'
};

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

function objectFrom(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function resourceItemsFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

function listFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.categories)) return data.categories;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

function metaFrom(result) {
  if (!result || typeof result !== 'object') return {};
  if (result.meta && typeof result.meta === 'object') return result.meta;
  if (result.pagination && typeof result.pagination === 'object') return result.pagination;
  return {};
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

function fileExtension(resource) {
  const path = trimmed(resource.file_path || resource.url || resource.file_url);
  const match = path.match(/\.([a-z0-9]+)(?:[?#].*)?$/i);
  if (match) return match[1].toUpperCase();

  const type = trimmed(resource.file_type);
  if (type.includes('/')) {
    const [, subtype] = type.split('/');
    return trimmed(subtype).toUpperCase() || 'FILE';
  }
  return type.toUpperCase() || 'FILE';
}

function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function resourceCategory(resource) {
  const category = resource.category && typeof resource.category === 'object' ? resource.category : {};
  const id = positiveInteger(resource.category_id || category.id);
  const name = trimmed(resource.category_name || category.name);
  const color = trimmed(resource.category_color || category.color || 'grey');
  return name ? { id, name, color } : null;
}

function uploaderName(resource) {
  const uploader = resource.uploader && typeof resource.uploader === 'object' ? resource.uploader : {};
  return trimmed(resource.uploader_name || uploader.name || uploader.full_name);
}

function normalizeLibraryResource(resource) {
  const item = resource && typeof resource === 'object' ? resource : {};
  const id = positiveInteger(item.id);
  return {
    id,
    title: trimmed(item.title) || 'File',
    description: truncate(item.description, 220),
    fileExtension: fileExtension(item),
    fileSize: formatFileSize(item.file_size),
    downloads: Number.isInteger(Number(item.downloads)) ? Number(item.downloads) : 0,
    uploaderName: uploaderName(item),
    category: resourceCategory(item),
    createdAt: trimmed(item.created_at),
    downloadHref: id ? `/resources/${id}/download` : '',
    commentsHref: id ? `/resources/${id}/comments` : '',
    likeCount: Number.isInteger(Number(item.like_count || item.reaction_count || item.reactions_count))
      ? Number(item.like_count || item.reaction_count || item.reactions_count)
      : 0,
    commentCount: Number.isInteger(Number(item.comment_count || item.comments_count))
      ? Number(item.comment_count || item.comments_count)
      : 0,
    canManage: Boolean(item.can_manage || item.can_delete || item.is_owner)
  };
}

function normalizeCategory(category) {
  const item = category && typeof category === 'object' ? category : {};
  const children = Array.isArray(item.children) ? item.children.map(normalizeCategory).filter((child) => child.id && child.name) : [];
  return {
    id: positiveInteger(item.id),
    name: trimmed(item.name),
    color: trimmed(item.color || 'grey'),
    resourceCount: Number.isInteger(Number(item.resource_count || item.resources_count))
      ? Number(item.resource_count || item.resources_count)
      : 0,
    children
  };
}

function normalizeComment(comment) {
  const item = objectFrom(comment);
  const author = objectFrom(item.author || item.user);
  return {
    id: positiveInteger(item.id),
    content: trimmed(item.content || item.body),
    createdAt: trimmed(item.created_at || item.createdAt),
    userId: positiveInteger(item.user_id || author.id),
    authorName: trimmed(item.author_name || item.user_name || author.name || [author.first_name, author.last_name].filter(Boolean).join(' ')) || 'Community member',
    replies: (Array.isArray(item.replies) ? item.replies : Array.isArray(item.children) ? item.children : []).map(normalizeComment)
  };
}

function commentCount(comments) {
  return comments.reduce((total, comment) => total + 1 + commentCount(comment.replies || []), 0);
}

function reactionSummaryFrom(result) {
  const data = objectFrom(dataFrom(result));
  return {
    counts: objectFrom(data.counts),
    total: positiveInteger(data.total) || 0,
    userReaction: trimmed(data.user_reaction || data.userReaction)
  };
}

function statusMessage(status) {
  switch (status) {
    case 'resource-uploaded':
      return { type: 'success', title: 'Success', message: 'Your resource was uploaded.' };
    case 'resource-deleted':
      return { type: 'success', title: 'Success', message: 'The resource was deleted.' };
    case 'resource-delete-failed':
      return { type: 'error', title: 'There is a problem', message: 'We could not delete the resource. Please try again.' };
    case 'resource-reorder-failed':
      return { type: 'error', title: 'There is a problem', message: 'We could not save the new order. Please try again.' };
    default:
      return null;
  }
}

function commentsStatusMessage(status) {
  switch (status) {
    case 'comment-added':
      return { type: 'success', title: 'Success', message: 'Your comment was posted.' };
    case 'reply-added':
      return { type: 'success', title: 'Success', message: 'Your reply was posted.' };
    case 'reaction-added':
      return { type: 'success', title: 'Success', message: 'Your reaction was saved.' };
    case 'reaction-removed':
      return { type: 'success', title: 'Success', message: 'Your reaction was removed.' };
    case 'comment-deleted':
      return { type: 'success', title: 'Success', message: 'The comment was deleted.' };
    case 'comment-invalid':
      return { type: 'error', title: 'There is a problem', message: 'Enter a comment before submitting.', anchor: 'body' };
    case 'comment-failed':
      return { type: 'error', title: 'There is a problem', message: 'We could not post your comment. Please try again.', anchor: 'body' };
    case 'comment-delete-failed':
      return { type: 'error', title: 'There is a problem', message: 'We could not delete the comment. Please try again.' };
    case 'reaction-failed':
      return { type: 'error', title: 'There is a problem', message: 'We could not save your reaction. Please try again.' };
    default:
      return null;
  }
}

function uploadStatusMessage(status) {
  switch (status) {
    case 'resource-upload-failed':
      return { type: 'error', title: 'There is a problem', message: 'We could not upload the resource. Please try again.' };
    default:
      return null;
  }
}

function libraryQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value) !== '') {
      query.set(key, String(value));
    }
  });
  const text = query.toString();
  return text ? `?${text}` : '';
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

router.get('/library', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const searchQuery = trimmed(req.query && req.query.q);
  const selectedCategory = positiveInteger(req.query && req.query.category_id);
  const cursor = trimmed(req.query && req.query.cursor);
  const reorderMode = trimmed(req.query && req.query.reorder) === '1';

  const params = { per_page: 20 };
  if (searchQuery) params.search = searchQuery;
  if (selectedCategory !== null) params.category_id = selectedCategory;
  if (cursor) params.cursor = cursor;

  const [resourcesResult, categoriesResult, treeResult] = await Promise.all([
    getResources(token, params),
    getResourceCategories(token),
    getResourceCategoryTree(token)
  ]);

  const resources = resourceItemsFrom(resourcesResult).map(normalizeLibraryResource);
  const meta = metaFrom(resourcesResult);
  const nextCursor = trimmed(meta.next_cursor || meta.nextCursor || meta.cursor);
  const hasMore = Boolean(meta.has_more || meta.hasMore || nextCursor);
  const flatCategories = listFrom(categoriesResult).map(normalizeCategory).filter((category) => category.id && category.name);
  const categoryTree = listFrom(treeResult).map(normalizeCategory).filter((category) => category.id && category.name);
  const hasFilters = Boolean(searchQuery || selectedCategory !== null);

  return res.render('resources/library', {
    title: 'Resource library',
    activeNav: 'explore',
    resources,
    categoryTree,
    flatCategories,
    selectedCategory,
    searchQuery,
    cursor,
    hasMore,
    nextCursor,
    hasFilters,
    status: statusMessage(trimmed(req.query && req.query.status)),
    reorderMode,
    resourceCountText: resources.length === 0 ? 'No resources' : resources.length === 1 ? '1 resource' : `${resources.length} resources`,
    clearHref: '/resources/library',
    loadMoreHref: hasMore && nextCursor ? `/resources/library${libraryQuery({
      q: searchQuery,
      category_id: selectedCategory,
      reorder: reorderMode ? '1' : '',
      cursor: nextCursor
    })}` : ''
  });
}, { redirectOn401: '/login?status=auth-required', notFoundTitle: 'Resource library' }));

router.get('/upload', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let flatCategories = [];
  try {
    const categoriesResult = await getResourceCategories(token);
    flatCategories = listFrom(categoriesResult).map(normalizeCategory).filter((category) => category.id && category.name);
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
  }

  return res.render('resources/upload', {
    title: 'Upload a resource',
    activeNav: 'explore',
    flatCategories,
    maxSizeLabel: '10MB',
    allowedLabel: 'PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, JPG, PNG, GIF, WEBP',
    status: uploadStatusMessage(trimmed(req.query && req.query.status))
  });
}, { redirectOn401: '/login?status=auth-required', notFoundTitle: 'Upload a resource' }));

router.get('/:id(\\d+)/comments', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const resourceId = Number(req.params.id);
  const [profileResult, resourcesResult, commentsResult, reactionsResult] = await Promise.all([
    getProfile(token).catch(() => null),
    getResources(token, { per_page: 50 }),
    getComments(token, { target_type: 'resource', target_id: resourceId }),
    getReactionSummary(token, 'resource', resourceId)
  ]);

  const resource = resourceItemsFrom(resourcesResult).find((item) => positiveInteger(item && item.id) === resourceId);
  if (!resource) {
    throw new ApiError('Resource not found', 404);
  }

  const commentsData = objectFrom(dataFrom(commentsResult));
  const comments = (Array.isArray(commentsData.comments) ? commentsData.comments : resourceItemsFrom(commentsResult)).map(normalizeComment);
  const reactions = reactionSummaryFrom(reactionsResult);
  const profile = objectFrom(dataFrom(profileResult));
  const currentUserId = positiveInteger(profile.id || profile.user_id);

  return res.render('resources/comments', {
    title: `Comments on ${trimmed(resource.title) || 'resource'}`,
    activeNav: 'explore',
    resourceId,
    resourceTitle: trimmed(resource.title) || 'Resource',
    comments,
    commentsTotal: positiveInteger(commentsData.count) || commentCount(comments),
    currentUserId,
    reactions,
    reactionLabels: RESOURCE_REACTION_LABELS,
    status: commentsStatusMessage(trimmed(req.query && req.query.status))
  });
}, { redirectOn401: '/login?status=auth-required', notFoundTitle: 'Resource comments' }));

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
