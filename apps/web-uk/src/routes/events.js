// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const fs = require('fs/promises');
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
  getMyGroups,
  getProfile,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');
const { localeOptions } = require('../lib/accessible-shell');

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
  return result?.event?.id || result?.data?.id || result?.data?.template?.id || result?.id;
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
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 16);
  }
  const text = trimmed(value);
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
    return res.redirect(loginRedirect());
  }

  try {
    await callApi(token, method, path, data);
    return res.redirect(successRedirect);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(failureRedirect);
  }
}

function eventRedirect(id, status, fragment = '') {
  return `/events/${id}?status=${encodeURIComponent(status)}${fragment}`;
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
  if (!token) return res.redirect(loginRedirect());

  const id = Number(req.params.id);
  const event = eventFrom(await callApi(token, 'GET', `/${id}`));
  if (!eventIsSeries(event)) {
    return res.redirect(`/events/${id}/edit`);
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
  if (!token) return res.redirect(loginRedirect());

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
  if (!token) return res.redirect(loginRedirect());

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
  return {
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
  if (!token) return res.redirect(loginRedirect());
  const id = Number(req.params.id);
  const pollId = Number(req.params.pollId);
  const optionId = positiveInteger(req.body.option_id);
  if (optionId === null) {
    return res.redirect(eventRedirect(id, 'poll-vote-failed', `#poll-${pollId}`));
  }

  try {
    await votePoll(token, pollId, { option_id: optionId });
    return res.redirect(eventRedirect(id, 'poll-voted', `#poll-${pollId}`));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(eventRedirect(id, 'poll-vote-failed', `#poll-${pollId}`));
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
    `/events/${id}/polls?status=polls-updated`,
    `/events/${id}/polls?status=polls-failed`
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
  if (!token) return res.redirect(loginRedirect());
  const id = Number(req.params.id);
  const sourceText = trimmed(req.body.source_text || req.body.description, 8000);
  if (sourceText === '') {
    return res.redirect(`/events/${id}/translate?status=translate-empty`);
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
    return res.redirect(`/events/${id}/translate?status=translate-done`);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(`/events/${id}/translate?status=translate-failed`);
  }
}));

// List events
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 20;
  const searchQuery = req.query.search ? req.query.search.trim() : '';
  const groupId = req.query.group_id || null;
  const upcomingOnly = req.query.upcoming_only !== 'false';

  const result = await getEvents(req.token, {
    page,
    limit,
    search: searchQuery,
    group_id: groupId,
    upcoming_only: upcomingOnly
  });

  const events = result.items || result.data || [];

  res.render('events/index', {
    title: 'Events',
    events,
    searchQuery,
    groupId,
    upcomingOnly,
    pagination: result.pagination || { page, totalPages: 1 },
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}));

// Create event form
router.get('/new', requireAuth, asyncRoute(async (req, res) => {
  const groupId = req.query.group_id || null;
  let setupErrorMessage = null;

  const [myGroupsResult, categoriesResult] = await Promise.all([
    getMyGroups(req.token).catch((error) => {
      if (error instanceof ApiError && error.status === 401) {
        throw error;
      }
      setupErrorMessage = 'Sorry, there is a problem loading event setup information.';
      return { data: [] };
    }),
    getEventCategories(req.token).catch((error) => {
      if (error instanceof ApiError && error.status === 401) {
        throw error;
      }
      setupErrorMessage = 'Sorry, there is a problem loading event setup information.';
      return { data: [] };
    })
  ]);
  const myGroups = myGroupsResult.items || myGroupsResult.data || [];
  const categories = categoriesResult.items || categoriesResult.data || [];

  res.render('events/new', {
    title: 'Create an event',
    myGroups,
    categories,
    selectedGroupId: groupId,
    setupErrorMessage,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

// Create event
router.post('/new', requireAuth, audit.eventCreate(), asyncRoute(async (req, res) => {
  const { title, description, location, starts_at_date, starts_at_time, ends_at_date, ends_at_time, max_attendees, group_id, category_id, is_online, online_link, allow_remote_attendance, video_url, is_recurring, recurrence_frequency, recurrence_interval, recurrence_ends_type, recurrence_ends_after_count, recurrence_ends_on_date } = req.body;
  const image = uploadedFile(req, 'image');

  const errors = [];

  if (!title || !title.trim()) {
    errors.push({ text: 'Enter an event title', href: '#title' });
  } else if (title.length > 255) {
    errors.push({ text: 'Title must be 255 characters or fewer', href: '#title' });
  }

  if (!starts_at_date || !starts_at_time) {
    errors.push({ text: 'Enter a start date and time', href: '#starts_at_date' });
  }

  // Combine date and time into ISO 8601 UTC
  let startsAt = null;
  let endsAt = null;

  if (starts_at_date && starts_at_time) {
    startsAt = `${starts_at_date}T${starts_at_time}:00`;
  }

  if (ends_at_date && ends_at_time) {
    endsAt = `${ends_at_date}T${ends_at_time}:00`;
  }

  // Helper to render form with errors
  const renderFormWithErrors = async (errorList) => {
    await removeUploadedFile(image);
    let myGroups = [];
    let categories = [];
    try {
      const [myGroupsResult, categoriesResult] = await Promise.all([
        getMyGroups(req.token),
        getEventCategories(req.token)
      ]);
      myGroups = myGroupsResult.data || [];
      categories = categoriesResult.data || [];
    } catch {
      // Ignore - render with empty form support data
    }

    return res.render('events/new', {
      title: 'Create an event',
      errors: errorList,
      values: { title, description, location, starts_at_date, starts_at_time, ends_at_date, ends_at_time, max_attendees, group_id, category_id, is_online, online_link, allow_remote_attendance, video_url, is_recurring, recurrence_frequency, recurrence_interval, recurrence_ends_type, recurrence_ends_after_count, recurrence_ends_on_date },
      myGroups,
      categories,
      selectedGroupId: group_id,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  };

  if (errors.length > 0) {
    return renderFormWithErrors(errors);
  }

  try {
    const eventData = {
      title: title.trim(),
      description: description ? description.trim() : null,
      location: location ? location.trim() : null,
      starts_at: startsAt,
      ends_at: endsAt,
      max_attendees: max_attendees ? parseInt(max_attendees, 10) : null,
      group_id: group_id ? parseInt(group_id, 10) : null,
      category_id: positiveInteger(category_id),
      is_online: checked(is_online),
      online_link: trimmed(online_link) || null,
      allow_remote_attendance: checked(allow_remote_attendance),
      video_url: trimmed(video_url) || null
    };

    const result = checked(is_recurring)
      ? await callApi(req.token, 'POST', '/recurring', {
        title: eventData.title,
        description: eventData.description,
        start_time: startsAt,
        end_time: endsAt,
        location: eventData.location,
        category_id: eventData.category_id,
        max_attendees: eventData.max_attendees,
        is_online: eventData.is_online,
        online_link: eventData.online_link,
        allow_remote_attendance: eventData.allow_remote_attendance,
        video_url: eventData.video_url,
        ...recurrencePayload({ recurrence_frequency, recurrence_interval, recurrence_ends_type, recurrence_ends_after_count, recurrence_ends_on_date })
      })
      : await createEvent(req.token, eventData);
    const eventId = resultEventId(result);

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

    res.redirect(`/events/${eventId}`);
  } catch (error) {
    await removeUploadedFile(image);
    // Handle validation errors from API by re-rendering form
    if (error instanceof ApiError && error.status !== 401) {
      return renderFormWithErrors([{ text: error.message || 'Unable to create event' }]);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// View event details
router.get('/:id(\\d+)', requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;

  const [eventResult, rsvpsResult] = await Promise.all([
    getEvent(req.token, id),
    getEventRsvps(req.token, id).catch(() => ({ data: [] }))
  ]);

  const event = eventFrom(eventResult);
  const myRsvp = eventResult.myRsvp || eventResult.my_rsvp;
  const rsvps = rsvpsResult.data || [];

  // Group RSVPs by status
  const rsvpsByStatus = {
    going: rsvps.filter(r => r.status === 'going'),
    maybe: rsvps.filter(r => r.status === 'maybe'),
    not_going: rsvps.filter(r => r.status === 'not_going')
  };

  res.render('events/detail', {
    title: event.title,
    event,
    myRsvp,
    rsvpsByStatus,
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}, { notFoundTitle: 'Event not found' }));

// Edit event form
router.get('/:id(\\d+)/edit', requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;

  const [eventResult, currentUser] = await Promise.all([
    getEvent(req.token, id),
    getProfile(req.token)
  ]);
  const event = eventFrom(eventResult);
  const ownerId = eventOwnerId(event);
  const currentUserId = idFrom(currentUser);
  if (ownerId !== null && currentUserId !== null && String(ownerId) !== String(currentUserId)) {
    return res.status(403).render('errors/403', { title: 'Forbidden' });
  }

  let setupErrorMessage = null;
  const [myGroupsResult, categoriesResult] = await Promise.all([
    getMyGroups(req.token).catch((error) => {
      if (error instanceof ApiError && error.status === 401) {
        throw error;
      }
      setupErrorMessage = 'Sorry, there is a problem loading event setup information.';
      return { data: [] };
    }),
    getEventCategories(req.token).catch((error) => {
      if (error instanceof ApiError && error.status === 401) {
        throw error;
      }
      setupErrorMessage = 'Sorry, there is a problem loading event setup information.';
      return { data: [] };
    })
  ]);
  const myGroups = myGroupsResult.items || myGroupsResult.data || [];
  const categories = categoriesResult.items || categoriesResult.data || [];

  // Parse dates for form (backend returns camelCase: startsAt, endsAt)
  const startsAt = (event.startsAt || event.starts_at) ? new Date(event.startsAt || event.starts_at) : null;
  const endsAt = (event.endsAt || event.ends_at) ? new Date(event.endsAt || event.ends_at) : null;

  res.render('events/edit', {
    title: `Edit ${event.title}`,
    event,
    myGroups,
    categories,
    setupErrorMessage,
    startsAtDate: startsAt ? startsAt.toISOString().split('T')[0] : '',
    startsAtTime: startsAt ? startsAt.toTimeString().slice(0, 5) : '',
    endsAtDate: endsAt ? endsAt.toISOString().split('T')[0] : '',
    endsAtTime: endsAt ? endsAt.toTimeString().slice(0, 5) : '',
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Event not found' }));

// Update event
router.post('/:id(\\d+)/edit', requireAuth, audit.eventUpdate(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { title, description, location, starts_at_date, starts_at_time, ends_at_date, ends_at_time, max_attendees, category_id, is_online, online_link, allow_remote_attendance, video_url } = req.body;
  const image = uploadedFile(req, 'image');

  const errors = [];

  if (!title || !title.trim()) {
    errors.push({ text: 'Enter an event title', href: '#title' });
  }

  if (!starts_at_date || !starts_at_time) {
    errors.push({ text: 'Enter a start date and time', href: '#starts_at_date' });
  }

  // Combine date and time into ISO 8601 UTC
  let startsAt = null;
  let endsAt = null;

  if (starts_at_date && starts_at_time) {
    startsAt = `${starts_at_date}T${starts_at_time}:00`;
  }

  if (ends_at_date && ends_at_time) {
    endsAt = `${ends_at_date}T${ends_at_time}:00`;
  }

  // Helper to render form with errors
  const renderFormWithErrors = async (errorList) => {
    await removeUploadedFile(image);
    let myGroups = [];
    let categories = [];
    try {
      const [myGroupsResult, categoriesResult] = await Promise.all([
        getMyGroups(req.token),
        getEventCategories(req.token)
      ]);
      myGroups = myGroupsResult.data || [];
      categories = categoriesResult.data || [];
    } catch {
      // Ignore - render with empty form support data
    }

    return res.render('events/edit', {
      title: 'Edit event',
      event: { id, title, description, location, max_attendees, category_id, is_online, online_link, allow_remote_attendance, video_url },
      errors: errorList,
      myGroups,
      categories,
      startsAtDate: starts_at_date,
      startsAtTime: starts_at_time,
      endsAtDate: ends_at_date,
      endsAtTime: ends_at_time,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  };

  if (errors.length > 0) {
    return renderFormWithErrors(errors);
  }

  try {
    await updateEvent(req.token, id, {
      title: title.trim(),
      description: description ? description.trim() : null,
      location: location ? location.trim() : null,
      starts_at: startsAt,
      ends_at: endsAt,
      max_attendees: max_attendees ? parseInt(max_attendees, 10) : null,
      category_id: positiveInteger(category_id),
      is_online: checked(is_online),
      online_link: trimmed(online_link) || null,
      allow_remote_attendance: checked(allow_remote_attendance),
      video_url: trimmed(video_url) || null
    });

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

    res.redirect(`/events/${id}`);
  } catch (error) {
    await removeUploadedFile(image);
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to update event');
      }
      return res.redirect(`/events/${id}/edit`);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// Cancel event
router.post('/:id(\\d+)/cancel', requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;

  try {
    await cancelEvent(req.token, id);

    if (req.flash) {
      req.flash('success', 'Event cancelled');
    }
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to cancel event');
      }
      return res.redirect(`/events/${id}`);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }

  res.redirect(`/events/${id}`);
}));

// Delete event
router.post('/:id(\\d+)/delete', requireAuth, audit.eventDelete(), asyncRoute(async (req, res) => {
  const { id } = req.params;

  try {
    await deleteEvent(req.token, id);

    if (req.flash) {
      req.flash('success', 'Event deleted successfully');
    }

    res.redirect('/events');
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to delete event');
      }
      return res.redirect(`/events/${id}`);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// RSVP to event
router.post('/:id(\\d+)/rsvp', requireAuth, audit.eventRsvp(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await rsvpToEvent(req.token, id, status);

    if (req.flash) {
      const messages = {
        going: "You're going to this event",
        maybe: "You've marked yourself as maybe",
        not_going: "You've declined this event"
      };
      req.flash('success', messages[status] || 'RSVP recorded');
    }
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to RSVP');
      }
      return res.redirect(`/events/${id}`);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }

  res.redirect(`/events/${id}`);
}));

module.exports = router;
