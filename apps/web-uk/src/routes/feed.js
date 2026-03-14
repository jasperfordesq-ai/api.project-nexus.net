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

  const [postResult, commentsResult] = await Promise.all([
    getFeedPost(req.token, id),
    getFeedComments(req.token, id, { limit: 50 }).catch(() => ({ data: [] }))
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
