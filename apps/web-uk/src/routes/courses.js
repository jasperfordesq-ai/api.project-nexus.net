// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { ApiError, callCourseApi } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'];
const COURSE_VISIBILITIES = ['members', 'public'];
const COURSE_ENROLLMENT_TYPES = ['self_paced', 'cohort'];
const LESSON_CONTENT_TYPES = ['text', 'video', 'pdf', 'embed'];

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

function optionalText(value, limit = null) {
  const text = trimmed(value, limit);
  return text === '' ? null : text;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function boundedNumber(value, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(maximum, Math.max(minimum, number));
}

function checked(value) {
  return value === true || ['1', 'true', 'on', 'yes'].includes(String(value || '').toLowerCase());
}

function allowed(value, choices, fallback) {
  const text = trimmed(value);
  return choices.includes(text) ? text : fallback;
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

function dataFrom(result) {
  return result && typeof result === 'object' && result.data !== undefined
    ? result.data
    : result;
}

function resultId(result) {
  const data = dataFrom(result);
  if (!data || typeof data !== 'object') return null;
  return positiveInteger(data.id) || positiveInteger(data.course && data.course.id);
}

function errorCode(error) {
  if (!(error instanceof ApiError) || !error.data || typeof error.data !== 'object') {
    return '';
  }

  const nested = error.data.error && typeof error.data.error === 'object'
    ? error.data.error.code
    : error.data.error;
  return String(nested || error.data.code || '').toUpperCase();
}

async function callCourse(token, method, path, data = undefined) {
  if (data === undefined) {
    return callCourseApi(token, method, path);
  }

  return callCourseApi(token, method, path, data);
}

async function requireCourseAction(req, res, failureRedirect, action) {
  const token = tokenFrom(req);
  if (!token) {
    return res.redirect(loginRedirect());
  }

  try {
    return await action(token);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(typeof failureRedirect === 'function' ? failureRedirect(error) : failureRedirect);
  }
}

function courseRedirect(id, status, suffix = '') {
  return `/courses/${id}?status=${encodeURIComponent(status)}${suffix}`;
}

function learnRedirect(id, status, lessonId = null) {
  const lesson = lessonId === null ? '' : `lesson=${encodeURIComponent(lessonId)}&`;
  return `/courses/${id}/learn?${lesson}status=${encodeURIComponent(status)}`;
}

function instructorRedirect(status) {
  return `/courses/instructor?status=${encodeURIComponent(status)}`;
}

function instructorEditRedirect(id, status) {
  return `/courses/instructor/${id}/edit?status=${encodeURIComponent(status)}`;
}

function instructorGradingRedirect(id, status) {
  return `/courses/instructor/${id}/grading?status=${encodeURIComponent(status)}`;
}

function coursePayload(body) {
  const title = trimmed(body.title, 200);
  if (title === '') {
    return null;
  }

  const payload = {
    title,
    summary: trimmed(body.summary, 500),
    description: trimmed(body.description, 20000),
    level: allowed(body.level, COURSE_LEVELS, 'beginner'),
    visibility: allowed(body.visibility, COURSE_VISIBILITIES, 'members'),
    enrollment_type: allowed(body.enrollment_type, COURSE_ENROLLMENT_TYPES, 'self_paced')
  };

  const creditCost = trimmed(body.credit_cost);
  if (creditCost !== '' && Number.isFinite(Number(creditCost))) {
    payload.credit_cost = Math.max(0, Number(creditCost));
  }

  payload.category_id = positiveInteger(body.category_id);
  return payload;
}

function reviewPayload(body) {
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return null;
  }

  return {
    rating,
    body: trimmed(body.body, 2000)
  };
}

function sectionPayload(body) {
  const title = trimmed(body.section_title, 200);
  return title === '' ? null : { title };
}

function lessonPayload(body) {
  const title = trimmed(body.lesson_title, 200);
  if (title === '') {
    return null;
  }

  const contentType = allowed(body.content_type, LESSON_CONTENT_TYPES, 'text');
  const payload = {
    title,
    content_type: contentType,
    body: trimmed(body.body, 50000)
  };

  const sectionId = positiveInteger(body.section_id);
  if (sectionId !== null) {
    payload.section_id = sectionId;
  }

  const mediaUrl = trimmed(body.media_url);
  if (contentType === 'video') {
    payload.video_url = mediaUrl;
  } else if (contentType === 'pdf') {
    payload.attachment_url = mediaUrl;
  } else if (contentType === 'embed') {
    payload.embed_url = mediaUrl;
  }

  return payload;
}

function gradePayload(body) {
  return {
    score_percent: boundedNumber(body.score_percent, 0, 100) || 0,
    passed: checked(body.passed),
    feedback: optionalText(body.feedback, 5000)
  };
}

function completionPayload(body) {
  const watchPercent = boundedNumber(body.watch_percent, 0, 100);
  return watchPercent === null ? undefined : { watch_percent: watchPercent };
}

function quizAnswers(body) {
  if (body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)) {
    return body.answers;
  }

  const answers = {};
  Object.entries(body).forEach(([key, value]) => {
    const match = key.match(/^answers\[([^\]]+)\](?:\[\])?$/);
    if (match) {
      answers[match[1]] = value;
    }
  });

  return answers;
}

function enrolFailureStatus(error) {
  const code = errorCode(error);
  if (code === 'INSUFFICIENT_CREDITS') return 'insufficient-credits';
  return 'enrol-failed';
}

function reviewFailureStatus(error) {
  const code = errorCode(error);
  if (code === 'NOT_ENROLLED') return 'review-not-enrolled';
  if (code === 'VALIDATION_FAILED') return 'review-invalid';
  return 'review-failed';
}

function quizStatus(result) {
  const data = dataFrom(result);
  if (data && typeof data === 'object') {
    if (data.needs_review) return 'quiz-pending-review';
    if (data.passed) return 'quiz-passed';
  }

  return 'quiz-failed';
}

router.post('/:id/enrol', asyncRoute(async (req, res) => {
  return requireCourseAction(req, res, (error) => courseRedirect(req.params.id, enrolFailureStatus(error)), async (token) => {
    await callCourse(token, 'POST', `/${req.params.id}/enroll`);
    return res.redirect(courseRedirect(req.params.id, 'enrolled'));
  });
}));

router.post('/:id/lessons/:lessonId/complete', asyncRoute(async (req, res) => {
  return requireCourseAction(req, res, learnRedirect(req.params.id, 'lesson-completed'), async (token) => {
    const result = await callCourse(token, 'POST', `/${req.params.id}/lessons/${req.params.lessonId}/complete`, completionPayload(req.body));
    const data = dataFrom(result);
    const status = data && typeof data === 'object' && data.course_completed
      ? 'course-completed'
      : 'lesson-completed';
    return res.redirect(learnRedirect(req.params.id, status));
  });
}));

router.post('/:id/lessons/:lessonId/quiz', asyncRoute(async (req, res) => {
  return requireCourseAction(req, res, learnRedirect(req.params.id, 'quiz-error', req.params.lessonId), async (token) => {
    const quizId = positiveInteger(req.body.quiz_id || req.body.quizId);
    if (quizId === null) {
      return res.redirect(learnRedirect(req.params.id, 'quiz-error', req.params.lessonId));
    }

    try {
      const result = await callCourse(token, 'POST', `/quizzes/${quizId}/attempt`, {
        answers: quizAnswers(req.body)
      });
      return res.redirect(learnRedirect(req.params.id, quizStatus(result), req.params.lessonId));
    } catch (error) {
      if (redirectOnAuthError(error, res)) return undefined;
      const status = errorCode(error) === 'MAX_ATTEMPTS_REACHED' ? 'quiz-no-attempts' : 'quiz-error';
      return res.redirect(learnRedirect(req.params.id, status, req.params.lessonId));
    }
  });
}));

router.post('/:id/reviews', asyncRoute(async (req, res) => {
  const payload = reviewPayload(req.body);
  if (payload === null) {
    return res.redirect(courseRedirect(req.params.id, 'review-invalid', '#reviews'));
  }

  return requireCourseAction(req, res, (error) => courseRedirect(req.params.id, reviewFailureStatus(error), '#reviews'), async (token) => {
    await callCourse(token, 'POST', `/${req.params.id}/reviews`, payload);
    return res.redirect(courseRedirect(req.params.id, 'review-saved', '#reviews'));
  });
}));

router.post('/instructor/new', asyncRoute(async (req, res) => {
  const payload = coursePayload(req.body);
  if (payload === null) {
    return res.redirect('/courses/instructor/new?status=create-failed');
  }

  return requireCourseAction(req, res, '/courses/instructor/new?status=create-failed', async (token) => {
    const result = await callCourse(token, 'POST', '', payload);
    const id = resultId(result);
    return res.redirect(id === null
      ? '/courses/instructor/new?status=create-failed'
      : instructorEditRedirect(id, 'created'));
  });
}));

router.post('/instructor/:id/update', asyncRoute(async (req, res) => {
  const payload = coursePayload(req.body);
  if (payload === null) {
    return res.redirect(instructorEditRedirect(req.params.id, 'save-failed'));
  }

  return requireCourseAction(req, res, instructorEditRedirect(req.params.id, 'save-failed'), async (token) => {
    await callCourse(token, 'PUT', `/${req.params.id}`, payload);
    return res.redirect(instructorEditRedirect(req.params.id, 'saved'));
  });
}));

router.post('/instructor/:id/publish', asyncRoute(async (req, res) => {
  return requireCourseAction(req, res, instructorEditRedirect(req.params.id, 'publish-failed'), async (token) => {
    const result = await callCourse(token, 'POST', `/${req.params.id}/publish`);
    const data = dataFrom(result);
    const status = data && typeof data === 'object' && data.moderation_status === 'approved'
      ? 'published'
      : 'pending-review';
    return res.redirect(instructorEditRedirect(req.params.id, status));
  });
}));

router.post('/instructor/:id/unpublish', asyncRoute(async (req, res) => {
  return requireCourseAction(req, res, instructorEditRedirect(req.params.id, 'unpublish-failed'), async (token) => {
    await callCourse(token, 'POST', `/${req.params.id}/unpublish`);
    return res.redirect(instructorEditRedirect(req.params.id, 'unpublished'));
  });
}));

router.post('/instructor/:id/delete', asyncRoute(async (req, res) => {
  return requireCourseAction(req, res, instructorRedirect('delete-failed'), async (token) => {
    await callCourse(token, 'DELETE', `/${req.params.id}`);
    return res.redirect(instructorRedirect('deleted'));
  });
}));

router.post('/instructor/:id/grading/:attemptId', asyncRoute(async (req, res) => {
  return requireCourseAction(req, res, instructorGradingRedirect(req.params.id, 'grade-failed'), async (token) => {
    await callCourse(token, 'POST', `/attempts/${req.params.attemptId}/grade`, gradePayload(req.body));
    return res.redirect(instructorGradingRedirect(req.params.id, 'graded'));
  });
}));

router.post('/instructor/:id/sections', asyncRoute(async (req, res) => {
  const payload = sectionPayload(req.body);
  if (payload === null) {
    return res.redirect(instructorEditRedirect(req.params.id, 'section-title-missing'));
  }

  return requireCourseAction(req, res, instructorEditRedirect(req.params.id, 'section-failed'), async (token) => {
    await callCourse(token, 'POST', `/${req.params.id}/sections`, payload);
    return res.redirect(instructorEditRedirect(req.params.id, 'section-added'));
  });
}));

router.post('/instructor/:id/sections/:sectionId/update', asyncRoute(async (req, res) => {
  const payload = sectionPayload(req.body);
  if (payload === null) {
    return res.redirect(instructorEditRedirect(req.params.id, 'section-title-missing'));
  }

  return requireCourseAction(req, res, instructorEditRedirect(req.params.id, 'section-failed'), async (token) => {
    await callCourse(token, 'PUT', `/${req.params.id}/sections/${req.params.sectionId}`, payload);
    return res.redirect(instructorEditRedirect(req.params.id, 'section-saved'));
  });
}));

router.post('/instructor/:id/sections/:sectionId/delete', asyncRoute(async (req, res) => {
  return requireCourseAction(req, res, instructorEditRedirect(req.params.id, 'section-failed'), async (token) => {
    await callCourse(token, 'DELETE', `/${req.params.id}/sections/${req.params.sectionId}`);
    return res.redirect(instructorEditRedirect(req.params.id, 'section-deleted'));
  });
}));

router.post('/instructor/:id/lessons', asyncRoute(async (req, res) => {
  const payload = lessonPayload(req.body);
  if (payload === null) {
    return res.redirect(instructorEditRedirect(req.params.id, 'lesson-title-missing'));
  }

  return requireCourseAction(req, res, instructorEditRedirect(req.params.id, 'lesson-failed'), async (token) => {
    await callCourse(token, 'POST', `/${req.params.id}/lessons`, payload);
    return res.redirect(instructorEditRedirect(req.params.id, 'lesson-added'));
  });
}));

router.post('/instructor/:id/lessons/:lessonId/update', asyncRoute(async (req, res) => {
  const payload = lessonPayload(req.body);
  if (payload === null) {
    return res.redirect(instructorEditRedirect(req.params.id, 'lesson-title-missing'));
  }

  return requireCourseAction(req, res, instructorEditRedirect(req.params.id, 'lesson-failed'), async (token) => {
    await callCourse(token, 'PUT', `/${req.params.id}/lessons/${req.params.lessonId}`, payload);
    return res.redirect(instructorEditRedirect(req.params.id, 'lesson-saved'));
  });
}));

router.post('/instructor/:id/lessons/:lessonId/delete', asyncRoute(async (req, res) => {
  return requireCourseAction(req, res, instructorEditRedirect(req.params.id, 'lesson-failed'), async (token) => {
    await callCourse(token, 'DELETE', `/${req.params.id}/lessons/${req.params.lessonId}`);
    return res.redirect(instructorEditRedirect(req.params.id, 'lesson-deleted'));
  });
}));

module.exports = router;
