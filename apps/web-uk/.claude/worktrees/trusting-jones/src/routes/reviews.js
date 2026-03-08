const express = require('express');
const {
  createUserReview,
  createListingReview,
  getReview,
  updateReview,
  deleteReview,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { validateReturnUrl } = require('../lib/urlValidator');
const { audit } = require('../lib/auditLogger');

const router = express.Router();

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
    returnUrl: safeReturnUrl
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
