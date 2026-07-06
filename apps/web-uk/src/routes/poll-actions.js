// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  createPoll,
  deletePoll,
  votePoll,
  rankPoll,
  createComment,
  toggleFeedLike,
  ApiError
} = require('../lib/api');
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

function valuesFrom(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  if (value === undefined || value === null) return [];
  return [value];
}

function booleanFrom(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function redirectAuthIfNeeded(error, res) {
  if (isAuthError(error)) {
    res.redirect('/login?status=auth-required');
    return true;
  }
  return false;
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined
    ? result.data
    : result;
}

function pollRedirect(status, id = null) {
  const suffix = id === null ? '' : `#poll-${id}`;
  return `/polls?status=${encodeURIComponent(status)}${suffix}`;
}

function pollDetailRedirect(id, status, fragment) {
  const suffix = fragment ? `#${fragment}` : '';
  return `/polls/${encodeURIComponent(id)}?status=${encodeURIComponent(status)}${suffix}`;
}

function rankRedirect(id, status) {
  return `/polls/${encodeURIComponent(id)}/rank?status=${encodeURIComponent(status)}`;
}

function createPollRedirect(status, parity = false) {
  return parity
    ? `/polls/parity/create?status=${encodeURIComponent(status)}`
    : pollRedirect(status);
}

function pollOptionsFrom(body) {
  return valuesFrom(body.options !== undefined ? body.options : body['options[]'])
    .map((option) => trimmed(option, 500))
    .filter(Boolean)
    .slice(0, 20);
}

function pollTypeFrom(value, allowed) {
  const type = trimmed(value).toLowerCase();
  return allowed.has(type) ? type : 'standard';
}

function pollPayloadFrom(body, { parity = false } = {}) {
  const allowedTypes = parity
    ? new Set(['standard', 'ranked'])
    : new Set(['standard', 'multiple']);
  const payload = {
    question: trimmed(body.question, 500),
    poll_type: pollTypeFrom(body.poll_type, allowedTypes),
    options: pollOptionsFrom(body)
  };

  const description = trimmed(body.description, 5000);
  const expiresAt = trimmed(body.expires_at);
  const category = trimmed(body.category, 120);
  if (description) payload.description = description;
  if (expiresAt) payload.expires_at = expiresAt;
  if (parity && category) payload.category = category;
  if (!parity) payload.is_anonymous = booleanFrom(body.is_anonymous);

  return payload;
}

function isValidPollPayload(payload) {
  return payload.question !== '' && Array.isArray(payload.options) && payload.options.length >= 2;
}

function parseJsonMaybe(value) {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function rankingFromEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const optionId = positiveInteger(entry.option_id || entry.optionId || entry.id);
  const rank = positiveInteger(entry.rank || entry.position || entry.order);
  return optionId !== null && rank !== null ? { option_id: optionId, rank } : null;
}

function rankingsFromRankMap(rankMap) {
  if (!rankMap || typeof rankMap !== 'object' || Array.isArray(rankMap)) return [];

  return Object.entries(rankMap)
    .map(([optionId, rank]) => {
      const parsedOptionId = positiveInteger(optionId);
      const parsedRank = positiveInteger(rank);
      return parsedOptionId !== null && parsedRank !== null
        ? { option_id: parsedOptionId, rank: parsedRank }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.rank - right.rank);
}

function rankingsFromRawForm(rawBody) {
  if (typeof rawBody !== 'string' || rawBody === '') return [];

  return Array.from(new URLSearchParams(rawBody).entries())
    .map(([key, value]) => {
      const match = key.match(/^rank\[(\d+)\]$/);
      if (!match) return null;
      const optionId = positiveInteger(match[1]);
      const rank = positiveInteger(value);
      return optionId !== null && rank !== null ? { option_id: optionId, rank } : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.rank - right.rank);
}

function rankingsFrom(body, rawBody = '') {
  const rawRows = rankingsFromRawForm(rawBody);
  if (rawRows.length > 0) return rawRows;

  const rankRows = rankingsFromRankMap(body.rank);
  if (rankRows.length > 0) return rankRows;

  const rawRankings = parseJsonMaybe(body.rankings);
  return valuesFrom(rawRankings)
    .map(rankingFromEntry)
    .filter(Boolean)
    .sort((left, right) => left.rank - right.rank);
}

function likeStatusFrom(result) {
  const data = dataFrom(result);
  return data && data.action === 'unliked' ? 'poll-unliked' : 'poll-liked';
}

async function storePoll(req, res, { parity = false } = {}) {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const payload = pollPayloadFrom(req.body, { parity });
  if (!isValidPollPayload(payload)) {
    return res.redirect(createPollRedirect('poll-create-failed', parity));
  }

  let status = 'poll-created';
  try {
    await createPoll(token, payload);
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    status = 'poll-create-failed';
  }

  return res.redirect(createPollRedirect(status, parity));
}

router.post('/parity/create', asyncRoute(async (req, res) => (
  storePoll(req, res, { parity: true })
)));

router.post('/', asyncRoute(async (req, res) => (
  storePoll(req, res)
)));

router.post('/:id(\\d+)/vote', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const optionId = positiveInteger(req.body.option_id);
  if (optionId === null) {
    return res.redirect(pollRedirect('vote-failed', id));
  }

  let status = 'voted';
  try {
    await votePoll(token, id, { option_id: optionId });
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    status = 'vote-failed';
  }

  return res.redirect(pollRedirect(status, id));
}));

router.post('/:id(\\d+)/rank', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const rankings = rankingsFrom(req.body, req.rawUrlencodedBody);
  if (rankings.length === 0) {
    return res.redirect(rankRedirect(id, 'rank-failed'));
  }

  let status = 'ranked';
  try {
    await rankPoll(token, id, { rankings });
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    status = 'rank-failed';
  }

  return res.redirect(rankRedirect(id, status));
}));

router.post('/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let status = 'poll-deleted';
  try {
    await deletePoll(token, id);
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    status = 'poll-delete-failed';
  }

  return res.redirect(`/polls/parity/manage?status=${encodeURIComponent(status)}`);
}));

router.post('/:id(\\d+)/like', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  let status = 'poll-like-failed';
  try {
    const result = await toggleFeedLike(token, {
      target_type: 'poll',
      target_id: id
    });
    status = likeStatusFrom(result);
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    status = 'poll-like-failed';
  }

  return res.redirect(pollDetailRedirect(id, status, 'poll-social'));
}));

router.post('/:id(\\d+)/comment', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  if (!token) {
    return res.redirect('/login?status=auth-required');
  }

  const content = trimmed(req.body.content || req.body.body, 10000);
  const rawContent = String(req.body.content || req.body.body || '');
  const parentId = positiveInteger(req.body.parent_id);
  if (content === '') {
    return res.redirect(pollDetailRedirect(id, 'poll-comment-empty', 'poll-comments'));
  }
  if (rawContent.length > 10000) {
    return res.redirect(pollDetailRedirect(id, 'poll-comment-too-long', 'poll-comments'));
  }

  let status = 'poll-comment-created';
  try {
    await createComment(token, {
      target_type: 'poll',
      target_id: id,
      content,
      parent_id: parentId
    });
  } catch (error) {
    if (redirectAuthIfNeeded(error, res)) return undefined;
    status = 'poll-comment-failed';
  }

  return res.redirect(pollDetailRedirect(id, status, 'poll-comments'));
}));

module.exports = router;
