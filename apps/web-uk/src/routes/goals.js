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

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined ? result.data : result;
}

function collectionFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.items)) return data.items;
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

function metaFrom(result) {
  const data = dataFrom(result);
  const meta = (result && result.meta) || (data && data.meta) || {};
  return {
    hasMore: Boolean(meta.has_more || meta.hasMore || result?.has_more || data?.has_more),
    cursor: meta.cursor || meta.next_cursor || meta.nextCursor || result?.cursor || data?.cursor || ''
  };
}

function statusLabel(status) {
  const value = trimmed(status || 'active').toLowerCase();
  if (['completed', 'achieved'].includes(value)) return 'Completed';
  return 'Active';
}

function statusClass(status) {
  return statusLabel(status) === 'Completed' ? 'govuk-tag--green' : 'govuk-tag--blue';
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function progressPercent(goal) {
  const target = Number(goal.target_value ?? goal.targetValue ?? 0);
  const current = Number(goal.current_value ?? goal.currentValue ?? 0);
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(current)) return 0;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}

function normalizeGoal(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const current = raw.current_value ?? raw.currentValue ?? 0;
  const target = raw.target_value ?? raw.targetValue ?? 0;
  const status = raw.status || 'active';
  const streakCount = Number(raw.streak_count ?? raw.streakCount ?? 0) || 0;

  return {
    ...raw,
    id: positiveInteger(raw.id),
    title: trimmed(raw.title) || 'Goal',
    description: trimmed(raw.description || raw.summary || ''),
    currentText: formatNumber(current),
    targetText: formatNumber(target),
    progressPercent: progressPercent(raw),
    statusLabel: statusLabel(status),
    statusClass: statusClass(status),
    visibilityLabel: checked(raw.is_public) ? 'Public' : 'Private',
    visibilityClass: checked(raw.is_public) ? 'govuk-tag--blue' : 'govuk-tag--grey',
    streakCount,
    deadline: trimmed(raw.deadline || raw.target_date || raw.targetDate)
  };
}

function normalizeTemplate(item) {
  const raw = item && typeof item === 'object' ? item : {};
  return {
    id: positiveInteger(raw.id),
    title: trimmed(raw.title) || 'Goal',
    description: trimmed(raw.description || ''),
    category: trimmed(raw.category || ''),
    targetText: positiveNumber(raw.default_target_value ?? raw.defaultTargetValue) === null
      ? ''
      : formatNumber(raw.default_target_value ?? raw.defaultTargetValue)
  };
}

function ownerNameFrom(raw) {
  const user = raw && typeof raw.user === 'object' && raw.user !== null ? raw.user : {};
  const explicit = trimmed(raw.owner_name || raw.ownerName || raw.user_name || raw.userName || raw.owner);
  const joined = trimmed(`${trimmed(user.first_name || user.firstName)} ${trimmed(user.last_name || user.lastName)}`);
  const name = explicit || joined || trimmed(user.name);
  return name || 'A member';
}

function normalizeDiscoverGoal(item) {
  const goal = normalizeGoal(item);
  const raw = item && typeof item === 'object' ? item : {};
  return {
    ...goal,
    ownerName: ownerNameFrom(raw)
  };
}

function dateInputValue(value) {
  const text = trimmed(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }
  return '';
}

function normalizeEditableGoal(item) {
  const goal = normalizeGoal(item);
  const raw = item && typeof item === 'object' ? item : {};
  return {
    ...goal,
    rawTitle: trimmed(raw.title),
    rawDescription: trimmed(raw.description || ''),
    targetValue: goal.targetText,
    deadlineValue: dateInputValue(raw.deadline || raw.target_date || raw.targetDate),
    checkinFrequency: allowedValue(raw.checkin_frequency || raw.checkinFrequency, GOAL_CHECKIN_FREQUENCIES, 'none'),
    isPublic: checked(raw.is_public)
  };
}

function statusMessage(status) {
  const messages = {
    'goal-created': 'Goal created',
    'goal-completed': 'Goal completed',
    'goal-deleted': 'Goal deleted'
  };
  return messages[trimmed(status)] || '';
}

function errorMessage(status) {
  const messages = {
    'goal-failed': 'We could not update the goal. Try again.',
    'goal-invalid': 'Enter a title and target value.'
  };
  return messages[trimmed(status)] || '';
}

function editErrorMessage(status) {
  const messages = {
    'goal-failed': 'Something went wrong. Please try again.',
    'goal-invalid': 'Enter a goal and a target greater than zero.'
  };
  return messages[trimmed(status)] || '';
}

function buddyingStatus(status) {
  const value = trimmed(status);
  if (value === 'buddy-nudge-sent') {
    return { successMessage: 'Encouragement sent!', errorMessage: '', errorHref: '' };
  }
  if (value === 'buddy-joined') {
    return { successMessage: 'You are now a buddy for this goal.', errorMessage: '', errorHref: '' };
  }
  if (value === 'buddy-nudge-failed') {
    return { successMessage: '', errorMessage: 'Unable to send encouragement. Please try again.', errorHref: '#your-buddied-goals' };
  }
  if (value === 'buddy-failed') {
    return { successMessage: '', errorMessage: 'We could not add you as a buddy. The goal may already have one.', errorHref: '#available-goals' };
  }
  return { successMessage: '', errorMessage: '', errorHref: '' };
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

router.get('/templates', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const category = trimmed(req.query.category);
  const templateParams = new URLSearchParams({ per_page: '50' });
  if (category) templateParams.set('category', category);
  if (trimmed(req.query.cursor)) templateParams.set('cursor', trimmed(req.query.cursor));

  const [categoryResult, templateResult] = await Promise.all([
    callGoal(token, 'GET', '/templates/categories').catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: [] };
    }),
    callGoal(token, 'GET', `/templates?${templateParams.toString()}`).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: [] };
    })
  ]);

  const templates = collectionFrom(templateResult).map(normalizeTemplate).filter((template) => template.id !== null);
  const meta = metaFrom(templateResult);
  const nextParams = new URLSearchParams();
  if (category) nextParams.set('category', category);
  if (meta.cursor) nextParams.set('cursor', meta.cursor);
  const status = trimmed(req.query.status);

  return res.render('goals/templates', {
    title: 'Goal templates',
    activeNav: 'explore',
    templates,
    categories: collectionFrom(categoryResult).map((item) => trimmed(item)).filter(Boolean),
    category,
    meta,
    nextHref: meta.hasMore && meta.cursor ? `/goals/templates?${nextParams.toString()}` : '',
    errorMessage: status === 'goal-failed' ? 'Something went wrong. Please try again.' : ''
  });
}, { redirectOn401: loginRedirect() }));

router.get('/buddying', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const params = new URLSearchParams({ per_page: '30' });
  const [buddyingResult, availableResult] = await Promise.all([
    callGoal(token, 'GET', `/mentoring?${params.toString()}`).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: [] };
    }),
    callGoal(token, 'GET', `/discover?${params.toString()}`).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: [] };
    })
  ]);

  const status = buddyingStatus(req.query.status);

  return res.render('goals/buddying', {
    title: 'Goals you buddy',
    activeNav: 'explore',
    buddying: collectionFrom(buddyingResult).map(normalizeDiscoverGoal).filter((goal) => goal.id !== null),
    available: collectionFrom(availableResult).map(normalizeDiscoverGoal).filter((goal) => goal.id !== null),
    ...status
  });
}, { redirectOn401: loginRedirect() }));

router.get('/discover', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const params = new URLSearchParams({ per_page: '30' });
  if (trimmed(req.query.cursor)) params.set('cursor', trimmed(req.query.cursor));

  const result = await callGoal(token, 'GET', `/discover?${params.toString()}`);
  const goals = collectionFrom(result).map(normalizeDiscoverGoal).filter((goal) => goal.id !== null);
  const meta = metaFrom(result);
  const status = trimmed(req.query.status);
  const nextParams = new URLSearchParams();
  if (meta.cursor) nextParams.set('cursor', meta.cursor);

  return res.render('goals/discover', {
    title: 'Discover goals',
    activeNav: 'explore',
    goals,
    meta,
    nextHref: meta.hasMore && meta.cursor ? `/goals/discover?${nextParams.toString()}` : '',
    successMessage: status === 'buddy-joined' ? 'You are now a buddy for this goal.' : '',
    errorMessage: status === 'buddy-failed' ? 'We could not add you as a buddy. The goal may already have one.' : ''
  });
}, { redirectOn401: loginRedirect() }));

router.get('/:id(\\d+)/edit', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const id = req.params.id;
  const result = await getGoal(token, id);
  const goal = normalizeEditableGoal(dataFrom(result));
  goal.id = goal.id || Number(id);

  return res.render('goals/edit', {
    title: 'Edit your goal',
    activeNav: 'explore',
    goal,
    errorMessage: editErrorMessage(req.query.status),
    frequencies: [
      { value: 'none', label: 'No reminders' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Every two weeks' },
      { value: 'monthly', label: 'Monthly' }
    ]
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Goal not found' }));

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

router.get('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const result = await getGoals(token, { per_page: 30 });
  const goals = collectionFrom(result).map(normalizeGoal).filter((goal) => goal.id !== null);
  const status = trimmed(req.query.status);

  return res.render('goals/index', {
    title: 'Goals',
    activeNav: 'explore',
    goals,
    meta: metaFrom(result),
    status,
    successMessage: statusMessage(status),
    errorMessage: errorMessage(status)
  });
}, { redirectOn401: loginRedirect() }));

router.use(requireAuth);

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
