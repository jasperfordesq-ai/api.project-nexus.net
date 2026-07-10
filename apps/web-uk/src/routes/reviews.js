// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  deleteReview,
  callReviewApi,
  createReview,
  getComments,
  getReactionSummary,
  createComment,
  toggleReaction,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');
const { getRequestProfile } = require('../lib/request-profile');

const router = express.Router();

const REVIEWS_PATH = '/reviews';
const LOGIN_AUTH_REQUIRED_PATH = '/login?status=auth-required';
const LARAVEL_REVIEW_REACTIONS = ['like', 'love', 'laugh', 'wow', 'sad', 'celebrate'];
const LARAVEL_REVIEW_REACTION_SET = new Set(LARAVEL_REVIEW_REACTIONS);
const LARAVEL_REVIEW_REACTION_LABELS = {
  like: 'Like',
  love: 'Love',
  laugh: 'Laugh',
  wow: 'Wow',
  sad: 'Sad',
  celebrate: 'Celebrate'
};

function tokenFrom(req) {
  return req.signedCookies.token || '';
}

function positiveInteger(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function integerOrZero(value) {
  const id = Number(value);
  return Number.isInteger(id) ? id : 0;
}

function trimmed(value, limit = null) {
  const text = String(value || '').trim();
  return limit === null ? text : text.slice(0, limit);
}

function redirectTo(res, pathname) {
  const target = typeof pathname === 'string' && pathname ? pathname : '/';
  const activePrefix = typeof res.locals.accessibleRoutePrefix === 'string'
    ? res.locals.accessibleRoutePrefix
    : '';

  if (
    activePrefix
    && (
      target === activePrefix
      || target.startsWith(`${activePrefix}/`)
      || target.startsWith(`${activePrefix}?`)
      || target.startsWith(`${activePrefix}#`)
    )
  ) {
    return res.redirect(target);
  }

  const urlFor = typeof res.locals.urlFor === 'function' ? res.locals.urlFor : (value) => value;
  return res.redirect(urlFor(target));
}

function commentsRedirect(id, status, fragment = '') {
  return `${REVIEWS_PATH}/${id}/comments?status=${encodeURIComponent(status)}${fragment}`;
}

function redirectAuthIfNeeded(error, res) {
  if (error instanceof ApiError && error.status === 401) {
    redirectTo(res, LOGIN_AUTH_REQUIRED_PATH);
    return true;
  }
  return false;
}

function shouldRenderNotFound(error) {
  return error instanceof ApiError && error.status === 404;
}

function dataFrom(result) {
  return result && Object.prototype.hasOwnProperty.call(result, 'data') ? result.data : result;
}

function collectionFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.reviews)) return data.reviews;
  return [];
}

function metaFrom(result) {
  const data = dataFrom(result);
  return (result && result.meta) || (data && data.meta) || {};
}

function commentCollectionFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.comments)) return data.comments;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function commentCountFrom(result, comments) {
  const data = dataFrom(result);
  return Number(data && (data.count ?? data.total ?? data.comments_count)) || comments.length;
}

function oneFrom(result) {
  const data = dataFrom(result);
  if (data && data.data && !Array.isArray(data.data)) return data.data;
  return data || {};
}

function personName(person) {
  if (!person) return '';
  if (typeof person === 'string') return person;
  const firstLast = [person.first_name || person.firstName, person.last_name || person.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return String(person.name || person.display_name || person.displayName || firstLast || person.email || '').trim();
}

function reviewerName(review) {
  return personName(review.reviewer) ||
    personName(review.author) ||
    personName(review.user) ||
    trimmed(review.reviewer_name || review.reviewerName || review.author_name || review.authorName) ||
    'Community member';
}

function receiverName(review) {
  return personName(review.receiver) ||
    personName(review.reviewee) ||
    personName(review.subject) ||
    trimmed(review.receiver_name || review.receiverName || review.reviewee_name || review.revieweeName) ||
    'Community member';
}

function ratingLabel(value) {
  const rating = Number(value);
  return Number.isFinite(rating) && rating > 0 ? `${rating} out of 5` : 'Not rated';
}

function normalizeReview(review = {}, direction = 'received') {
  const rating = Number(review.rating || review.score || 0);
  const otherName = direction === 'given' ? receiverName(review) : reviewerName(review);
  return {
    id: review.id,
    rating,
    ratingLabel: ratingLabel(rating),
    comment: trimmed(review.comment || review.body || review.content),
    otherLabel: direction === 'given' ? 'For' : 'By',
    otherName,
    createdAt: review.created_at || review.createdAt || review.date || ''
  };
}

function normalizePendingReview(item = {}) {
  return {
    receiverId: item.receiver_id || item.receiverId || (item.receiver && item.receiver.id) || '',
    receiverName: receiverName(item),
    transactionId: item.transaction_id || item.transactionId || item.exchange_id || item.exchangeId || '',
    title: trimmed(item.exchange_title || item.exchangeTitle || item.title || item.description || 'Completed exchange')
  };
}

function normalizeComment(comment = {}) {
  return {
    id: comment.id,
    body: trimmed(comment.content || comment.body || comment.comment),
    authorName: personName(comment.user) || personName(comment.author) || trimmed(comment.user_name || comment.userName) || 'Community member',
    createdAt: comment.created_at || comment.createdAt || ''
  };
}

function reviewListApiPath(tab, userId, cursor = '') {
  const params = new URLSearchParams();
  params.set('per_page', '20');
  if (cursor) params.set('cursor', cursor);
  const basePath = tab === 'given' ? '/given' : `/user/${encodeURIComponent(userId)}`;
  return `${basePath}?${params.toString()}`;
}

function listHref(tab, cursor = '') {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (cursor) params.set('cursor', cursor);
  return `${REVIEWS_PATH}/list?${params.toString()}`;
}

function reviewStatusMessage(status) {
  const messages = {
    'review-submitted': { type: 'success', text: 'Thank you. Your review has been submitted.' },
    'review-invalid': { type: 'error', text: 'Check your review and try again. A rating between 1 and 5 is required.' },
    'review-duplicate': { type: 'error', text: 'You have already reviewed this exchange or member.' },
    'review-failed': { type: 'error', text: 'Sorry, your review could not be submitted. Try again.' },
    'review-deleted': { type: 'success', text: 'Your review has been deleted.' },
    'review-delete-failed': { type: 'error', text: 'We could not delete this review. Please try again.' }
  };
  return messages[status] || null;
}

function commentStatusMessage(status) {
  const messages = {
    'comment-added': { type: 'success', text: 'Your comment has been posted.' },
    'reply-added': { type: 'success', text: 'Your reply has been posted.' },
    'comment-invalid': { type: 'error', text: 'Enter a comment before posting.' },
    'comment-failed': { type: 'error', text: 'Sorry, your comment could not be posted. Try again.' },
    'reaction-added': { type: 'success', text: 'Your reaction has been added.' },
    'reaction-removed': { type: 'success', text: 'Your reaction has been removed.' },
    'reaction-failed': { type: 'error', text: 'Sorry, your reaction could not be saved. Try again.' }
  };
  return messages[status] || null;
}

router.post('/', audit.reviewCreate(), asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return redirectTo(res, LOGIN_AUTH_REQUIRED_PATH);
  }

  const transactionId = positiveInteger(req.body.transaction_id);
  const comment = trimmed(req.body.comment);
  const payload = {
    receiver_id: integerOrZero(req.body.receiver_id),
    rating: integerOrZero(req.body.rating),
    comment: comment !== '' ? comment : null,
    transaction_id: transactionId
  };

  let status = 'review-submitted';
  try {
    await createReview(token, payload);
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return;
    if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
      status = 'review-invalid';
    } else if (error instanceof ApiError && error.status === 409) {
      status = 'review-duplicate';
    } else {
      status = 'review-failed';
    }
  }

  return redirectTo(res, `${REVIEWS_PATH}?status=${status}`);
}));

router.post('/:id(\\d+)/comments', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return redirectTo(res, LOGIN_AUTH_REQUIRED_PATH);
  }

  const id = Number(req.params.id);
  const body = trimmed(req.body.body, 5000);
  const parentId = positiveInteger(req.body.parent_id);

  if (body === '') {
    return redirectTo(res, commentsRedirect(id, 'comment-invalid'));
  }

  let status = parentId !== null ? 'reply-added' : 'comment-added';
  try {
    await createComment(token, {
      target_type: 'review',
      target_id: id,
      content: body,
      parent_id: parentId
    });
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return;
    if (shouldRenderNotFound(error)) throw error;
    status = 'comment-failed';
  }

  return redirectTo(res, commentsRedirect(id, status));
}));

router.post('/:id(\\d+)/react', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return redirectTo(res, LOGIN_AUTH_REQUIRED_PATH);
  }

  const id = Number(req.params.id);
  const emoji = trimmed(req.body.emoji);
  let status = 'reaction-failed';

  if (LARAVEL_REVIEW_REACTION_SET.has(emoji)) {
    try {
      const result = await toggleReaction(token, {
        target_type: 'review',
        target_id: id,
        reaction_type: emoji
      });
      const action = result && result.data && result.data.action;
      status = action === 'removed' ? 'reaction-removed' : 'reaction-added';
    } catch (error) {
      if (redirectAuthIfNeeded(error, res)) return;
      if (shouldRenderNotFound(error)) throw error;
    }
  }

  return redirectTo(res, commentsRedirect(id, status, '#review-reactions'));
}));

router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const profile = dataFrom(await getRequestProfile(req, req.token || tokenFrom(req)));
  const userId = profile && (profile.id || profile.user_id || profile.userId);

  const [receivedResult, givenResult, pendingResult, statsResult] = await Promise.all([
    callReviewApi(req.token, 'GET', reviewListApiPath('received', userId)),
    callReviewApi(req.token, 'GET', '/given?per_page=20'),
    callReviewApi(req.token, 'GET', '/pending?per_page=20'),
    callReviewApi(req.token, 'GET', `/user/${encodeURIComponent(userId)}/stats`)
  ]);

  const stats = oneFrom(statsResult);

  res.render('reviews/index', {
    title: 'Reviews',
    statusMessage: reviewStatusMessage(req.query.status),
    reviewsReceived: collectionFrom(receivedResult).map((review) => normalizeReview(review, 'received')),
    reviewsGiven: collectionFrom(givenResult).map((review) => normalizeReview(review, 'given')),
    reviewsPending: collectionFrom(pendingResult).map(normalizePendingReview),
    reviewStats: {
      average: stats.average ?? stats.average_rating ?? stats.averageRating ?? '',
      total: stats.total ?? stats.count ?? stats.reviews_count ?? stats.reviewsCount ?? 0
    },
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.get('/list', requireAuth, asyncRoute(async (req, res) => {
  const tab = req.query.tab === 'given' ? 'given' : 'received';
  const cursor = trimmed(req.query.cursor);
  const token = req.token || tokenFrom(req);
  let userId = null;

  if (tab === 'received') {
    const profile = dataFrom(await getRequestProfile(req, token));
    userId = profile && (profile.id || profile.user_id || profile.userId);
  }

  const result = await callReviewApi(token, 'GET', reviewListApiPath(tab, userId, cursor));
  const meta = metaFrom(result);
  const nextCursor = meta.cursor || meta.next_cursor || meta.nextCursor || '';
  const hasMore = Boolean(meta.has_more ?? meta.hasMore ?? nextCursor);

  res.render('reviews/list', {
    title: 'All reviews',
    reviewsTab: tab,
    reviewsItems: collectionFrom(result).map((review) => normalizeReview(review, tab)),
    reviewsCursor: nextCursor,
    reviewsHasMore: hasMore,
    loadMoreHref: hasMore && nextCursor ? listHref(tab, nextCursor) : '',
    isFirstPage: cursor === ''
  });
}));

router.get('/:id(\\d+)/comments', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const token = req.token || tokenFrom(req);
  const [reviewResult, commentsResult, reactionsResult] = await Promise.all([
    callReviewApi(token, 'GET', `/${id}`),
    getComments(token, { target_type: 'review', target_id: id }),
    getReactionSummary(token, 'review', id)
  ]);

  const rawReview = oneFrom(reviewResult);
  const comments = commentCollectionFrom(commentsResult).map(normalizeComment);
  const reactionData = oneFrom(reactionsResult);

  res.render('reviews/comments', {
    title: 'Comments on a review',
    statusMessage: commentStatusMessage(req.query.status),
    review: normalizeReview(rawReview, 'received'),
    comments,
    commentsCount: commentCountFrom(commentsResult, comments),
    alphaReactions: LARAVEL_REVIEW_REACTIONS.map((value) => ({
      value,
      label: LARAVEL_REVIEW_REACTION_LABELS[value],
      count: Number((reactionData.counts && reactionData.counts[value]) || 0),
      selected: reactionData.user_reaction === value || reactionData.userReaction === value
    })),
    reactionTotal: Number(reactionData.total || 0),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Review not found' }));

// Delete review
router.post('/:id/delete', requireAuth, audit.reviewDelete(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  let status = 'review-deleted';

  try {
    await deleteReview(req.token, id);

    if (req.flash) {
      req.flash('success', 'Review deleted');
    }
  } catch (error) {
    if (error instanceof ApiError && error.status !== 401) {
      status = 'review-delete-failed';
      if (req.flash) {
        req.flash('error', error.message);
      }
    } else {
      throw error;
    }
  }

  return redirectTo(res, `${REVIEWS_PATH}?status=${status}`);
}));

module.exports = router;
