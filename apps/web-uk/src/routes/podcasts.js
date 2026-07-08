// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { callPodcastApi, ApiError } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

const PODCAST_SORTS = ['newest', 'title', 'episodes', 'followers'];
const SHOW_STATUS_LABELS = {
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived'
};
const SHOW_STATUS_TAGS = {
  published: 'govuk-tag--green',
  draft: 'govuk-tag--grey',
  archived: 'govuk-tag--red'
};
const EPISODE_STATUS_LABELS = {
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived'
};
const EPISODE_STATUS_TAGS = {
  published: 'govuk-tag--green',
  draft: 'govuk-tag--grey',
  archived: 'govuk-tag--red'
};
const STUDIO_SUCCESS_MESSAGES = {
  'show-deleted': 'Your show was deleted.',
  'show-created': 'Your show was created. Add episodes and publish when you are ready.',
  'show-saved': 'Your changes were saved.',
  'show-published': 'Your show is published and listeners can find it.',
  'show-pending-review': 'Your show was submitted and is awaiting review before it goes live.',
  'episode-added': 'Your episode was added.',
  'episode-published': 'Your episode is published.',
  'episode-deleted': 'Your episode was deleted.'
};
const STUDIO_ERROR_MESSAGES = {
  'show-delete-failed': 'Sorry, your show could not be deleted. Please try again.',
  'show-save-failed': 'Sorry, your changes could not be saved. Please try again.',
  'show-publish-failed': 'Sorry, your show could not be published. Please try again.',
  'show-title-missing': 'Enter a show title',
  'show-create-failed': 'Sorry, your show could not be created. Please try again.',
  'episode-failed': 'Sorry, your episode could not be added. Please try again.',
  'episode-title-missing': 'Enter a title for the episode.',
  'episode-audio-missing': 'Upload an audio file or enter an audio link for the episode.',
  'episode-invalid-audio': 'Sorry, that audio could not be accepted. Check the file or link and try again.',
  'episode-publish-failed': 'Sorry, your episode could not be published. Please try again.',
  'episode-delete-failed': 'Sorry, your episode could not be deleted. Please try again.'
};
const PODCAST_STATUS_MESSAGES = {
  subscribed: { type: 'success', message: 'You have subscribed to this podcast.' },
  unsubscribed: { type: 'success', message: 'You have unsubscribed from this podcast.' },
  'subscribe-failed': { type: 'error', message: 'We could not update your subscription. Please try again.' }
};

function tokenFrom(req) {
  return (req.signedCookies && req.signedCookies.token) || req.token || '';
}

function loginRedirect() {
  return '/login?status=auth-required';
}

function trimmed(value, limit = null) {
  const text = String(value || '').trim();
  return limit === null ? text : text.slice(0, limit);
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined
    ? result.data
    : result;
}

function rowsFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

function objectFrom(result) {
  const data = dataFrom(result);
  return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
}

async function callPodcast(token, method, path = '') {
  return callPodcastApi(token, method, path);
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function isForbidden(error) {
  return error instanceof ApiError && error.status === 403;
}

function isNotFound(error) {
  return error instanceof ApiError && error.status === 404;
}

function redirectAuthIfNeeded(error, res) {
  if (isAuthError(error)) {
    res.redirect(loginRedirect());
    return true;
  }
  return false;
}

function renderPodcastError(error, res, title = 'Podcasts') {
  if (redirectAuthIfNeeded(error, res)) return true;
  if (isForbidden(error)) {
    res.status(403).render('errors/403', { title: 'Access denied' });
    return true;
  }
  if (isNotFound(error)) {
    res.status(404).render('errors/404', { title: 'Page not found' });
    return true;
  }

  res.status(503).render('static-page', {
    title,
    body: 'Podcast information could not be loaded. Please try again shortly.'
  });
  return true;
}

function safeRelativeOrAbsoluteUrl(value) {
  const url = trimmed(value);
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')
    ? url
    : '';
}

function sortFrom(query) {
  const sort = trimmed(query.sort);
  return PODCAST_SORTS.includes(sort) ? sort : 'newest';
}

function indexPath(query) {
  const params = new URLSearchParams();
  params.set('per_page', '30');
  params.set('sort', sortFrom(query));

  const search = trimmed(query.q);
  if (search) params.set('q', search);

  const category = trimmed(query.category);
  if (category) params.set('category', category);

  return `?${params.toString()}`;
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, '');
}

function episodeCountLabel(count) {
  const number = Number.isFinite(Number(count)) ? Number(count) : 0;
  if (number === 0) return 'No episodes';
  if (number === 1) return '1 episode';
  return `${number} episodes`;
}

function decorateShow(show) {
  const row = show && typeof show === 'object' ? show : {};
  const id = positiveInteger(row.id);
  const title = trimmed(row.title) || 'Podcasts';
  const ownerName = trimmed(row.owner && row.owner.name);
  const approvedCount = row.approved_episode_count !== undefined ? row.approved_episode_count : row.episodes_count;
  const episodeCount = approvedCount !== undefined ? approvedCount : row.episode_count;
  const status = trimmed(row.status) || 'draft';

  return {
    ...row,
    id,
    title,
    description: stripHtml(row.description || ''),
    summary: stripHtml(row.summary || ''),
    ownerName,
    byLabel: ownerName ? `By ${ownerName}` : '',
    artworkUrl: safeRelativeOrAbsoluteUrl(row.artwork_url),
    rssUrl: safeRelativeOrAbsoluteUrl(row.rss_url),
    rssEnabled: Boolean(row.rss_enabled) && safeRelativeOrAbsoluteUrl(row.rss_url),
    episodeCount: Number.isFinite(Number(episodeCount)) ? Number(episodeCount) : 0,
    episodeCountLabel: episodeCountLabel(episodeCount),
    status,
    statusLabel: SHOW_STATUS_LABELS[status] || status,
    statusTag: SHOW_STATUS_TAGS[status] || 'govuk-tag--grey',
    visibility: ['public', 'members', 'private'].includes(trimmed(row.visibility)) ? trimmed(row.visibility) : 'public',
    moderationStatus: trimmed(row.moderation_status) || 'approved'
  };
}

function decorateEpisode(episode, showId = null) {
  const row = episode && typeof episode === 'object' ? episode : {};
  const id = positiveInteger(row.id);
  const status = trimmed(row.status) || 'draft';
  const number = positiveInteger(row.episode_number);

  return {
    ...row,
    id,
    showId: positiveInteger(row.show_id) || showId,
    title: trimmed(row.title) || 'Episodes',
    description: stripHtml(row.description || row.summary || ''),
    audioUrl: safeRelativeOrAbsoluteUrl(row.audio_url),
    transcript: String(row.transcript || '').trim(),
    status,
    statusLabel: EPISODE_STATUS_LABELS[status] || status,
    statusTag: EPISODE_STATUS_TAGS[status] || 'govuk-tag--grey',
    episodeNumber: number,
    episodeNumberLabel: number !== null ? `Episode ${number}` : ''
  };
}

function showEpisodes(show) {
  const rows = Array.isArray(show.episodes) ? show.episodes : [];
  return rows
    .filter((episode) => !episode.status || episode.status === 'published')
    .map((episode) => decorateEpisode(episode, show.id))
    .filter((episode) => episode.id !== null);
}

function studioEpisodes(show) {
  const rows = Array.isArray(show.episodes) ? show.episodes : [];
  return rows
    .map((episode) => decorateEpisode(episode, show.id))
    .filter((episode) => episode.id !== null);
}

function statusEntry(status) {
  const key = trimmed(status);
  if (STUDIO_SUCCESS_MESSAGES[key]) {
    return { type: 'success', message: STUDIO_SUCCESS_MESSAGES[key] };
  }
  if (STUDIO_ERROR_MESSAGES[key]) {
    return { type: 'error', message: STUDIO_ERROR_MESSAGES[key] };
  }
  return null;
}

function requireToken(req, res) {
  const token = tokenFrom(req);
  if (!token) {
    res.redirect(loginRedirect());
    return '';
  }
  return token;
}

router.get('/', asyncRoute(async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return undefined;

  const path = indexPath(req.query);
  try {
    const result = await callPodcast(token, 'GET', path);
    const shows = rowsFrom(result)
      .map(decorateShow)
      .filter((show) => show.id !== null);

    return res.render('podcasts/index', {
      title: 'Podcasts',
      activeNav: 'explore',
      shows,
      query: trimmed(req.query.q),
      sort: sortFrom(req.query),
      category: trimmed(req.query.category)
    });
  } catch (error) {
    return renderPodcastError(error, res);
  }
}));

router.get('/studio', asyncRoute(async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return undefined;

  try {
    const result = await callPodcast(token, 'GET', '/mine');
    const shows = rowsFrom(result)
      .map(decorateShow)
      .filter((show) => show.id !== null);

    return res.render('podcasts/studio', {
      title: 'Podcast studio',
      activeNav: 'explore',
      shows,
      status: statusEntry(req.query.status)
    });
  } catch (error) {
    return renderPodcastError(error, res, 'Podcast studio');
  }
}));

router.get('/studio/new', (req, res) => {
  const token = requireToken(req, res);
  if (!token) return undefined;

  return res.render('podcasts/form', {
    title: 'Create a podcast',
    activeNav: 'explore',
    mode: 'create',
    action: '/podcasts/studio/new',
    show: {
      title: '',
      summary: '',
      description: '',
      category: '',
      visibility: 'public'
    },
    status: statusEntry(req.query.status)
  });
});

router.get('/studio/:id(\\d+)', asyncRoute(async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return undefined;

  const showId = positiveInteger(req.params.id);
  try {
    const result = await callPodcast(token, 'GET', '/mine');
    const shows = rowsFrom(result).map(decorateShow);
    const show = shows.find((row) => row.id === showId);
    if (!show) {
      res.status(404).render('errors/404', { title: 'Page not found' });
      return undefined;
    }

    const episodes = studioEpisodes(show);
    return res.render('podcasts/manage', {
      title: 'Edit your podcast',
      activeNav: 'explore',
      show,
      episodes,
      status: statusEntry(req.query.status),
      episodeStoreAction: `/podcasts/studio/${show.id}/episodes`
    });
  } catch (error) {
    return renderPodcastError(error, res, 'Edit your podcast');
  }
}));

router.get('/:showId(\\d+)/episodes/:id(\\d+)', asyncRoute(async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return undefined;

  const showId = positiveInteger(req.params.showId);
  const episodeId = positiveInteger(req.params.id);
  try {
    const result = await callPodcast(token, 'GET', `/${showId}/${episodeId}`);
    const episodeData = objectFrom(result);
    if (!episodeData) {
      res.status(404).render('errors/404', { title: 'Page not found' });
      return undefined;
    }

    const show = decorateShow(episodeData.show || { id: showId });
    const episode = decorateEpisode(episodeData, show.id);
    return res.render('podcasts/episode', {
      title: episode.title,
      activeNav: 'explore',
      show,
      episode
    });
  } catch (error) {
    return renderPodcastError(error, res, 'Podcast episode');
  }
}));

router.get('/:id(\\d+)', asyncRoute(async (req, res) => {
  const token = requireToken(req, res);
  if (!token) return undefined;

  const showId = positiveInteger(req.params.id);
  try {
    const result = await callPodcast(token, 'GET', `/${showId}`);
    const showData = objectFrom(result);
    if (!showData) {
      res.status(404).render('errors/404', { title: 'Page not found' });
      return undefined;
    }

    const show = decorateShow({ id: showId, ...showData });
    const episodes = showEpisodes(show);
    return res.render('podcasts/detail', {
      title: show.title,
      activeNav: 'explore',
      show,
      episodes,
      status: PODCAST_STATUS_MESSAGES[trimmed(req.query.status)] || null,
      isSubscribed: Boolean(showData.is_subscribed || showData.subscribed)
    });
  } catch (error) {
    return renderPodcastError(error, res, 'Podcast');
  }
}));

module.exports = router;
