// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { ApiError, callIdeationApi } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

function tokenFrom(req) {
  return req.signedCookies.token || '';
}

function trimmed(value, limit = null) {
  const text = String(value || '').trim();
  return limit === null ? text : text.slice(0, limit);
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function stringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function loginRedirect() {
  return '/login?status=auth-required';
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

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined
    ? result.data
    : result;
}

function resultId(result) {
  const data = dataFrom(result);
  return data && typeof data === 'object' ? positiveInteger(data.id) : null;
}

async function callApi(token, method, path, data = undefined) {
  if (data === undefined) {
    return callIdeationApi(token, method, path);
  }

  return callIdeationApi(token, method, path, data);
}

async function runAction(req, res, method, path, data, successRedirect, failureRedirect) {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  try {
    const result = await callApi(token, method, path, data);
    const redirect = typeof successRedirect === 'function'
      ? successRedirect(result)
      : successRedirect;
    return res.redirect(redirect);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(failureRedirect);
  }
}

function challengeRedirect(id, status) {
  return `/ideation/${id}?status=${encodeURIComponent(status)}`;
}

function challengeManageRedirect(id, status) {
  return `/ideation/${id}/manage?status=${encodeURIComponent(status)}`;
}

function ideaRedirect(challengeId, ideaId, status, fragment = '') {
  return `/ideation/${challengeId}/ideas/${ideaId}?status=${encodeURIComponent(status)}${fragment}`;
}

function campaignRedirect(id, status) {
  return `/ideation/campaigns/${id}?status=${encodeURIComponent(status)}`;
}

function challengePayload(body) {
  const payload = {
    title: trimmed(body.title, 200),
    description: trimmed(body.description, 10000)
  };

  const categoryId = positiveInteger(body.category_id);
  if (categoryId !== null) {
    payload.category_id = categoryId;
  }

  const status = trimmed(body.status, 64);
  if (status !== '') {
    payload.status = status;
  }

  const tags = stringArray(body.tags);
  if (tags.length > 0) {
    payload.tags = tags;
  }

  return payload;
}

function ideaPayload(body) {
  const payload = {
    title: trimmed(body.idea_title || body.title, 200),
    description: trimmed(body.idea_content || body.description, 10000)
  };

  const action = trimmed(body.action, 64);
  if (action !== '') {
    payload.action = action;
  }

  return payload;
}

function campaignPayload(body) {
  const payload = {
    title: trimmed(body.title, 200),
    description: trimmed(body.description, 10000)
  };

  const status = trimmed(body.status, 64);
  if (status !== '') {
    payload.status = status;
  }

  return payload;
}

function outcomePayload(body) {
  const payload = {
    title: trimmed(body.outcome_title || body.title, 200),
    summary: trimmed(body.outcome_summary || body.summary, 10000)
  };

  const impactMetric = trimmed(body.impact_metric, 255);
  if (impactMetric !== '') {
    payload.impact_metric = impactMetric;
  }

  return payload;
}

function mediaPayload(body) {
  return {
    media_type: trimmed(body.media_type, 64),
    url: trimmed(body.media_url || body.url, 2048),
    caption: trimmed(body.media_caption || body.caption, 255)
  };
}

function convertPayload(body) {
  return {
    group_name: trimmed(body.group_name, 200),
    description: trimmed(body.group_description || body.description, 10000)
  };
}

router.post('/campaigns', asyncRoute(async (req, res) => runAction(
  req,
  res,
  'POST',
  '/ideation-campaigns',
  campaignPayload(req.body),
  '/ideation/campaigns?status=campaign-created',
  '/ideation/campaigns?status=campaign-create-failed'
)));

router.post('/campaigns/:id(\\d+)', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'PUT',
    `/ideation-campaigns/${id}`,
    campaignPayload(req.body),
    campaignRedirect(id, 'campaign-saved'),
    campaignRedirect(id, 'campaign-save-failed')
  );
}));

router.post('/campaigns/:id(\\d+)/challenges/:challengeId(\\d+)/unlink', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const challengeId = Number(req.params.challengeId);
  return runAction(
    req,
    res,
    'DELETE',
    `/ideation-campaigns/${id}/challenges/${challengeId}`,
    undefined,
    campaignRedirect(id, 'challenge-unlinked'),
    campaignRedirect(id, 'challenge-unlink-failed')
  );
}));

router.post('/campaigns/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'DELETE',
    `/ideation-campaigns/${id}`,
    undefined,
    '/ideation/campaigns?status=campaign-deleted',
    campaignRedirect(id, 'campaign-delete-failed')
  );
}));

router.post('/new', asyncRoute(async (req, res) => runAction(
  req,
  res,
  'POST',
  '/ideation-challenges',
  challengePayload(req.body),
  (result) => challengeRedirect(resultId(result) || 'new', 'challenge-created'),
  '/ideation/new?status=challenge-create-failed'
)));

router.post('/:id(\\d+)/edit', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'PUT',
    `/ideation-challenges/${id}`,
    challengePayload(req.body),
    challengeManageRedirect(id, 'challenge-saved'),
    challengeManageRedirect(id, 'challenge-save-failed')
  );
}));

router.post('/:id(\\d+)/status', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'PUT',
    `/ideation-challenges/${id}/status`,
    { status: trimmed(req.body.status, 64) },
    challengeManageRedirect(id, 'status-updated'),
    challengeManageRedirect(id, 'status-update-failed')
  );
}));

router.post('/:id(\\d+)/favorite', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'POST',
    `/ideation-challenges/${id}/favorite`,
    undefined,
    challengeRedirect(id, 'favorite-updated'),
    challengeRedirect(id, 'favorite-failed')
  );
}));

router.post('/:id(\\d+)/duplicate', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'POST',
    `/ideation-challenges/${id}/duplicate`,
    undefined,
    (result) => challengeRedirect(resultId(result) || id, 'challenge-duplicated'),
    challengeManageRedirect(id, 'challenge-duplicate-failed')
  );
}));

router.post('/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'DELETE',
    `/ideation-challenges/${id}`,
    undefined,
    '/ideation?status=challenge-deleted',
    challengeManageRedirect(id, 'challenge-delete-failed')
  );
}));

router.post('/:id(\\d+)/link-campaign', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const campaignId = positiveInteger(req.body.campaign_id);
  const sortOrder = positiveInteger(req.body.sort_order);
  const payload = { challenge_id: id };
  if (sortOrder !== null) {
    payload.sort_order = sortOrder;
  }

  return runAction(
    req,
    res,
    'POST',
    `/ideation-campaigns/${campaignId || 0}/challenges`,
    payload,
    challengeManageRedirect(id, 'campaign-linked'),
    challengeManageRedirect(id, 'campaign-link-failed')
  );
}));

router.post('/:id(\\d+)/outcome', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'PUT',
    `/ideation-challenges/${id}/outcome`,
    outcomePayload(req.body),
    `/ideation/${id}/outcome?status=outcome-saved`,
    `/ideation/${id}/outcome?status=outcome-save-failed`
  );
}));

router.post('/:id(\\d+)/drafts/:ideaId(\\d+)', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const ideaId = Number(req.params.ideaId);
  return runAction(
    req,
    res,
    'PUT',
    `/ideation-ideas/${ideaId}/draft`,
    ideaPayload(req.body),
    `/ideation/${id}/drafts?status=draft-saved`,
    `/ideation/${id}/drafts?status=draft-save-failed`
  );
}));

router.post('/:id(\\d+)/ideas', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runAction(
    req,
    res,
    'POST',
    `/ideation-challenges/${id}/ideas`,
    ideaPayload(req.body),
    `/ideation/${id}?status=idea-submitted#ideas`,
    `/ideation/${id}?status=idea-submit-failed#ideas`
  );
}));

router.post('/:id(\\d+)/ideas/:ideaId(\\d+)/comments', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const ideaId = Number(req.params.ideaId);
  return runAction(
    req,
    res,
    'POST',
    `/ideation-ideas/${ideaId}/comments`,
    { body: trimmed(req.body.comment_body || req.body.body, 5000) },
    ideaRedirect(id, ideaId, 'comment-added', '#comments'),
    ideaRedirect(id, ideaId, 'comment-add-failed', '#comments')
  );
}));

router.post('/:id(\\d+)/ideas/:ideaId(\\d+)/comments/:commentId(\\d+)/delete', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const ideaId = Number(req.params.ideaId);
  const commentId = Number(req.params.commentId);
  return runAction(
    req,
    res,
    'DELETE',
    `/ideation-comments/${commentId}`,
    undefined,
    ideaRedirect(id, ideaId, 'comment-deleted', '#comments'),
    ideaRedirect(id, ideaId, 'comment-delete-failed', '#comments')
  );
}));

router.post('/:id(\\d+)/ideas/:ideaId(\\d+)/toggle-vote', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const ideaId = Number(req.params.ideaId);
  return runAction(
    req,
    res,
    'POST',
    `/ideation-ideas/${ideaId}/vote`,
    undefined,
    ideaRedirect(id, ideaId, 'idea-voted'),
    ideaRedirect(id, ideaId, 'idea-vote-failed')
  );
}));

router.post('/:id(\\d+)/ideas/:ideaId(\\d+)/vote', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const ideaId = Number(req.params.ideaId);
  return runAction(
    req,
    res,
    'POST',
    `/ideation-ideas/${ideaId}/vote`,
    undefined,
    `/ideation/${id}?status=idea-voted#ideas`,
    `/ideation/${id}?status=idea-vote-failed#ideas`
  );
}));

router.post('/:id(\\d+)/ideas/:ideaId(\\d+)/status', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const ideaId = Number(req.params.ideaId);
  return runAction(
    req,
    res,
    'PUT',
    `/ideation-ideas/${ideaId}/status`,
    { status: trimmed(req.body.idea_status || req.body.status, 64) },
    ideaRedirect(id, ideaId, 'idea-status-updated'),
    ideaRedirect(id, ideaId, 'idea-status-failed')
  );
}));

router.post('/:id(\\d+)/ideas/:ideaId(\\d+)/delete', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const ideaId = Number(req.params.ideaId);
  return runAction(
    req,
    res,
    'DELETE',
    `/ideation-ideas/${ideaId}`,
    undefined,
    `/ideation/${id}?status=idea-deleted#ideas`,
    `/ideation/${id}?status=idea-delete-failed#ideas`
  );
}));

router.post('/:id(\\d+)/ideas/:ideaId(\\d+)/media', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const ideaId = Number(req.params.ideaId);
  return runAction(
    req,
    res,
    'POST',
    `/ideation-ideas/${ideaId}/media`,
    mediaPayload(req.body),
    ideaRedirect(id, ideaId, 'media-added'),
    ideaRedirect(id, ideaId, 'media-add-failed')
  );
}));

router.post('/:id(\\d+)/ideas/:ideaId(\\d+)/convert', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const ideaId = Number(req.params.ideaId);
  return runAction(
    req,
    res,
    'POST',
    `/ideation-ideas/${ideaId}/convert-to-group`,
    convertPayload(req.body),
    ideaRedirect(id, ideaId, 'converted-to-group'),
    ideaRedirect(id, ideaId, 'convert-failed')
  );
}));

module.exports = router;
