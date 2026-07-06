// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getGoals,
  getGoal,
  callGoalApi,
  createComment,
  deleteComment,
  toggleFeedLike,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { normalizeResponse } = require('../lib/normalizeResponse');

const router = express.Router();

const GOAL_CHECKIN_MOODS = ['great', 'good', 'neutral', 'okay', 'struggling', 'stuck', 'motivated', 'grateful'];
const GOAL_CHECKIN_FREQUENCIES = ['none', 'daily', 'weekly', 'biweekly', 'monthly'];
const GOAL_REMINDER_FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly'];
const GOAL_BUDDY_ACTION_TYPES = ['nudge', 'encouragement', 'offer_help'];

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

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function boundedPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(100, Math.max(0, number));
}

function allowedValue(value, allowed, fallback = null) {
  const text = trimmed(value);
  return allowed.includes(text) ? text : fallback;
}

function optionalText(value, limit = null) {
  const text = trimmed(value, limit);
  return text === '' ? null : text;
}

function optionalDate(value) {
  const text = trimmed(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
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

async function callGoal(token, method, path, data = undefined) {
  if (data === undefined) {
    return callGoalApi(token, method, path);
  }

  return callGoalApi(token, method, path, data);
}

function goalRedirect(id, status, suffix = '') {
  return `/goals/${id}?status=${encodeURIComponent(status)}${suffix}`;
}

function goalSubpageRedirect(id, segment, status, suffix = '') {
  return `/goals/${id}/${segment}?status=${encodeURIComponent(status)}${suffix}`;
}

function goalFormPayload(body) {
  const targetValue = positiveNumber(body.target_value);
  if (trimmed(body.title) === '' || targetValue === null) {
    return null;
  }

  return {
    title: trimmed(body.title, 255),
    description: optionalText(body.description, 5000),
    target_value: targetValue,
    deadline: optionalDate(body.deadline),
    is_public: checked(body.is_public)
  };
}

function goalIdFromResult(result) {
  return result?.data?.id || result?.goal?.id || result?.id || null;
}

router.post('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const payload = goalFormPayload(req.body);
  if (payload === null) {
    return res.redirect('/goals?status=goal-invalid');
  }

  let status = 'goal-created';
  try {
    await callGoal(token, 'POST', '', payload);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'goal-failed';
  }

  return res.redirect(`/goals?status=${status}`);
}));

router.post('/templates/:templateId(\\d+)', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const templateId = Number(req.params.templateId);
  const payload = {
    title: optionalText(req.body.title, 255),
    deadline: optionalDate(req.body.deadline),
    is_public: checked(req.body.is_public)
  };

  let result;
  try {
    result = await callGoal(token, 'POST', `/from-template/${templateId}`, payload);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect('/goals/templates?status=goal-failed');
  }

  const goalId = goalIdFromResult(result);
  return res.redirect(goalId ? goalRedirect(goalId, 'goal-created') : '/goals/templates?status=goal-failed');
}));

router.post('/:id(\\d+)/edit', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  const payload = goalFormPayload(req.body);
  if (payload === null) {
    return res.redirect(goalSubpageRedirect(id, 'edit', 'goal-invalid'));
  }

  payload.checkin_frequency = allowedValue(req.body.checkin_frequency, GOAL_CHECKIN_FREQUENCIES, 'none');

  try {
    await callGoal(token, 'PUT', `/${id}`, payload);
    return res.redirect(goalRedirect(id, 'goal-edited'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(goalSubpageRedirect(id, 'edit', 'goal-failed'));
  }
}));

router.post('/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  try {
    await callGoal(token, 'DELETE', `/${id}`);
    return res.redirect('/goals?status=goal-deleted');
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(goalRedirect(id, 'goal-failed'));
  }
}));

router.post('/:id(\\d+)/buddy', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  try {
    await callGoal(token, 'POST', `/${id}/buddy`);
    return res.redirect(goalRedirect(id, 'buddy-joined'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(goalRedirect(id, 'buddy-failed'));
  }
}));

router.post('/:id(\\d+)/buddy-nudge', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  try {
    await callGoal(token, 'POST', `/${id}/buddy/nudge`, { type: 'nudge' });
    return res.redirect('/goals/buddying?status=buddy-nudge-sent');
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect('/goals/buddying?status=buddy-nudge-failed');
  }
}));

router.post('/:id(\\d+)/progress', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  const increment = positiveNumber(req.body.increment);
  if (increment === null) {
    return res.redirect(goalRedirect(id, 'goal-invalid'));
  }

  try {
    await callGoal(token, 'POST', `/${id}/progress`, { increment });
    return res.redirect(goalRedirect(id, 'goal-updated'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(goalRedirect(id, 'goal-failed'));
  }
}));

router.post('/:id(\\d+)/complete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  try {
    await callGoal(token, 'POST', `/${id}/complete`);
    return res.redirect(goalRedirect(id, 'goal-completed'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(goalRedirect(id, 'goal-failed'));
  }
}));

router.post('/:id(\\d+)/checkin', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  const progressPercent = boundedPercent(req.body.progress_percent || req.body.progress_value);
  const mood = allowedValue(req.body.mood, GOAL_CHECKIN_MOODS, null);
  const note = optionalText(req.body.note, 2000);
  const payload = {
    progress_percent: progressPercent,
    progress_value: progressPercent,
    mood,
    note
  };

  try {
    await callGoal(token, 'POST', `/${id}/checkins`, payload);
    return res.redirect(goalSubpageRedirect(id, 'checkin', 'checkin-recorded'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(goalSubpageRedirect(id, 'checkin', 'checkin-failed'));
  }
}));

router.post('/:id(\\d+)/reminder', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  const payload = {
    frequency: allowedValue(req.body.frequency, GOAL_REMINDER_FREQUENCIES, 'weekly'),
    enabled: checked(req.body.enabled) || !Object.prototype.hasOwnProperty.call(req.body, 'enabled')
  };

  try {
    await callGoal(token, 'PUT', `/${id}/reminder`, payload);
    return res.redirect(goalSubpageRedirect(id, 'reminder', 'reminder-saved'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(goalSubpageRedirect(id, 'reminder', 'reminder-failed'));
  }
}));

router.post('/:id(\\d+)/reminder/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  try {
    await callGoal(token, 'DELETE', `/${id}/reminder`);
    return res.redirect(goalSubpageRedirect(id, 'reminder', 'reminder-removed'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(goalSubpageRedirect(id, 'reminder', 'reminder-failed'));
  }
}));

router.post('/:id(\\d+)/buddy-actions', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  const type = allowedValue(req.body.type, GOAL_BUDDY_ACTION_TYPES, 'encouragement');
  const payload = { type };
  const message = optionalText(req.body.message, 1000);
  if (message !== null) {
    payload.message = message;
  }

  try {
    await callGoal(token, 'POST', `/${id}/buddy/nudge`, payload);
    return res.redirect(goalSubpageRedirect(id, 'buddy-actions', 'buddy-action-sent'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(goalSubpageRedirect(id, 'buddy-actions', 'buddy-action-failed'));
  }
}));

router.post('/:id(\\d+)/like', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  try {
    const result = await toggleFeedLike(token, {
      target_type: 'goal',
      target_id: id
    });
    const action = result?.data?.action === 'unliked' ? 'unliked' : 'liked';
    return res.redirect(goalSubpageRedirect(id, 'social', action));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(goalSubpageRedirect(id, 'social', 'like-failed'));
  }
}));

router.post('/:id(\\d+)/comments', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  const content = optionalText(req.body.body || req.body.content, 5000);
  if (content === null) {
    return res.redirect(goalSubpageRedirect(id, 'social', 'comment-invalid', '#comments'));
  }

  const parentId = positiveInteger(req.body.parent_id);
  const payload = {
    target_type: 'goal',
    target_id: id,
    content
  };
  if (parentId !== null) {
    payload.parent_id = parentId;
  }

  try {
    await createComment(token, payload);
    return res.redirect(goalSubpageRedirect(id, 'social', parentId === null ? 'comment-added' : 'reply-added', '#comments'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(goalSubpageRedirect(id, 'social', 'comment-failed', '#comments'));
  }
}));

router.post('/:id(\\d+)/comments/:commentId(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  const commentId = Number(req.params.commentId);
  try {
    await deleteComment(token, commentId);
    return res.redirect(goalSubpageRedirect(id, 'social', 'comment-deleted', '#comments'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(goalSubpageRedirect(id, 'social', 'comment-delete-failed', '#comments'));
  }
}));

router.use(requireAuth);

// List goals
router.get('/', asyncRoute(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;

  const result = await getGoals(req.token, { page, limit: 20 });

  const goals = (result.items || result.data || []).map(normalizeResponse);

  res.render('goals/index', {
    title: 'Goals',
    goals,
    pagination: result.pagination || { page, totalPages: 1 },
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// View goal with milestones
router.get('/:id', asyncRoute(async (req, res) => {
  const result = await getGoal(req.token, req.params.id);
  const goal = normalizeResponse(result.goal || result);

  res.render('goals/detail', {
    title: goal.title || 'Goal',
    goal,
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}, { notFoundTitle: 'Goal not found' }));

module.exports = router;
