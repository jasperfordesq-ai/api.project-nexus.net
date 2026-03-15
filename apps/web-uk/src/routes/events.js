// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  getEvents,
  getMyEvents,
  getEvent,
  createEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
  getEventRsvps,
  rsvpToEvent,
  removeEventRsvp,
  getMyGroups,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { audit } = require('../lib/auditLogger');

const router = express.Router();

router.use(requireAuth);

// List events
router.get('/', asyncRoute(async (req, res) => {
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

// My events (RSVPs)
router.get('/my', asyncRoute(async (req, res) => {
  const result = await getMyEvents(req.token);
  const events = (result.items || result.data || []).map(e => {
    const startsAt = e.starts_at || e.startsAt;
    return {
      ...e,
      // Normalize for template: add myRsvp object and is_past flag
      myRsvp: { status: (e.my_rsvp || e.myRsvp || '').toLowerCase() },
      is_past: startsAt ? new Date(startsAt) < new Date() : false
    };
  });

  res.render('events/my', {
    title: 'My events',
    events,
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// Create event form
router.get('/new', asyncRoute(async (req, res) => {
  const groupId = req.query.group_id || null;

  const myGroupsResult = await getMyGroups(req.token);
  const myGroups = myGroupsResult.data || [];

  res.render('events/new', {
    title: 'Create an event',
    myGroups,
    selectedGroupId: groupId,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

// Create event
router.post('/new', audit.eventCreate(), asyncRoute(async (req, res) => {
  const { title, description, location, starts_at_date, starts_at_time, ends_at_date, ends_at_time, max_attendees, group_id } = req.body;

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
    startsAt = `${starts_at_date}T${starts_at_time}:00Z`;
  }

  if (ends_at_date && ends_at_time) {
    endsAt = `${ends_at_date}T${ends_at_time}:00Z`;
  }

  // Helper to render form with errors
  const renderFormWithErrors = async (errorList) => {
    let myGroups = [];
    try {
      const myGroupsResult = await getMyGroups(req.token);
      myGroups = myGroupsResult.data || [];
    } catch (e) {
      // Ignore - render with empty groups
    }

    return res.render('events/new', {
      title: 'Create an event',
      errors: errorList,
      values: { title, description, location, starts_at_date, starts_at_time, ends_at_date, ends_at_time, max_attendees, group_id },
      myGroups,
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
      group_id: group_id ? parseInt(group_id, 10) : null
    };

    const result = await createEvent(req.token, eventData);

    if (req.flash) {
      req.flash('success', 'Event created successfully');
    }

    const eventId = result.event?.id || result.id;
    res.redirect(`/events/${eventId}`);
  } catch (error) {
    // Handle validation errors from API by re-rendering form
    if (error instanceof ApiError && error.status !== 401) {
      return renderFormWithErrors([{ text: error.message || 'Unable to create event' }]);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// View event details
router.get('/:id', asyncRoute(async (req, res) => {
  const { id } = req.params;

  const [eventResult, rsvpsResult] = await Promise.all([
    getEvent(req.token, id),
    getEventRsvps(req.token, id).catch(() => ({ data: [] }))
  ]);

  const event = eventResult.event || eventResult;
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
router.get('/:id/edit', asyncRoute(async (req, res) => {
  const { id } = req.params;

  const [eventResult, myGroupsResult] = await Promise.all([
    getEvent(req.token, id),
    getMyGroups(req.token)
  ]);

  const event = eventResult.event || eventResult;
  const myGroups = myGroupsResult.data || [];

  // Parse dates for form (backend returns camelCase: startsAt, endsAt)
  const startsAt = (event.startsAt || event.starts_at) ? new Date(event.startsAt || event.starts_at) : null;
  const endsAt = (event.endsAt || event.ends_at) ? new Date(event.endsAt || event.ends_at) : null;

  res.render('events/edit', {
    title: `Edit ${event.title}`,
    event,
    myGroups,
    startsAtDate: startsAt ? startsAt.toISOString().split('T')[0] : '',
    startsAtTime: startsAt ? startsAt.toTimeString().slice(0, 5) : '',
    endsAtDate: endsAt ? endsAt.toISOString().split('T')[0] : '',
    endsAtTime: endsAt ? endsAt.toTimeString().slice(0, 5) : '',
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}, { notFoundTitle: 'Event not found' }));

// Update event
router.post('/:id/edit', audit.eventUpdate(), asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { title, description, location, starts_at_date, starts_at_time, ends_at_date, ends_at_time, max_attendees } = req.body;

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
    startsAt = `${starts_at_date}T${starts_at_time}:00Z`;
  }

  if (ends_at_date && ends_at_time) {
    endsAt = `${ends_at_date}T${ends_at_time}:00Z`;
  }

  // Helper to render form with errors
  const renderFormWithErrors = async (errorList) => {
    let myGroups = [];
    try {
      const myGroupsResult = await getMyGroups(req.token);
      myGroups = myGroupsResult.data || [];
    } catch (e) {
      // Ignore - render with empty groups
    }

    return res.render('events/edit', {
      title: 'Edit event',
      event: { id, title, description, location, max_attendees },
      errors: errorList,
      myGroups,
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
      max_attendees: max_attendees ? parseInt(max_attendees, 10) : null
    });

    if (req.flash) {
      req.flash('success', 'Event updated successfully');
    }

    res.redirect(`/events/${id}`);
  } catch (error) {
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
router.post('/:id/cancel', asyncRoute(async (req, res) => {
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
router.post('/:id/delete', audit.eventDelete(), asyncRoute(async (req, res) => {
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
router.post('/:id/rsvp', audit.eventRsvp(), asyncRoute(async (req, res) => {
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

// Remove RSVP
router.post('/:id/rsvp/remove', asyncRoute(async (req, res) => {
  const { id } = req.params;

  try {
    await removeEventRsvp(req.token, id);

    if (req.flash) {
      req.flash('success', 'RSVP removed');
    }
  } catch (error) {
    // Handle non-401 API errors with flash message
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to remove RSVP');
      }
      return res.redirect(`/events/${id}`);
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }

  res.redirect(`/events/${id}`);
}));

module.exports = router;
