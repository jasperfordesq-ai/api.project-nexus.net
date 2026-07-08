// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  getFeedPosts,
  getFeedPost,
  createFeedPost,
  updateFeedPost,
  deleteFeedPost,
  likeFeedPost,
  unlikeFeedPost,
  getFeedComments,
  addFeedComment,
  deleteFeedComment,
  getMyGroups,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { validateReturnUrl, validateImageUrl } = require('../lib/urlValidator');
const { audit } = require('../lib/auditLogger');

const router = express.Router();

router.use(requireAuth);

function allowed(value, choices, fallback) {
  return choices.includes(value) ? value : fallback;
}

function intQuery(value, fallback, min, max) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
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

function firstPresent(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '');
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function truncate(value, maxLength = 500) {
  const clean = stripHtml(value);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3).trim()}...`;
}

function itemTypeLabel(type) {
  const labels = {
    post: 'Post',
    listing: 'Listing',
    event: 'Event',
    goal: 'Goal',
    poll: 'Poll',
    review: 'Review',
    job: 'Job',
    challenge: 'Challenge',
    volunteer: 'Volunteering',
    blog: 'Blog',
    discussion: 'Discussion',
    resource: 'Resource'
  };
  return labels[type] || 'Activity';
}

function itemTypeClass(type) {
  if (type === 'listing') return 'govuk-tag--blue';
  if (type === 'event') return 'govuk-tag--green';
  if (type === 'goal') return 'govuk-tag--purple';
  if (type === 'poll') return 'govuk-tag--yellow';
  return 'govuk-tag--grey';
}

function detailUrlFor(item) {
  const id = item.id;
  if (!id) return null;
  if (item.type === 'listing') return `/listings/${id}`;
  if (item.type === 'event') return `/events/${id}`;
  if (item.type === 'volunteer') return `/volunteering/opportunities/${id}`;
  if (item.type === 'goal') return `/goals/${id}`;
  if (item.type === 'job') return `/jobs/${id}`;
  if (item.type === 'challenge') return `/ideation/${id}`;
  return item.type === 'post' ? `/feed/${id}` : null;
}

function normalizeFeedItem(item) {
  const type = firstPresent(item.type, item.item_type, 'post');
  const author = item.author || item.user || {};
  const media = Array.isArray(item.media) ? item.media : [];
  const title = firstPresent(item.title, item.name, itemTypeLabel(type));
  return {
    id: item.id,
    type,
    typeLabel: itemTypeLabel(type),
    typeClass: itemTypeClass(type),
    title,
    detailUrl: detailUrlFor({ id: item.id, type }),
    authorName: firstPresent(author.name, author.full_name, author.firstName, author.first_name, item.author_name, 'Community member'),
    authorAvatar: firstPresent(author.avatar_url, author.avatarUrl),
    createdAt: firstPresent(item.created_at, item.createdAt),
    content: truncate(firstPresent(item.content, item.body, item.description, '')),
    imageUrl: firstPresent(item.image_url, item.imageUrl, media[0]?.thumbnail_url, media[0]?.file_url),
    likesCount: Number(firstPresent(item.likes_count, item.like_count, item.likeCount, 0)),
    commentsCount: Number(firstPresent(item.comments_count, item.comment_count, item.commentCount, 0))
  };
}

// List feed posts
router.get('/', asyncRoute(async (req, res) => {
  const typeOptions = ['all', 'following', 'saved', 'posts', 'listings', 'events', 'goals', 'polls', 'jobs', 'challenges', 'volunteering', 'blogs', 'discussions'];
  const selectedType = allowed(req.query.type, typeOptions, 'all');
  const selectedMode = allowed(req.query.mode, ['ranking', 'recent'], 'ranking');
  const selectedSubtype = selectedType === 'listings' ? allowed(req.query.subtype, ['offer', 'request'], '') : '';
  const perPage = intQuery(req.query.per_page, 10, 1, 50);
  const cursor = typeof req.query.cursor === 'string' && req.query.cursor.trim() ? req.query.cursor.trim() : null;

  let feedResult = { items: [], has_more: false, cursor: null };
  let error = null;
  try {
    feedResult = await getFeedPosts(req.token, {
      limit: perPage,
      type: selectedType,
      mode: selectedMode === 'recent' ? 'recent' : 'ranked',
      subtype: selectedSubtype || null,
      cursor
    });
  } catch (feedError) {
    error = 'Feed items could not be loaded. Try again.';
  }

  const items = unwrapList(feedResult).map(normalizeFeedItem);
  const hasMore = Boolean(firstPresent(feedResult.has_more, feedResult.hasMore, feedResult.meta?.has_more, false));
  const nextCursor = firstPresent(feedResult.cursor, feedResult.meta?.cursor, null);

  res.render('feed/index', {
    title: 'Feed',
    activeNav: 'feed',
    communityName: res.locals.tenantName || res.locals.serviceName || 'Project NEXUS Accessible',
    items,
    typeOptions,
    selectedType,
    selectedMode,
    selectedSubtype,
    perPage,
    meta: { hasMore, cursor: nextCursor },
    error,
    status: req.query.status || null,
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
