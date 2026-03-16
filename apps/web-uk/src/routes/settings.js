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
  changePassword,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

router.use(requireAuth);

// Settings overview
router.get('/', asyncRoute(async (req, res) => {
  const profile = await getProfile(req.token);

  let notificationPrefs = {};
  let privacyPrefs = {};
  try {
    const notifData = await getNotificationPreferences(req.token);
    if (Array.isArray(notifData) && notifData.length > 0) {
      // Any enabled email notification counts as "enabled"
      notificationPrefs.anyEmailEnabled = notifData.some(p => p.enable_email !== false);
    } else {
      notificationPrefs.anyEmailEnabled = true;
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    notificationPrefs.anyEmailEnabled = true;
  }

  try {
    privacyPrefs = await getPrivacyPreferences(req.token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
  }

  res.render('settings/index', {
    title: 'Settings',
    profile,
    notificationPrefs,
    privacyPrefs,
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

  // Use privacyPrefs.visibility as the authoritative source for profile_visibility
  if (privacyPrefs.visibility) {
    generalPrefs.profile_visibility = privacyPrefs.visibility;
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
      show_balance: showBalance,
      searchable: visibility !== 'private'
    });

    req.flash('success', 'Privacy settings saved');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    req.flash('error', error.message || 'Failed to save privacy settings');
  }

  res.redirect('/settings/privacy');
}));

// Change password
router.get('/password', asyncRoute(async (req, res) => {
  res.render('settings/password', {
    title: 'Change password',
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    errors: null,
    fieldErrors: {}
  });
}));

router.post('/password', asyncRoute(async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  const errors = [];
  const fieldErrors = {};

  if (!current_password) {
    errors.push({ text: 'Enter your current password', href: '#current_password' });
    fieldErrors.current_password = 'Enter your current password';
  }

  if (!new_password) {
    errors.push({ text: 'Enter a new password', href: '#new_password' });
    fieldErrors.new_password = 'Enter a new password';
  } else if (new_password.length < 8) {
    errors.push({ text: 'New password must be at least 8 characters', href: '#new_password' });
    fieldErrors.new_password = 'New password must be at least 8 characters';
  }

  if (new_password !== confirm_password) {
    errors.push({ text: 'Passwords do not match', href: '#confirm_password' });
    fieldErrors.confirm_password = 'Passwords do not match';
  }

  if (errors.length > 0) {
    return res.render('settings/password', {
      title: 'Change password',
      errors,
      fieldErrors,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }

  try {
    await changePassword(req.token, current_password, new_password);

    if (req.flash) {
      req.flash('success', 'Password changed successfully');
    }
    res.redirect('/settings');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;

    const errorMessage = (error instanceof ApiError && error.message) ? error.message : 'Unable to change password. Check your current password and try again.';
    return res.render('settings/password', {
      title: 'Change password',
      errors: [{ text: errorMessage }],
      fieldErrors: {},
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  }
}));

module.exports = router;
