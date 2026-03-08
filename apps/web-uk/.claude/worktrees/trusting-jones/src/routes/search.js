const express = require('express');
const {
  search,
  searchSuggestions,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

router.use(requireAuth);

// Search results page
router.get('/', asyncRoute(async (req, res) => {
  const query = req.query.q ? req.query.q.trim() : '';
  const type = req.query.type || 'all';
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 20;

  // If no query, show empty search page
  if (!query || query.length < 2) {
    return res.render('search/index', {
      title: 'Search',
      query: '',
      type: 'all',
      results: null,
      pagination: null,
      errorMessage: query && query.length < 2 ? 'Search query must be at least 2 characters' : null
    });
  }

  try {
    const results = await search(req.token, query, type, page, limit);

    res.render('search/index', {
      title: `Search results for "${query}"`,
      query,
      type,
      results,
      pagination: results.pagination || null,
      successMessage: req.flash ? req.flash('success')[0] : null,
      errorMessage: req.flash ? req.flash('error')[0] : null
    });
  } catch (error) {
    // Handle non-401 API errors by showing search page with error
    if (error instanceof ApiError && error.status !== 401) {
      return res.render('search/index', {
        title: 'Search',
        query,
        type,
        results: null,
        pagination: null,
        errorMessage: error.message
      });
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// API endpoint for autocomplete suggestions (JSON response)
router.get('/suggestions', asyncRoute(async (req, res) => {
  const query = req.query.q ? req.query.q.trim() : '';
  const limit = parseInt(req.query.limit, 10) || 5;

  if (!query || query.length < 2) {
    return res.json([]);
  }

  try {
    const suggestions = await searchSuggestions(req.token, query, limit);
    res.json(suggestions);
  } catch (error) {
    // For JSON endpoint, return empty array on non-auth errors
    if (error instanceof ApiError && error.status !== 401) {
      return res.json([]);
    }
    // For 401, return proper JSON error
    if (error instanceof ApiError && error.status === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    throw error; // Re-throw for asyncRoute to handle 503
  }
}));

module.exports = router;
