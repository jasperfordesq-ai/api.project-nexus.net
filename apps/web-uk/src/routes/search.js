// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  search,
  searchSuggestions,
  saveSavedSearch,
  deleteSavedSearch,
  runSavedSearch,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

const SEARCH_TYPES = new Set(['all', 'listings', 'users', 'events', 'groups']);
const SEARCH_SORTS = new Set(['relevance', 'newest', 'oldest']);

function tokenFrom(req) {
  return req.signedCookies.token || '';
}

function allowed(value, choices, fallback) {
  const text = String(value || '').trim();
  return choices.has(text) ? text : fallback;
}

function validDate(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return '';
  }
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text ? '' : text;
}

function normaliseSkills(value) {
  const seen = new Set();
  const skills = [];

  for (const part of String(value || '').split(',')) {
    const skill = part.trim().toLowerCase();
    if (skill !== '' && !seen.has(skill)) {
      seen.add(skill);
      skills.push(skill);
    }
    if (skills.length >= 20) break;
  }

  return skills;
}

function queryParamsFrom(input) {
  const params = {};
  const query = String(input.q || '').trim();
  if (query !== '') {
    params.q = query;
  }

  const type = allowed(input.type, SEARCH_TYPES, 'all');
  if (type !== 'all') {
    params.type = type;
  }

  const sort = allowed(input.sort, SEARCH_SORTS, 'relevance');
  if (sort !== 'relevance') {
    params.sort = sort;
  }

  const categoryId = Number(input.category_id);
  if (Number.isInteger(categoryId) && categoryId > 0) {
    params.category_id = String(categoryId);
  }

  const skills = normaliseSkills(input.skills);
  if (skills.length > 0) {
    params.skills = skills.join(',');
  }

  const dateFrom = validDate(input.date_from);
  if (dateFrom !== '') {
    params.date_from = dateFrom;
  }

  const dateTo = validDate(input.date_to);
  if (dateTo !== '') {
    params.date_to = dateTo;
  }

  const location = String(input.location || '').trim();
  if (location !== '') {
    params.location = location.slice(0, 120);
  }

  return params;
}

function searchAdvancedUrl(params = {}, status = null) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== '') {
      query.set(key, value);
    }
  }
  if (status !== null) {
    query.set('status', status);
  }

  const text = query.toString();
  return `/search/advanced${text ? `?${text}` : ''}`;
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

router.post('/saved', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const name = String(req.body.name || '').trim().slice(0, 255);
  const queryParams = queryParamsFrom(req.body);

  if (name === '' || !queryParams.q) {
    return res.redirect(searchAdvancedUrl(queryParams, 'search-save-failed'));
  }

  let status = 'search-saved';
  try {
    await saveSavedSearch(token, {
      name,
      query_params: queryParams,
      notify_on_new: false
    });
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return;
    status = 'search-save-failed';
  }

  return res.redirect(searchAdvancedUrl(queryParams, status));
}));

router.post('/saved/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let status = 'search-deleted';
  try {
    await deleteSavedSearch(token, Number(req.params.id));
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return;
    if (shouldRenderNotFound(error)) throw error;
    status = 'search-delete-failed';
  }

  return res.redirect(searchAdvancedUrl({}, status));
}));

router.post('/saved/:id(\\d+)/run', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  try {
    const result = await runSavedSearch(token, Number(req.params.id));
    const data = result && result.data && typeof result.data === 'object' ? result.data : {};
    const params = queryParamsFrom(data.query_params && typeof data.query_params === 'object' ? data.query_params : {});
    return res.redirect(searchAdvancedUrl(params));
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    if (shouldRenderNotFound(error)) throw error;
  }

  return res.redirect(searchAdvancedUrl({}, 'search-run-failed'));
}));

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
