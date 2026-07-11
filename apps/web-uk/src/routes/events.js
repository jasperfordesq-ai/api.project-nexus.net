// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const fs = require('fs/promises');
const { URL } = require('node:url');
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
  getEventRsvps,
  rsvpToEvent,
  votePoll,
  getPolls,
  callEventApi,
  getEventCategories,
  uploadEventImage,
  callUgcTranslateApi,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');
const { localeOptions } = require('../lib/accessible-shell');
const { getRequestProfile } = require('../lib/request-profile');

const router = express.Router();

function tokenFrom(req) {
  return req.token || req.signedCookies?.token || '';
}

function trimmed(value, limit = null) {
  const text = String(value || '').trim();
  return limit === null ? text : text.slice(0, limit);
}

function safeExternalHttpUrl(value) {
  const text = trimmed(value, 2048);
  if (!text) return '';
  try {
    const parsed = new URL(text);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function boundedPositiveInteger(value, fallback, max = null) {
  const number = positiveInteger(value) || fallback;
  return max === null ? number : Math.min(number, max);
}

function checked(value) {
  return value === true || ['1', 'true', 'on', 'yes'].includes(String(value || '').toLowerCase());
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

function resultEventId(result) {
  const data = dataFrom(result);
  return positiveInteger(
    data?.event?.id
    || data?.template?.id
    || data?.id
    || result?.event?.id
    || result?.id
  );
}

async function uploadEventCoverImage(token, eventId, image) {
  if (!image || !image.filepath || !eventId) return;

  const buffer = await fs.readFile(image.filepath);
  await uploadEventImage(token, eventId, {
    file: {
      buffer,
      filename: trimmed(image.originalFilename) || 'event-image',
      contentType: trimmed(image.mimetype) || 'application/octet-stream',
      size: image.size
    }
  });
}

function loginRedirect() {
  return '/login?status=auth-required';
}

const EVENTS_PATH = '/events';

function redirectTo(res, pathname) {
  const urlFor = typeof res.locals.urlFor === 'function' ? res.locals.urlFor : (value) => value;
  return res.redirect(urlFor(pathname));
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

async function callApi(token, method, path, data = undefined) {
  if (data === undefined) {
    return callEventApi(token, method, path);
  }

  return callEventApi(token, method, path, data);
}

function dataFrom(result) {
  return result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'data')
    ? result.data
    : result;
}

function collectionFrom(result) {
  const data = dataFrom(result);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

function eventCategoryFrom(item) {
  const row = item && typeof item === 'object' ? item : {};
  const id = positiveInteger(row.id);
  const name = trimmed(row.name || row.title);
  if (id === null || !name) return null;
  return { id, name };
}

function eventFrom(result) {
  const data = dataFrom(result);
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data.event || data;
  }
  return {};
}

function apiErrorsFrom(error) {
  if (!(error instanceof ApiError) || !error.data || typeof error.data !== 'object') {
    return [];
  }

  const { errors } = error.data;
  if (Array.isArray(errors)) {
    return errors
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        code: trimmed(item.code).toUpperCase(),
        message: trimmed(item.message),
        field: trimmed(item.field)
      }));
  }

  if (errors && typeof errors === 'object') {
    return Object.entries(errors).flatMap(([field, messages]) => {
      const values = Array.isArray(messages) ? messages : [messages];
      return values
        .map(message => trimmed(message))
        .filter(Boolean)
        .map(message => ({ code: 'VALIDATION_ERROR', message, field }));
    });
  }

  return [];
}

function apiErrorCode(error) {
  return apiErrorsFrom(error)[0]?.code
    || trimmed(error?.data?.code || error?.data?.error_code).toUpperCase();
}

function isOnboardingRequired(error) {
  return error instanceof ApiError
    && error.status === 403
    && apiErrorCode(error) === 'ONBOARDING_REQUIRED';
}

function eventFormErrors(error, fallbackMessage) {
  const fieldAliases = {
    starts_at: 'start_time',
    ends_at: 'end_time'
  };
  const apiErrors = apiErrorsFrom(error);
  if (apiErrors.length === 0) {
    return [{ text: trimmed(error?.message) || fallbackMessage }];
  }

  return apiErrors.map(item => {
    const field = fieldAliases[item.field] || item.field;
    return {
      text: item.message || fallbackMessage,
      ...(field ? { href: `#${field}` } : {})
    };
  });
}

function renderForbidden(res, error) {
  return res.status(403).render('errors/403', {
    title: 'Forbidden',
    message: trimmed(error?.message) || 'You do not have permission to manage this event.'
  });
}

function idFrom(value) {
  const object = value && typeof value === 'object' ? value : {};
  const data = dataFrom(object);
  const row = data && typeof data === 'object' && !Array.isArray(data) ? data : object;
  return positiveInteger(row.id || row.user_id || row.userId);
}

function eventOwnerId(event) {
  const user = event && typeof event.user === 'object' ? event.user : {};
  return positiveInteger(event.user_id || event.userId || user.id);
}

function coordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatCoordinate(value) {
  return Number(value).toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

function eventMapState(event) {
  const lat = coordinate(event.latitude ?? event.lat);
  const lng = coordinate(event.longitude ?? event.lng);
  const location = trimmed(event.location);
  const isOnline = checked(event.is_online ?? event.isOnline);
  const hasCoordinates = lat !== null && lng !== null && !isOnline;
  const latText = hasCoordinates ? formatCoordinate(lat) : '';
  const lngText = hasCoordinates ? formatCoordinate(lng) : '';
  const delta = 0.01;
  const bbox = hasCoordinates
    ? `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`
    : '';

  return {
    id: event.id,
    title: trimmed(event.title) || 'Location',
    location,
    isOnline,
    hasCoordinates,
    latText,
    lngText,
    embedUrl: hasCoordinates ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latText}%2C${lngText}` : '',
    viewUrl: hasCoordinates ? `https://www.openstreetmap.org/?mlat=${latText}&mlon=${lngText}#map=15/${latText}/${lngText}` : '',
    directionsUrl: hasCoordinates ? `https://www.openstreetmap.org/directions?to=${latText}%2C${lngText}` : ''
  };
}

function eventPollFrom(item, eventId) {
  const row = item && typeof item === 'object' ? item : {};
  const id = positiveInteger(row.id);
  if (id === null) return null;
  const question = trimmed(row.question || row.title) || `#${id}`;
  const attached = checked(row.attached) || positiveInteger(row.event_id ?? row.eventId) === eventId;
  return {
    id,
    question,
    attached
  };
}

function eventIsSeries(event) {
  return checked(event.is_series ?? event.isSeries)
    || checked(event.is_recurring_template ?? event.isRecurringTemplate)
    || positiveInteger(event.parent_event_id ?? event.parentEventId) !== null;
}

function dateTimeLocal(value) {
  if (!value) return '';
  const text = trimmed(value);
  const localMatch = text.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (localMatch && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) {
    return `${localMatch[1]}T${localMatch[2]}`;
  }
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    // Laravel formats event inputs in its configured UTC application timezone.
    return date.toISOString().slice(0, 16);
  }
  return text.length >= 16 ? text.slice(0, 16) : text;
}

function occurrenceFrom(item, currentEventId) {
  const row = item && typeof item === 'object' ? item : {};
  const id = positiveInteger(row.id);
  if (id === null) return null;
  const startTime = row.start_time ?? row.startTime ?? row.starts_at ?? row.startsAt;
  return {
    id,
    when: dateTimeLocal(startTime).replace('T', ' '),
    current: id === currentEventId
  };
}

async function runEventAction(req, res, method, path, data, successRedirect, failureRedirect) {
  const token = tokenFrom(req);
  if (!token) {
    return redirectTo(res, loginRedirect());
  }

  try {
    await callApi(token, method, path, data);
    return redirectTo(res, successRedirect);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, failureRedirect);
  }
}

function eventPath(id, suffix = '') {
  return `${EVENTS_PATH}/${id}${suffix}`;
}

function eventRedirect(id, status, fragment = '') {
  return `${eventPath(id)}?status=${encodeURIComponent(status)}${fragment}`;
}

router.get('/browse', asyncRoute(async (req, res) => {
  const categoriesResult = await getEventCategories(tokenFrom(req));
  const categories = collectionFrom(categoriesResult)
    .map(eventCategoryFrom)
    .filter(Boolean);
  const selectedCategoryId = positiveInteger(req.query.category_id);

  return res.render('events/browse', {
    title: 'Browse events by category',
    activeNav: 'events',
    categories,
    selectedCategoryId
  });
}));

router.get('/:id(\\d+)/map', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const result = await callApi(tokenFrom(req), 'GET', `/${id}`);
  const map = eventMapState(eventFrom(result));

  res.render('events/map', {
    title: 'Event location',
    activeNav: 'events',
    map
  });
}, { notFoundTitle: 'Event not found' }));

router.get('/:id(\\d+)/recurring-edit', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const event = eventFrom(await callApi(token, 'GET', `/${id}`));
  if (!eventIsSeries(event)) {
    return redirectTo(res, eventPath(id, '/edit'));
  }

  const occurrences = collectionFrom(event.series_occurrences ?? event.seriesOccurrences)
    .map((occurrence) => occurrenceFrom(occurrence, id))
    .filter(Boolean);

  return res.render('events/recurring-edit', {
    title: 'Edit a repeating event',
    activeNav: 'events',
    event: {
      id,
      title: trimmed(event.title),
      description: trimmed(event.description, 8000),
      location: trimmed(event.location),
      startTime: dateTimeLocal(event.start_time ?? event.startTime ?? event.starts_at ?? event.startsAt),
      endTime: dateTimeLocal(event.end_time ?? event.endTime ?? event.ends_at ?? event.endsAt)
    },
    occurrences,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Event not found' }));

router.get('/:id(\\d+)/polls', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const [eventResult, pollsResult] = await Promise.all([
    callApi(token, 'GET', `/${id}`),
    getPolls(token, { mine: true, limit: 100 })
  ]);
  const event = eventFrom(eventResult);
  const polls = collectionFrom(pollsResult)
    .map((poll) => eventPollFrom(poll, id))
    .filter(Boolean);

  res.render('events/polls', {
    title: 'Polls for this event',
    activeNav: 'events',
    event: {
      id,
      title: trimmed(event.title) || 'Polls'
    },
    polls,
    status: trimmed(req.query.status),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Event not found' }));

router.get('/:id(\\d+)/translate', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const event = eventFrom(await callApi(token, 'GET', `/${id}`));
  const sourceText = trimmed(event.description, 8000);
  const targetLocale = trimmed(req.query.target_locale || req.query.locale) || '';

  res.render('events/translate', {
    title: 'Translate event description',
    activeNav: 'events',
    event: {
      id,
      title: trimmed(event.title) || 'Translate'
    },
    sourceText,
    languages: localeOptions.map(([code, name]) => ({ code, name, selected: code === targetLocale })),
    status: trimmed(req.query.status),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Event not found' }));

function eventScopedPayload(body) {
  const categoryId = positiveInteger(body.category_id);
  const maxAttendees = positiveInteger(body.max_attendees);
  const payload = {
    title: trimmed(body.title),
    description: trimmed(body.description),
    start_time: trimmed(body.start_time) || null,
    end_time: trimmed(body.end_time) || null,
    location: trimmed(body.location) || null,
    category_id: categoryId,
    max_attendees: maxAttendees === null ? null : Math.max(1, maxAttendees),
    is_online: checked(body.is_online),
    online_link: trimmed(body.online_link) || null,
    allow_remote_attendance: checked(body.allow_remote_attendance),
    video_url: trimmed(body.video_url) || null
  };
  if (Object.prototype.hasOwnProperty.call(body, 'group_id')) {
    payload.group_id = positiveInteger(body.group_id);
  }
  return payload;
}

function recurrencePayload(body) {
  const frequency = ['daily', 'weekly', 'monthly'].includes(trimmed(body.recurrence_frequency))
    ? trimmed(body.recurrence_frequency)
    : 'weekly';
  const endsType = trimmed(body.recurrence_ends_type) === 'on_date' ? 'on_date' : 'after_count';

  return {
    recurrence_frequency: frequency,
    recurrence_interval: boundedPositiveInteger(body.recurrence_interval, 1),
    recurrence_ends_type: endsType,
    recurrence_ends_after_count: boundedPositiveInteger(body.recurrence_ends_after_count, 10, 52),
    recurrence_ends_on_date: trimmed(body.recurrence_ends_on_date) || null
  };
}

function pollIdsFrom(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  const unique = new Set();
  values.forEach((item) => {
    const id = positiveInteger(item);
    if (id !== null) {
      unique.add(id);
    }
  });
  return Array.from(unique);
}

router.post('/:id(\\d+)/waitlist', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runEventAction(
    req,
    res,
    'POST',
    `/${id}/waitlist`,
    undefined,
    eventRedirect(id, 'waitlist-joined'),
    eventRedirect(id, 'waitlist-failed')
  );
}));

router.post('/:id(\\d+)/waitlist/leave', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runEventAction(
    req,
    res,
    'DELETE',
    `/${id}/waitlist`,
    undefined,
    eventRedirect(id, 'waitlist-left'),
    eventRedirect(id, 'waitlist-leave-failed')
  );
}));

router.post('/:id(\\d+)/attendees/:attendeeId(\\d+)/check-in', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const attendeeId = Number(req.params.attendeeId);
  return runEventAction(
    req,
    res,
    'POST',
    `/${id}/attendees/${attendeeId}/check-in`,
    undefined,
    eventRedirect(id, 'checkin-success'),
    eventRedirect(id, 'checkin-failed')
  );
}));

router.post('/:id(\\d+)/polls/:pollId(\\d+)/vote', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());
  const id = Number(req.params.id);
  const pollId = Number(req.params.pollId);
  const optionId = positiveInteger(req.body.option_id);
  if (optionId === null) {
    return redirectTo(res, eventRedirect(id, 'poll-vote-failed', `#poll-${pollId}`));
  }

  try {
    await votePoll(token, pollId, { option_id: optionId });
    return redirectTo(res, eventRedirect(id, 'poll-voted', `#poll-${pollId}`));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, eventRedirect(id, 'poll-vote-failed', `#poll-${pollId}`));
  }
}));

router.post('/:id(\\d+)/polls', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  return runEventAction(
    req,
    res,
    'PUT',
    `/${id}`,
    { poll_ids: pollIdsFrom(req.body.poll_ids) },
    eventPath(id, '/polls?status=polls-updated'),
    eventPath(id, '/polls?status=polls-failed')
  );
}));

router.post('/:id(\\d+)/recurring-edit', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const scope = trimmed(req.body.scope) === 'all' ? 'all' : 'single';
  return runEventAction(
    req,
    res,
    'PUT',
    `/${id}/recurring`,
    {
      ...eventScopedPayload(req.body),
      scope
    },
    eventRedirect(id, 'event-updated'),
    eventRedirect(id, 'event-update-failed')
  );
}));

router.post('/:id(\\d+)/translate', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());
  const id = Number(req.params.id);
  const sourceText = trimmed(req.body.source_text || req.body.description, 8000);
  if (sourceText === '') {
    return redirectTo(res, eventPath(id, '/translate?status=translate-empty'));
  }

  const payload = {
    content_type: 'event',
    content_id: id,
    source_text: sourceText,
    target_locale: trimmed(req.body.target_locale) || 'en'
  };

  const sourceLocale = trimmed(req.body.source_locale);
  if (sourceLocale !== '') {
    payload.source_locale = sourceLocale;
  }

  try {
    await callUgcTranslateApi(token, payload);
    return redirectTo(res, eventPath(id, '/translate?status=translate-done'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return redirectTo(res, eventPath(id, '/translate?status=translate-failed'));
  }
}));

// List events
router.get('/', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  const limit = 20;
  const searchQuery = trimmed(req.query.q || req.query.search);
  const groupId = req.query.group_id || null;
  const when = ['upcoming', 'past', 'all'].includes(req.query.when)
    ? req.query.when
    : (req.query.upcoming_only === 'false' ? 'all' : 'upcoming');
  const upcomingOnly = when === 'upcoming';
  const hasFilters = Boolean(searchQuery || groupId || when !== 'upcoming');

  const result = await getEvents(token, {
    per_page: limit,
    cursor: trimmed(req.query.cursor) || undefined,
    q: searchQuery,
    group_id: groupId,
    when
  });

  const events = collectionFrom(result);
  const meta = result?.meta || {};

  res.render('events/index', {
    title: 'Events',
    events,
    searchQuery,
    groupId,
    hasFilters,
    upcomingOnly,
    when,
    pagination: {
      hasMore: Boolean(meta.has_more),
      cursor: trimmed(meta.cursor || meta.next_cursor)
    },
    isAuthenticated: Boolean(token),
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}));

// Create event form
router.get('/new', requireAuth, asyncRoute(async (req, res) => {
  let setupErrorMessage = null;

  const categoriesResult = await getEventCategories(req.token).catch((error) => {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    setupErrorMessage = 'Sorry, there is a problem loading event setup information.';
    return { data: [] };
  });
  const categories = collectionFrom(categoriesResult);

  res.render('events/new', {
    title: 'Create an event',
    categories,
    setupErrorMessage,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

// Create event
router.post('/new', requireAuth, audit.eventCreate(), asyncRoute(async (req, res) => {
  const {
    title,
    description,
    start_time,
    end_time,
    group_id,
    is_recurring,
    recurrence_frequency,
    recurrence_interval,
    recurrence_ends_type,
    recurrence_ends_after_count,
    recurrence_ends_on_date
  } = req.body;
  const image = uploadedFile(req, 'image');
  const values = {
    ...req.body,
    title: trimmed(title),
    description: trimmed(description),
    start_time: dateTimeLocal(start_time),
    end_time: dateTimeLocal(end_time),
    is_online: checked(req.body.is_online),
    allow_remote_attendance: checked(req.body.allow_remote_attendance),
    is_recurring: checked(is_recurring)
  };

  const errors = [];

  if (values.title === '') {
    errors.push({ text: 'Enter an event title', href: '#title' });
  } else if (values.title.length > 255) {
    errors.push({ text: 'Title must be 255 characters or fewer', href: '#title' });
  }

  if (values.description === '') {
    errors.push({ text: 'Enter an event description', href: '#description' });
  }

  if (values.start_time === '') {
    errors.push({ text: 'Enter a start date and time', href: '#start_time' });
  }

  // Helper to render form with errors
  const renderFormWithErrors = async (errorList) => {
    await removeUploadedFile(image);
    let categories = [];
    try {
      const categoriesResult = await getEventCategories(req.token);
      categories = collectionFrom(categoriesResult);
    } catch (error) {
      if (isAuthError(error)) throw error;
      // Non-auth support-data failures remain visible through the validation form.
    }

    return res.render('events/new', {
      title: 'Create an event',
      errors: errorList,
      values,
      categories,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  };

  if (errors.length > 0) {
    return renderFormWithErrors(errors);
  }

  try {
    const eventData = {
      ...eventScopedPayload(req.body),
      group_id: positiveInteger(group_id)
    };

    const result = checked(is_recurring)
      ? await callApi(req.token, 'POST', '/recurring', {
        ...eventData,
        ...recurrencePayload({ recurrence_frequency, recurrence_interval, recurrence_ends_type, recurrence_ends_after_count, recurrence_ends_on_date })
      })
      : await createEvent(req.token, eventData);
    const eventId = resultEventId(result);
    if (eventId === null) {
      throw new ApiError('The event API did not return the created event ID.', 502, result);
    }

    try {
      await uploadEventCoverImage(req.token, eventId, image);
    } catch (uploadError) {
      if (uploadError instanceof ApiError && uploadError.status === 401) {
        throw uploadError;
      }
      if (req.flash) {
        req.flash('error', uploadError.message || 'Event created, but the image could not be uploaded');
      }
    } finally {
      await removeUploadedFile(image);
    }

    if (req.flash) {
      req.flash('success', 'Event created successfully');
    }

    redirectTo(res, eventPath(eventId));
  } catch (error) {
    await removeUploadedFile(image);
    if (isOnboardingRequired(error)) {
      return redirectTo(res, '/onboarding');
    }
    if (error instanceof ApiError && [400, 409, 422].includes(error.status)) {
      return renderFormWithErrors(eventFormErrors(error, 'Unable to create event'));
    }
    if (error instanceof ApiError && error.status === 403) {
      return renderForbidden(res, error);
    }
    throw error; // asyncRoute handles 401, 404, and 503 consistently.
  }
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Event not found' }));

// View event details
router.get('/:id(\\d+)', asyncRoute(async (req, res) => {
  const { id } = req.params;
  const token = tokenFrom(req);

  const [eventResult, rsvpsResult, currentUserResult] = await Promise.all([
    getEvent(token, id),
    getEventRsvps(token, id).catch(() => ({ data: [] })),
    token ? getRequestProfile(req, token).catch((error) => {
      if (isAuthError(error)) throw error;
      return null;
    }) : Promise.resolve(null)
  ]);

  const event = eventFrom(eventResult);
  event.online_link = safeExternalHttpUrl(event.online_link ?? event.onlineLink);
  event.onlineLink = event.online_link;
  event.video_url = safeExternalHttpUrl(event.video_url ?? event.videoUrl);
  event.videoUrl = event.video_url;
  const ownerId = eventOwnerId(event);
  const currentUserId = idFrom(currentUserResult);
  const isCurrentUserOwner = ownerId !== null && currentUserId !== null && String(ownerId) === String(currentUserId);
  const canEditFromApi = event.can_edit === true || event.canEdit === true;
  event.can_edit = Boolean(token) && (canEditFromApi || isCurrentUserOwner);
  event.canEdit = event.can_edit;
  const rawRsvp = event.myRsvp ?? event.my_rsvp ?? event.user_rsvp ?? event.rsvp_status;
  const myRsvpStatus = trimmed(
    rawRsvp && typeof rawRsvp === 'object' ? rawRsvp.status : rawRsvp
  ).toLowerCase();
  const myRsvp = myRsvpStatus
    ? { status: myRsvpStatus === 'maybe' ? 'interested' : myRsvpStatus }
    : null;
  const rsvps = collectionFrom(rsvpsResult);

  // Group RSVPs by status
  const rsvpsByStatus = {
    going: rsvps.filter(r => (r.status || r.rsvp_status) === 'going'),
    interested: rsvps.filter(r => ['interested', 'maybe'].includes(r.status || r.rsvp_status)),
    not_going: rsvps.filter(r => (r.status || r.rsvp_status) === 'not_going')
  };

  res.render('events/detail', {
    title: event.title,
    event,
    myRsvp,
    rsvpsByStatus,
    isAuthenticated: Boolean(token),
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Event not found' }));

// Edit event form
router.get('/:id(\\d+)/edit', requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;

  const [eventResult, currentUser] = await Promise.all([
    getEvent(req.token, id),
    getRequestProfile(req, req.token)
  ]);
  const event = eventFrom(eventResult);
  const ownerId = eventOwnerId(event);
  const currentUserId = idFrom(currentUser);
  if (ownerId !== null && currentUserId !== null && String(ownerId) !== String(currentUserId)) {
    return res.status(403).render('errors/403', { title: 'Forbidden' });
  }

  let setupErrorMessage = null;
  const categoriesResult = await getEventCategories(req.token).catch((error) => {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    setupErrorMessage = 'Sorry, there is a problem loading event setup information.';
    return { data: [] };
  });
  const categories = collectionFrom(categoriesResult);

  res.render('events/edit', {
    title: `Edit ${event.title}`,
    event,
    categories,
    setupErrorMessage,
    startTime: dateTimeLocal(event.start_time ?? event.startTime),
    endTime: dateTimeLocal(event.end_time ?? event.endTime),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Event not found' }));

// Update event
router.post('/:id(\\d+)/edit', requireAuth, audit.eventUpdate(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { title, description, start_time, end_time } = req.body;
  const image = uploadedFile(req, 'image');
  const values = {
    ...req.body,
    title: trimmed(title),
    description: trimmed(description),
    start_time: dateTimeLocal(start_time),
    end_time: dateTimeLocal(end_time),
    is_online: checked(req.body.is_online),
    allow_remote_attendance: checked(req.body.allow_remote_attendance)
  };

  const errors = [];

  if (values.title === '') {
    errors.push({ text: 'Enter an event title', href: '#title' });
  } else if (values.title.length > 255) {
    errors.push({ text: 'Title must be 255 characters or fewer', href: '#title' });
  }

  if (values.description === '') {
    errors.push({ text: 'Enter an event description', href: '#description' });
  }

  if (values.start_time === '') {
    errors.push({ text: 'Enter a start date and time', href: '#start_time' });
  }

  // Helper to render form with errors
  const renderFormWithErrors = async (errorList) => {
    await removeUploadedFile(image);
    let categories = [];
    try {
      const categoriesResult = await getEventCategories(req.token);
      categories = collectionFrom(categoriesResult);
    } catch (error) {
      if (isAuthError(error)) throw error;
      // Non-auth support-data failures remain visible through the validation form.
    }

    return res.render('events/edit', {
      title: 'Edit event',
      event: { id, ...values },
      errors: errorList,
      categories,
      startTime: values.start_time,
      endTime: values.end_time,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  };

  if (errors.length > 0) {
    return renderFormWithErrors(errors);
  }

  try {
    await updateEvent(req.token, id, eventScopedPayload(req.body));

    try {
      await uploadEventCoverImage(req.token, id, image);
    } catch (uploadError) {
      if (uploadError instanceof ApiError && uploadError.status === 401) {
        throw uploadError;
      }
      if (req.flash) {
        req.flash('error', uploadError.message || 'Event updated, but the image could not be uploaded');
      }
    } finally {
      await removeUploadedFile(image);
    }

    if (req.flash) {
      req.flash('success', 'Event updated successfully');
    }

    redirectTo(res, eventPath(id));
  } catch (error) {
    await removeUploadedFile(image);
    if (isOnboardingRequired(error)) {
      return redirectTo(res, '/onboarding');
    }
    if (error instanceof ApiError && [400, 409, 422].includes(error.status)) {
      return renderFormWithErrors(eventFormErrors(error, 'Unable to update event'));
    }
    if (error instanceof ApiError && error.status === 403) {
      return renderForbidden(res, error);
    }
    throw error; // asyncRoute handles 401, 404, and 503 consistently.
  }
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Event not found' }));

// Cancel event
router.post('/:id(\\d+)/cancel', requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const reason = trimmed(req.body.reason);

  try {
    await cancelEvent(req.token, id, { reason });

    if (req.flash) {
      req.flash('success', 'Event cancelled');
    }
  } catch (error) {
    if (isOnboardingRequired(error)) {
      return redirectTo(res, '/onboarding');
    }
    if (error instanceof ApiError && error.status === 403) {
      return renderForbidden(res, error);
    }
    if (error instanceof ApiError && [400, 409, 422].includes(error.status)) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to cancel event');
      }
      return redirectTo(res, eventPath(id));
    }
    throw error; // asyncRoute handles 401, 404, and 503 consistently.
  }

  redirectTo(res, eventPath(id));
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Event not found' }));

// Delete event
router.post('/:id(\\d+)/delete', requireAuth, audit.eventDelete(), asyncRoute(async (req, res) => {
  const { id } = req.params;

  try {
    await deleteEvent(req.token, id);

    if (req.flash) {
      req.flash('success', 'Event deleted successfully');
    }

    redirectTo(res, EVENTS_PATH);
  } catch (error) {
    if (isOnboardingRequired(error)) {
      return redirectTo(res, '/onboarding');
    }
    if (error instanceof ApiError && error.status === 403) {
      return renderForbidden(res, error);
    }
    if (error instanceof ApiError && [400, 409, 422].includes(error.status)) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to delete event');
      }
      return redirectTo(res, eventPath(id));
    }
    throw error; // asyncRoute handles 401, 404, and 503 consistently.
  }
}, { redirectOn401: loginRedirect(), notFoundTitle: 'Event not found' }));

// RSVP to event
router.post('/:id(\\d+)/rsvp', requireAuth, audit.eventRsvp(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  const requestedStatus = trimmed(req.body.status).toLowerCase();
  const status = ['going', 'interested', 'not_going'].includes(requestedStatus)
    ? requestedStatus
    : 'going';

  try {
    const result = await rsvpToEvent(req.token, id, status);
    const response = dataFrom(result) || {};

    if (req.flash) {
      const messages = {
        going: "You're going to this event",
        interested: "You've marked yourself as interested",
        not_going: "You've declined this event"
      };
      const message = response.status === 'waitlisted'
        ? `The event is full. You have joined the waitlist${response.waitlist_position ? ` at position ${response.waitlist_position}` : ''}.`
        : (messages[status] || 'RSVP recorded');
      req.flash('success', message);
    }
  } catch (error) {
    if (isOnboardingRequired(error)) {
      return redirectTo(res, '/onboarding');
    }
    if (error instanceof ApiError && error.status === 403) {
      return renderForbidden(res, error);
    }
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to RSVP');
      }
      return redirectTo(res, eventPath(id));
    }
    throw error;
  }

  redirectTo(res, eventPath(id));
}));

module.exports = router;
