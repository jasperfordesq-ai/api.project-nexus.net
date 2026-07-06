// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  getBlogPost,
  createComment,
  updateComment,
  deleteComment,
  toggleReaction,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();
const BLOG_REACTIONS = new Set(['like', 'love', 'laugh', 'wow', 'sad', 'celebrate']);

function tokenFrom(req) {
  return req.signedCookies.token || '';
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

function redirectAuthIfNeeded(error, res) {
  if (isAuthError(error)) {
    res.redirect('/login?status=auth-required');
    return true;
  }
  return false;
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined
    ? result.data
    : result;
}

async function blogPostFromSlug(token, slug) {
  const post = dataFrom(await getBlogPost(token, slug));
  if (!post || typeof post !== 'object') {
    throw new ApiError('Blog post not found', 404);
  }
  return post;
}

function postIdFrom(post) {
  return positiveInteger(post.id || post.post_id || post.blog_id);
}

function blogPostRedirect(slug, status, fragment = 'comments') {
  const suffix = fragment ? `#${fragment}` : '';
  return `/blog/${encodeURIComponent(slug)}?status=${encodeURIComponent(status)}${suffix}`;
}

function blogCommentsRedirect(slug, status, fragment = 'comments') {
  if (!slug) return '/blog';
  const suffix = fragment ? `#${fragment}` : '';
  return `/blog/${encodeURIComponent(slug)}/comments?status=${encodeURIComponent(status)}${suffix}`;
}

function commentMutationRedirect(req, status, fragment = 'comments') {
  const reviewId = positiveInteger(req.body.review_id);
  if (reviewId !== null) {
    const suffix = fragment ? `#${fragment}` : '';
    return `/reviews/${reviewId}/comments?status=${encodeURIComponent(status)}${suffix}`;
  }

  return blogCommentsRedirect(trimmed(req.body.slug), status, fragment);
}

async function createBlogComment(req, res, slug, redirectToPost) {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const body = trimmed(req.body.body, 5000);
  const parentId = positiveInteger(req.body.parent_id);
  if (body === '') {
    return res.redirect(redirectToPost
      ? blogPostRedirect(slug, 'comment-invalid')
      : blogCommentsRedirect(slug, 'comment-invalid'));
  }

  let status = parentId !== null && !redirectToPost ? 'reply-added' : 'comment-added';
  try {
    const post = await blogPostFromSlug(token, slug);
    const postId = postIdFrom(post);
    if (postId === null) {
      status = 'comment-failed';
    } else {
      await createComment(token, {
        target_type: 'blog',
        target_id: postId,
        content: body,
        parent_id: redirectToPost ? null : parentId
      });
    }
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    if (isNotFound(error)) throw error;
    status = 'comment-failed';
  }

  return res.redirect(redirectToPost
    ? blogPostRedirect(slug, status)
    : blogCommentsRedirect(slug, status));
}

router.post('/comments/:id(\\d+)/update', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const content = trimmed(req.body.content, 5000);
  if (content === '') {
    return res.redirect(commentMutationRedirect(req, 'comment-empty'));
  }

  let status = 'comment-updated';
  try {
    await updateComment(token, id, { content });
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    status = 'comment-update-failed';
  }

  return res.redirect(commentMutationRedirect(req, status));
}));

router.post('/comments/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let status = 'comment-deleted';
  try {
    await deleteComment(token, id);
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    status = 'comment-delete-failed';
  }

  return res.redirect(commentMutationRedirect(req, status));
}));

router.post('/comments/:id(\\d+)/react', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const emoji = trimmed(req.body.emoji);
  let status = 'reaction-failed';
  if (BLOG_REACTIONS.has(emoji)) {
    try {
      const result = await toggleReaction(token, {
        target_type: 'comment',
        target_id: id,
        reaction_type: emoji
      });
      const action = result && result.data && result.data.action;
      status = action === 'removed' ? 'reaction-removed' : 'reaction-added';
    } catch (error) {
      if (redirectAuthIfNeeded(error, res)) return undefined;
      status = 'reaction-failed';
    }
  }

  return res.redirect(commentMutationRedirect(req, status, `comment-${id}`));
}));

router.post('/:slug([a-zA-Z0-9_-]+)/comments/add', asyncRoute(async (req, res) => (
  createBlogComment(req, res, req.params.slug, false)
)));

router.post('/:slug([a-zA-Z0-9_-]+)/comments', asyncRoute(async (req, res) => (
  createBlogComment(req, res, req.params.slug, true)
)));

router.post('/:slug([a-zA-Z0-9_-]+)/like', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const slug = req.params.slug;
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let status = 'like-failed';
  try {
    const post = await blogPostFromSlug(token, slug);
    const postId = postIdFrom(post);
    if (postId !== null) {
      const result = await toggleReaction(token, {
        target_type: 'blog',
        target_id: postId,
        reaction_type: 'like'
      });
      const action = result && result.data && result.data.action;
      status = action === 'removed' ? 'unliked' : 'liked';
    }
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    if (isNotFound(error)) throw error;
    status = 'like-failed';
  }

  return res.redirect(blogPostRedirect(slug, status, 'reactions'));
}));

router.post('/:slug([a-zA-Z0-9_-]+)/react', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const slug = req.params.slug;
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const emoji = trimmed(req.body.emoji);
  let status = 'reaction-failed';
  if (BLOG_REACTIONS.has(emoji)) {
    try {
      const post = await blogPostFromSlug(token, slug);
      const postId = postIdFrom(post);
      if (postId !== null) {
        const result = await toggleReaction(token, {
          target_type: 'blog',
          target_id: postId,
          reaction_type: emoji
        });
        const action = result && result.data && result.data.action;
        status = action === 'removed' ? 'reaction-removed' : 'reaction-added';
      }
    } catch (error) {
      if (redirectAuthIfNeeded(error, res)) return undefined;
      if (isNotFound(error)) throw error;
      status = 'reaction-failed';
    }
  }

  return res.redirect(blogCommentsRedirect(slug, status, 'post-reactions'));
}));

module.exports = router;
