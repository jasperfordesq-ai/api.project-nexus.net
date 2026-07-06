// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { ApiError, callJobApi, getJobs, getJob, getProfile } = require('../lib/api');
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
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offer: 'Offer',
  accepted: 'Accepted',
  rejected: 'Not selected',
  withdrawn: 'Withdrawn'
};
const JOB_POSTING_STATUS_LABELS = {
  open: 'Open',
  draft: 'Draft',
  closed: 'Closed',
  filled: 'Filled'
};
const JOB_ALERT_SUCCESS_MESSAGES = {
  'alert-created': 'Your job alert has been created.',
  'alert-paused': 'The alert has been paused.',
  'alert-resumed': 'The alert has been resumed.',
  'alert-deleted': 'The alert has been deleted.'
};
const JOB_ALERT_ERROR_MESSAGES = {
  'alert-failed': 'We could not complete that action. Please try again.'
};
const JOB_RESPONSE_SUCCESS_MESSAGES = {
  'interview-accepted': 'You accepted the interview. The employer has been notified.',
  'interview-declined': 'You declined the interview. The employer has been notified.',
  'offer-accepted': 'You accepted the offer. The employer has been notified.',
  'offer-rejected': 'You declined the offer. The employer has been notified.'
};
const JOB_RESPONSE_ERROR_MESSAGES = {
  'interview-failed': 'Sorry, we could not update that interview. It may have already been responded to.',
  'offer-failed': 'Sorry, we could not update that offer. It may have expired or already been responded to.'
};
const JOB_INTERVIEW_STATUSES = ['proposed', 'accepted', 'declined'];
const JOB_INTERVIEW_TYPE_LABELS = {
  video: 'Video',
  phone: 'Phone',
  in_person: 'In person'
};
const JOB_INTERVIEW_STATUS_LABELS = {
  proposed: 'Awaiting your response',
  accepted: 'Accepted',
  declined: 'Declined'
};
const JOB_OFFER_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn', 'expired'];
const JOB_OFFER_STATUS_LABELS = {
  pending: 'Awaiting your decision',
  accepted: 'Accepted',
  rejected: 'Declined',
  withdrawn: 'Withdrawn',
  expired: 'Expired'
};
const JOB_SALARY_PERIOD_LABELS = {
  hourly: 'hour',
  monthly: 'month',
  annual: 'year'
};
const JOB_APPLICANT_STAGE_OPTIONS = [
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
const JOB_APPLICANT_SUCCESS_MESSAGES = {
  'status-updated': 'The application stage has been updated.'
};
const JOB_APPLICANT_ERROR_MESSAGES = {
  'status-failed': 'We could not update the application. Please try again.',
  'export-failed': 'We could not prepare the download. Please try again.'
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

function myPostingsPath(cursor) {
  return queryPath('/my-postings', {
    per_page: JOBS_PER_PAGE,
    cursor: cursor || null
  });
}

function myPostingsHref(cursor) {
  return queryPath('/jobs/mine', { cursor: cursor || null });
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

function formatUtcDateParts(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

function formatDateOnlyLong(value) {
  if (!value) return '';
  const text = trimmed(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return formatUtcDateParts(Number(match[1]), Number(match[2]), Number(match[3])) || text;
  }

  return formatDateLong(text);
}

function dateInputValue(value) {
  if (!value) return '';
  const text = trimmed(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : text;
}

function formatDateTimeLong(value) {
  if (!value) return '';
  const text = trimmed(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (match) {
    const dateLabel = formatUtcDateParts(Number(match[1]), Number(match[2]), Number(match[3]));
    return dateLabel ? `${dateLabel}, ${match[4]}:${match[5]}` : text;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function formatDateTimeMeridiem(value) {
  if (!value) return '';
  const text = trimmed(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (!match) return formatDateTimeLong(text);

  const dateLabel = formatUtcDateParts(Number(match[1]), Number(match[2]), Number(match[3]));
  if (!dateLabel) return text;

  const hour = Number(match[4]);
  const displayHour = hour % 12 || 12;
  const suffix = hour < 12 ? 'am' : 'pm';

  return `${dateLabel}, ${displayHour}:${match[5]}${suffix}`;
}

function timestampForFilename(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
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

function listText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => personName(item) || trimmed(item)).filter(Boolean).join(', ');
  }

  return trimmed(value, 1000);
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
    isRemote: checked(job.is_remote),
    statusLabel: JOB_POSTING_STATUS_LABELS[job.status] || trimmed(job.status) || JOB_POSTING_STATUS_LABELS.open
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

function decorateAlert(alert) {
  const keywords = trimmed(alert.keywords, 255);
  const categories = listText(alert.categories || alert.category);
  const typeLabel = JOB_TYPE_LABELS[alert.type] || '';
  const commitmentLabel = JOB_COMMITMENT_LABELS[alert.commitment] || '';
  const location = trimmed(alert.location, 255);
  const isRemoteOnly = checked(alert.is_remote_only || alert.isRemoteOnly);
  const activeValue = alert.is_active !== undefined ? alert.is_active : alert.isActive;
  const criteria = [];

  if (keywords) criteria.push(`Keywords: ${keywords}`);
  if (categories) criteria.push(`Categories: ${categories}`);
  if (typeLabel) criteria.push(`Type: ${typeLabel}`);
  if (commitmentLabel) criteria.push(`Commitment: ${commitmentLabel}`);
  if (location) criteria.push(`Location: ${location}`);
  if (isRemoteOnly) criteria.push('Remote opportunities only');
  if (criteria.length === 0) criteria.push('Any opportunity');

  return {
    ...alert,
    id: positiveInteger(alert.id) || 0,
    criteria,
    primaryCriteria: criteria[0],
    secondaryCriteria: criteria.slice(1),
    isActive: activeValue === undefined ? true : checked(activeValue)
  };
}

function vacancyTitle(row) {
  const vacancy = row.vacancy || row.job || row.job_vacancy || {};
  return trimmed(row.vacancy_title || row.job_title || vacancy.title || row.title, 255) || 'Jobs';
}

function vacancyId(row) {
  const vacancy = row.vacancy || row.job || row.job_vacancy || {};
  return positiveInteger(row.vacancy_id)
    || positiveInteger(row.job_id)
    || positiveInteger(vacancy.id)
    || 0;
}

function formatPlainNumber(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString('en-IE', { maximumFractionDigits: 0 })
    : trimmed(value);
}

function offerSalaryLine(offer) {
  const amount = offer.salary_offered ?? offer.salary_amount ?? offer.salary;
  if (amount === null || amount === undefined || amount === '') return 'No pay specified';

  const currency = trimmed(offer.salary_currency || offer.currency || '', 10);
  const period = JOB_SALARY_PERIOD_LABELS[offer.salary_type]
    || JOB_SALARY_PERIOD_LABELS[offer.salary_period]
    || trimmed(offer.salary_type || offer.salary_period || '');
  const amountLabel = formatPlainNumber(amount);
  const payLabel = trimmed(`${amountLabel} ${currency}`);

  return period ? `${payLabel} per ${period}` : payLabel;
}

function decorateInterview(interview) {
  const status = allowed(interview.status, JOB_INTERVIEW_STATUSES, 'proposed');
  const type = trimmed(interview.interview_type || interview.type);
  const duration = positiveInteger(interview.duration_mins || interview.duration_minutes || interview.duration);

  return {
    ...interview,
    id: positiveInteger(interview.id) || 0,
    vacancyId: vacancyId(interview),
    title: vacancyTitle(interview),
    typeLabel: JOB_INTERVIEW_TYPE_LABELS[type] || trimmed(type) || 'Interview',
    status,
    statusLabel: JOB_INTERVIEW_STATUS_LABELS[status] || JOB_INTERVIEW_STATUS_LABELS.proposed,
    scheduledLabel: formatDateTimeLong(interview.scheduled_at || interview.scheduled_for),
    durationLabel: duration ? `${duration} minutes` : '',
    details: trimmed(interview.location_notes || interview.details || interview.notes || interview.message, 2000),
    canRespond: status === 'proposed'
  };
}

function decorateOffer(offer) {
  const status = allowed(offer.status, JOB_OFFER_STATUSES, 'pending');

  return {
    ...offer,
    id: positiveInteger(offer.id) || 0,
    vacancyId: vacancyId(offer),
    title: vacancyTitle(offer),
    status,
    statusLabel: JOB_OFFER_STATUS_LABELS[status] || JOB_OFFER_STATUS_LABELS.pending,
    salaryLine: offerSalaryLine(offer),
    startLabel: formatDateOnlyLong(offer.start_date || offer.starts_at),
    expiresLabel: formatDateOnlyLong(offer.expires_at || offer.respond_by || offer.response_due_at),
    messageText: trimmed(offer.message || offer.employer_message || offer.notes, 5000),
    canRespond: status === 'pending'
  };
}

function jobFormForEdit(job) {
  return {
    ...job,
    deadline: dateInputValue(job.deadline),
    is_remote: checked(job.is_remote || job.isRemote),
    salary_negotiable: checked(job.salary_negotiable || job.salaryNegotiable)
  };
}

function profileUserId(result) {
  const data = dataFrom(result);
  const profile = data && typeof data === 'object' && !Array.isArray(data) ? data : result;

  return positiveInteger(profile?.id || profile?.user_id || profile?.userId);
}

function jobOwnerId(job) {
  return positiveInteger(job.user_id || job.userId || job.creator?.id || job.owner?.id);
}

function analyticsFrom(result) {
  const data = dataFrom(result);
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data;
  }

  return null;
}

function decorateApplicant(application) {
  const applicant = application.applicant || application.user || {};
  const status = allowed(application.stage || application.status, JOB_APPLICANT_STAGE_OPTIONS, 'applied');

  return {
    ...application,
    id: positiveInteger(application.id) || 0,
    applicantName: personName(applicant) || 'Candidate',
    status,
    statusLabel: JOB_APPLICATION_LABELS[status] || status,
    appliedOnLabel: formatDateOnlyLong(application.created_at || application.applied_at),
    coverLetter: trimmed(application.message || application.cover_letter || application.notes, 5000)
  };
}

function statusTitle(value) {
  const text = trimmed(value);
  if (!text) return '';

  return text
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

function decorateApplicationHistory(entry) {
  const toStatus = trimmed(entry.to_status || entry.toStatus);
  const fromStatus = trimmed(entry.from_status || entry.fromStatus);
  const changedByName = trimmed(entry.changed_by_name || entry.changedByName);

  return {
    ...entry,
    id: positiveInteger(entry.id) || 0,
    statusLabel: JOB_APPLICATION_LABELS[toStatus] || statusTitle(toStatus) || 'Updated',
    fromLabel: fromStatus ? `from ${JOB_APPLICATION_LABELS[fromStatus] || statusTitle(fromStatus)}` : '',
    changedAtLabel: formatDateTimeMeridiem(entry.changed_at || entry.changedAt),
    changedByLabel: changedByName ? `by ${changedByName}` : '',
    notesText: trimmed(entry.notes, 5000)
  };
}

function statusMessage(status) {
  const messages = {
    applied: 'Your application has been submitted.',
    saved: 'Opportunity saved.',
    unsaved: 'Opportunity removed from your saved list.',
    withdrawn: 'Your application has been withdrawn.',
    deleted: 'The opportunity has been deleted.',
    created: 'Opportunity created.',
    updated: 'Opportunity updated.',
    renewed: 'Opportunity renewed.'
  };

  return messages[status] || '';
}

function statusErrorMessage(status) {
  const messages = {
    'delete-failed': 'We could not delete the opportunity. Please try again.',
    'create-failed': 'The opportunity could not be saved. Check the details and try again.'
  };

  return messages[status] || '';
}

function alertSuccessMessage(status) {
  return JOB_ALERT_SUCCESS_MESSAGES[status] || '';
}

function alertErrorMessage(status) {
  return JOB_ALERT_ERROR_MESSAGES[status] || '';
}

function responseSuccessMessage(status) {
  return JOB_RESPONSE_SUCCESS_MESSAGES[status] || '';
}

function responseErrorMessage(status) {
  return JOB_RESPONSE_ERROR_MESSAGES[status] || '';
}

function applicantSuccessMessage(status) {
  return JOB_APPLICANT_SUCCESS_MESSAGES[status] || '';
}

function applicantErrorMessage(status) {
  return JOB_APPLICANT_ERROR_MESSAGES[status] || '';
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

router.get('/applications/:appId(\\d+)/history', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const appId = Number(req.params.appId);
  let result = null;

  try {
    result = await callJob(token, 'GET', `/applications/${appId}/history`);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      return res.status(404).render('errors/404', { title: 'Page not found' });
    }

    return res.status(503).render('errors/503', { title: 'Service unavailable' });
  }

  return res.render('jobs/application-history', {
    title: 'Application timeline',
    activeNav: 'explore',
    applicationId: appId,
    history: collectionItems(result).map(decorateApplicationHistory)
  });
}));

router.get('/mine', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const cursor = trimmed(req.query.cursor, 500);
  let result = null;
  let loadError = false;

  try {
    result = await callJob(token, 'GET', myPostingsPath(cursor));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    loadError = true;
  }

  const jobs = collectionItems(result).map(decorateJob);
  const jobsMeta = collectionMeta(result, { offset: 0 });

  return res.render('jobs/mine', {
    title: 'My postings',
    activeNav: 'explore',
    jobs,
    jobsMeta,
    nextHref: jobsMeta.has_more && jobsMeta.cursor ? myPostingsHref(jobsMeta.cursor) : '',
    status: req.query.status || '',
    successMessage: statusMessage(req.query.status),
    errorMessage: statusErrorMessage(req.query.status),
    loadError,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.get('/create', (req, res) => res.render('jobs/form', {
  title: 'Post an opportunity',
  activeNav: 'explore',
  formMode: 'create',
  formAction: '/jobs',
  jobForm: {},
  jobFormErrors: [],
  csrfToken: req.csrfToken ? req.csrfToken() : ''
}));

router.get('/alerts', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  let result = null;
  let loadError = false;

  try {
    result = await callJob(token, 'GET', '/alerts');
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    loadError = true;
  }

  return res.render('jobs/alerts', {
    title: 'Job alerts',
    activeNav: 'explore',
    alerts: collectionItems(result).map(decorateAlert),
    status: req.query.status || '',
    successMessage: alertSuccessMessage(req.query.status),
    errorMessage: alertErrorMessage(req.query.status),
    loadError,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.get('/responses', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  let interviewsResult = null;
  let offersResult = null;
  let loadError = false;

  try {
    interviewsResult = await callJob(token, 'GET', '/my-interviews');
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    loadError = true;
  }

  try {
    offersResult = await callJob(token, 'GET', '/my-offers');
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    loadError = true;
  }

  return res.render('jobs/responses', {
    title: 'Interviews and offers',
    activeNav: 'explore',
    interviews: collectionItems(interviewsResult).map(decorateInterview),
    offers: collectionItems(offersResult).map(decorateOffer),
    status: req.query.status || '',
    successMessage: responseSuccessMessage(req.query.status),
    errorMessage: responseErrorMessage(req.query.status),
    loadError,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.get('/:id(\\d+)/applications/export.csv', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  let csv;

  try {
    csv = await callJob(token, 'GET', `/${id}/applications/export-csv`);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(statusRedirect(`/jobs/${id}/applications`, 'export-failed'));
  }

  const filename = `job_${id}_applications_${timestampForFilename()}.csv`;

  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache'
  });

  return res.send(typeof csv === 'string' ? csv : String(csv || ''));
}));

router.get('/:id(\\d+)/edit', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  let result;
  let profileResult;

  try {
    [result, profileResult] = await Promise.all([
      getJob(token, id),
      getProfile(token)
    ]);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && error.status === 403) {
      return res.status(403).render('errors/403', { title: 'Forbidden' });
    }
    if (error instanceof ApiError && error.status === 404) {
      return res.status(404).render('errors/404', { title: 'Page not found' });
    }

    return res.status(503).render('errors/503', { title: 'Service unavailable' });
  }

  const job = dataFrom(result);
  if (!job || typeof job !== 'object' || !job.id) {
    return res.status(404).render('errors/404', { title: 'Page not found' });
  }

  if (jobOwnerId(job) !== profileUserId(profileResult)) {
    return res.status(403).render('errors/403', { title: 'Forbidden' });
  }

  return res.render('jobs/form', {
    title: 'Edit opportunity',
    activeNav: 'explore',
    formMode: 'edit',
    formAction: `/jobs/${id}/update`,
    jobForm: jobFormForEdit(job),
    jobFormErrors: [],
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.get('/:id(\\d+)/applications', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const id = Number(req.params.id);
  let jobResult;
  let applicationsResult = null;
  let analyticsResult = null;
  let loadError = false;

  try {
    jobResult = await getJob(token, id);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && error.status === 403) {
      return res.status(403).render('errors/403', { title: 'Forbidden' });
    }
    if (error instanceof ApiError && error.status === 404) {
      return res.status(404).render('errors/404', { title: 'Page not found' });
    }

    return res.status(503).render('errors/503', { title: 'Service unavailable' });
  }

  const job = dataFrom(jobResult);
  if (!job || typeof job !== 'object' || !job.id) {
    return res.status(404).render('errors/404', { title: 'Page not found' });
  }

  try {
    applicationsResult = await callJob(token, 'GET', `/${id}/applications`);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && error.status === 403) {
      return res.status(403).render('errors/403', { title: 'Forbidden' });
    }
    if (error instanceof ApiError && error.status === 404) {
      return res.status(404).render('errors/404', { title: 'Page not found' });
    }
    loadError = true;
  }

  try {
    analyticsResult = await callJob(token, 'GET', `/${id}/analytics`);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  return res.render('jobs/applicants', {
    title: 'Applications',
    activeNav: 'explore',
    job: decorateJob(job),
    applications: collectionItems(applicationsResult).map(decorateApplicant),
    analytics: analyticsFrom(analyticsResult),
    status: req.query.status || '',
    successMessage: applicantSuccessMessage(req.query.status),
    errorMessage: applicantErrorMessage(req.query.status),
    statusOptions: JOB_APPLICANT_STAGE_OPTIONS.map((status) => ({
      value: status,
      label: JOB_APPLICATION_LABELS[status] || status
    })),
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
