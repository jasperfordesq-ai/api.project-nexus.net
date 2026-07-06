// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const fs = require('fs/promises');
const { callPodcastApi, uploadPodcastEpisode, ApiError } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

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

function checked(value) {
  return value === true || ['1', 'true', 'on', 'yes'].includes(String(value || '').toLowerCase());
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

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function redirectOnAuthError(error, res) {
  if (isAuthError(error)) {
    res.redirect(loginRedirect());
    return true;
  }
  return false;
}

async function callPodcast(token, method, path, data = undefined) {
  if (data === undefined) {
    return callPodcastApi(token, method, path);
  }

  return callPodcastApi(token, method, path, data);
}

function statusRedirect(path, status) {
  return `${path}?status=${encodeURIComponent(status)}`;
}

function studioRedirect(showId, status) {
  return statusRedirect(`/podcasts/studio/${showId}`, status);
}

function allowedVisibility(value) {
  const visibility = trimmed(value);
  return ['public', 'members', 'private'].includes(visibility) ? visibility : 'public';
}

function showPayload(body) {
  return {
    title: trimmed(body.title, 200),
    summary: trimmed(body.summary, 600),
    description: trimmed(body.description, 20000),
    category: trimmed(body.category, 120),
    visibility: allowedVisibility(body.visibility)
  };
}

function episodePayload(body) {
  const payload = {
    title: trimmed(body.episode_title || body.title, 200),
    summary: trimmed(body.episode_summary || body.summary, 600),
    description: trimmed(body.episode_description || body.description, 20000)
  };

  const audioUrl = trimmed(body.audio_url);
  if (audioUrl !== '') {
    payload.audio_url = audioUrl;
  }

  const episodeNumber = positiveInteger(body.episode_number);
  if (episodeNumber !== null) {
    payload.episode_number = episodeNumber;
  }

  return payload;
}

function uploadedFile(req, fieldName) {
  const file = req.files && req.files[fieldName];
  return file && typeof file === 'object' ? file : null;
}

async function removeUploadedFile(file) {
  if (!file || !file.filepath) return;
  try {
    await fs.unlink(file.filepath);
  } catch {
    // Temporary upload cleanup is best-effort only.
  }
}

router.post('/:id(\\d+)/subscribe', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  let status = 'subscribe-failed';
  try {
    const result = await callPodcast(token, 'POST', `/${id}/subscribe`, {
      notify_new_episodes: checked(req.body.notify_new_episodes)
    });
    const data = dataFrom(result);
    status = data && data.subscribed === false ? 'unsubscribed' : 'subscribed';
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  return res.redirect(statusRedirect(`/podcasts/${id}`, status));
}));

router.post('/studio/new', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const payload = showPayload(req.body);
  if (payload.title === '') {
    return res.redirect(statusRedirect('/podcasts/studio/new', 'show-title-missing'));
  }

  try {
    const result = await callPodcast(token, 'POST', '', payload);
    const data = dataFrom(result);
    const showId = positiveInteger(data && (data.id || data.show_id));
    if (showId !== null) {
      return res.redirect(studioRedirect(showId, 'show-created'));
    }
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  return res.redirect(statusRedirect('/podcasts/studio/new', 'show-create-failed'));
}));

router.post('/studio/:id(\\d+)/update', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  const payload = showPayload(req.body);
  if (payload.title === '') {
    return res.redirect(studioRedirect(id, 'show-title-missing'));
  }

  let status = 'show-saved';
  try {
    await callPodcast(token, 'PUT', `/${id}`, payload);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'show-save-failed';
  }

  return res.redirect(studioRedirect(id, status));
}));

router.post('/studio/:id(\\d+)/publish', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  let status = 'show-publish-failed';
  try {
    const result = await callPodcast(token, 'POST', `/${id}/publish`);
    const data = dataFrom(result);
    status = data && data.moderation_status && data.moderation_status !== 'approved'
      ? 'show-pending-review'
      : 'show-published';
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  return res.redirect(studioRedirect(id, status));
}));

router.post('/studio/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  let status = 'show-deleted';
  try {
    await callPodcast(token, 'DELETE', `/${id}`);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'show-delete-failed';
  }

  return res.redirect(statusRedirect('/podcasts/studio', status));
}));

router.post('/studio/:id(\\d+)/episodes', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  const payload = episodePayload(req.body);
  const file = uploadedFile(req, 'audio');
  if (payload.title === '') {
    await removeUploadedFile(file);
    return res.redirect(studioRedirect(id, 'episode-title-missing'));
  }
  if (!payload.audio_url && !file) {
    return res.redirect(studioRedirect(id, 'episode-audio-missing'));
  }

  let status = 'episode-added';
  try {
    if (file) {
      const buffer = await fs.readFile(file.filepath);
      await uploadPodcastEpisode(token, id, {
        ...payload,
        file: {
          buffer,
          filename: trimmed(file.originalFilename) || 'podcast-audio',
          contentType: trimmed(file.mimetype) || 'application/octet-stream',
          size: file.size
        }
      });
    } else {
      await callPodcast(token, 'POST', `/${id}/episodes`, payload);
    }
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = error instanceof ApiError && error.status === 422 ? 'episode-invalid-audio' : 'episode-failed';
  } finally {
    await removeUploadedFile(file);
  }

  return res.redirect(studioRedirect(id, status));
}));

router.post('/studio/:id(\\d+)/episodes/:episodeId(\\d+)/publish', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  const episodeId = Number(req.params.episodeId);
  let status = 'episode-published';
  try {
    await callPodcast(token, 'POST', `/${id}/episodes/${episodeId}/publish`);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'episode-publish-failed';
  }

  return res.redirect(studioRedirect(id, status));
}));

router.post('/studio/:id(\\d+)/episodes/:episodeId(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  const episodeId = Number(req.params.episodeId);
  let status = 'episode-deleted';
  try {
    await callPodcast(token, 'DELETE', `/${id}/episodes/${episodeId}`);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'episode-delete-failed';
  }

  return res.redirect(studioRedirect(id, status));
}));

module.exports = router;
