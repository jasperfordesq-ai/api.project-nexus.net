// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { ApiError, callJobApi } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

const JOB_TYPES = ['paid', 'volunteer', 'timebank'];
const JOB_COMMITMENTS = ['full_time', 'part_time', 'flexible', 'one_off'];
const JOB_SALARY_TYPES = ['hourly', 'monthly', 'annual'];
const JOB_STATUSES = ['open', 'draft'];
const APPLICATION_STATUSES = [
  'applied',
  'pending',
  'screening',
  'reviewed',
  'shortlisted',
  'interview',
  'offer',
  'accepted',
  'rejected'
];

router.use((req, res, next) => {
  if (req.method !== 'POST') {
    return next();
  }

  return requireAuth(req, res, next);
});

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

function checkedOne(value) {
  return String(value || '') === '1';
}

function allowed(value, choices, fallback) {
  const text = trimmed(value);
  return choices.includes(text) ? text : fallback;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
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

async function callJob(token, method, path, data = undefined) {
  if (data === undefined) {
    return callJobApi(token, method, path);
  }

  return callJobApi(token, method, path, data);
}

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined
    ? result.data
    : result;
}

function resultId(result) {
  const data = dataFrom(result);
  if (!data || typeof data !== 'object') return null;

  return positiveInteger(data.id) || positiveInteger(data.job && data.job.id);
}

function statusRedirect(path, status) {
  return `${path}?status=${encodeURIComponent(status)}`;
}

function jobRedirect(id, status) {
  return statusRedirect(`/jobs/${id}`, status);
}

function bookmarkRedirect(id, from, status) {
  return statusRedirect(from === 'saved' ? '/jobs/saved' : `/jobs/${id}`, status);
}

function jobFormPayload(body) {
  const title = trimmed(body.title, 255);
  if (title === '') {
    return null;
  }

  return {
    title,
    description: trimmed(body.description, 20000),
    type: allowed(body.type, JOB_TYPES, 'volunteer'),
    commitment: allowed(body.commitment, JOB_COMMITMENTS, 'flexible'),
    category: trimmed(body.category, 255),
    location: trimmed(body.location, 255),
    is_remote: checkedOne(body.is_remote),
    skills_required: trimmed(body.skills_required, 2000),
    hours_per_week: trimmed(body.hours_per_week, 100),
    time_credits: trimmed(body.time_credits, 100),
    deadline: trimmed(body.deadline, 20),
    salary_min: trimmed(body.salary_min, 100),
    salary_max: trimmed(body.salary_max, 100),
    salary_currency: trimmed(body.salary_currency, 10),
    salary_type: allowed(body.salary_type, JOB_SALARY_TYPES, ''),
    salary_negotiable: checkedOne(body.salary_negotiable),
    contact_email: trimmed(body.contact_email, 255),
    status: allowed(body.status, JOB_STATUSES, 'open')
  };
}

function applicationStatusPayload(body) {
  return {
    status: allowed(body.app_status, APPLICATION_STATUSES, 'pending'),
    notes: trimmed(body.notes, 5000)
  };
}

function alertPayload(body) {
  return {
    keywords: trimmed(body.keywords, 255),
    categories: trimmed(body.categories, 1000),
    type: allowed(body.type, JOB_TYPES, ''),
    commitment: allowed(body.commitment, JOB_COMMITMENTS, ''),
    location: trimmed(body.location, 255),
    is_remote_only: checkedOne(body.is_remote_only)
  };
}

function notePayload(body) {
  return { notes: trimmed(body.note, 1000) };
}

router.post('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const payload = jobFormPayload(req.body);
  if (payload === null) {
    return res.redirect('/jobs/create');
  }

  let result;
  try {
    result = await callJob(token, 'POST', '', payload);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(statusRedirect('/jobs/create', 'create-failed'));
  }

  const id = resultId(result);
  return res.redirect(id ? jobRedirect(id, 'created') : statusRedirect('/jobs/mine', 'created'));
}));

router.post('/:id(\\d+)/update', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const id = Number(req.params.id);
  const payload = jobFormPayload(req.body);
  if (payload === null) {
    return res.redirect(`/jobs/${id}/edit`);
  }

  try {
    await callJob(token, 'PUT', `/${id}`, payload);
    return res.redirect(jobRedirect(id, 'updated'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(statusRedirect(`/jobs/${id}/edit`, 'update-failed'));
  }
}));

router.post('/:id(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const id = Number(req.params.id);
  try {
    await callJob(token, 'DELETE', `/${id}`);
    return res.redirect(statusRedirect('/jobs/mine', 'deleted'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(statusRedirect('/jobs/mine', 'delete-failed'));
  }
}));

router.post('/:id(\\d+)/renew', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const id = Number(req.params.id);
  try {
    await callJob(token, 'POST', `/${id}/renew`, { days: 30 });
    return res.redirect(jobRedirect(id, 'renewed'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(jobRedirect(id, 'renew-failed'));
  }
}));

router.post('/:id(\\d+)/apply', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const id = Number(req.params.id);
  const payload = { message: trimmed(req.body.cover_letter, 5000) };

  try {
    await callJob(token, 'POST', `/${id}/apply`, payload);
    return res.redirect(jobRedirect(id, 'applied'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(jobRedirect(id, 'apply-failed'));
  }
}));

router.post('/:id(\\d+)/save', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const id = Number(req.params.id);
  try {
    await callJob(token, 'POST', `/${id}/save`);
    return res.redirect(bookmarkRedirect(id, req.body.from, 'saved'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(bookmarkRedirect(id, req.body.from, 'save-failed'));
  }
}));

router.post('/:id(\\d+)/unsave', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const id = Number(req.params.id);
  try {
    await callJob(token, 'DELETE', `/${id}/save`);
    return res.redirect(bookmarkRedirect(id, req.body.from, 'unsaved'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(bookmarkRedirect(id, req.body.from, 'save-failed'));
  }
}));

router.post('/:id(\\d+)/applications/:appId(\\d+)/status', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const id = Number(req.params.id);
  const appId = Number(req.params.appId);
  try {
    await callJob(token, 'PUT', `/applications/${appId}`, applicationStatusPayload(req.body));
    return res.redirect(statusRedirect(`/jobs/${id}/applications`, 'status-updated'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(statusRedirect(`/jobs/${id}/applications`, 'status-failed'));
  }
}));

router.post('/applications/:appId(\\d+)/withdraw', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const appId = Number(req.params.appId);
  try {
    await callJob(token, 'PUT', `/applications/${appId}`, { status: 'withdrawn' });
    return res.redirect(statusRedirect('/jobs/applications', 'withdrawn'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(statusRedirect('/jobs/applications', 'withdraw-failed'));
  }
}));

router.post('/alerts', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  try {
    await callJob(token, 'POST', '/alerts', alertPayload(req.body));
    return res.redirect(statusRedirect('/jobs/alerts', 'alert-created'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(statusRedirect('/jobs/alerts', 'alert-failed'));
  }
}));

router.post('/alerts/:alertId(\\d+)/pause', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const alertId = Number(req.params.alertId);
  try {
    await callJob(token, 'PUT', `/alerts/${alertId}/unsubscribe`);
    return res.redirect(statusRedirect('/jobs/alerts', 'alert-paused'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(statusRedirect('/jobs/alerts', 'alert-failed'));
  }
}));

router.post('/alerts/:alertId(\\d+)/resume', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const alertId = Number(req.params.alertId);
  try {
    await callJob(token, 'PUT', `/alerts/${alertId}/resubscribe`);
    return res.redirect(statusRedirect('/jobs/alerts', 'alert-resumed'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(statusRedirect('/jobs/alerts', 'alert-failed'));
  }
}));

router.post('/alerts/:alertId(\\d+)/delete', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const alertId = Number(req.params.alertId);
  try {
    await callJob(token, 'DELETE', `/alerts/${alertId}`);
    return res.redirect(statusRedirect('/jobs/alerts', 'alert-deleted'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(statusRedirect('/jobs/alerts', 'alert-failed'));
  }
}));

router.post('/interviews/:interviewId(\\d+)/accept', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const interviewId = Number(req.params.interviewId);
  try {
    await callJob(token, 'PUT', `/interviews/${interviewId}/accept`, notePayload(req.body));
    return res.redirect(statusRedirect('/jobs/responses', 'interview-accepted'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(statusRedirect('/jobs/responses', 'interview-failed'));
  }
}));

router.post('/interviews/:interviewId(\\d+)/decline', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const interviewId = Number(req.params.interviewId);
  try {
    await callJob(token, 'PUT', `/interviews/${interviewId}/decline`, notePayload(req.body));
    return res.redirect(statusRedirect('/jobs/responses', 'interview-declined'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(statusRedirect('/jobs/responses', 'interview-failed'));
  }
}));

router.post('/offers/:offerId(\\d+)/accept', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const offerId = Number(req.params.offerId);
  try {
    await callJob(token, 'PUT', `/offers/${offerId}/accept`);
    return res.redirect(statusRedirect('/jobs/responses', 'offer-accepted'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(statusRedirect('/jobs/responses', 'offer-failed'));
  }
}));

router.post('/offers/:offerId(\\d+)/reject', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect('/login');

  const offerId = Number(req.params.offerId);
  try {
    await callJob(token, 'PUT', `/offers/${offerId}/reject`);
    return res.redirect(statusRedirect('/jobs/responses', 'offer-rejected'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(statusRedirect('/jobs/responses', 'offer-failed'));
  }
}));

module.exports = router;
