// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  search,
  searchSuggestions,
  searchV2,
  getSavedSearches,
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

function advancedSearchState(query) {
  const params = queryParamsFrom(query);
  const type = params.type || 'all';
  const sort = params.sort || 'relevance';
  const categoryId = params.category_id || '0';
  const skillsList = normaliseSkills(query.skills);
  const dateFrom = params.date_from || '';
  const dateTo = params.date_to || '';
  const location = params.location || '';
  let activeFilterCount = 0;

  if (type !== 'all') activeFilterCount += 1;
  if (categoryId !== '0') activeFilterCount += 1;
  if (sort !== 'relevance') activeFilterCount += 1;
  if (dateFrom) activeFilterCount += 1;
  if (dateTo) activeFilterCount += 1;
  if (location) activeFilterCount += 1;
  if (skillsList.length) activeFilterCount += 1;

  return {
    searchQuery: params.q || '',
    filters: {
      type,
      category_id: categoryId,
      sort,
      date_from: dateFrom,
      date_to: dateTo,
      location,
      skills: skillsList.join(',')
    },
    skillsList,
    activeFilterCount,
    activeTab: allowed(query.tab, SEARCH_TYPES, 'all')
  };
}

function apiSearchParams(state) {
  const params = {
    q: state.searchQuery,
    type: state.filters.type,
    per_page: 30
  };

  if (state.filters.category_id !== '0') params.category_id = state.filters.category_id;
  if (state.filters.sort !== 'relevance') params.sort = state.filters.sort;
  if (state.filters.skills) params.skills = state.filters.skills;

  return params;
}

function advancedLinkEntries(state) {
  const entries = [];
  if (state.searchQuery) entries.push(['q', state.searchQuery]);
  if (state.filters.type !== 'all') entries.push(['type', state.filters.type]);
  if (state.filters.category_id !== '0') entries.push(['category_id', state.filters.category_id]);
  if (state.filters.sort !== 'relevance') entries.push(['sort', state.filters.sort]);
  if (state.filters.skills) entries.push(['skills', state.filters.skills]);
  if (state.filters.date_from) entries.push(['date_from', state.filters.date_from]);
  if (state.filters.date_to) entries.push(['date_to', state.filters.date_to]);
  if (state.filters.location) entries.push(['location', state.filters.location]);
  return entries;
}

function advancedSearchHref(entries, tab = 'all') {
  const query = new URLSearchParams(entries);
  if (tab !== 'all') {
    query.set('tab', tab);
  }
  const queryString = query.toString();
  return queryString ? `/search/advanced?${queryString}` : '/search/advanced';
}

function advancedTabHrefs(state) {
  const entries = advancedLinkEntries(state);
  return {
    all: advancedSearchHref(entries, 'all'),
    listings: advancedSearchHref(entries, 'listings'),
    users: advancedSearchHref(entries, 'users'),
    events: advancedSearchHref(entries, 'events'),
    groups: advancedSearchHref(entries, 'groups')
  };
}

function objectFrom(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function textFrom(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function intFrom(value) {
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) ? numeric : 0;
}

function truncate(text, max) {
  const value = textFrom(text);
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

function groupedSearchResults(rows) {
  const grouped = { listings: [], users: [], events: [], groups: [] };
  for (const row of Array.isArray(rows) ? rows : []) {
    const item = objectFrom(row);
    const type = textFrom(item.type);
    if (type === 'listing') grouped.listings.push(item);
    if (type === 'user') grouped.users.push(item);
    if (type === 'event') grouped.events.push(item);
    if (type === 'group') grouped.groups.push(item);
  }
  return grouped;
}

function resultCounts(grouped, total) {
  return {
    all: total,
    listings: grouped.listings.length,
    users: grouped.users.length,
    events: grouped.events.length,
    groups: grouped.groups.length
  };
}

function resultCountLabel(count) {
  if (count === 0) return 'No results found';
  if (count === 1) return '1 result found';
  return `${count.toLocaleString('en-GB')} results found`;
}

function membersCountLabel(count) {
  if (count === 0) return 'No members';
  if (count === 1) return '1 member';
  return `${count.toLocaleString('en-GB')} members`;
}

function savedSearchRows(result) {
  const rows = Array.isArray(result?.data) ? result.data : [];
  return rows.map((row) => {
    const object = objectFrom(row);
    const queryParams = objectFrom(object.query_params);
    return {
      id: intFrom(object.id),
      name: textFrom(object.name, 'Saved search'),
      query: textFrom(queryParams.q),
      lastResultCount: object.last_result_count === null || object.last_result_count === undefined
        ? ''
        : intFrom(object.last_result_count).toLocaleString('en-GB')
    };
  }).filter((row) => row.id > 0);
}

function savedCountLabel(count) {
  if (count === 0) return 'No saved searches';
  if (count === 1) return '1 saved search';
  return `${count.toLocaleString('en-GB')} saved searches`;
}

function savedSearchById(result, id) {
  return savedSearchRows(result).find((row) => row.id === id) || null;
}

router.get('/advanced', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const state = advancedSearchState(req.query);
  const hasSearched = state.searchQuery !== '';
  let searchResult = { data: [], meta: { search: { total: 0 } } };
  let savedResult = { data: [] };
  let searchError = false;

  try {
    const calls = [getSavedSearches(token)];
    if (hasSearched) {
      calls.unshift(searchV2(token, apiSearchParams(state)));
    }
    const results = await Promise.all(calls);
    if (hasSearched) {
      [searchResult, savedResult] = results;
    } else {
      [savedResult] = results;
    }
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    searchError = hasSearched;
  }

  const grouped = groupedSearchResults(searchResult.data);
  const total = intFrom(searchResult?.meta?.search?.total) || Object.values(grouped).reduce((sum, rows) => sum + rows.length, 0);
  const counts = resultCounts(grouped, total);
  const savedSearches = savedSearchRows(savedResult);

  return res.render('search/advanced', {
    title: 'Advanced search',
    activeNav: 'explore',
    communityName: res.locals.tenantName || res.locals.serviceName || 'this community',
    status: allowed(req.query.status, new Set(['search-saved', 'search-deleted', 'search-save-failed', 'search-delete-failed']), ''),
    ...state,
    tabHrefs: advancedTabHrefs(state),
    hasSearched,
    searchError,
    total,
    counts,
    resultCountLabel: resultCountLabel(total),
    grouped,
    savedSearches,
    savedCountLabel: savedCountLabel(savedSearches.length),
    truncate,
    membersCountLabel
  });
}));

router.get('/saved/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const id = Number(req.params.id);
  const result = await getSavedSearches(token);
  const savedSearch = savedSearchById(result, id);
  if (savedSearch === null) {
    throw new ApiError('Saved search not found', 404);
  }

  return res.render('search/saved-delete', {
    title: 'Delete this saved search?',
    activeNav: 'explore',
    savedSearch
  });
}));

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
