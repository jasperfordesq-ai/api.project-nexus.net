// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  createUserReview,
  createListingReview,
  getReview,
  updateReview,
  deleteReview,
  createReview,
  createComment,
  toggleReaction,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { validateReturnUrl } = require('../lib/urlValidator');
const { audit } = require('../lib/auditLogger');

const router = express.Router();

const LARAVEL_REVIEW_REACTIONS = new Set(['like', 'love', 'laugh', 'wow', 'sad', 'celebrate']);

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

function commentsRedirect(id, status, fragment = '') {
  return `/reviews/${id}/comments?status=${encodeURIComponent(status)}${fragment}`;
}

function redirectAuthIfNeeded(error, res) {
  if (error instanceof ApiError && error.status === 401) {
    res.redirect('/login?status=auth-required');
    return true;
  }
  return false;
}

function shouldRenderNotFound(error) {
  return error instanceof ApiError && error.status === 404;
}

router.post('/', audit.reviewCreate(), asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
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

  return res.redirect(`/reviews?status=${status}`);
}));

router.post('/:id(\\d+)/comments', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const id = Number(req.params.id);
  const body = trimmed(req.body.body, 5000);
  const parentId = positiveInteger(req.body.parent_id);

  if (body === '') {
    return res.redirect(commentsRedirect(id, 'comment-invalid'));
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

  return res.redirect(commentsRedirect(id, status));
}));

router.post('/:id(\\d+)/react', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const id = Number(req.params.id);
  const emoji = trimmed(req.body.emoji);
  let status = 'reaction-failed';

  if (LARAVEL_REVIEW_REACTIONS.has(emoji)) {
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

  return res.redirect(commentsRedirect(id, status, '#review-reactions'));
}));

router.use(requireAuth);

// Create review for a user
router.post('/user/:userId', audit.reviewCreate(), asyncRoute(async (req, res) => {
  const { userId } = req.params;
  const { rating, comment, return_url } = req.body;
  const safeReturnUrl = validateReturnUrl(return_url, `/members/${userId}`);

  const errors = [];
  const ratingNum = parseInt(rating, 10);

  if (!rating || isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    errors.push({ text: 'Rating must be between 1 and 5', href: '#rating' });
  }

  if (errors.length > 0) {
    if (req.flash) {
      req.flash('error', errors[0].text);
    }
    return res.redirect(safeReturnUrl);
  }

  try {
    await createUserReview(req.token, userId, {
      rating: ratingNum,
      comment: comment ? comment.trim() : null
    });

    if (req.flash) {
      req.flash('success', 'Review submitted successfully');
    }
    res.redirect(safeReturnUrl);
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message);
      }
      return res.redirect(safeReturnUrl);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// Create review for a listing
router.post('/listing/:listingId', audit.reviewCreate(), asyncRoute(async (req, res) => {
  const { listingId } = req.params;
  const { rating, comment, return_url } = req.body;
  const safeReturnUrl = validateReturnUrl(return_url, `/listings/${listingId}`);

  const errors = [];
  const ratingNum = parseInt(rating, 10);

  if (!rating || isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    errors.push({ text: 'Rating must be between 1 and 5', href: '#rating' });
  }

  if (errors.length > 0) {
    if (req.flash) {
      req.flash('error', errors[0].text);
    }
    return res.redirect(safeReturnUrl);
  }

  try {
    await createListingReview(req.token, listingId, {
      rating: ratingNum,
      comment: comment ? comment.trim() : null
    });

    if (req.flash) {
      req.flash('success', 'Review submitted successfully');
    }
    res.redirect(safeReturnUrl);
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message);
      }
      return res.redirect(safeReturnUrl);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// Edit review page
router.get('/:id/edit', asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { return_url } = req.query;
  const safeReturnUrl = validateReturnUrl(return_url, '/dashboard');

  const review = await getReview(req.token, id);

  res.render('reviews/form', {
    title: 'Edit review',
    review,
    isEdit: true,
    returnUrl: safeReturnUrl,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Review not found' }));

// Update review
router.post('/:id/edit', asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { rating, comment, return_url } = req.body;
  const safeReturnUrl = validateReturnUrl(return_url, '/dashboard');

  const errors = [];
  const ratingNum = parseInt(rating, 10);

  if (!rating || isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    errors.push({ text: 'Rating must be between 1 and 5', href: '#rating' });
  }

  if (errors.length > 0) {
    try {
      const review = await getReview(req.token, id);
      return res.render('reviews/form', {
        title: 'Edit review',
        review,
        isEdit: true,
        errors,
        returnUrl: safeReturnUrl
      });
    } catch (error) {
      if (req.flash) {
        req.flash('error', errors[0].text);
      }
      return res.redirect(safeReturnUrl);
    }
  }

  try {
    await updateReview(req.token, id, {
      rating: ratingNum,
      comment: comment ? comment.trim() : null
    });

    if (req.flash) {
      req.flash('success', 'Review updated successfully');
    }
    res.redirect(safeReturnUrl);
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message);
      }
      return res.redirect(safeReturnUrl);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// Delete review
router.post('/:id/delete', audit.reviewDelete(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { return_url } = req.body;
  const safeReturnUrl = validateReturnUrl(return_url, '/dashboard');

  try {
    await deleteReview(req.token, id);

    if (req.flash) {
      req.flash('success', 'Review deleted');
    }
    res.redirect(safeReturnUrl);
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message);
      }
      return res.redirect(safeReturnUrl);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

module.exports = router;
