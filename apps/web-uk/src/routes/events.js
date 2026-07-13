// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const fs = require('fs/promises');
const { randomUUID } = require('node:crypto');
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
  downloadEventApi,
  getEventCategories,
  uploadEventImage,
  callUgcTranslateApi,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');
const { localeOptions, resolveBackendAssetUrl } = require('../lib/accessible-shell');
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
    return eventWithAssetUrls(data.event || data);
  }
  return {};
}

function eventWithAssetUrls(value) {
  const event = value && typeof value === 'object' ? value : {};
  const coverImage = resolveBackendAssetUrl(event.cover_image || event.coverImage);
  return {
    ...event,
    cover_image: coverImage,
    coverImage
  };
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

function eventMapState(event, t = (key) => key) {
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
    title: trimmed(event.title) || t('govuk_alpha_events.map.caption'),
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

const PEOPLE_FILTERS = {
  registration_state: ['none', 'invited', 'pending', 'confirmed', 'declined', 'cancelled'],
  waitlist_state: ['none', 'active', 'waiting', 'offered', 'accepted', 'expired', 'cancelled'],
  attendance_state: ['not_checked_in', 'checked_in', 'checked_out', 'attended', 'no_show'],
  engagement_state: ['none', 'interested']
};

function selectedValue(value, allowed, fallback = '') {
  const candidate = trimmed(value);
  return allowed.includes(candidate) ? candidate : fallback;
}

function eventPeopleQuery(query = {}) {
  return {
    page: boundedPositiveInteger(query.page, 1),
    per_page: 25,
    search: trimmed(query.search, 255),
    registration_state: selectedValue(query.registration_state, PEOPLE_FILTERS.registration_state),
    waitlist_state: selectedValue(query.waitlist_state, PEOPLE_FILTERS.waitlist_state),
    attendance_state: selectedValue(query.attendance_state, PEOPLE_FILTERS.attendance_state),
    engagement_state: selectedValue(query.engagement_state, PEOPLE_FILTERS.engagement_state),
    sort: selectedValue(query.sort, ['name', 'registration', 'waitlist', 'attendance'], 'name'),
    direction: selectedValue(query.direction, ['asc', 'desc'], 'asc')
  };
}

function eventPeoplePath(id, query, page = query.page) {
  const parameters = new URLSearchParams();
  Object.entries({ ...query, page }).forEach(([key, value]) => {
    if (value !== '' && key !== 'per_page') parameters.set(key, String(value));
  });
  return eventPath(id, `/people?${parameters.toString()}`);
}

function eventPerson(row = {}) {
  const member = row.member && typeof row.member === 'object' ? row.member : {};
  const registration = row.registration && typeof row.registration === 'object' ? row.registration : {};
  const waitlist = row.waitlist && typeof row.waitlist === 'object' ? row.waitlist : {};
  const attendance = row.attendance && typeof row.attendance === 'object' ? row.attendance : {};
  const management = row.management_actions && typeof row.management_actions === 'object' ? row.management_actions : {};
  return {
    id: positiveInteger(member.id || row.user_id),
    name: trimmed(member.display_name || member.name),
    registrationState: selectedValue(registration.state, PEOPLE_FILTERS.registration_state, 'none'),
    registrationVersion: Math.max(0, Number.parseInt(registration.version ?? registration.registration_version ?? 0, 10) || 0),
    waitlistState: selectedValue(waitlist.state, PEOPLE_FILTERS.waitlist_state, 'none'),
    waitlistPosition: positiveInteger(waitlist.position),
    attendanceState: selectedValue(attendance.state, PEOPLE_FILTERS.attendance_state, 'not_checked_in'),
    attendanceVersion: Math.max(0, Number.parseInt(attendance.version ?? attendance.attendance_version ?? 0, 10) || 0),
    attendanceActions: {
      check_in: checked(management.check_in),
      check_out: checked(management.check_out),
      no_show: checked(management.no_show),
      undo: checked(management.undo_attendance)
    }
  };
}

async function callEventMutation(token, method, path, data, idempotencyKey) {
  return callEventApi(token, method, path, data, {
    headers: { 'Idempotency-Key': idempotencyKey }
  });
}

function offlineCredentialFrom(result) {
  const data = dataFrom(result);
  const value = data?.credential;
  if (!value || typeof value !== 'object') return null;
  const id = positiveInteger(value.id);
  const version = positiveInteger(value.version ?? value.credential_version);
  return {
    id,
    version,
    status: selectedValue(value.status, ['active', 'rotated', 'revoked', 'expired'], 'expired'),
    expiresAt: trimmed(value.expires_at ?? value.expiresAt),
    revokedAt: trimmed(value.revoked_at ?? value.revokedAt),
    token: trimmed(value.token, 4096),
    tokenOneShot: value.token_one_shot === true
  };
}

function arrayValues(value) {
  return Array.isArray(value) ? value : (value === undefined ? [] : [value]);
}

function agendaSessionPayload(body) {
  const speakerNames = arrayValues(body.speaker_name);
  const speakerRoles = arrayValues(body.speaker_role);
  const speakers = speakerNames.map((name, index) => ({
    display_name: trimmed(name, 160),
    role: trimmed(speakerRoles[index], 120) || null
  })).filter((speaker) => speaker.display_name);
  const resourceTypes = arrayValues(body.resource_type);
  const resourceTitles = arrayValues(body.resource_title);
  const resourceUrls = arrayValues(body.resource_url);
  const resourceVisibilities = arrayValues(body.resource_visibility);
  const resources = resourceTitles.map((title, index) => ({
    type: selectedValue(resourceTypes[index], ['link', 'document', 'slides', 'download', 'stream', 'recording'], 'link'),
    title: trimmed(title, 191),
    url: trimmed(resourceUrls[index], 2048),
    visibility: selectedValue(resourceVisibilities[index], ['public', 'registered', 'staff'], 'public')
  })).filter((resource) => resource.title || resource.url);
  return {
    title: trimmed(body.title, 255),
    description: trimmed(body.description, 4000) || null,
    session_type: selectedValue(body.session_type, ['session', 'keynote', 'workshop', 'panel', 'break', 'networking', 'other'], 'session'),
    visibility: selectedValue(body.visibility, ['public', 'registered', 'staff'], 'public'),
    start_at: trimmed(body.start_at),
    end_at: trimmed(body.end_at),
    timezone: trimmed(body.timezone, 64) || 'UTC',
    track_name: trimmed(body.track_name, 160) || null,
    room_name: trimmed(body.room_name, 160) || null,
    capacity: body.capacity === '' ? null : positiveInteger(body.capacity),
    speakers,
    resources
  };
}

async function renderOfflineCredential(req, res, id, options = {}) {
  const token = tokenFrom(req);
  const [eventResult, credentialResult] = await Promise.all([
    callApi(token, 'GET', `/${id}`),
    options.credentialResult === undefined
      ? callApi(token, 'GET', `/${id}/offline-checkin/credentials/me`)
      : Promise.resolve(options.credentialResult)
  ]);
  const event = eventFrom(eventResult);
  const credential = offlineCredentialFrom(credentialResult);
  res.set('Cache-Control', 'private, no-store');
  res.set('Pragma', 'no-cache');
  return res.render('events/check-in-credential', {
    title: res.locals.t('event_offline_checkin.attendee.title'),
    activeNav: 'events',
    event: { id, title: trimmed(event.title) },
    credential,
    oneShotToken: credential?.tokenOneShot && credential.token.startsWith('nqx2_') ? credential.token : '',
    status: options.status || trimmed(req.query.status),
    idempotencyKey: randomUUID(),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}

function eventRelationship(result) {
  const row = dataFrom(result);
  if (!row || typeof row !== 'object') return null;
  const registration = row.registration && typeof row.registration === 'object' ? row.registration : {};
  const waitlist = row.waitlist && typeof row.waitlist === 'object' ? row.waitlist : {};
  const actions = row.actions && typeof row.actions === 'object' ? row.actions : {};
  return {
    registrationState: trimmed(registration.state),
    waitlistState: selectedValue(waitlist.state, PEOPLE_FILTERS.waitlist_state, 'none'),
    waitlistPosition: positiveInteger(waitlist.position),
    offerActive: checked(waitlist.offer_active),
    canConfirm: checked(actions.confirm),
    canWithdraw: checked(actions.withdraw),
    canJoinWaitlist: checked(actions.join_waitlist),
    canLeaveWaitlist: checked(actions.leave_waitlist),
    canAcceptOffer: checked(actions.accept_offer)
  };
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
    title: res.locals.t('govuk_alpha_events.browse.title'),
    activeNav: 'events',
    categories,
    selectedCategoryId
  });
}));

router.get('/:id(\\d+)/map', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const result = await callApi(tokenFrom(req), 'GET', `/${id}`);
  const map = eventMapState(eventFrom(result), res.locals.t);

  res.render('events/map', {
    title: res.locals.t('govuk_alpha_events.map.title'),
    activeNav: 'events',
    map
  });
}, { notFoundTitle: 'Event not found' }));

router.get('/:id(\\d+)/people', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const token = tokenFrom(req);
  const query = eventPeopleQuery(req.query);
  const parameters = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]));
  const [eventResult, peopleResult] = await Promise.all([
    callApi(token, 'GET', `/${id}`),
    callApi(token, 'GET', `/${id}/people?${parameters.toString()}`)
  ]);
  const event = eventFrom(eventResult);
  const meta = peopleResult?.meta && typeof peopleResult.meta === 'object' ? peopleResult.meta : {};
  const people = (Array.isArray(peopleResult?.data) ? peopleResult.data : [])
    .map(eventPerson)
    .filter((person) => person.id !== null);
  const totalPages = Math.max(0, Number.parseInt(meta.total_pages, 10) || 0);

  res.render('events/people', {
    title: res.locals.t('govuk_alpha.events.people_title'),
    activeNav: 'events',
    event: { id, title: trimmed(event.title) },
    people,
    metrics: meta.metrics && typeof meta.metrics === 'object' ? meta.metrics : {},
    canManageRegistration: meta.capabilities?.manage_registration === true,
    canManageAttendance: meta.capabilities?.manage_attendance === true,
    total: Math.max(0, Number.parseInt(meta.total, 10) || 0),
    query,
    filters: PEOPLE_FILTERS,
    status: trimmed(req.query.status),
    updated: Math.max(0, Number.parseInt(req.query.updated, 10) || 0),
    failed: Math.max(0, Number.parseInt(req.query.failed, 10) || 0),
    idempotencyKey: randomUUID(),
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    previousHref: query.page > 1 ? eventPeoplePath(id, query, query.page - 1) : '',
    nextHref: query.page < totalPages ? eventPeoplePath(id, query, query.page + 1) : ''
  });
}, { notFoundTitle: 'Event not found' }));

router.get('/:id(\\d+)/check-in', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const token = tokenFrom(req);
  const query = {
    page: boundedPositiveInteger(req.query.page, 1),
    per_page: 25,
    search: trimmed(req.query.search, 255),
    attendance_state: selectedValue(req.query.attendance_state, PEOPLE_FILTERS.attendance_state),
    sort: selectedValue(req.query.sort, ['name', 'attendance'], 'name'),
    direction: selectedValue(req.query.direction, ['asc', 'desc'], 'asc')
  };
  const parameters = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]));
  const [eventResult, peopleResult] = await Promise.all([
    callApi(token, 'GET', `/${id}`),
    callApi(token, 'GET', `/${id}/people?${parameters.toString()}`)
  ]);
  const event = eventFrom(eventResult);
  const meta = peopleResult?.meta && typeof peopleResult.meta === 'object' ? peopleResult.meta : {};
  const people = (Array.isArray(peopleResult?.data) ? peopleResult.data : [])
    .map(eventPerson)
    .filter((person) => person.id !== null);
  const totalPages = Math.max(0, Number.parseInt(meta.total_pages, 10) || 0);
  const pathForPage = (page) => {
    const pageQuery = new URLSearchParams();
    Object.entries({ ...query, page }).forEach(([key, value]) => {
      if (value !== '' && key !== 'per_page') pageQuery.set(key, String(value));
    });
    return eventPath(id, `/check-in?${pageQuery.toString()}`);
  };

  res.render('events/check-in', {
    title: res.locals.t('govuk_alpha.events.check_in_title'),
    activeNav: 'events',
    event: { id, title: trimmed(event.title) },
    people,
    metrics: meta.metrics && typeof meta.metrics === 'object' ? meta.metrics : {},
    total: Math.max(0, Number.parseInt(meta.total, 10) || 0),
    query,
    attendanceStates: PEOPLE_FILTERS.attendance_state,
    status: trimmed(req.query.status),
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    previousHref: query.page > 1 ? pathForPage(query.page - 1) : '',
    nextHref: query.page < totalPages ? pathForPage(query.page + 1) : ''
  });
}, { notFoundTitle: 'Event not found' }));

router.get('/:id(\\d+)/recurring-edit', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return redirectTo(res, loginRedirect());

  const id = Number(req.params.id);
  const [eventResult, currentUser] = await Promise.all([
    callApi(token, 'GET', `/${id}`),
    getRequestProfile(req, token)
  ]);
  const event = eventFrom(eventResult);
  const ownerId = eventOwnerId(event);
  const currentUserId = idFrom(currentUser);
  const canEdit = event.can_edit === true || event.canEdit === true;
  if (!canEdit && (ownerId === null || currentUserId === null || ownerId !== currentUserId)) {
    return res.status(403).render('errors/403', { title: 'Forbidden' });
  }
  if (!eventIsSeries(event)) {
    return redirectTo(res, eventPath(id, '/edit'));
  }

  const occurrences = collectionFrom(event.series_occurrences ?? event.seriesOccurrences)
    .map((occurrence) => occurrenceFrom(occurrence, id))
    .filter(Boolean);

  return res.render('events/recurring-edit', {
    title: res.locals.t('govuk_alpha_events.recurring_edit.title'),
    activeNav: 'events',
    event: {
      id,
      title: trimmed(event.title) || res.locals.t('govuk_alpha_events.recurring_edit.caption'),
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
  const [eventResult, pollsResult, currentUser] = await Promise.all([
    callApi(token, 'GET', `/${id}`),
    getPolls(token, { mine: true, limit: 100 }),
    getRequestProfile(req, token)
  ]);
  const event = eventFrom(eventResult);
  const ownerId = eventOwnerId(event);
  const currentUserId = idFrom(currentUser);
  const canEdit = event.can_edit === true || event.canEdit === true;
  if (!canEdit && (ownerId === null || currentUserId === null || ownerId !== currentUserId)) {
    return res.status(403).render('errors/403', { title: 'Forbidden' });
  }
  const polls = collectionFrom(pollsResult)
    .map((poll) => eventPollFrom(poll, id))
    .filter(Boolean);

  res.render('events/polls', {
    title: res.locals.t('govuk_alpha_events.polls.title'),
    activeNav: 'events',
    event: {
      id,
      title: trimmed(event.title) || res.locals.t('govuk_alpha_events.polls.caption')
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
  const translation = req.session && req.session.eventTranslation && req.session.eventTranslation.eventId === id
    ? req.session.eventTranslation
    : null;
  if (translation && req.session) delete req.session.eventTranslation;
  const targetLocale = trimmed(req.query.target_locale || translation?.targetLocale || req.query.locale) || '';

  res.render('events/translate', {
    title: res.locals.t('govuk_alpha_events.translate.title'),
    activeNav: 'events',
    event: {
      id,
      title: trimmed(event.title) || res.locals.t('govuk_alpha_events.translate.caption')
    },
    sourceText,
    translated: translation?.text || null,
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

router.post('/:id(\\d+)/people', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const action = selectedValue(req.body.action, ['approve', 'reject', 'cancel']);
  const userIds = pollIdsFrom(req.body.user_ids).slice(0, 101);
  const reason = trimmed(req.body.reason, 1000);
  const confirmed = checked(req.body.confirmation);
  if (!action || userIds.length === 0 || userIds.length > 100 || !confirmed
    || (['reject', 'cancel'].includes(action) && !reason)) {
    return redirectTo(res, eventPath(id, '/people?status=people-invalid'));
  }

  const requestKey = trimmed(req.body.idempotency_key, 128) || randomUUID();
  const operations = userIds.map((userId) => ({
    user_id: userId,
    action,
    expected_version: Math.max(0, Number.parseInt(req.body[`version_${userId}`], 10) || 0),
    idempotency_key: `accessible-people:${requestKey}:${action}:${userId}`,
    reason: reason || null
  }));

  try {
    const result = dataFrom(await callApi(tokenFrom(req), 'POST', `/${id}/people/bulk`, { operations })) || {};
    const updated = Math.max(0, Number.parseInt(result.succeeded, 10) || 0);
    const failed = Math.max(0, Number.parseInt(result.failed, 10) || 0);
    const status = failed > 0 ? 'people-partial' : 'people-updated';
    return redirectTo(res, eventPath(id, `/people?status=${status}&updated=${updated}&failed=${failed}`));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && [400, 403, 404, 409, 422].includes(error.status)) {
      return redirectTo(res, eventPath(id, '/people?status=people-failed'));
    }
    throw error;
  }
}));

router.post('/:id(\\d+)/check-in/:userId(\\d+)', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const userId = Number(req.params.userId);
  const action = selectedValue(req.body.action, ['check_in', 'check_out', 'no_show', 'undo']);
  const expectedVersion = Number.parseInt(req.body.expected_version, 10);
  const reason = trimmed(req.body.reason, 4000);
  if (!action || !Number.isInteger(expectedVersion) || expectedVersion < 0 || !checked(req.body.confirmation)
    || (action === 'undo' && !reason)) {
    return redirectTo(res, eventPath(id, '/check-in?status=attendance-invalid'));
  }

  try {
    await callApi(tokenFrom(req), 'POST', `/${id}/people/${userId}/attendance`, {
      action,
      expected_version: expectedVersion,
      reason: reason || null,
      idempotency_key: trimmed(req.body.idempotency_key, 191) || randomUUID()
    });
    return redirectTo(res, eventPath(id, '/check-in?status=attendance-updated'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && error.status === 409) {
      return redirectTo(res, eventPath(id, '/check-in?status=attendance-conflict'));
    }
    if (error instanceof ApiError && [400, 403, 404, 422].includes(error.status)) {
      return redirectTo(res, eventPath(id, '/check-in?status=attendance-failed'));
    }
    throw error;
  }
}));

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

router.get('/:id(\\d+)/check-in/credential', requireAuth, asyncRoute(async (req, res) => {
  return renderOfflineCredential(req, res, Number(req.params.id));
}, { notFoundTitle: 'Event not found' }));

router.post('/:id(\\d+)/check-in/credential/issue', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const idempotencyKey = trimmed(req.body.idempotency_key, 191);
  if (!checked(req.body.confirmation) || idempotencyKey.length < 8) {
    return redirectTo(res, eventPath(id, '/check-in/credential?status=invalid'));
  }
  try {
    const result = await callApi(tokenFrom(req), 'POST', `/${id}/offline-checkin/credentials`, {
      idempotency_key: idempotencyKey
    });
    const credential = offlineCredentialFrom(result);
    return renderOfflineCredential(req, res, id, {
      credentialResult: result,
      status: credential?.tokenOneShot ? 'issued' : 'already-active'
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && [400, 403, 404, 409, 422].includes(error.status)) {
      return redirectTo(res, eventPath(id, '/check-in/credential?status=failed'));
    }
    throw error;
  }
}));

router.get('/:id(\\d+)/safety', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const token = tokenFrom(req);
  const [eventResult, safetyResult] = await Promise.all([
    callApi(token, 'GET', `/${id}`),
    callApi(token, 'GET', `/${id}/safety`)
  ]);
  const event = eventFrom(eventResult);
  const safety = dataFrom(safetyResult) || {};
  const canReview = safety.permissions?.review_participation === true;
  let reviews = { items: [], total: 0, page: 1, per_page: 25 };
  let people = [];
  if (canReview) {
    const page = boundedPositiveInteger(req.query.page, 1);
    const [reviewsResult, peopleResult] = await Promise.all([
      callApi(token, 'GET', `/${id}/safety/reviews?page=${page}&per_page=25`),
      callApi(token, 'GET', `/${id}/people?page=1&per_page=100&sort=name&direction=asc`)
    ]);
    reviews = dataFrom(reviewsResult) || reviews;
    people = (Array.isArray(peopleResult?.data) ? peopleResult.data : [])
      .map(eventPerson)
      .filter((person) => person.id !== null);
  }
  res.set('Cache-Control', 'private, no-store');
  res.set('Pragma', 'no-cache');
  return res.render('events/safety', {
    title: res.locals.t('event_safety.govuk.title'),
    activeNav: 'events',
    event: { id, title: trimmed(event.title) },
    safety,
    reviews,
    people,
    status: trimmed(req.query.status),
    today: new Date().toISOString().slice(0, 10),
    idempotencyKey: randomUUID(),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Event not found' }));

router.post('/:id(\\d+)/safety', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const action = selectedValue(req.body.action, [
    'save_requirements', 'publish_requirements', 'archive_requirements',
    'acknowledge_code', 'withdraw_code', 'request_guardian_consent',
    'withdraw_guardian_consent', 'record_review', 'withdraw_review'
  ]);
  const idempotencyKey = trimmed(req.body.idempotency_key, 191);
  const destructive = ['archive_requirements', 'withdraw_code', 'withdraw_guardian_consent', 'withdraw_review'].includes(action);
  if (!action || idempotencyKey.length < 8 || (destructive && !checked(req.body.confirm_destructive))) {
    return redirectTo(res, eventPath(id, '/safety?status=safety-failed'));
  }

  let method = 'POST';
  let path;
  let payload = {};
  const expectedRevision = req.body.expected_revision === '' ? null : Number.parseInt(req.body.expected_revision, 10);
  const expectedVersion = Number.parseInt(req.body.expected_version, 10);
  if (action === 'save_requirements') {
    method = 'PUT';
    path = `/${id}/safety/requirements`;
    payload = {
      minimum_age: req.body.minimum_age === '' ? null : Number.parseInt(req.body.minimum_age, 10),
      guardian_consent_required: checked(req.body.guardian_consent_required),
      minor_age_threshold: req.body.minor_age_threshold === '' ? null : Number.parseInt(req.body.minor_age_threshold, 10),
      code_of_conduct_required: checked(req.body.code_of_conduct_required),
      code_of_conduct_text: trimmed(req.body.code_of_conduct_text, 20000),
      code_of_conduct_text_version: trimmed(req.body.code_of_conduct_text_version, 191),
      expected_revision: expectedRevision
    };
  } else if (action === 'publish_requirements' || action === 'archive_requirements') {
    path = `/${id}/safety/requirements/${action === 'publish_requirements' ? 'publish' : 'archive'}`;
    payload = { expected_revision: expectedRevision, expected_version: expectedVersion };
  } else if (action === 'acknowledge_code') {
    path = `/${id}/safety/code-of-conduct/acknowledgements`;
    payload = { text_version: trimmed(req.body.text_version, 191), text_hash: trimmed(req.body.text_hash, 191) };
  } else if (action === 'withdraw_code') {
    method = 'DELETE';
    path = `/${id}/safety/code-of-conduct/acknowledgements/${positiveInteger(req.body.acknowledgement_id) || 0}`;
  } else if (action === 'request_guardian_consent') {
    path = `/${id}/safety/guardian-consents`;
    payload = {
      guardian_name: trimmed(req.body.guardian_name, 160),
      guardian_email: trimmed(req.body.guardian_email, 320),
      relationship_code: selectedValue(req.body.relationship_code, ['parent', 'guardian', 'legal_guardian', 'carer']),
      preferred_language: req.locale || 'en'
    };
  } else if (action === 'withdraw_guardian_consent') {
    method = 'DELETE';
    path = `/${id}/safety/guardian-consents/${positiveInteger(req.body.consent_id) || 0}`;
  } else if (action === 'record_review') {
    path = `/${id}/safety/reviews`;
    payload = {
      user_id: positiveInteger(req.body.user_id),
      decision: selectedValue(req.body.decision, ['deny', 'remove']),
      reason_code: selectedValue(req.body.reason_code, ['safeguarding_policy', 'minimum_age', 'guardian_consent', 'code_of_conduct', 'conduct_violation', 'safety_review', 'user_block']),
      effective_from: trimmed(req.body.effective_from),
      effective_until: trimmed(req.body.effective_until) || null,
      expected_version: req.body.expected_version === '' ? null : Number.parseInt(req.body.expected_version, 10)
    };
  } else {
    method = 'DELETE';
    path = `/${id}/safety/reviews/${positiveInteger(req.body.denial_id) || 0}`;
    payload = { expected_version: expectedVersion };
  }

  const invalidNumber = [payload.minimum_age, payload.minor_age_threshold, payload.expected_revision, payload.expected_version]
    .some((value) => value !== undefined && value !== null && (!Number.isInteger(value) || value < 0));
  const invalidPayload = invalidNumber
    || (action === 'request_guardian_consent' && (!payload.guardian_name || !payload.guardian_email || !payload.relationship_code))
    || (action === 'record_review' && (!payload.user_id || !payload.decision || !payload.reason_code || !payload.effective_from));
  if (invalidPayload || path.includes('/0')) {
    return redirectTo(res, eventPath(id, '/safety?status=safety-failed'));
  }
  try {
    await callEventMutation(tokenFrom(req), method, path, payload, idempotencyKey);
    return redirectTo(res, eventPath(id, '/safety?status=safety-updated'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && [400, 403, 404, 409, 422, 429].includes(error.status)) {
      return redirectTo(res, eventPath(id, '/safety?status=safety-failed'));
    }
    throw error;
  }
}));

router.get('/:id(\\d+)/agenda', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const token = tokenFrom(req);
  const [eventResult, agendaResult] = await Promise.all([
    callApi(token, 'GET', `/${id}`),
    callApi(token, 'GET', `/${id}/agenda?include_cancelled=true`)
  ]);
  const event = eventFrom(eventResult);
  const agenda = dataFrom(agendaResult) || {};
  const sessions = (Array.isArray(agenda.sessions) ? agenda.sessions : []).map((session) => ({
    ...session,
    start_at_local: trimmed(session.start_at).slice(0, 16),
    end_at_local: trimmed(session.end_at).slice(0, 16)
  }));
  agenda.sessions = sessions;
  res.set('Cache-Control', 'private, no-store');
  res.set('Pragma', 'no-cache');
  return res.render('events/agenda', {
    title: res.locals.t('govuk_alpha.events.agenda.title'),
    activeNav: 'events',
    event: { id, title: trimmed(event.title) },
    agenda,
    scheduledSessions: sessions.filter((session) => session.status === 'scheduled'),
    cancelledSessions: sessions.filter((session) => session.status === 'cancelled'),
    status: trimmed(req.query.status),
    idempotencyKey: randomUUID(),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Event not found' }));

router.post('/:id(\\d+)/agenda', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const action = selectedValue(req.body.action, ['create', 'update', 'cancel', 'move_up', 'move_down', 'register', 'withdraw']);
  const idempotencyKey = trimmed(req.body.idempotency_key, 191);
  const sessionId = positiveInteger(req.body.session_id);
  if (!action || idempotencyKey.length < 8 || (action !== 'create' && sessionId === null)
    || (action === 'withdraw' && !checked(req.body.confirm_destructive))) {
    return redirectTo(res, eventPath(id, '/agenda?status=agenda-failed'));
  }
  let method = 'POST';
  let path = `/${id}/agenda/sessions`;
  let payload = {};
  if (action === 'create' || action === 'update') {
    payload = agendaSessionPayload(req.body);
    if (!payload.title || !payload.start_at || !payload.end_at || (req.body.capacity !== '' && payload.capacity === null)) {
      return redirectTo(res, eventPath(id, '/agenda?status=agenda-failed'));
    }
    if (action === 'update') {
      method = 'PUT';
      path = `/${id}/agenda/sessions/${sessionId}`;
      payload.expected_version = positiveInteger(req.body.expected_version);
      if (payload.expected_version === null) return redirectTo(res, eventPath(id, '/agenda?status=agenda-failed'));
    }
  } else if (action === 'cancel') {
    path = `/${id}/agenda/sessions/${sessionId}/cancel`;
    payload = { expected_version: positiveInteger(req.body.expected_version), reason: trimmed(req.body.reason, 500) };
    if (payload.expected_version === null || !payload.reason) return redirectTo(res, eventPath(id, '/agenda?status=agenda-failed'));
  } else if (action === 'register' || action === 'withdraw') {
    path = `/${id}/agenda/sessions/${sessionId}/registration${action === 'withdraw' ? '/withdraw' : ''}`;
    payload = { expected_version: Math.max(0, Number.parseInt(req.body.expected_version, 10) || 0) };
  } else {
    method = 'PUT';
    path = `/${id}/agenda/order`;
    const ordered = arrayValues(req.body.ordered_session_ids).map(positiveInteger).filter(Boolean);
    const currentIndex = ordered.indexOf(sessionId);
    const swapIndex = action === 'move_up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || swapIndex < 0 || swapIndex >= ordered.length) {
      return redirectTo(res, eventPath(id, '/agenda?status=agenda-failed'));
    }
    [ordered[currentIndex], ordered[swapIndex]] = [ordered[swapIndex], ordered[currentIndex]];
    payload = {
      expected_agenda_version: Math.max(0, Number.parseInt(req.body.expected_agenda_version, 10) || 0),
      ordered_session_ids: ordered
    };
  }
  try {
    await callEventMutation(tokenFrom(req), method, path, payload, idempotencyKey);
    const status = {
      create: 'agenda-created', update: 'agenda-updated', cancel: 'agenda-cancelled',
      move_up: 'agenda-reordered', move_down: 'agenda-reordered', register: 'agenda-session-registered', withdraw: 'agenda-session-withdrawn'
    }[action];
    return redirectTo(res, eventPath(id, `/agenda?status=${status}`));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && [400, 403, 404, 409, 422, 429].includes(error.status)) {
      return redirectTo(res, eventPath(id, '/agenda?status=agenda-failed'));
    }
    throw error;
  }
}));

router.get('/:id(\\d+)/reminders', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const token = tokenFrom(req);
  const [eventResult, preferencesResult] = await Promise.all([
    callApi(token, 'GET', `/${id}`),
    callApi(token, 'GET', `/${id}/reminders`)
  ]);
  const event = eventFrom(eventResult);
  const preferences = dataFrom(preferencesResult) || {};
  const resolved = preferences.resolved || {};
  const overrides = preferences.overrides || {};
  const selectedOffsets = (Array.isArray(preferences.rules) ? preferences.rules : [])
    .map((rule) => positiveInteger(rule.offset_minutes))
    .filter(Boolean);
  const limits = preferences.limits || {};
  res.set('Cache-Control', 'private, no-store');
  return res.render('events/reminders', {
    title: res.locals.t('govuk_alpha_events.reminders.title'),
    activeNav: 'events',
    event: { id, title: trimmed(event.title) },
    preferences,
    limits: {
      minimum: positiveInteger(limits.minimum_offset_minutes) || 5,
      maximum: positiveInteger(limits.maximum_offset_minutes) || 525600,
      maximumRules: positiveInteger(limits.maximum_rules) || 10
    },
    selectedOffsets: selectedOffsets.length ? selectedOffsets : (limits.default_offsets_minutes || [1440, 60]),
    enabled: overrides.reminders_enabled ?? resolved.reminders_enabled ?? false,
    channels: { ...(resolved.channels || {}), email: overrides.email_enabled ?? resolved.channels?.email, in_app: overrides.in_app_enabled ?? resolved.channels?.in_app, web_push: overrides.web_push_enabled ?? resolved.channels?.web_push, fcm: overrides.fcm_enabled ?? resolved.channels?.fcm, realtime: overrides.realtime_enabled ?? resolved.channels?.realtime },
    source: selectedValue(resolved.reminders_source, ['event', 'category', 'global', 'tenant'], 'unavailable'),
    status: trimmed(req.query.status),
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Event not found' }));

router.post('/:id(\\d+)/reminders', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const expectedRevision = Math.max(0, Number.parseInt(req.body.expected_revision, 10) || 0);
  const offsets = arrayValues(req.body.offsets).concat(trimmed(req.body.custom_offset) || [])
    .map(positiveInteger).filter(Boolean);
  const uniqueOffsets = [...new Set(offsets)].sort((left, right) => right - left);
  const enabled = checked(req.body.reminders_enabled);
  if ((enabled && uniqueOffsets.length === 0) || uniqueOffsets.length > 10 || uniqueOffsets.some((offset) => offset < 5 || offset > 525600)) {
    return redirectTo(res, eventPath(id, '/reminders?status=invalid'));
  }
  try {
    await callApi(tokenFrom(req), 'PUT', `/${id}/reminders`, {
      overrides: {
        reminders_enabled: enabled,
        cadence: enabled ? 'instant' : 'off',
        email_enabled: checked(req.body.channel_email),
        in_app_enabled: checked(req.body.channel_in_app),
        web_push_enabled: checked(req.body.channel_web_push),
        fcm_enabled: checked(req.body.channel_fcm),
        realtime_enabled: checked(req.body.channel_realtime)
      },
      rules: uniqueOffsets.map((offset) => ({ offset_minutes: offset, enabled: true, email_enabled: null, in_app_enabled: null, web_push_enabled: null, fcm_enabled: null, realtime_enabled: null })),
      expected_revision: expectedRevision
    });
    return redirectTo(res, eventPath(id, '/reminders?status=saved'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && error.status === 409) return redirectTo(res, eventPath(id, '/reminders?status=conflict'));
    if (error instanceof ApiError && [400, 403, 404, 422, 429].includes(error.status)) return redirectTo(res, eventPath(id, '/reminders?status=failed'));
    throw error;
  }
}));

router.post('/:id(\\d+)/reminders/reset', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const expectedRevision = Number.parseInt(req.body.expected_revision, 10);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) return redirectTo(res, eventPath(id, '/reminders?status=invalid'));
  try {
    await callApi(tokenFrom(req), 'DELETE', `/${id}/reminders`, { expected_revision: expectedRevision });
    return redirectTo(res, eventPath(id, '/reminders?status=reset'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && error.status === 409) return redirectTo(res, eventPath(id, '/reminders?status=conflict'));
    if (error instanceof ApiError && [400, 403, 404, 422, 429].includes(error.status)) return redirectTo(res, eventPath(id, '/reminders?status=failed'));
    throw error;
  }
}));

const COMMUNICATION_VARIANTS = ['announcement', 'follow_up', 'review_request'];
const COMMUNICATION_SEGMENTS = ['registration_confirmed', 'waitlist_active', 'attendance_attended', 'attendance_no_show'];
const COMMUNICATION_CHANNELS = ['email', 'in_app', 'push'];

function communicationDraft(body = {}) {
  const variant = selectedValue(body.variant, COMMUNICATION_VARIANTS);
  const segments = [...new Set(arrayValues(body.segments).map((value) => trimmed(value)).filter((value) => COMMUNICATION_SEGMENTS.includes(value)))];
  const channels = [...new Set(arrayValues(body.channels).map((value) => trimmed(value)).filter((value) => COMMUNICATION_CHANNELS.includes(value)))];
  const message = trimmed(body.body, 20001);
  if (!variant || segments.length === 0 || channels.length === 0 || !message || message.length > 20000) return null;
  return { variant, segments, channels, body: message };
}

async function renderCommunications(req, res, options = {}) {
  const id = Number(req.params.id);
  const token = tokenFrom(req);
  const page = boundedPositiveInteger(req.query.page, 1);
  const historyPage = boundedPositiveInteger(req.query.history_page, 1);
  const broadcastId = positiveInteger(req.query.broadcast_id);
  const [eventResult, listResult, detailResult] = await Promise.all([
    callApi(token, 'GET', `/${id}`),
    callApi(token, 'GET', `/${id}/broadcasts?page=${page}&per_page=20`),
    broadcastId ? callApi(token, 'GET', `/event-broadcasts/${broadcastId}?history_page=${historyPage}&history_per_page=50`) : null
  ]);
  const event = eventFrom(eventResult);
  const listData = dataFrom(listResult) || {};
  const detail = detailResult ? dataFrom(detailResult) : null;
  if (detail?.broadcast && positiveInteger(detail.broadcast.event_id) !== id) {
    return res.status(404).render('errors/404', { title: 'Broadcast not found' });
  }
  res.set('Cache-Control', 'private, no-store');
  res.set('Pragma', 'no-cache');
  return res.render('events/communications', {
    title: res.locals.t('govuk_alpha_events.communications.title'), activeNav: 'events',
    event: { id, title: trimmed(event.title) }, broadcasts: collectionFrom(listResult),
    pagination: listData.meta || listData.pagination || { current_page: page, total: collectionFrom(listResult).length, per_page: 20 },
    detail, preview: options.preview || null,
    draft: options.draft || { variant: 'announcement', segments: ['registration_confirmed'], channels: ['email', 'in_app'], body: '' },
    status: options.status ?? trimmed(req.query.status), idempotencyKey: randomUUID(), csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}

router.get('/:id(\\d+)/communications', requireAuth, asyncRoute(async (req, res) => renderCommunications(req, res), { notFoundTitle: 'Event not found' }));

router.post('/:id(\\d+)/communications/preview', requireAuth, asyncRoute(async (req, res) => {
  const draft = communicationDraft(req.body);
  if (!draft) return redirectTo(res, eventPath(Number(req.params.id), '/communications?status=invalid'));
  try {
    const result = await callApi(tokenFrom(req), 'POST', `/${Number(req.params.id)}/broadcasts/preview`, {
      variant: draft.variant, segments: draft.segments, channels: draft.channels
    });
    return renderCommunications(req, res, { draft, preview: dataFrom(result) });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && [400, 403, 404, 409, 422, 429, 503].includes(error.status)) return redirectTo(res, eventPath(Number(req.params.id), '/communications?status=failed'));
    throw error;
  }
}));

router.post('/:id(\\d+)/communications', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const draft = communicationDraft(req.body);
  const key = trimmed(req.body.idempotency_key, 191);
  if (!draft || !checked(req.body.preview_confirmed) || !key) return redirectTo(res, eventPath(id, '/communications?status=invalid'));
  try {
    await callEventMutation(tokenFrom(req), 'POST', `/${id}/broadcasts`, draft, key);
    return redirectTo(res, eventPath(id, '/communications?status=created'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && [400, 403, 404, 409, 422, 429, 503].includes(error.status)) return redirectTo(res, eventPath(id, '/communications?status=failed'));
    throw error;
  }
}));

async function mutateCommunication(req, res, action) {
  const id = Number(req.params.id);
  const broadcastId = positiveInteger(req.params.broadcastId);
  const expectedVersion = positiveInteger(req.body.expected_version);
  const key = trimmed(req.body.idempotency_key, 191);
  const payload = { expected_version: expectedVersion };
  if (action === 'schedule') payload.scheduled_at = trimmed(req.body.scheduled_at) || null;
  if (action === 'cancel') payload.reason = trimmed(req.body.reason, 501);
  if (!broadcastId || !expectedVersion || !key || (action === 'cancel' && (!payload.reason || payload.reason.length > 500))) {
    return redirectTo(res, eventPath(id, '/communications?status=invalid'));
  }
  try {
    await callEventMutation(tokenFrom(req), 'POST', `/event-broadcasts/${broadcastId}/${action}`, payload, key);
    const success = { schedule: 'scheduled', cancel: 'cancelled', retry: 'retried' }[action];
    return redirectTo(res, eventPath(id, `/communications?status=${success}`));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && [400, 403, 404, 409, 422, 429, 503].includes(error.status)) return redirectTo(res, eventPath(id, '/communications?status=failed'));
    throw error;
  }
}

router.post('/:id(\\d+)/communications/:broadcastId(\\d+)/schedule', requireAuth, asyncRoute(async (req, res) => mutateCommunication(req, res, 'schedule')));
router.post('/:id(\\d+)/communications/:broadcastId(\\d+)/cancel', requireAuth, asyncRoute(async (req, res) => mutateCommunication(req, res, 'cancel')));
router.post('/:id(\\d+)/communications/:broadcastId(\\d+)/retry', requireAuth, asyncRoute(async (req, res) => mutateCommunication(req, res, 'retry')));

async function ticketCatalogue(token, eventId) {
  const result = await callApi(token, 'GET', `/${eventId}/tickets`);
  const data = dataFrom(result) || {};
  return data.catalogue || data;
}

router.get('/:id(\\d+)/tickets', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const token = tokenFrom(req);
  const [eventResult, catalogue] = await Promise.all([callApi(token, 'GET', `/${id}`), ticketCatalogue(token, id)]);
  const event = eventFrom(eventResult);
  res.set('Cache-Control', 'private, no-store');
  res.set('Pragma', 'no-cache');
  return res.render('events/tickets', {
    title: res.locals.t('event_tickets.title'), activeNav: 'events', event: { id, title: trimmed(event.title) },
    catalogue, ticketNames: Object.fromEntries(collectionFrom({ data: catalogue.ticket_types || [] }).map((ticket) => [ticket.id, ticket])),
    status: trimmed(req.query.status), idempotencyKey: randomUUID(), csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Event not found' }));

router.post('/:id(\\d+)/tickets/:ticketTypeId(\\d+)/allocate', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const ticketTypeId = positiveInteger(req.params.ticketTypeId);
  const units = positiveInteger(req.body.units);
  const key = trimmed(req.body.idempotency_key, 512);
  if (!ticketTypeId || !units || units > 1000 || !key) return redirectTo(res, eventPath(id, '/tickets?status=invalid'));
  try {
    await callEventMutation(tokenFrom(req), 'POST', `/${id}/tickets/${ticketTypeId}/allocate`, { units }, key);
    return redirectTo(res, eventPath(id, '/tickets?status=allocated'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && [400, 403, 404, 409, 422, 429, 503].includes(error.status)) return redirectTo(res, eventPath(id, '/tickets?status=allocate-failed'));
    throw error;
  }
}));

router.get('/:id(\\d+)/tickets/entitlements/:entitlementId(\\d+)/cancel', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const entitlementId = positiveInteger(req.params.entitlementId);
  const catalogue = await ticketCatalogue(tokenFrom(req), id);
  const entitlement = arrayValues(catalogue.own_entitlements).find((item) => positiveInteger(item?.id) === entitlementId);
  const ticket = arrayValues(catalogue.ticket_types).find((item) => positiveInteger(item?.id) === positiveInteger(entitlement?.ticket_type_id));
  if (!entitlement || !ticket || entitlement.kind !== 'free') return res.status(404).render('errors/404', { title: 'Ticket not found' });
  res.set('Cache-Control', 'private, no-store');
  res.set('Pragma', 'no-cache');
  return res.render('events/ticket-cancel', {
    title: res.locals.t('event_tickets.cancel_title'), activeNav: 'events', eventId: id, entitlement, ticket,
    status: trimmed(req.query.status), idempotencyKey: randomUUID(), csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Ticket not found' }));

router.post('/:id(\\d+)/tickets/entitlements/:entitlementId(\\d+)/cancel', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const entitlementId = positiveInteger(req.params.entitlementId);
  const expectedVersion = positiveInteger(req.body.expected_version);
  const key = trimmed(req.body.idempotency_key, 512);
  const reason = trimmed(req.body.reason, 501);
  if (!entitlementId || !expectedVersion || !key || !reason || reason.length > 500) return redirectTo(res, eventPath(id, `/tickets/entitlements/${entitlementId || 0}/cancel?status=invalid`));
  try {
    await callEventMutation(tokenFrom(req), 'POST', `/${id}/ticket-entitlements/${entitlementId}/cancel`, { expected_version: expectedVersion, reason }, key);
    return redirectTo(res, eventPath(id, '/tickets?status=cancelled'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && [400, 403, 404, 409, 422, 429, 503].includes(error.status)) return redirectTo(res, eventPath(id, `/tickets/entitlements/${entitlementId}/cancel?status=failed`));
    throw error;
  }
}));

router.get('/:id(\\d+)/analytics', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const result = await callApi(tokenFrom(req), 'GET', `/${id}/analytics`);
  const summary = dataFrom(result) || {};
  const value = (input) => input && typeof input === 'object'
    ? (input.suppressed ? 'suppressed' : (input.basis_points === null || input.basis_points === undefined ? (input.value ?? 0) : `${(Number(input.basis_points) / 100).toFixed(1)}%`))
    : (input ?? 0);
  const sections = {
    registration: [['confirmed', value(summary.registration?.confirmed)], ['pending', value(summary.registration?.pending)], ['cancelled', value(summary.registration?.cancelled)], ['capacity_remaining', summary.registration?.remaining ?? 'not_limited']],
    acquisition: [['invitations_issued', value(summary.invitation?.issued)], ['invitations_accepted', value(summary.invitation?.accepted)], ['invitation_conversion', value(summary.invitation?.conversion)], ['waitlist_joined', value(summary.waitlist?.joined)], ['waitlist_accepted', value(summary.waitlist?.accepted)], ['waitlist_conversion', value(summary.waitlist?.conversion)]],
    attendance: [['checked_in', value(summary.attendance?.checked_in)], ['attended', value(summary.attendance?.attended)], ['no_show', value(summary.attendance?.no_show)], ['attendance_rate', value(summary.attendance?.attendance_rate)]],
    communications: [['delivered', value(summary.communications?.delivered)], ['suppressed_deliveries', value(summary.communications?.suppressed)], ['failed_deliveries', value(summary.communications?.failed)], ['dead_lettered', value(summary.communications?.dead_lettered)], ['delivery_rate', value(summary.communications?.delivery_rate)]],
    funnel: [['event_views', value(summary.optional_funnel?.event_views)], ['registration_starts', value(summary.optional_funnel?.registration_starts)], ['start_conversion', value(summary.optional_funnel?.start_to_registration_conversion)], ['guardian_consents', value(summary.safeguarding?.guardian_consents)]],
    finance: summary.tickets?.redacted ? [['finance', 'finance_redacted']] : [['ticket_units', value(summary.tickets?.confirmed_units)], ['ticket_credit_value', value(summary.tickets?.confirmed_credit_value)], ['completed_credit_claims', value(summary.credits?.completed_claims)], ['failed_credit_claims', value(summary.credits?.failed_claims)]]
  };
  res.set('Cache-Control', 'private, no-store');
  res.set('Pragma', 'no-cache');
  return res.render('events/analytics', {
    title: res.locals.t('govuk_alpha_events.analytics.title'), activeNav: 'events', eventId: id, summary, sections
  });
}, { notFoundTitle: 'Event not found' }));

router.get('/:id(\\d+)/analytics/export.csv', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const download = await downloadEventApi(tokenFrom(req), `/${id}/analytics/export.csv`);
  res.status(download.status || 200);
  res.set('Content-Type', download.headers['content-type'] || 'text/csv; charset=UTF-8');
  res.set('Content-Disposition', download.headers['content-disposition'] || `attachment; filename="event-${id}-analytics.csv"`);
  res.set('Cache-Control', 'private, no-store');
  res.set('Pragma', 'no-cache');
  res.set('X-Content-Type-Options', 'nosniff');
  return res.send(download.body);
}));

function calendarSensitive(res) {
  res.set('Cache-Control', 'private, no-store, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('X-Robots-Tag', 'noindex, nofollow');
}

router.get('/:id(\\d+)/calendar', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const token = tokenFrom(req);
  const [eventResult, actionsResult] = await Promise.all([callApi(token, 'GET', `/${id}`), callApi(token, 'GET', `/${id}/calendar-actions`)]);
  return res.render('events/calendar', {
    title: res.locals.t('govuk_alpha_events.calendar_actions_title'), activeNav: 'events',
    event: { id, title: trimmed(eventFrom(eventResult).title) }, actions: dataFrom(actionsResult) || {}
  });
}, { notFoundTitle: 'Event not found' }));

async function streamCalendar(req, res, path, fallbackName) {
  const download = await downloadEventApi(tokenFrom(req), path);
  res.status(download.status || 200);
  res.set('Content-Type', download.headers['content-type'] || 'text/calendar; charset=utf-8');
  res.set('Content-Disposition', download.headers['content-disposition'] || `attachment; filename="${fallbackName}"`);
  calendarSensitive(res);
  res.set('X-Content-Type-Options', 'nosniff');
  return res.send(download.body);
}

router.get('/:id(\\d+)/calendar.ics', requireAuth, asyncRoute(async (req, res) => streamCalendar(req, res, `/${Number(req.params.id)}/calendar.ics`, `event-${Number(req.params.id)}.ics`)));
router.get('/calendar.ics', requireAuth, asyncRoute(async (req, res) => streamCalendar(req, res, '/calendar/feed.ics', 'events.ics')));

async function calendarTokens(token) {
  return collectionFrom(await callApi(token, 'GET', '/calendar/feed-tokens'));
}

router.get('/calendar-subscriptions', requireAuth, asyncRoute(async (req, res) => {
  calendarSensitive(res);
  return res.render('events/calendar-subscriptions', {
    title: res.locals.t('govuk_alpha_events.calendar_subscriptions_title'), activeNav: 'events',
    tokens: await calendarTokens(tokenFrom(req)), createdFeedUrl: '', status: trimmed(req.query.status), label: '', csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.post('/calendar-subscriptions', requireAuth, asyncRoute(async (req, res) => {
  const label = trimmed(req.body.label, 101);
  const hasControlCharacters = [...label].some((character) => character.codePointAt(0) <= 31 || character.codePointAt(0) === 127);
  if (label.length > 100 || hasControlCharacters) return redirectTo(res, '/events/calendar-subscriptions?status=invalid');
  try {
    const result = await callApi(tokenFrom(req), 'POST', '/calendar/feed-tokens', { label: label || null });
    const created = dataFrom(result) || {};
    calendarSensitive(res);
    return res.status(201).render('events/calendar-subscriptions', {
      title: res.locals.t('govuk_alpha_events.calendar_subscriptions_title'), activeNav: 'events',
      tokens: await calendarTokens(tokenFrom(req)), createdFeedUrl: trimmed(created.feed_url, 4096), status: 'created', label: '', csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && [400, 409, 422, 429].includes(error.status)) return redirectTo(res, '/events/calendar-subscriptions?status=failed');
    throw error;
  }
}));

router.get('/calendar-subscriptions/:tokenId(\\d+)/revoke', requireAuth, asyncRoute(async (req, res) => {
  const tokenId = positiveInteger(req.params.tokenId);
  const token = (await calendarTokens(tokenFrom(req))).find((item) => positiveInteger(item?.id) === tokenId && checked(item?.active));
  if (!token) return res.status(404).render('errors/404', { title: 'Calendar subscription not found' });
  calendarSensitive(res);
  return res.render('events/calendar-subscription-revoke', {
    title: res.locals.t('govuk_alpha_events.calendar_subscription_revoke_title'), activeNav: 'events', token,
    status: trimmed(req.query.status), csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.post('/calendar-subscriptions/:tokenId(\\d+)/revoke', requireAuth, asyncRoute(async (req, res) => {
  const tokenId = positiveInteger(req.params.tokenId);
  if (!tokenId || req.body.confirm_revoke !== 'yes') return redirectTo(res, `/events/calendar-subscriptions/${tokenId || 0}/revoke?status=invalid`);
  try {
    await callApi(tokenFrom(req), 'DELETE', `/calendar/feed-tokens/${tokenId}`);
    calendarSensitive(res);
    return redirectTo(res, '/events/calendar-subscriptions?status=revoked');
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && [400, 403, 404, 409, 422, 429].includes(error.status)) return redirectTo(res, `/events/calendar-subscriptions/${tokenId}/revoke?status=failed`);
    throw error;
  }
}));

router.post('/:id(\\d+)/check-in/credential/rotate', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const credentialId = positiveInteger(req.body.credential_id);
  const expectedVersion = positiveInteger(req.body.expected_version);
  const idempotencyKey = trimmed(req.body.idempotency_key, 191);
  if (!checked(req.body.confirmation) || credentialId === null || expectedVersion === null || idempotencyKey.length < 8) {
    return redirectTo(res, eventPath(id, '/check-in/credential?status=invalid'));
  }
  try {
    const result = await callApi(tokenFrom(req), 'POST', `/${id}/offline-checkin/credentials/${credentialId}/rotate`, {
      expected_version: expectedVersion,
      idempotency_key: idempotencyKey
    });
    const credential = offlineCredentialFrom(result);
    return renderOfflineCredential(req, res, id, {
      credentialResult: result,
      status: credential?.tokenOneShot ? 'replaced' : 'already-active'
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && [400, 403, 404, 409, 422].includes(error.status)) {
      return redirectTo(res, eventPath(id, '/check-in/credential?status=failed'));
    }
    throw error;
  }
}));

router.post('/:id(\\d+)/check-in/credential/revoke', requireAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const credentialId = positiveInteger(req.body.credential_id);
  const expectedVersion = positiveInteger(req.body.expected_version);
  const reason = trimmed(req.body.reason, 501);
  if (!checked(req.body.confirmation) || credentialId === null || expectedVersion === null || !reason || reason.length > 500) {
    return redirectTo(res, eventPath(id, '/check-in/credential?status=invalid'));
  }
  try {
    await callApi(tokenFrom(req), 'POST', `/${id}/offline-checkin/credentials/${credentialId}/revoke`, {
      expected_version: expectedVersion,
      reason
    });
    return redirectTo(res, eventPath(id, '/check-in/credential?status=revoked'));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    if (error instanceof ApiError && [400, 403, 404, 409, 422].includes(error.status)) {
      return redirectTo(res, eventPath(id, '/check-in/credential?status=failed'));
    }
    throw error;
  }
}));

router.post('/:id(\\d+)/waitlist/accept', asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const token = trimmed(req.body.token, 513);
  if (token.length > 512) {
    return redirectTo(res, eventRedirect(id, 'waitlist-offer-accept-failed'));
  }
  const payload = {
    idempotency_key: trimmed(req.body.idempotency_key, 191) || randomUUID()
  };
  if (token) payload.token = token;
  return runEventAction(
    req,
    res,
    'POST',
    `/${id}/registration/waitlist/accept`,
    payload,
    eventRedirect(id, 'waitlist-offer-accepted'),
    eventRedirect(id, 'waitlist-offer-accept-failed')
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
    const result = await callUgcTranslateApi(token, payload);
    const translated = trimmed(result?.data?.translated_text || result?.translated_text, 10000);
    if (translated === '') {
      return redirectTo(res, eventPath(id, '/translate?status=translate-unavailable'));
    }
    if (translated === sourceText) {
      return redirectTo(res, eventPath(id, '/translate?status=translate-same'));
    }
    if (req.session) {
      req.session.eventTranslation = {
        eventId: id,
        text: translated,
        targetLocale: payload.target_locale
      };
    }
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
  const categoryId = positiveInteger(req.query.category_id);
  const when = ['upcoming', 'past', 'all'].includes(req.query.when)
    ? req.query.when
    : (req.query.upcoming_only === 'false' ? 'all' : 'upcoming');
  const near = ['any', '5', '10', '25', '50'].includes(String(req.query.near))
    ? String(req.query.near)
    : 'any';
  const upcomingOnly = when === 'upcoming';
  const hasFilters = Boolean(searchQuery || categoryId || when !== 'upcoming' || near !== 'any');
  let nearNoLocation = false;
  let nearFilters = {};

  if (near !== 'any' && token) {
    const profile = await getRequestProfile(req, token).catch((error) => {
      if (isAuthError(error)) throw error;
      return null;
    });
    const latitude = Number(profile?.latitude ?? profile?.location?.latitude);
    const longitude = Number(profile?.longitude ?? profile?.location?.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      nearFilters = { near_lat: latitude, near_lng: longitude, radius_km: Number(near) };
    } else {
      nearNoLocation = true;
    }
  }

  const [result, categoriesResult] = await Promise.all([
    getEvents(token, {
      per_page: limit,
      cursor: trimmed(req.query.cursor) || undefined,
      q: searchQuery,
      category_id: categoryId,
      when,
      ...nearFilters
    }).catch((error) => {
      if (!token && isAuthError(error)) {
        return { data: [], meta: { has_more: false, cursor: null }, loadError: true };
      }
      throw error;
    }),
    getEventCategories(token).catch((error) => {
      if (isAuthError(error)) throw error;
      return { data: [] };
    })
  ]);

  const events = collectionFrom(result).map(eventWithAssetUrls);
  const categories = collectionFrom(categoriesResult);
  const meta = result?.meta || {};
  const loadError = result?.loadError === true;

  res.render('events/index', {
    title: 'Events',
    events,
    loadError,
    categories,
    searchQuery,
    categoryId,
    hasFilters,
    upcomingOnly,
    when,
    near,
    nearNoLocation,
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

  const [eventResult, rsvpsResult, currentUserResult, relationshipResult] = await Promise.all([
    getEvent(token, id),
    getEventRsvps(token, id).catch(() => ({ data: [] })),
    token ? getRequestProfile(req, token).catch((error) => {
      if (isAuthError(error)) throw error;
      return null;
    }) : Promise.resolve(null),
    token ? callApi(token, 'GET', `/${id}/relationship`).catch((error) => {
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
  event.is_archived = event.is_archived === true
    || event.isArchived === true
    || trimmed(event.operational_status ?? event.operationalStatus ?? event.status).toLowerCase() === 'archived';
  event.isArchived = event.is_archived;
  event.can_edit = !event.is_archived && Boolean(token) && (canEditFromApi || isCurrentUserOwner);
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
    relationship: eventRelationship(relationshipResult),
    rsvpsByStatus,
    isAuthenticated: Boolean(token),
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null,
    status: trimmed(req.query.status),
    idempotencyKey: randomUUID(),
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
  const idempotencyKey = trimmed(req.body.idempotency_key) || randomUUID();

  if (!reason || reason.length > 4000) {
    return redirectTo(res, eventPath(id, '?status=event-cancel-failed'));
  }

  try {
    await cancelEvent(req.token, id, {
      reason,
      idempotency_key: idempotencyKey
    });

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

// Archive event through Laravel's archive-first DELETE lifecycle contract.
router.post('/:id(\\d+)/delete', requireAuth, audit.eventDelete(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  const reason = trimmed(req.body.reason);
  const idempotencyKey = trimmed(req.body.idempotency_key) || randomUUID();

  if (!reason || reason.length > 4000) {
    return redirectTo(res, eventPath(id, '?status=event-archive-failed'));
  }

  try {
    await deleteEvent(req.token, id, {
      reason,
      idempotency_key: idempotencyKey
    });

    if (req.flash) {
      req.flash('success', res.locals.t('govuk_alpha.events.archived'));
    }

    redirectTo(res, `${EVENTS_PATH}?status=event-archived`);
  } catch (error) {
    if (isOnboardingRequired(error)) {
      return redirectTo(res, '/onboarding');
    }
    if (error instanceof ApiError && error.status === 403) {
      return renderForbidden(res, error);
    }
    if (error instanceof ApiError && [400, 409, 422].includes(error.status)) {
      if (req.flash) {
        req.flash('error', error.message || res.locals.t('govuk_alpha.events.archive_failed'));
      }
      return redirectTo(res, eventPath(id, '?status=event-archive-failed'));
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
