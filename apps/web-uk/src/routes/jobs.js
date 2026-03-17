// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getJobs, getJob, applyForJob, ApiError } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { normalizeResponse } = require('../lib/normalizeResponse');

const router = express.Router();

router.use(requireAuth);

// List jobs
router.get('/', asyncRoute(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const searchQuery = req.query.search ? req.query.search.trim() : '';

  const result = await getJobs(req.token, { page, limit: 20, search: searchQuery });

  const jobs = (result.items || result.data || []).map(normalizeResponse);

  res.render('jobs/index', {
    title: 'Jobs',
    jobs,
    searchQuery,
    pagination: result.pagination || { page, totalPages: 1 },
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// View job detail
router.get('/:id', asyncRoute(async (req, res) => {
  const result = await getJob(req.token, req.params.id);
  const job = normalizeResponse(result.job || result);

  res.render('jobs/detail', {
    title: job.title || 'Job details',
    job,
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}, { notFoundTitle: 'Job not found' }));

// Apply for job
router.post('/:id/apply', asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { cover_letter } = req.body;

  try {
    await applyForJob(req.token, id, { cover_letter });

    if (req.flash) {
      req.flash('success', 'Your application has been submitted');
    }
  } catch (error) {
    if (error instanceof ApiError && error.status !== 401) {
      if (req.flash) {
        req.flash('error', error.message || 'Unable to submit application');
      }
      return res.redirect(`/jobs/${id}`);
    }
    throw error;
  }

  res.redirect(`/jobs/${id}`);
}));

module.exports = router;
