// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getProfile,
  getNotificationPreferences,
  updateNotificationPreference,
  getPrivacyPreferences,
  updatePrivacyPreferences,
  getPreferences,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

router.use(requireAuth);

// Settings overview
router.get('/', asyncRoute(async (req, res) => {
  const profile = await getProfile(req.token);

  res.render('settings/index', {
    title: 'Settings',
    profile,
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

// Notification settings
router.get('/notifications', asyncRoute(async (req, res) => {
  const profile = await getProfile(req.token);

  // Fetch current notification preferences from API
  let notificationPrefs = [];
  try {
    notificationPrefs = await getNotificationPreferences(req.token);
  } catch (error) {
    // If preferences API fails, continue with defaults
    if (!(error instanceof ApiError) || error.status === 401) throw error;
  }

  // Build a map of notification_type -> enable_email for the template
  const prefMap = {};
  if (Array.isArray(notificationPrefs)) {
    for (const pref of notificationPrefs) {
      prefMap[pref.notification_type] = pref.enable_email !== false;
    }
  }

  res.render('settings/notifications', {
    title: 'Notification settings',
    profile,
    notificationPrefs: prefMap,
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}));

// POST notification settings
router.post('/notifications', asyncRoute(async (req, res) => {
  const selectedNotifications = req.body.notifications || [];
  const allTypes = ['messages', 'listings', 'transactions', 'marketing'];

  // Normalize to array (single checkbox submits as string)
  const selected = Array.isArray(selectedNotifications) ? selectedNotifications : [selectedNotifications];

  // Validate: only allow known notification types
  const validSelected = selected.filter(t => allTypes.includes(t));

  try {
    // Update each notification type
    for (const type of allTypes) {
      const enabled = validSelected.includes(type);
      await updateNotificationPreference(req.token, {
        notification_type: type,
        enable_email: enabled,
        enable_in_app: true,
        enable_push: enabled
      });
    }

    req.flash('success', 'Notification settings saved');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    req.flash('error', error.message || 'Failed to save notification settings');
  }

  res.redirect('/settings/notifications');
}));

// Privacy settings
router.get('/privacy', asyncRoute(async (req, res) => {
  const profile = await getProfile(req.token);

  // Fetch current privacy preferences from API
  let privacyPrefs = {};
  try {
    privacyPrefs = await getPrivacyPreferences(req.token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status === 401) throw error;
  }

  // Also fetch general preferences for profile_visibility
  let generalPrefs = {};
  try {
    generalPrefs = await getPreferences(req.token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status === 401) throw error;
  }

  res.render('settings/privacy', {
    title: 'Privacy settings',
    profile,
    privacyPrefs,
    generalPrefs,
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    successMessage: req.flash ? req.flash('success')[0] : null,
    errorMessage: req.flash ? req.flash('error')[0] : null
  });
}));

// POST privacy settings
router.post('/privacy', asyncRoute(async (req, res) => {
  const { profile_visibility, show_balance } = req.body;

  // Validate profile_visibility
  const allowedVisibilities = ['public', 'contacts', 'private'];
  const visibility = allowedVisibilities.includes(profile_visibility) ? profile_visibility : 'public';
  const showBalance = show_balance === 'yes';

  try {
    await updatePrivacyPreferences(req.token, {
      visibility,
      show_email: showBalance,
      searchable: visibility !== 'private'
    });

    req.flash('success', 'Privacy settings saved');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    req.flash('error', error.message || 'Failed to save privacy settings');
  }

  res.redirect('/settings/privacy');
}));

module.exports = router;
