// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  getBlogPosts,
  getBlogPost,
  getComments,
  getReactionSummary,
  getReactors,
  createComment,
  updateComment,
  deleteComment,
  toggleReaction,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();
const BLOG_REACTIONS = new Set(['like', 'love', 'laugh', 'wow', 'sad', 'celebrate']);
const BLOG_REACTION_LABELS = {
  like: 'Like',
  love: 'Love',
  laugh: 'Haha',
  wow: 'Wow',
  sad: 'Sad',
  celebrate: 'Celebrate'
};
const BLOG_REACTION_EMOJI = {
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

function redirectTo(res, pathname) {
  const urlFor = typeof res.locals.urlFor === 'function' ? res.locals.urlFor : (value) => value;
  return res.redirect(urlFor(pathname));
}

function redirectAuthIfNeeded(error, res) {
  if (isAuthError(error)) {
    redirectTo(res, '/login?status=auth-required');
    return true;
  }
  return false;
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined
    ? result.data
    : result;
}

function metaFrom(result) {
  return result && typeof result === 'object' && result.meta && typeof result.meta === 'object'
    ? result.meta
    : {};
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function normalizePost(rawPost) {
  const post = asObject(rawPost);
  const category = asObject(post.category);
  const author = asObject(post.author);
  return {
    id: positiveInteger(post.id || post.post_id || post.blog_id),
    slug: trimmed(post.slug || post.id),
    title: trimmed(post.title),
    excerpt: trimmed(post.excerpt || post.summary),
    content: String(post.content || post.body || ''),
    featuredImage: trimmed(post.featured_image || post.featuredImage || post.image_url || post.image),
    category: {
      id: positiveInteger(category.id || post.category_id),
      name: trimmed(category.name || post.category_name || post.category)
    },
    author: {
      id: positiveInteger(author.id || post.author_id),
      name: trimmed(author.name || post.author_name || [author.first_name, author.last_name].filter(Boolean).join(' '))
    },
    publishedAt: trimmed(post.published_at || post.created_at || post.createdAt),
    updatedAt: trimmed(post.updated_at || post.updatedAt),
    readingTime: positiveInteger(post.reading_time || post.readingTime),
    likeCount: positiveInteger(post.like_count || post.likes_count) || 0,
    hasLiked: Boolean(post.has_liked || post.hasLiked)
  };
}

function normalizeCategory(category) {
  const item = asObject(category);
  return {
    id: positiveInteger(item.id),
    name: trimmed(item.name)
  };
}

function normalizeComment(comment) {
  const item = asObject(comment);
  const user = asObject(item.user || item.author);
  return {
    id: positiveInteger(item.id),
    content: trimmed(item.content || item.body),
    createdAt: trimmed(item.created_at || item.createdAt),
    updatedAt: trimmed(item.updated_at || item.updatedAt),
    user: {
      id: positiveInteger(user.id || item.user_id),
      name: trimmed(user.name || item.user_name || [user.first_name, user.last_name].filter(Boolean).join(' ')) || 'Community member'
    },
    replies: asList(item.replies || item.children).map(normalizeComment)
  };
}

function reactionSummaryFrom(result) {
  const data = asObject(dataFrom(result));
  return {
    counts: asObject(data.counts),
    total: positiveInteger(data.total) || 0,
    userReaction: trimmed(data.user_reaction || data.userReaction) || null
  };
}

function commentCount(comments) {
  return comments.reduce((count, comment) => count + 1 + commentCount(comment.replies || []), 0);
}

function statusBanner(status) {
  const banners = {
    'comment-added': { type: 'success', message: 'Your comment has been posted.' },
    'reply-added': { type: 'success', message: 'Your reply has been posted.' },
    'comment-updated': { type: 'success', message: 'Your comment has been updated.' },
    'comment-deleted': { type: 'success', message: 'Your comment has been deleted.' },
    'reaction-added': { type: 'success', message: 'Your reaction has been added.' },
    'reaction-removed': { type: 'success', message: 'Your reaction has been removed.' },
    liked: { type: 'success', message: 'Your reaction has been added.' },
    unliked: { type: 'success', message: 'Your reaction has been removed.' },
    'comment-invalid': { type: 'error', anchor: 'body', message: 'Enter a comment before posting.' },
    'comment-empty': { type: 'error', anchor: 'body', message: 'Enter some text before saving.' },
    'comment-failed': { type: 'error', anchor: 'body', message: 'Sorry, your comment could not be posted. Try again.' },
    'comment-update-failed': { type: 'error', anchor: null, message: 'Sorry, your comment could not be updated. Try again.' },
    'comment-delete-failed': { type: 'error', anchor: null, message: 'Sorry, your comment could not be deleted. Try again.' },
    'reaction-failed': { type: 'error', anchor: null, message: 'Sorry, your reaction could not be saved. Try again.' }
  };
  return banners[trimmed(status)] || null;
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

router.get('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const search = trimmed(req.query && req.query.q);
  const categoryId = positiveInteger(req.query && req.query.category);
  const cursor = trimmed(req.query && req.query.cursor) || null;
  const params = {
    search,
    category_id: categoryId,
    cursor,
    per_page: 12
  };

  const result = await getBlogPosts(token, params);
  const data = dataFrom(result);
  const payload = asObject(data);
  const posts = asList(payload.items || data).map(normalizePost);
  const categories = asList(payload.categories).map(normalizeCategory).filter((category) => category.id && category.name);

  return res.render('blog/index', {
    title: 'Blog',
    activeNav: 'blog',
    posts,
    categories,
    searchQuery: search,
    categoryId,
    hasMore: Boolean(payload.has_more || payload.hasMore),
    nextCursor: trimmed(payload.cursor || payload.next_cursor || payload.nextCursor)
  });
}));

router.get('/feed.xml', asyncRoute(async (req, res) => {
  const result = await getBlogPosts('', { per_page: 20 });
  const data = dataFrom(result);
  const posts = asList(asObject(data).items || data).map(normalizePost);
  const items = posts
    .filter((post) => post.slug)
    .map((post) => `<item><title>${post.title}</title><link>/blog/${post.slug}</link><guid>/blog/${post.slug}</guid><description>${post.excerpt}</description></item>`)
    .join('');

  res.type('application/rss+xml; charset=UTF-8');
  return res.send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Blog</title><link>/blog</link><description>Blog</description>${items}</channel></rss>`);
}));

router.get('/:slug([a-zA-Z0-9_-]+)/comments', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, '/login?status=auth-required');

  const post = normalizePost(await blogPostFromSlug(token, req.params.slug));
  const postId = post.id;
  let comments = [];
  let commentsTotal = 0;
  let reactions = { counts: {}, total: 0, userReaction: null };

  if (postId !== null) {
    const commentsResult = await getComments(token, { target_type: 'blog', target_id: postId });
    const commentsData = asObject(dataFrom(commentsResult));
    comments = asList(commentsData.comments || dataFrom(commentsResult)).map(normalizeComment);
    commentsTotal = positiveInteger(commentsData.count) || commentCount(comments);
    reactions = reactionSummaryFrom(await getReactionSummary(token, 'blog', postId));
  }

  return res.render('blog/comments', {
    title: `Comments on ${post.title}`,
    activeNav: 'blog',
    post,
    comments,
    commentsTotal,
    reactions,
    reactionLabels: BLOG_REACTION_LABELS,
    reactionEmoji: BLOG_REACTION_EMOJI,
    statusBanner: statusBanner(req.query && req.query.status)
  });
}));

router.get('/:slug([a-zA-Z0-9_-]+)/likers/:reaction([a-zA-Z0-9_]+)', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, '/login?status=auth-required');

  const reaction = BLOG_REACTIONS.has(req.params.reaction) ? req.params.reaction : 'like';
  const page = positiveInteger(req.query && req.query.page) || 1;
  const post = normalizePost(await blogPostFromSlug(token, req.params.slug));
  const reactorsResult = post.id !== null
    ? await getReactors(token, 'blog', post.id, reaction, { page, per_page: 20 })
    : { data: [], meta: {} };
  const meta = metaFrom(reactorsResult);
  const likers = asList(dataFrom(reactorsResult)).map((liker) => {
    const item = asObject(liker);
    return {
      id: positiveInteger(item.id),
      name: trimmed(item.name || item.user_name || [item.first_name, item.last_name].filter(Boolean).join(' ')) || 'Community member'
    };
  });

  return res.render('blog/likers', {
    title: 'People who reacted',
    activeNav: 'blog',
    post,
    reaction,
    reactionEmoji: BLOG_REACTION_EMOJI[reaction],
    likers,
    likersTotal: positiveInteger(meta.total) || likers.length,
    likersHasMore: Boolean(meta.has_more || meta.hasMore),
    likersPage: page
  });
}));

router.get('/:slug([a-zA-Z0-9_-]+)', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const post = normalizePost(await blogPostFromSlug(token, req.params.slug));
  let comments = [];
  let commentsTotal = 0;

  if (token && post.id !== null) {
    const commentsResult = await getComments(token, { target_type: 'blog', target_id: post.id });
    const commentsData = asObject(dataFrom(commentsResult));
    comments = asList(commentsData.comments || dataFrom(commentsResult)).map(normalizeComment);
    commentsTotal = positiveInteger(commentsData.count) || commentCount(comments);
  }

  return res.render('blog/detail', {
    title: post.title || 'Blog post',
    activeNav: 'blog',
    post,
    comments,
    commentsTotal,
    isAuthenticated: Boolean(token),
    likeCount: post.likeCount,
    hasLiked: post.hasLiked,
    statusBanner: statusBanner(req.query && req.query.status)
  });
}, { notFoundTitle: 'Post not found' }));

async function createBlogComment(req, res, slug, redirectToPost) {
  const token = tokenFrom(req);
  if (!token) {
    return redirectTo(res, '/login?status=auth-required');
  }

  const body = trimmed(req.body.body, 5000);
  const parentId = positiveInteger(req.body.parent_id);
  if (body === '') {
    return redirectTo(res, redirectToPost
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

  return redirectTo(res, redirectToPost
    ? blogPostRedirect(slug, status)
    : blogCommentsRedirect(slug, status));
}

router.post('/comments/:id(\\d+)/update', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return redirectTo(res, '/login?status=auth-required');
  }

  const content = trimmed(req.body.content, 5000);
  if (content === '') {
    return redirectTo(res, commentMutationRedirect(req, 'comment-empty'));
  }

  let status = 'comment-updated';
  try {
    await updateComment(token, id, { content });
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    status = 'comment-update-failed';
  }

  return redirectTo(res, commentMutationRedirect(req, status));
}));

router.post('/comments/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return redirectTo(res, '/login?status=auth-required');
  }

  let status = 'comment-deleted';
  try {
    await deleteComment(token, id);
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    status = 'comment-delete-failed';
  }

  return redirectTo(res, commentMutationRedirect(req, status));
}));

router.post('/comments/:id(\\d+)/react', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return redirectTo(res, '/login?status=auth-required');
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

  return redirectTo(res, commentMutationRedirect(req, status, `comment-${id}`));
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
    return redirectTo(res, '/login?status=auth-required');
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

  return redirectTo(res, blogPostRedirect(slug, status, 'reactions'));
}));

router.post('/:slug([a-zA-Z0-9_-]+)/react', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const slug = req.params.slug;
  if (!token) {
    return redirectTo(res, '/login?status=auth-required');
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

  return redirectTo(res, blogCommentsRedirect(slug, status, 'post-reactions'));
}));

module.exports = router;
