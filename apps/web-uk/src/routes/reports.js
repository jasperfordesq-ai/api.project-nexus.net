// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const {
  submitReport,
  getMyReports,
  ApiError
} = require('../lib/api');
const { requireAuth } = require('../middleware/auth');
const { asyncRoute } = require('../lib/routeHelpers');
const { validateReturnUrl } = require('../lib/urlValidator');
const { audit } = require('../lib/auditLogger');

const router = express.Router();

router.use(requireAuth);

// Report reasons by content type
const REPORT_REASONS = {
  default: [
    { value: 'spam', text: 'Spam or misleading' },
    { value: 'harassment', text: 'Harassment or bullying' },
    { value: 'hate_speech', text: 'Hate speech or discrimination' },
    { value: 'inappropriate', text: 'Inappropriate content' },
    { value: 'illegal', text: 'Illegal activity' },
    { value: 'other', text: 'Other' }
  ]
};

// Report form (standalone page)
router.get('/new', (req, res) => {
  const { type, id, return_to } = req.query;

  if (!type || !id) {
    return res.redirect('/');
  }

  res.render('reports/new', {
    title: 'Report content',
    contentType: type,
    contentId: id,
    returnTo: validateReturnUrl(return_to, '/'),
    reasons: REPORT_REASONS.default,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
});

// Submit report
router.post('/new', audit.reportCreate(), asyncRoute(async (req, res) => {
  const { content_type, content_id, reason, details, return_to } = req.body;
  const safeReturnTo = validateReturnUrl(return_to, '/');

  const errors = [];

  if (!content_type || !content_id) {
    errors.push({ text: 'Invalid report request' });
  }

  if (!reason) {
    errors.push({ text: 'Select a reason for your report', href: '#reason' });
  }

  if (errors.length > 0) {
    return res.render('reports/new', {
      title: 'Report content',
      contentType: content_type,
      contentId: content_id,
      returnTo: safeReturnTo,
      reasons: REPORT_REASONS.default,
      errors,
      values: { reason, details },
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await submitReport(req.token, {
      content_type,
      content_id: parseInt(content_id, 10),
      reason,
      details: details ? details.trim() : null
    });

    if (req.flash) {
      req.flash('success', 'Thank you for your report. We will review it shortly.');
    }

    res.redirect(safeReturnTo);
  } catch (error) {
    // Handle non-401 API errors by re-rendering form
    if (error instanceof ApiError && error.status !== 401) {
      return res.render('reports/new', {
        title: 'Report content',
        contentType: content_type,
        contentId: content_id,
        returnTo: safeReturnTo,
        reasons: REPORT_REASONS.default,
        errors: [{ text: error.message || 'Unable to submit report. Please try again.' }],
        values: { reason, details },
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

// View my reports
router.get('/my', asyncRoute(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const status = req.query.status || null;

  const result = await getMyReports(req.token, { page, limit: 20, status });
  const reports = result.data || [];

  res.render('reports/my', {
    title: 'My reports',
    reports,
    status,
    pagination: result.pagination || { page, total_pages: 1 },
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

module.exports = router;
