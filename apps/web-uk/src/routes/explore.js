// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  ApiError,
  ApiOfflineError,
  getExplore
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

function tokenFrom(req) {
  return (req.signedCookies && req.signedCookies.token) || '';
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data && typeof result.data === 'object'
    ? result.data
    : result;
}

function trimmed(value) {
  return String(value || '').trim();
}

function positiveInteger(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeListing(item) {
  const title = trimmed(item && item.title);
  const id = positiveInteger(item && item.id);
  if (!title) return null;

  const type = trimmed(item && item.type) === 'request' ? 'request' : 'offer';
  return {
    id,
    title,
    type,
    tagClass: type === 'request' ? 'govuk-tag--purple' : 'govuk-tag--blue',
    href: id ? `/listings/${id}` : ''
  };
}

function normalizeEvent(item) {
  const title = trimmed(item && item.title);
  const id = positiveInteger(item && item.id);
  if (!title) return null;

  return {
    id,
    title,
    date: item.start_date || item.event_date || item.starts_at || item.startsAt || '',
    href: id ? `/events/${id}` : ''
  };
}

function compact(items) {
  return items.filter(Boolean);
}

function normalizeExplore(result) {
  const data = dataFrom(result) || {};
  return {
    recentListings: compact(asList(data.recent_listings || data.popular_listings).map(normalizeListing)).slice(0, 5),
    upcomingEvents: compact(asList(data.upcoming_events).map(normalizeEvent)).slice(0, 5)
  };
}

function renderExploreError(error, res) {
  if (error instanceof ApiError && error.status === 401) {
    res.redirect('/login?status=auth-required');
    return true;
  }

  if (error instanceof ApiOfflineError || error instanceof ApiError) {
    res.status(503).render('errors/503', { title: 'Explore' });
    return true;
  }

  return false;
}

router.get('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let explore;
  try {
    explore = normalizeExplore(await getExplore(token));
  } catch (error) {
    if (renderExploreError(error, res)) return undefined;
    throw error;
  }

  res.render('explore', {
    title: 'Explore',
    activeNav: 'explore',
    recentListings: explore.recentListings,
    upcomingEvents: explore.upcomingEvents
  });
}));

module.exports = router;
