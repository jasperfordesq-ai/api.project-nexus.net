// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  getFeedPosts,
  getFeedPost,
  getFeedPostV2,
  getFeedHashtags,
  getFeedHashtagPosts,
  createFeedPost,
  updateFeedPost,
  deleteFeedPost,
  likeFeedPost,
  unlikeFeedPost,
  getFeedComments,
  addFeedComment,
  deleteFeedComment,
  getComments,
  getMyGroups,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { validateReturnUrl, validateImageUrl } = require('../lib/urlValidator');
const { audit } = require('../lib/auditLogger');

const router = express.Router();

function tokenFrom(req) {
  return req.signedCookies && req.signedCookies.token ? req.signedCookies.token : '';
}

function trimmed(value, limit = null) {
  const text = String(value || '').trim();
  return limit === null ? text : text.slice(0, limit);
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined
    ? result.data
    : result;
}

function hashtagRows(result) {
  const data = dataFrom(result);
  const rows = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : []);

  return rows.map((row) => {
    const tag = trimmed(row && (row.tag || row.name || row.hashtag), 100).replace(/^#/, '');
    const count = Number(row && (row.post_count !== undefined ? row.post_count : row.postCount));
    const postCount = Number.isFinite(count) && count >= 0 ? count : 0;
    return {
      tag,
      postCount,
      postCountLabel: postCount === 0 ? 'No posts' : `${postCount} post${postCount === 1 ? '' : 's'}`
    };
  }).filter((row) => row.tag);
}

function strippedSearch(value) {
  return trimmed(value, 100).replace(/[%_]/g, '');
}

function positiveInteger(value, fallback, min = 1, max = 1000) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function pluralLabel(count, singular, plural = `${singular}s`, zero = `0 ${plural}`) {
  if (count === 0) return zero;
  if (count === 1) return `1 ${singular}`;
  return `${count} ${plural}`;
}

function plainParagraphs(value) {
  const text = String(value || '')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();

  if (!text) return [];
  return text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

function feedMedia(row) {
  const media = Array.isArray(row && row.media) ? row.media : [];
  const rows = media.length > 0
    ? media
    : (row && row.image_url ? [{ file_url: row.image_url, thumbnail_url: row.image_url, alt_text: null }] : []);

  return rows.slice(0, 4).map((item) => {
    const fileUrl = trimmed(item && (item.file_url || item.url));
    const thumbnailUrl = trimmed(item && (item.thumbnail_url || item.thumbnailUrl || fileUrl));
    return {
      fileUrl,
      thumbnailUrl,
      altText: trimmed(item && (item.alt_text || item.altText), 500) || 'Image attached to this feed item'
    };
  }).filter((item) => item.fileUrl);
}

function normalizeFeedPost(row) {
  const id = positiveInteger(row && row.id, 0, 0, Number.MAX_SAFE_INTEGER);
  const likeCount = positiveInteger(row && (row.likes_count !== undefined ? row.likes_count : row.likeCount), 0, 0, Number.MAX_SAFE_INTEGER);
  const commentCount = positiveInteger(row && (row.comments_count !== undefined ? row.comments_count : row.commentCount), 0, 0, Number.MAX_SAFE_INTEGER);
  const author = row && row.author && typeof row.author === 'object' ? row.author : {};

  return {
    id,
    authorName: trimmed(author.name || row && row.author_name) || 'A community member',
    authorAvatar: trimmed(author.avatar_url || row && row.author_avatar_url),
    createdAt: trimmed(row && (row.created_at || row.createdAt)),
    contentParagraphs: plainParagraphs(row && row.content),
    media: feedMedia(row),
    likeCount,
    commentCount,
    likeLabel: pluralLabel(likeCount, 'like'),
    commentLabel: pluralLabel(commentCount, 'comment'),
    isLiked: !!(row && (row.is_liked || row.isLiked))
  };
}

function collectionMeta(result) {
  return result && typeof result === 'object' && result.meta && typeof result.meta === 'object'
    ? result.meta
    : {};
}

function feedCollectionRows(result) {
  const data = dataFrom(result);
  return Array.isArray(data) ? data : [];
}

function feedStatusMessage(status) {
  const messages = {
    'reaction-added': { type: 'success', text: 'Your reaction has been added.' },
    'reaction-removed': { type: 'success', text: 'Your reaction has been removed.' },
    'reaction-failed': { type: 'error', text: 'Sorry, we could not save your reaction. Try again later.' },
    'not-interested': { type: 'success', text: 'Thank you. We will show you less like this.' },
    'not-interested-failed': { type: 'error', text: 'Sorry, we could not record your feedback. Try again later.' },
    'like-failed': { type: 'error', text: 'Sorry, we could not save your reaction. Try again later.' },
    'auth-required': { type: 'error', text: 'Sign in to take part in the feed.' }
  };
  return messages[status] || null;
}

function feedPostStatusMessage(status) {
  const messages = {
    'reaction-added': { type: 'success', text: 'Your reaction has been added.' },
    'reaction-removed': { type: 'success', text: 'Your reaction has been removed.' },
    'comment-created': { type: 'success', text: 'Your comment has been posted.' },
    'comment-updated': { type: 'success', text: 'Your comment has been updated.' },
    'comment-deleted': { type: 'success', text: 'Your comment has been deleted.' },
    'share-added': { type: 'success', text: 'This post has been shared to your feed.' },
    'share-removed': { type: 'success', text: 'This post has been removed from your feed.' },
    'save-added': { type: 'success', text: 'This post has been saved.' },
    'save-removed': { type: 'success', text: 'This post has been removed from your saved items.' }
  };
  return messages[status] || null;
}

router.get('/hashtags', asyncRoute(async (req, res) => {
  const searchQuery = trimmed(req.query.q, 100);
  const searchTerm = strippedSearch(searchQuery);
  const isSearching = searchTerm.length >= 1;
  let hashtags = [];
  let errorMessage = null;

  try {
    const result = await getFeedHashtags(tokenFrom(req), isSearching
      ? { q: searchTerm, limit: 50 }
      : { limit: 50, days: 7 });
    hashtags = hashtagRows(result);
  } catch {
    errorMessage = 'Sorry, there is a problem with this page. Try again later.';
  }

  res.render('feed/hashtags', {
    title: 'Hashtags',
    activeNav: 'feed',
    alphaActiveNav: 'feed',
    communityName: res.locals.tenantName || res.locals.serviceName || 'this community',
    hashtags,
    searchQuery,
    isSearching,
    errorMessage
  });
}));

router.get('/posts/:id(\\d+)', asyncRoute(async (req, res) => {
  const id = positiveInteger(req.params.id, 0, 1, Number.MAX_SAFE_INTEGER);
  const token = tokenFrom(req);
  const result = await getFeedPostV2(token, id);
  const item = normalizeFeedPost(dataFrom(result));
  const comments = token
    ? feedCollectionRows(await getComments(token, { target_type: 'post', target_id: id }).catch(() => ({ data: [] })))
    : [];

  res.render('feed/post', {
    title: 'Post',
    activeNav: 'feed',
    alphaActiveNav: 'feed',
    communityName: res.locals.tenantName || res.locals.serviceName || 'this community',
    item,
    comments,
    requiresAuth: !token,
    statusMessage: feedPostStatusMessage(trimmed(req.query.status)),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Post not found' }));

router.get('/hashtag/:tag([A-Za-z0-9_]{1,100})', asyncRoute(async (req, res) => {
  const tag = trimmed(req.params.tag, 100).replace(/^#/, '').toLowerCase();
  const perPage = positiveInteger(req.query.per_page, 20, 1, 50);
  const cursor = trimmed(req.query.cursor, 500);
  const query = { limit: perPage };
  if (cursor) query.cursor = cursor;

  let items = [];
  let totalCount = 0;
  let hasMore = false;
  let nextCursor = '';
  let errorMessage = null;

  try {
    const result = await getFeedHashtagPosts(tokenFrom(req), tag, query);
    const meta = collectionMeta(result);
    items = feedCollectionRows(result).map(normalizeFeedPost).filter((item) => item.id > 0);
    totalCount = positiveInteger(meta.total_items, items.length, 0, Number.MAX_SAFE_INTEGER);
    hasMore = !!meta.has_more;
    nextCursor = trimmed(meta.cursor, 500);
  } catch {
    errorMessage = 'Sorry, there is a problem with this page. Try again later.';
  }

  res.render('feed/hashtag', {
    title: `#${tag}`,
    activeNav: 'feed',
    alphaActiveNav: 'feed',
    communityName: res.locals.tenantName || res.locals.serviceName || 'this community',
    tag,
    items,
    totalCount,
    totalCountLabel: pluralLabel(totalCount, 'post', 'posts', 'No posts'),
    hasMore,
    nextCursor,
    perPage,
    nextHref: hasMore && nextCursor ? `/feed/hashtag/${encodeURIComponent(tag)}?cursor=${encodeURIComponent(nextCursor)}&per_page=${perPage}` : '',
    requiresAuth: !tokenFrom(req),
    statusMessage: feedStatusMessage(trimmed(req.query.status)),
    errorMessage
  });
}));

router.use(requireAuth);

// List feed posts
router.get('/', asyncRoute(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 20;
  const groupId = req.query.group_id || null;

  const [feedResult, myGroupsResult] = await Promise.all([
    getFeedPosts(req.token, { page, limit, group_id: groupId }),
    getMyGroups(req.token).catch(() => ({ data: [] }))
  ]);

  const posts = feedResult.data || [];
  const myGroups = myGroupsResult.data || [];

  res.render('feed/index', {
    title: 'Feed',
    posts,
    myGroups,
    groupId,
    pagination: feedResult.pagination || { page, total_pages: 1 },
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}));

// Create post form
router.get('/new', asyncRoute(async (req, res) => {
  const groupId = req.query.group_id || null;

  const myGroupsResult = await getMyGroups(req.token);
  const myGroups = myGroupsResult.data || [];

  res.render('feed/new', {
    title: 'Create a post',
    myGroups,
    selectedGroupId: groupId,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

// Create post
router.post('/new', audit.feedPostCreate(), asyncRoute(async (req, res) => {
  const { content, image_url, group_id } = req.body;

  const errors = [];

  if (!content || !content.trim()) {
    errors.push({ text: 'Enter some content for your post', href: '#content' });
  } else if (content.length > 5000) {
    errors.push({ text: 'Post content must be 5000 characters or fewer', href: '#content' });
  }

  if (errors.length > 0) {
    const myGroupsResult = await getMyGroups(req.token).catch(() => ({ data: [] }));
    const myGroups = myGroupsResult.data || [];

    return res.render('feed/new', {
      title: 'Create a post',
      errors,
      values: { content, image_url, group_id },
      myGroups,
      selectedGroupId: group_id,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    // Validate image URL to prevent XSS via javascript:, data:, etc.
    const safeImageUrl = image_url ? validateImageUrl(image_url.trim()) : null;

    const postData = {
      content: content.trim(),
      image_url: safeImageUrl,
      group_id: group_id ? parseInt(group_id, 10) : null
    };

    await createFeedPost(req.token, postData);

    if (req.flash) {
      req.flash('success', 'Post created successfully');
    }

    // Redirect back to feed or group feed
    if (group_id) {
      res.redirect(`/feed?group_id=${group_id}`);
    } else {
      res.redirect('/feed');
    }
  } catch (error) {
    // Handle non-401 errors by re-rendering form
    if (!(error instanceof ApiError && error.status === 401)) {
      const myGroupsResult = await getMyGroups(req.token).catch(() => ({ data: [] }));
      const myGroups = myGroupsResult.data || [];

      return res.render('feed/new', {
        title: 'Create a post',
        errors: [{ text: error.message || 'Unable to create post' }],
        values: { content, image_url, group_id },
        myGroups,
        selectedGroupId: group_id,
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// View single post with comments
router.get('/:id', asyncRoute(async (req, res) => {
  const { id } = req.params;

  const commentsPage = parseInt(req.query.comments_page, 10) || 1;

  const [postResult, commentsResult] = await Promise.all([
    getFeedPost(req.token, id),
    getFeedComments(req.token, id, { page: commentsPage, limit: 50 }).catch(() => ({ data: [] }))
  ]);

  const post = postResult.post || postResult;
  const comments = commentsResult.data || [];

  res.render('feed/detail', {
    title: 'Post',
    post,
    comments,
    commentsPagination: commentsResult.pagination || { page: 1, total_pages: 1 },
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}, { notFoundTitle: 'Post not found' }));

// Edit post form
router.get('/:id/edit', asyncRoute(async (req, res) => {
  const { id } = req.params;

  const postResult = await getFeedPost(req.token, id);
  const post = postResult.post || postResult;

  res.render('feed/edit', {
    title: 'Edit post',
    post,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Post not found' }));

// Update post
router.post('/:id/edit', audit.feedPostUpdate(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { content, image_url } = req.body;

  const errors = [];

  if (!content || !content.trim()) {
    errors.push({ text: 'Enter some content for your post', href: '#content' });
  } else if (content.length > 5000) {
    errors.push({ text: 'Post content must be 5000 characters or fewer', href: '#content' });
  }

  if (errors.length > 0) {
    return res.render('feed/edit', {
      title: 'Edit post',
      post: { id, content, image_url },
      errors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    // Validate image URL to prevent XSS via javascript:, data:, etc.
    const safeImageUrl = image_url ? validateImageUrl(image_url.trim()) : null;

    await updateFeedPost(req.token, id, {
      content: content.trim(),
      image_url: safeImageUrl
    });

    if (req.flash) {
      req.flash('success', 'Post updated successfully');
    }

    res.redirect(`/feed/${id}`);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to update post');
      }
      return res.redirect(`/feed/${id}/edit`);
    }
    throw error;
  }
}));

// Delete post
router.post('/:id/delete', audit.feedPostDelete(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  const returnTo = validateReturnUrl(req.body.return_to, '/feed');

  try {
    await deleteFeedPost(req.token, id);

    if (req.flash) {
      req.flash('success', 'Post deleted successfully');
    }

    res.redirect(returnTo);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to delete post');
      }
      return res.redirect(`/feed/${id}`);
    }
    throw error;
  }
}));

// Like post
router.post('/:id/like', asyncRoute(async (req, res) => {
  const { id } = req.params;
  const returnTo = validateReturnUrl(req.body.return_to, `/feed/${id}`);

  try {
    await likeFeedPost(req.token, id);
  } catch (error) {
    // Ignore "already liked" errors (400), re-throw 401
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    // Silently ignore other errors for like action
  }

  res.redirect(returnTo);
}));

// Unlike post
router.post('/:id/unlike', asyncRoute(async (req, res) => {
  const { id } = req.params;
  const returnTo = validateReturnUrl(req.body.return_to, `/feed/${id}`);

  try {
    await unlikeFeedPost(req.token, id);
  } catch (error) {
    // Ignore "not liked" errors (404), re-throw 401
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    // Silently ignore other errors for unlike action
  }

  res.redirect(returnTo);
}));

// Add comment
router.post('/:id/comments', audit.feedCommentCreate(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    if (req.flash) {
      req.flash('error', 'Enter a comment');
    }
    return res.redirect(`/feed/${id}`);
  }

  if (content.length > 2000) {
    if (req.flash) {
      req.flash('error', 'Comment must be 2000 characters or fewer');
    }
    return res.redirect(`/feed/${id}`);
  }

  try {
    await addFeedComment(req.token, id, content.trim());

    if (req.flash) {
      req.flash('success', 'Comment added');
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    if (req.flash) {
      req.flash('error', error.message || 'Unable to add comment');
    }
  }

  res.redirect(`/feed/${id}`);
}));

// Delete comment
router.post('/:id/comments/:commentId/delete', audit.feedCommentDelete(), asyncRoute(async (req, res) => {
  const { id, commentId } = req.params;

  try {
    await deleteFeedComment(req.token, id, commentId);

    if (req.flash) {
      req.flash('success', 'Comment deleted');
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    if (req.flash) {
      req.flash('error', error.message || 'Unable to delete comment');
    }
  }

  res.redirect(`/feed/${id}`);
}));

module.exports = router;
