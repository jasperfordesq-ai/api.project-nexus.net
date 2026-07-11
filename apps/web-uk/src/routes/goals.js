// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  getGoals,
  getGoal,
  getComments,
  callGoalApi,
  createComment,
  deleteComment,
  toggleFeedLike,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { normalizeResponse } = require('../lib/normalizeResponse');
const { getRequestIntlLocale } = require('../lib/request-intl-locale');

const router = express.Router();

const GOALS_PATH = '/goals';
const GOAL_CHECKIN_MOODS = ['great', 'good', 'neutral', 'okay', 'struggling', 'stuck', 'motivated', 'grateful'];
const GOAL_CHECKIN_FREQUENCIES = ['none', 'daily', 'weekly', 'biweekly', 'monthly'];
const GOAL_REMINDER_FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly'];
const GOAL_BUDDY_ACTION_TYPES = ['nudge', 'encouragement', 'offer_help'];
const GOAL_REMINDER_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly'
};
const GOAL_BUDDY_TYPE_LABELS = {
  nudge: 'Nudge',
  encouragement: 'Encouragement',
  offer_help: 'Offer to help'
};
const GOAL_BUDDY_TYPE_HINTS = {
  nudge: 'A gentle reminder to keep going.',
  encouragement: 'A few words of support and motivation.',
  offer_help: 'Let the owner know you can help out.'
};
const GOAL_MOOD_LABELS = {
  great: 'Great',
  good: 'Good',
  neutral: 'Neutral',
  okay: 'Okay',
  struggling: 'Struggling',
  stuck: 'Stuck',
  motivated: 'Motivated',
  grateful: 'Grateful'
};
const GOAL_HISTORY_LABELS = {
  created: 'Created',
  progress_update: 'Progress update',
  checkin: 'Check-in',
  milestone: 'Milestone',
  buddy_joined: 'Buddy joined',
  buddy_action: 'Buddy action',
  completed: 'Completed'
};
const GOAL_HISTORY_TAG_CLASSES = {
  created: 'govuk-tag--grey',
  progress_update: 'govuk-tag--blue',
  checkin: 'govuk-tag--blue',
  milestone: 'govuk-tag--purple',
  buddy_joined: 'govuk-tag--turquoise',
  buddy_action: 'govuk-tag--turquoise',
  completed: 'govuk-tag--green'
};
const GOAL_SOCIAL_SUCCESS_MESSAGES = {
  liked: 'You liked this goal.',
  unliked: 'You removed your like.',
  'comment-added': 'Your comment has been posted.',
  'reply-added': 'Your reply has been posted.',
  'comment-deleted': 'Your comment has been deleted.'
};
const GOAL_SOCIAL_ERROR_MESSAGES = {
  'like-failed': 'We could not update your like. Please try again.',
  'comment-invalid': 'Please enter a comment before posting.',
  'comment-failed': 'We could not post your comment. Please try again.',
  'comment-delete-failed': 'We could not delete that comment. You can only delete your own comments.'
};

function tokenFrom(req) {
  return (req.signedCookies && req.signedCookies.token) || req.token || '';
}

function loginRedirect() {
  return '/login?status=auth-required';
}

function redirectTo(res, target) {
  const urlFor = typeof res.locals.urlFor === 'function' ? res.locals.urlFor : (value) => value;
  return res.redirect(urlFor(target));
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
    redirectTo(res, loginRedirect());
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

async function optionalGoalRead(promise, fallback) {
  try {
    return await promise;
  } catch (error) {
    if (isAuthError(error)) throw error;
    return fallback;
  }
}

function goalRedirect(id, status, suffix = '') {
  return `${GOALS_PATH}/${id}?status=${encodeURIComponent(status)}${suffix}`;
}

function goalSubpageRedirect(id, segment, status, suffix = '') {
  return `${GOALS_PATH}/${id}/${segment}?status=${encodeURIComponent(status)}${suffix}`;
}

function goalsRedirect(status) {
  return `${GOALS_PATH}?status=${encodeURIComponent(status)}`;
}

function goalsSubpageStatusRedirect(segment, status) {
  return `${GOALS_PATH}/${segment}?status=${encodeURIComponent(status)}`;
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

function statusLabel(status, t) {
  const value = trimmed(status || 'active').toLowerCase();
  if (['completed', 'achieved'].includes(value)) return t ? t('goals.status_completed') : 'Completed';
  return t ? t('goals.status_active') : 'Active';
}

function statusClass(status) {
  const value = trimmed(status || 'active').toLowerCase();
  return ['completed', 'achieved'].includes(value) ? 'govuk-tag--green' : 'govuk-tag--blue';
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

function normalizeGoal(item, t) {
  const raw = item && typeof item === 'object' ? item : {};
  const current = raw.current_value ?? raw.currentValue ?? 0;
  const target = raw.target_value ?? raw.targetValue ?? 0;
  const status = raw.status || 'active';
  const done = ['completed', 'achieved'].includes(trimmed(status).toLowerCase());
  const isPublic = checked(raw.is_public ?? raw.isPublic);
  const streakCount = Number(raw.streak_count ?? raw.streakCount ?? 0) || 0;

  return {
    ...raw,
    id: positiveInteger(raw.id),
    title: trimmed(raw.title) || (t ? t('goals.title') : 'Goal'),
    description: trimmed(raw.description || raw.summary || ''),
    currentText: formatNumber(current),
    targetText: formatNumber(target),
    progressPercent: progressPercent(raw),
    done,
    statusLabel: statusLabel(status, t),
    statusClass: statusClass(status),
    isPublic,
    visibilityLabel: isPublic
      ? (t ? t('groups.visibility_public') : 'Public')
      : (t ? t('groups.visibility_private') : 'Private'),
    visibilityClass: isPublic ? 'govuk-tag--blue' : 'govuk-tag--grey',
    streakCount,
    deadline: trimmed(raw.deadline || raw.target_date || raw.targetDate),
    isOverdue: !done && Boolean(trimmed(raw.deadline || raw.target_date || raw.targetDate))
      && new Date(raw.deadline || raw.target_date || raw.targetDate).getTime() < Date.now()
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

function dateTimeLabel(value) {
  const text = trimmed(value);
  if (!text) return '';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(getRequestIntlLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(',', '');
}

function dateLabel(value) {
  const text = trimmed(value);
  if (!text) return '';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(getRequestIntlLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function normalizeEditableGoal(item, t) {
  const goal = normalizeGoal(item, t);
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

function normalizeCheckin(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const progress = raw.progress_value ?? raw.progress_percent ?? raw.progressValue ?? raw.progressPercent ?? null;
  const mood = allowedValue(raw.mood, GOAL_CHECKIN_MOODS, '');

  return {
    id: positiveInteger(raw.id),
    progressText: progress === null || progress === undefined || progress === ''
      ? 'Progress not recorded'
      : `Progress: ${Math.round(Number(progress))}%`,
    moodLabel: mood ? GOAL_MOOD_LABELS[mood] : '',
    note: trimmed(raw.note || ''),
    createdAtLabel: dateTimeLabel(raw.created_at || raw.createdAt)
  };
}

function normalizeHistoryEvent(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const type = allowedValue(raw.type || raw.event_type || raw.eventType, Object.keys(GOAL_HISTORY_LABELS), 'progress_update');
  const createdAt = raw.created_at || raw.createdAt || '';

  return {
    id: positiveInteger(raw.id),
    type,
    label: GOAL_HISTORY_LABELS[type],
    tagClass: GOAL_HISTORY_TAG_CLASSES[type],
    description: trimmed(raw.description || ''),
    createdAt,
    createdAtLabel: dateTimeLabel(createdAt)
  };
}

function pluralStreak(count) {
  if (count === 0) return 'No check-ins yet';
  if (count === 1) return '1 check-in in a row';
  return `${count} check-ins in a row`;
}

function pluralCheckins(count) {
  if (count === 0) return 'None recorded';
  if (count === 1) return '1 recorded';
  return `${count} recorded`;
}

function normalizeMilestone(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const percent = Math.round(Number(raw.target_percent ?? raw.targetPercent ?? 0)) || 0;
  const done = Boolean(raw.completed_at || raw.completedAt);
  return {
    title: trimmed(raw.title || ''),
    done,
    tagClass: done ? 'govuk-tag--green' : 'govuk-tag--grey',
    statusLabel: done ? 'Reached' : `Target: ${percent}%`
  };
}

function normalizeBuddyNote(item, t) {
  const raw = item && typeof item === 'object' ? item : {};
  const type = allowedValue(raw.type, GOAL_BUDDY_ACTION_TYPES, 'encouragement');
  return {
    typeLabel: GOAL_BUDDY_TYPE_LABELS[type],
    message: trimmed(raw.message || ''),
    buddyName: trimmed(raw.buddy_name || raw.buddyName || '') || (t ? t('goals.a_member') : 'A member'),
    createdAtDateLabel: dateLabel(raw.created_at || raw.createdAt),
    createdAtLabel: dateTimeLabel(raw.created_at || raw.createdAt)
  };
}

function goalDetailStatus(status) {
  const value = trimmed(status);
  if (['goal-updated', 'goal-edited', 'goal-completed', 'buddy-joined'].includes(value)) {
    return {
      successStateKey: `goals.states.${value}`,
      errorStateKey: '',
      errorHref: ''
    };
  }
  if (['goal-failed', 'goal-invalid', 'buddy-failed'].includes(value)) {
    return {
      successStateKey: '',
      errorStateKey: `goals.states.${value}`,
      errorHref: value === 'buddy-failed' ? '#buddy-section' : '#increment'
    };
  }
  return { successStateKey: '', errorStateKey: '', errorHref: '' };
}

function commentAuthorName(raw) {
  const author = raw && typeof raw.author === 'object' && raw.author !== null ? raw.author : {};
  const user = raw && typeof raw.user === 'object' && raw.user !== null ? raw.user : {};
  return trimmed(author.name || user.name || raw.author_name || raw.authorName || raw.user_name || raw.userName) || 'A member';
}

function normalizeSocialComment(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const replies = Array.isArray(raw.replies) ? raw.replies : [];
  const createdAt = raw.created_at || raw.createdAt || '';
  return {
    id: positiveInteger(raw.id),
    authorName: commentAuthorName(raw),
    content: trimmed(raw.content || raw.body || ''),
    createdAt,
    createdAtLabel: dateTimeLabel(createdAt),
    isOwn: checked(raw.is_own ?? raw.isOwn),
    edited: checked(raw.edited ?? raw.is_edited ?? raw.isEdited),
    replies: replies.map(normalizeSocialComment).filter((reply) => reply.id !== null)
  };
}

function socialCommentsFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data?.comments)) return data.comments;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

function socialCommentCount(comments) {
  return comments.reduce((total, comment) => total + 1 + socialCommentCount(comment.replies || []), 0);
}

function nonNegativeCount(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.floor(number);
}

function socialCountFrom(data, keys, fallback = 0) {
  for (const key of keys) {
    if (data && Object.prototype.hasOwnProperty.call(data, key)) {
      return nonNegativeCount(data[key], fallback);
    }
  }
  return fallback;
}

function likesLabel(count) {
  if (count === 0) return 'No likes yet';
  if (count === 1) return '1 person likes this';
  return `${count} people like this`;
}

function commentsLabel(count) {
  if (count === 0) return 'No comments yet';
  if (count === 1) return '1 comment';
  return `${count} comments`;
}

function normalizeInsights(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const keys = Object.keys(raw);
  const streak = Math.max(0, Number(raw.streak_count ?? raw.streakCount ?? 0) || 0);
  const best = Math.max(0, Number(raw.best_streak_count ?? raw.bestStreakCount ?? 0) || 0);
  const checkinCount = Math.max(0, Number(raw.checkin_count ?? raw.checkinCount ?? 0) || 0);
  const completedMilestones = Math.max(0, Number(raw.completed_milestones ?? raw.completedMilestones ?? 0) || 0);
  const milestoneCount = Math.max(0, Number(raw.milestone_count ?? raw.milestoneCount ?? 0) || 0);
  const milestonePercent = milestoneCount > 0 ? Math.round((completedMilestones / milestoneCount) * 100) : 0;
  const frequency = allowedValue(raw.checkin_frequency || raw.checkinFrequency, GOAL_REMINDER_FREQUENCIES, 'none');
  const nextDue = dateTimeLabel(raw.next_checkin_due_at || raw.nextCheckinDueAt);
  const lastCheckin = dateTimeLabel(raw.last_checkin_at || raw.lastCheckinAt);

  return {
    hasInsights: keys.length > 0,
    streakText: pluralStreak(streak),
    bestStreakText: `Best streak: ${best}`,
    checkinDue: checked(raw.is_checkin_due || raw.isCheckinDue),
    nextCheckinText: checked(raw.is_checkin_due || raw.isCheckinDue)
      ? ''
      : (nextDue || 'No cadence set'),
    frequencyHelper: frequency === 'none' ? 'Set a check-in cadence when you edit this goal.' : `${GOAL_REMINDER_LABELS[frequency]} cadence`,
    checkinsText: pluralCheckins(checkinCount),
    lastCheckinText: lastCheckin ? `Last check-in: ${lastCheckin}` : 'No check-ins yet',
    milestonesText: `${completedMilestones} of ${milestoneCount} reached`,
    milestonePercent,
    milestones: collectionFrom({ data: raw.milestones || [] }).map(normalizeMilestone),
    buddyNotes: collectionFrom({ data: raw.buddy_notes || raw.buddyNotes || [] }).map(normalizeBuddyNote)
  };
}

function normalizeReminder(item) {
  const raw = item && typeof item === 'object' ? item : {};
  const hasReminder = Object.keys(raw).length > 0;
  const frequency = allowedValue(raw.frequency, GOAL_REMINDER_FREQUENCIES, 'weekly');
  const enabled = hasReminder && checked(raw.enabled);

  return {
    hasReminder,
    enabled,
    frequency,
    frequencyLabel: GOAL_REMINDER_LABELS[frequency],
    nextReminderLabel: dateTimeLabel(raw.next_reminder_at || raw.nextReminderAt)
  };
}

function statusMessage(status, t) {
  const messages = {
    'goal-created': t('goals.states.goal-created'),
    'goal-completed': t('goals.states.goal-completed'),
    'goal-deleted': t('goals.states.goal-deleted')
  };
  return messages[trimmed(status)] || '';
}

function errorMessage(status, t) {
  const messages = {
    'goal-failed': t('goals.states.goal-failed'),
    'goal-invalid': t('goals.states.goal-invalid')
  };
  return messages[trimmed(status)] || '';
}

function checkinStatus(status) {
  const value = trimmed(status);
  if (value === 'checkin-recorded') {
    return {
      successMessage: 'Your check-in has been recorded.',
      errorMessage: ''
    };
  }
  if (value === 'checkin-failed') {
    return {
      successMessage: '',
      errorMessage: 'We could not record your check-in. Please try again.'
    };
  }
  return { successMessage: '', errorMessage: '' };
}

function reminderStatus(status) {
  const value = trimmed(status);
  if (value === 'reminder-saved') {
    return { successMessage: 'Your reminder settings have been saved.', errorMessage: '' };
  }
  if (value === 'reminder-removed') {
    return { successMessage: 'Your reminder has been removed.', errorMessage: '' };
  }
  if (value === 'reminder-failed') {
    return {
      successMessage: '',
      errorMessage: 'We could not save your reminder. Only the goal owner, or any member for a public goal, can set one.'
    };
  }
  return { successMessage: '', errorMessage: '' };
}

function buddyActionStatus(status) {
  const value = trimmed(status);
  if (value === 'buddy-action-sent') {
    return { successMessage: 'Your support has been sent to the goal owner.', errorMessage: '' };
  }
  if (value === 'buddy-action-failed') {
    return { successMessage: '', errorMessage: 'We could not send your support. You must be the goal buddy.' };
  }
  return { successMessage: '', errorMessage: '' };
}

function socialStatus(status) {
  const value = trimmed(status);
  if (Object.prototype.hasOwnProperty.call(GOAL_SOCIAL_SUCCESS_MESSAGES, value)) {
    return {
      statusBanner: {
        type: 'success',
        title: 'Success',
        message: GOAL_SOCIAL_SUCCESS_MESSAGES[value],
        anchor: ''
      }
    };
  }
  if (Object.prototype.hasOwnProperty.call(GOAL_SOCIAL_ERROR_MESSAGES, value)) {
    return {
      statusBanner: {
        type: 'error',
        title: 'There is a problem',
        message: GOAL_SOCIAL_ERROR_MESSAGES[value],
        anchor: 'body'
      }
    };
  }
  return { statusBanner: null };
}

function editErrorMessage(status, t) {
  const messages = {
    'goal-failed': t('goals.states.goal-failed'),
    'goal-invalid': t('goals.states.goal-invalid')
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
  if (!token) return redirectTo(res, loginRedirect());

  const payload = goalFormPayload(req.body);
  if (payload === null) {
    return redirectTo(res, goalsRedirect('goal-invalid'));
  }

  let status = 'goal-created';
  try {
    await callGoal(token, 'POST', '', payload);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'goal-failed';
  }

  return redirectTo(res, goalsRedirect(status));
}));

router.post('/templates/:templateId(\\d+)', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

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
    return redirectTo(res, goalsSubpageStatusRedirect('templates', 'goal-failed'));
  }

  const goalId = goalIdFromResult(result);
  return redirectTo(
    res,
    goalId ? goalRedirect(goalId, 'goal-created') : goalsSubpageStatusRedirect('templates', 'goal-failed')
  );
}));

router.get('/templates', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

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
  if (!token) return redirectTo(res, loginRedirect());

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
  if (!token) return redirectTo(res, loginRedirect());

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
  if (!token) return redirectTo(res, loginRedirect());

  const id = req.params.id;
  const result = await getGoal(token, id);
  const goal = normalizeEditableGoal(dataFrom(result), res.locals.t);
  goal.id = goal.id || Number(id);

  return res.render('goals/edit', {
    title: res.locals.t('goals.edit_title'),
    activeNav: 'explore',
    goal,
    errorMessage: editErrorMessage(req.query.status, res.locals.t),
    frequencies: GOAL_CHECKIN_FREQUENCIES.map((value) => ({
      value,
      label: res.locals.t(`goals.frequency_${value}`)
    }))
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Goal not found' }));

router.get('/:id(\\d+)/checkin', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = req.params.id;
  const [goalResult, checkinResult] = await Promise.all([
    getGoal(token, id),
    callGoal(token, 'GET', `/${id}/checkins?limit=20`).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: [] };
    })
  ]);

  const goal = normalizeGoal(dataFrom(goalResult));
  goal.id = goal.id || Number(id);
  const currentPercent = progressPercent(goal);
  const status = checkinStatus(req.query.status);

  return res.render('goals/checkin', {
    title: 'Log a check-in',
    activeNav: 'explore',
    goal,
    currentPercent,
    moods: GOAL_CHECKIN_MOODS.map((value) => ({ value, label: GOAL_MOOD_LABELS[value] })),
    checkins: collectionFrom(checkinResult).map(normalizeCheckin),
    ...status
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Goal not found' }));

router.get('/:id(\\d+)/reminder', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = req.params.id;
  const [goalResult, reminderResult] = await Promise.all([
    getGoal(token, id),
    callGoal(token, 'GET', `/${id}/reminder`).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: null };
    })
  ]);

  const goal = normalizeGoal(dataFrom(goalResult));
  goal.id = goal.id || Number(id);
  const reminder = normalizeReminder(dataFrom(reminderResult));

  return res.render('goals/reminder', {
    title: 'Reminder settings',
    activeNav: 'explore',
    goal,
    reminder,
    frequencies: GOAL_REMINDER_FREQUENCIES.map((value) => ({ value, label: GOAL_REMINDER_LABELS[value] })),
    ...reminderStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Goal not found' }));

router.get('/:id(\\d+)/buddy-actions', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = req.params.id;
  const result = await getGoal(token, id);
  const goal = normalizeGoal(dataFrom(result));
  goal.id = goal.id || Number(id);

  return res.render('goals/buddy-actions', {
    title: 'Send buddy support',
    activeNav: 'explore',
    goal,
    buddyTypes: GOAL_BUDDY_ACTION_TYPES.map((value) => ({
      value,
      label: GOAL_BUDDY_TYPE_LABELS[value],
      hint: GOAL_BUDDY_TYPE_HINTS[value]
    })),
    ...buddyActionStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Goal not found' }));

router.get('/:id(\\d+)/insights', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = req.params.id;
  const [goalResult, insightsResult] = await Promise.all([
    getGoal(token, id),
    callGoal(token, 'GET', `/${id}/insights`).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: {} };
    })
  ]);

  const goal = normalizeGoal(dataFrom(goalResult));
  goal.id = goal.id || Number(id);

  return res.render('goals/insights', {
    title: 'Goal insights',
    activeNav: 'explore',
    goal,
    insights: normalizeInsights(dataFrom(insightsResult)),
    isOwner: checked(goal.is_owner || goal.isOwner || goal.can_edit || goal.canEdit),
    isBuddy: checked(goal.is_buddy || goal.isBuddy)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Goal not found' }));

router.get('/:id(\\d+)/history', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = req.params.id;
  const params = new URLSearchParams({ limit: '30' });
  const cursor = trimmed(req.query.cursor);
  if (cursor) params.set('cursor', cursor);

  const [goalResult, historyResult] = await Promise.all([
    getGoal(token, id),
    callGoal(token, 'GET', `/${id}/history?${params.toString()}`).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: { items: [], has_more: false } };
    })
  ]);

  const goal = normalizeGoal(dataFrom(goalResult));
  goal.id = goal.id || Number(id);
  const meta = metaFrom(historyResult);
  const nextParams = new URLSearchParams();
  if (meta.cursor) nextParams.set('cursor', meta.cursor);

  return res.render('goals/history', {
    title: 'Progress history',
    activeNav: 'explore',
    goal,
    items: collectionFrom(historyResult).map(normalizeHistoryEvent),
    hasMore: meta.hasMore,
    nextHref: meta.hasMore && meta.cursor ? `/goals/${goal.id}/history?${nextParams.toString()}` : ''
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Goal not found' }));

router.get('/:id(\\d+)/social', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = req.params.id;
  const numericId = Number(id);
  const [goalResult, commentsResult, socialResult] = await Promise.all([
    getGoal(token, id),
    getComments(token, { target_type: 'goal', target_id: numericId }).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: { comments: [], count: 0 } };
    }),
    callGoal(token, 'GET', `/${id}/social`).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: {} };
    })
  ]);

  const goal = normalizeGoal(dataFrom(goalResult));
  goal.id = goal.id || numericId;
  const comments = socialCommentsFrom(commentsResult).map(normalizeSocialComment).filter((comment) => comment.id !== null);
  const commentsData = dataFrom(commentsResult) || {};
  const commentsFallback = socialCommentCount(comments);
  const commentsTotal = socialCountFrom(
    commentsData,
    ['count', 'total', 'comments_count', 'commentsCount'],
    commentsFallback
  );
  const socialData = dataFrom(socialResult) || {};
  const likeFallback = socialCountFrom(
    goal,
    ['like_count', 'likes_count', 'likeCount', 'likesCount'],
    0
  );
  const likeCount = socialCountFrom(
    socialData,
    ['like_count', 'likes_count', 'likeCount', 'likesCount'],
    likeFallback
  );
  const liked = checked(
    socialData.liked
      ?? socialData.has_liked
      ?? socialData.hasLiked
      ?? goal.liked
      ?? goal.has_liked
      ?? goal.hasLiked
  );

  return res.render('goals/social', {
    title: 'Likes and comments',
    activeNav: 'explore',
    goal,
    likeCount,
    liked,
    likeCountLabel: likesLabel(likeCount),
    comments,
    commentsTotal,
    commentsTotalLabel: commentsLabel(commentsTotal),
    ...socialStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Goal not found' }));

router.post('/:id(\\d+)/edit', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const payload = goalFormPayload(req.body);
  if (payload === null) {
    return redirectTo(res, goalSubpageRedirect(id, 'edit', 'goal-invalid'));
  }

  payload.checkin_frequency = allowedValue(req.body.checkin_frequency, GOAL_CHECKIN_FREQUENCIES, 'none');

  try {
    await callGoal(token, 'PUT', `/${id}`, payload);
    return redirectTo(res, goalRedirect(id, 'goal-edited'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, goalSubpageRedirect(id, 'edit', 'goal-failed'));
  }
}));

router.post('/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  try {
    await callGoal(token, 'DELETE', `/${id}`);
    return redirectTo(res, goalsRedirect('goal-deleted'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, goalRedirect(id, 'goal-failed'));
  }
}));

router.post('/:id(\\d+)/buddy', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  try {
    await callGoal(token, 'POST', `/${id}/buddy`);
    return redirectTo(res, goalRedirect(id, 'buddy-joined'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, goalRedirect(id, 'buddy-failed'));
  }
}));

router.post('/:id(\\d+)/buddy-nudge', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  try {
    await callGoal(token, 'POST', `/${id}/buddy/nudge`, { type: 'nudge' });
    return redirectTo(res, goalsSubpageStatusRedirect('buddying', 'buddy-nudge-sent'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, goalsSubpageStatusRedirect('buddying', 'buddy-nudge-failed'));
  }
}));

router.post('/:id(\\d+)/progress', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const increment = positiveNumber(req.body.increment);
  if (increment === null) {
    return redirectTo(res, goalRedirect(id, 'goal-invalid'));
  }

  try {
    await callGoal(token, 'POST', `/${id}/progress`, { increment });
    return redirectTo(res, goalRedirect(id, 'goal-updated'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, goalRedirect(id, 'goal-failed'));
  }
}));

router.post('/:id(\\d+)/complete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  try {
    await callGoal(token, 'POST', `/${id}/complete`);
    return redirectTo(res, goalRedirect(id, 'goal-completed'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, goalRedirect(id, 'goal-failed'));
  }
}));

router.post('/:id(\\d+)/checkin', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

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
    return redirectTo(res, goalSubpageRedirect(id, 'checkin', 'checkin-recorded'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, goalSubpageRedirect(id, 'checkin', 'checkin-failed'));
  }
}));

router.post('/:id(\\d+)/reminder', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const payload = {
    frequency: allowedValue(req.body.frequency, GOAL_REMINDER_FREQUENCIES, 'weekly'),
    enabled: checked(req.body.enabled) || !Object.prototype.hasOwnProperty.call(req.body, 'enabled')
  };

  try {
    await callGoal(token, 'PUT', `/${id}/reminder`, payload);
    return redirectTo(res, goalSubpageRedirect(id, 'reminder', 'reminder-saved'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, goalSubpageRedirect(id, 'reminder', 'reminder-failed'));
  }
}));

router.post('/:id(\\d+)/reminder/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  try {
    await callGoal(token, 'DELETE', `/${id}/reminder`);
    return redirectTo(res, goalSubpageRedirect(id, 'reminder', 'reminder-removed'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, goalSubpageRedirect(id, 'reminder', 'reminder-failed'));
  }
}));

router.post('/:id(\\d+)/buddy-actions', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const type = allowedValue(req.body.type, GOAL_BUDDY_ACTION_TYPES, 'encouragement');
  const payload = { type };
  const message = optionalText(req.body.message, 1000);
  if (message !== null) {
    payload.message = message;
  }

  try {
    await callGoal(token, 'POST', `/${id}/buddy/nudge`, payload);
    return redirectTo(res, goalSubpageRedirect(id, 'buddy-actions', 'buddy-action-sent'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, goalSubpageRedirect(id, 'buddy-actions', 'buddy-action-failed'));
  }
}));

router.post('/:id(\\d+)/like', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  try {
    const result = await toggleFeedLike(token, {
      target_type: 'goal',
      target_id: id
    });
    const action = result?.data?.action === 'unliked' ? 'unliked' : 'liked';
    return redirectTo(res, goalSubpageRedirect(id, 'social', action));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, goalSubpageRedirect(id, 'social', 'like-failed'));
  }
}));

router.post('/:id(\\d+)/comments', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const content = optionalText(req.body.body || req.body.content, 5000);
  if (content === null) {
    return redirectTo(res, goalSubpageRedirect(id, 'social', 'comment-invalid', '#comments'));
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
    return redirectTo(
      res,
      goalSubpageRedirect(id, 'social', parentId === null ? 'comment-added' : 'reply-added', '#comments')
    );
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, goalSubpageRedirect(id, 'social', 'comment-failed', '#comments'));
  }
}));

router.post('/:id(\\d+)/comments/:commentId(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const commentId = Number(req.params.commentId);
  try {
    await deleteComment(token, commentId);
    return redirectTo(res, goalSubpageRedirect(id, 'social', 'comment-deleted', '#comments'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, goalSubpageRedirect(id, 'social', 'comment-delete-failed', '#comments'));
  }
}));

router.get('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const result = await getGoals(token, { per_page: 30 });
  const goals = collectionFrom(result).map((goal) => normalizeGoal(goal, res.locals.t)).filter((goal) => goal.id !== null);
  const status = trimmed(req.query.status);

  return res.render('goals/index', {
    title: res.locals.t('goals.title'),
    activeNav: 'explore',
    goals,
    meta: metaFrom(result),
    status,
    successMessage: statusMessage(status, res.locals.t),
    errorMessage: errorMessage(status, res.locals.t)
  });
}, { redirectOn401: loginRedirect() }));

router.get('/:id(\\d+)', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const goalResult = await getGoal(token, id);
  const [historyResult, insightsResult] = await Promise.all([
    optionalGoalRead(callGoal(token, 'GET', `/${id}/history?per_page=30`), { data: [] }),
    optionalGoalRead(callGoal(token, 'GET', `/${id}/insights`), { data: {} })
  ]);
  const goal = normalizeGoal(normalizeResponse(dataFrom(goalResult)), res.locals.t);
  const rawInsights = dataFrom(insightsResult) || {};
  const isOwner = checked(goal.is_owner || goal.isOwner);
  const isBuddy = checked(goal.is_buddy || goal.isBuddy);
  const hasBuddy = positiveInteger(goal.mentor_id || goal.mentorId || goal.buddy_id || goal.buddyId) !== null;

  return res.render('goals/detail', {
    title: goal.title,
    activeNav: 'explore',
    goal,
    isOwner,
    isBuddy,
    hasBuddy,
    canBecomeBuddy: checked(goal.is_public || goal.isPublic) && !isOwner && !hasBuddy,
    goalHistory: collectionFrom(historyResult).map(normalizeHistoryEvent),
    buddyNotes: collectionFrom({ data: rawInsights.buddy_notes || rawInsights.buddyNotes || [] })
      .map((note) => normalizeBuddyNote(note, res.locals.t)),
    status: trimmed(req.query.status),
    ...goalDetailStatus(req.query.status)
  });
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Goal not found' }));

module.exports = router;
