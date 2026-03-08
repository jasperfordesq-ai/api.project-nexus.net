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
  const { name, email, phone } = req.body;

  // Basic validation
  const errors = [];
  const fieldErrors = {};

  if (!name || !name.trim()) {
    errors.push({ text: 'Enter your name', href: '#name' });
    fieldErrors.name = 'Enter your name';
  }

  if (!email || !email.trim()) {
    errors.push({ text: 'Enter your email address', href: '#email' });
    fieldErrors.email = 'Enter your email address';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ text: 'Enter a valid email address', href: '#email' });
    fieldErrors.email = 'Enter a valid email address';
  }

  if (errors.length > 0) {
    return res.render('profile/edit', {
      title: 'Edit your profile',
      profile: null,
      values: { name, email, phone },
      errors,
      fieldErrors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await updateProfile(req.token, { name: name.trim(), email: email.trim(), phone });

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
