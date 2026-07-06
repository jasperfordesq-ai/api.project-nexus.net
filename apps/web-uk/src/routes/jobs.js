// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { ApiError, callJobApi, getJobs, getJob } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

const JOB_TYPES = ['paid', 'volunteer', 'timebank'];
const JOB_COMMITMENTS = ['full_time', 'part_time', 'flexible', 'one_off'];
const JOB_SALARY_TYPES = ['hourly', 'monthly', 'annual'];
const JOB_STATUSES = ['open', 'draft'];
const JOB_SORTS = ['newest', 'deadline', 'salary_desc'];
const JOBS_PER_PAGE = 12;
const JOB_TYPE_LABELS = {
  paid: 'Paid',
  volunteer: 'Volunteer',
  timebank: 'Time credits'
};
const JOB_COMMITMENT_LABELS = {
  full_time: 'Full time',
  part_time: 'Part time',
  flexible: 'Flexible',
  one_off: 'One-off'
};
const APPLICATION_STATUSES = [
  'applied',
  'pending',
  'screening',
  'reviewed',
  'shortlisted',
  'interview',
  'offer',
  'accepted',
  'rejected',
  'withdrawn'
];
const JOB_APPLICATION_STATUSES = [
  'applied',
  'pending',
  'screening',
  'reviewed',
  'interview',
  'offer',
  'accepted',
  'rejected',
  'withdrawn'
];
const JOB_TERMINAL_APPLICATION_STATUSES = ['accepted', 'rejected', 'withdrawn'];
const JOB_APPLICATION_LABELS = {
  applied: 'Applied',
  pending: 'Pending',
  screening: 'Screening',
  reviewed: 'Reviewed',
  interview: 'Interview',
  offer: 'Offer',
  accepted: 'Accepted',
  rejected: 'Not selected',
  withdrawn: 'Withdrawn'
};

router.use(requireAuth);

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

function checked(value) {
  return value === true || value === 1 || value === '1';
}

function allowed(value, choices, fallback) {
  const text = trimmed(value);
  return choices.includes(text) ? text : fallback;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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

function collectionItems(result) {
  const data = dataFrom(result);
  if (Array.isArray(result && result.items)) return result.items;
  if (Array.isArray(data && data.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
}

function collectionMeta(result, filters) {
  const data = dataFrom(result);
  const source = result && typeof result === 'object' ? result : {};
  const itemCount = collectionItems(result).length;
  const dataSource = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const meta = (source.meta && typeof source.meta === 'object')
    ? source.meta
    : ((data && data.meta && typeof data.meta === 'object') ? data.meta : {});
  const filterOffset = filters && filters.offset !== undefined ? filters.offset : 0;
  const rawCursor = meta.cursor ?? source.cursor ?? dataSource.cursor ?? '';

  return {
    total: finiteNumber(meta.total ?? source.total ?? (Array.isArray(data) ? data.length : itemCount), itemCount),
    has_more: Boolean(meta.has_more ?? source.has_more ?? dataSource.has_more ?? false),
    offset: finiteNumber(meta.offset ?? source.offset ?? dataSource.offset ?? filterOffset, filterOffset),
    per_page: finiteNumber(meta.per_page ?? meta.limit ?? source.per_page ?? source.limit ?? dataSource.per_page ?? dataSource.limit ?? JOBS_PER_PAGE, JOBS_PER_PAGE),
    cursor: rawCursor ? trimmed(rawCursor, 500) : ''
  };
}

function jobFilters(query) {
  return {
    q: trimmed(query.q, 255),
    type: allowed(query.type, JOB_TYPES, ''),
    commitment: allowed(query.commitment, JOB_COMMITMENTS, ''),
    sort: allowed(query.sort, JOB_SORTS, 'newest'),
    remote: checkedOne(query.remote),
    offset: nonNegativeInteger(query.offset)
  };
}

function jobsApiParams(filters) {
  const params = {
    limit: JOBS_PER_PAGE,
    offset: filters.offset,
    status: 'open',
    sort: filters.sort
  };

  if (filters.q !== '') params.search = filters.q;
  if (filters.type !== '') params.type = filters.type;
  if (filters.commitment !== '') params.commitment = filters.commitment;
  if (filters.remote) params.is_remote = 1;

  return params;
}

function jobsHref(filters, offset = null) {
  const query = new URLSearchParams();
  if (filters.q !== '') query.set('q', filters.q);
  if (filters.type !== '') query.set('type', filters.type);
  if (filters.commitment !== '') query.set('commitment', filters.commitment);
  if (filters.sort !== 'newest') query.set('sort', filters.sort);
  if (filters.remote) query.set('remote', '1');
  if (offset !== null && offset > 0) query.set('offset', offset);

  const queryString = query.toString();
  return `/jobs${queryString ? `?${queryString}` : ''}`;
}

function queryPath(path, params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return `${path}${queryString ? `?${queryString}` : ''}`;
}

function savedJobsPath(cursor) {
  return queryPath('/saved', {
    per_page: JOBS_PER_PAGE,
    cursor: cursor || null
  });
}

function savedJobsHref(cursor) {
  return queryPath('/jobs/saved', { cursor: cursor || null });
}

function applicationFilters(query) {
  return {
    statusFilter: allowed(query.status_filter, JOB_APPLICATION_STATUSES, ''),
    cursor: trimmed(query.cursor, 500)
  };
}

function applicationsPath(filters) {
  return queryPath('/my-applications', {
    per_page: JOBS_PER_PAGE,
    status: filters.statusFilter || null,
    cursor: filters.cursor || null
  });
}

function applicationsHref(filters, cursor) {
  return queryPath('/jobs/applications', {
    status_filter: filters.statusFilter || null,
    cursor: cursor || null
  });
}

function formatDateLong(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return trimmed(value);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function money(value, currency) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  const amount = Number.isFinite(number)
    ? number.toLocaleString('en-IE', { maximumFractionDigits: 0 })
    : trimmed(value);
  return trimmed(`${currency || ''} ${amount}`);
}

function salaryLabel(job) {
  const currency = trimmed(job.salary_currency, 10);
  const min = money(job.salary_min, currency);
  const max = money(job.salary_max, currency);
  if (min && max) return `${min} - ${max}`;
  return min || max || '';
}

function personName(value) {
  if (!value) return '';
  if (typeof value === 'string') return trimmed(value);
  if (typeof value === 'object') return trimmed(value.name || value.display_name || value.title || '');
  return '';
}

function skillsFrom(job) {
  if (Array.isArray(job.skills)) {
    return job.skills.map((skill) => trimmed(skill)).filter(Boolean);
  }

  return trimmed(job.skills_required, 2000)
    .split(',')
    .map((skill) => trimmed(skill))
    .filter(Boolean);
}

function countLabel(count, singular, plural, zero) {
  if (count === 0 && zero) return zero;
  if (count === 1) return `1 ${singular}`;
  return `${count} ${plural}`;
}

function resultsLabel(total) {
  if (total === 0) return 'No opportunities found';
  if (total === 1) return '1 opportunity';
  return `${total} opportunities`;
}

function decorateJob(job) {
  const organizationName = personName(job.organization || job.organisation);
  const posterName = organizationName || personName(job.creator || job.user);
  const viewsCount = finiteNumber(job.views_count ?? job.viewsCount, 0);
  const applicationsCount = finiteNumber(job.applications_count ?? job.applicationsCount, 0);

  return {
    ...job,
    id: job.id,
    title: trimmed(job.title, 255) || 'Jobs',
    description: trimmed(job.description, 20000),
    typeLabel: JOB_TYPE_LABELS[job.type] || JOB_TYPE_LABELS.volunteer,
    commitmentLabel: JOB_COMMITMENT_LABELS[job.commitment] || '',
    organizationName,
    posterName,
    locationLabel: checked(job.is_remote) ? 'Remote' : trimmed(job.location, 255),
    salaryLabel: salaryLabel(job),
    deadlineLabel: formatDateLong(job.deadline),
    skillsList: skillsFrom(job),
    viewsCount,
    applicationsCount,
    viewsLabel: countLabel(viewsCount, 'view', 'views', 'No views'),
    applicationsLabel: countLabel(applicationsCount, 'application', 'applications', 'No applications'),
    isFeatured: checked(job.is_featured || job.isFeatured),
    hasApplied: checked(job.has_applied || job.hasApplied),
    isSaved: checked(job.is_saved || job.isSaved),
    isRemote: checked(job.is_remote)
  };
}

function decorateApplication(application) {
  const vacancy = application.vacancy || application.job || application.job_vacancy || {};
  const vacancyId = positiveInteger(vacancy.id)
    || positiveInteger(application.vacancy_id)
    || positiveInteger(application.job_id)
    || 0;
  const status = allowed(application.status, JOB_APPLICATION_STATUSES, 'applied');

  return {
    ...application,
    id: positiveInteger(application.id) || 0,
    vacancyId,
    title: trimmed(vacancy.title, 255) || 'Jobs',
    status,
    statusLabel: JOB_APPLICATION_LABELS[status] || JOB_APPLICATION_LABELS.applied,
    appliedOnLabel: formatDateLong(application.created_at || application.applied_at),
    canWithdraw: !JOB_TERMINAL_APPLICATION_STATUSES.includes(status)
  };
}

function statusMessage(status) {
  const messages = {
    applied: 'Your application has been submitted.',
    saved: 'Opportunity saved.',
    unsaved: 'Opportunity removed from your saved list.',
    withdrawn: 'Your application has been withdrawn.',
    created: 'Opportunity created.',
    updated: 'Opportunity updated.',
    renewed: 'Opportunity renewed.'
  };

  return messages[status] || '';
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

router.get('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const filters = jobFilters(req.query);
  const params = jobsApiParams(filters);
  let result = null;
  let loadError = false;

  try {
    result = await getJobs(token, params);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    loadError = true;
  }

  const jobs = collectionItems(result).map(decorateJob);
  const jobsMeta = collectionMeta(result, filters);
  const nextOffset = jobsMeta.offset + jobsMeta.per_page;

  return res.render('jobs/index', {
    title: 'Jobs',
    activeNav: 'explore',
    jobs,
    filters,
    jobsMeta,
    resultsLabel: resultsLabel(jobsMeta.total),
    nextHref: jobsMeta.has_more ? jobsHref(filters, nextOffset) : '',
    status: req.query.status || '',
    successMessage: statusMessage(req.query.status),
    loadError
  });
}));

router.get('/saved', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const cursor = trimmed(req.query.cursor, 500);
  let result = null;
  let loadError = false;

  try {
    result = await callJob(token, 'GET', savedJobsPath(cursor));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    loadError = true;
  }

  const jobs = collectionItems(result).map(decorateJob);
  const jobsMeta = collectionMeta(result, { offset: 0 });

  return res.render('jobs/saved', {
    title: 'Saved opportunities',
    activeNav: 'explore',
    jobs,
    jobsMeta,
    nextHref: jobsMeta.has_more && jobsMeta.cursor ? savedJobsHref(jobsMeta.cursor) : '',
    status: req.query.status || '',
    successMessage: statusMessage(req.query.status),
    loadError,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.get('/applications', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const filters = applicationFilters(req.query);
  let result = null;
  let loadError = false;

  try {
    result = await callJob(token, 'GET', applicationsPath(filters));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    loadError = true;
  }

  const applications = collectionItems(result).map(decorateApplication);
  const jobsMeta = collectionMeta(result, { offset: 0 });

  return res.render('jobs/applications', {
    title: 'My applications',
    activeNav: 'explore',
    applications,
    filters,
    statusOptions: JOB_APPLICATION_STATUSES.map((status) => ({
      value: status,
      label: JOB_APPLICATION_LABELS[status] || status
    })),
    jobsMeta,
    nextHref: jobsMeta.has_more && jobsMeta.cursor ? applicationsHref(filters, jobsMeta.cursor) : '',
    status: req.query.status || '',
    successMessage: statusMessage(req.query.status),
    errorMessage: req.query.status === 'withdraw-failed' ? 'Your application could not be withdrawn. Try again.' : '',
    loadError,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.get('/:id(\\d+)', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  let result;

  try {
    result = await getJob(token, req.params.id);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && error.status === 404) {
      return res.status(404).render('errors/404', { title: 'Page not found' });
    }

    return res.status(503).render('errors/503', { title: 'Service unavailable' });
  }

  const job = dataFrom(result);
  if (!job || typeof job !== 'object' || !job.id) {
    return res.status(404).render('errors/404', { title: 'Page not found' });
  }

  const decorated = decorateJob(job);
  return res.render('jobs/detail', {
    title: decorated.title,
    activeNav: 'explore',
    job: decorated,
    status: req.query.status || '',
    successMessage: statusMessage(req.query.status),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

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
