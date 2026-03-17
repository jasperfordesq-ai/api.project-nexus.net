// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getGoals, getGoal } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');
const { normalizeResponse } = require('../lib/normalizeResponse');

const router = express.Router();

router.use(requireAuth);

// List goals
router.get('/', asyncRoute(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;

  const result = await getGoals(req.token, { page, limit: 20 });

  const goals = (result.items || result.data || []).map(normalizeResponse);

  res.render('goals/index', {
    title: 'Goals',
    goals,
    pagination: result.pagination || { page, totalPages: 1 },
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// View goal with milestones
router.get('/:id', asyncRoute(async (req, res) => {
  const result = await getGoal(req.token, req.params.id);
  const goal = normalizeResponse(result.goal || result);

  res.render('goals/detail', {
    title: goal.title || 'Goal',
    goal,
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}, { notFoundTitle: 'Goal not found' }));

module.exports = router;
