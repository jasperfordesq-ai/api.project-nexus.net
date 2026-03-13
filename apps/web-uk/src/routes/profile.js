// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getProfile, updateProfile, ApiError } = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

router.use(requireAuth);

// View profile
router.get('/', asyncRoute(async (req, res) => {
  const profile = await getProfile(req.token);

  res.render('profile/index', {
    title: 'Your profile',
    profile,
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// Edit profile form
router.get('/edit', asyncRoute(async (req, res) => {
  const profile = await getProfile(req.token);

  res.render('profile/edit', {
    title: 'Edit your profile',
    profile,
    values: null,
    errors: null,
    fieldErrors: {},
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

// Update profile
router.post('/edit', asyncRoute(async (req, res) => {
  const { first_name, last_name, email, phone, bio } = req.body;

  // Basic validation
  const errors = [];
  const fieldErrors = {};

  if (!first_name || !first_name.trim()) {
    errors.push({ text: 'Enter your first name', href: '#first_name' });
    fieldErrors.first_name = 'Enter your first name';
  }

  if (!last_name || !last_name.trim()) {
    errors.push({ text: 'Enter your last name', href: '#last_name' });
    fieldErrors.last_name = 'Enter your last name';
  }

  if (errors.length > 0) {
    return res.render('profile/edit', {
      title: 'Edit your profile',
      profile: null,
      values: { first_name, last_name, email, phone, bio },
      errors,
      fieldErrors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    const updateData = {
      firstName: first_name.trim(),
      lastName: last_name.trim()
    };
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio ? bio.trim() : null;

    await updateProfile(req.token, updateData);

    if (req.flash) {
      req.flash('success', 'Profile updated successfully');
    }
    res.redirect('/profile');
  } catch (error) {
    // Handle validation errors from API by re-rendering form
    if (error instanceof ApiError && error.status === 400) {
      return res.render('profile/edit', {
        title: 'Edit your profile',
        profile: null,
        values: req.body,
        errors: [{ text: error.message }],
        fieldErrors: error.data?.errors || {},
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    throw error; // Re-throw for asyncRoute to handle 401/503
  }
}));

module.exports = router;
