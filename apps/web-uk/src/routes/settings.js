// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const fs = require('fs/promises');
const { requireAuth } = require('../middleware/auth');
const {
  getProfile,
  getNotificationPreferences,
  updateNotificationPreference,
  getPrivacyPreferences,
  updatePrivacyPreferences,
  getPreferences,
  changePassword,
  callUserSettingsApi,
  uploadInsuranceCertificate,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

const SETTINGS_THEMES = ['light', 'dark', 'system'];
const SETTINGS_LINK_TYPES = ['family', 'guardian', 'carer', 'organization'];
const SETTINGS_LINK_PERMISSIONS = [
  'can_view_activity',
  'can_manage_listings',
  'can_transact',
  'can_view_messages'
];
const SETTINGS_GDPR_TYPES = ['portability', 'rectification', 'restriction', 'objection'];
const SETTINGS_INSURANCE_TYPES = [
  'public_liability',
  'professional_indemnity',
  'employers_liability',
  'product_liability',
  'personal_accident',
  'other'
];

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

function checked(value) {
  return value === true || ['1', 'true', 'on', 'yes'].includes(String(value || '').toLowerCase());
}

function allowedValue(value, allowed, fallback = null) {
  const text = trimmed(value);
  return allowed.includes(text) ? text : fallback;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
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

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function apiErrorCode(error) {
  const data = error && error.data && typeof error.data === 'object' ? error.data : {};
  return String(data.code || data.error || '').toUpperCase();
}

function redirectOnAuthError(error, res) {
  if (isAuthError(error)) {
    res.redirect(loginRedirect());
    return true;
  }
  return false;
}

async function callSettings(token, method, path, data = undefined) {
  if (data === undefined) {
    return callUserSettingsApi(token, method, path);
  }

  return callUserSettingsApi(token, method, path, data);
}

function permissionPayload(body) {
  return SETTINGS_LINK_PERMISSIONS.reduce((permissions, key) => {
    permissions[key] = checked(body[`perm_${key}`]);
    return permissions;
  }, {});
}

function settingsStatusRedirect(path, status, fragment = '') {
  return `${path}?status=${encodeURIComponent(status)}${fragment}`;
}

function availabilitySlotsFromRawBody(rawBody) {
  const hasAvailabilityKeys = rawBody && (rawBody.includes('slots%5B') || rawBody.includes('slots['));
  if (!hasAvailabilityKeys) {
    return null;
  }

  const slotsByDay = {};
  for (const [key, value] of new URLSearchParams(rawBody).entries()) {
    const match = key.match(/^slots\[([0-6])\]\[([^\]]+)\]\[(start|end)\]$/);
    if (!match) continue;

    const [, day, index, field] = match;
    slotsByDay[day] = slotsByDay[day] || {};
    slotsByDay[day][index] = slotsByDay[day][index] || {};
    slotsByDay[day][index][field] = value;
  }

  return Object.keys(slotsByDay).length > 0 ? slotsByDay : null;
}

function flattenAvailabilitySlots(rawSlots, rawBody = '') {
  const slotsByDay = availabilitySlotsFromRawBody(rawBody) || (rawSlots && typeof rawSlots === 'object' ? rawSlots : {});
  const flat = [];
  let hasInvalid = false;

  for (const [dayKey, slots] of Object.entries(slotsByDay)) {
    const day = Number(dayKey);
    if (!Number.isInteger(day) || day < 0 || day > 6 || !slots || typeof slots !== 'object') {
      continue;
    }

    for (const slot of Object.values(slots)) {
      if (!slot || typeof slot !== 'object') continue;

      const start = trimmed(slot.start);
      const end = trimmed(slot.end);
      if (start === '' && end === '') continue;
      if (start === '' || end === '' || start >= end) {
        hasInvalid = true;
        continue;
      }

      flat.push({
        day_of_week: day,
        start_time: start,
        end_time: end
      });
    }
  }

  return { flat, hasInvalid };
}

function linkedFailureStatus(error) {
  if (error instanceof ApiError && error.status === 404) {
    return 'link-user-not-found';
  }

  const code = apiErrorCode(error);
  if (code.includes('SELF')) return 'link-self';
  if (code.includes('EXIST')) return 'link-exists';
  if (code.includes('MAX') || code.includes('LIMIT')) return 'link-max';
  return 'link-failed';
}

router.post('/appearance', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const theme = allowedValue(req.body.theme, SETTINGS_THEMES, null);
  if (theme === null) {
    return res.redirect(settingsStatusRedirect('/settings/appearance', 'appearance-invalid'));
  }

  let status = 'appearance-saved';
  try {
    await callSettings(token, 'PUT', '/theme', { theme });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'appearance-failed';
  }

  return res.redirect(settingsStatusRedirect('/settings/appearance', status));
}));

router.post('/availability', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const { flat, hasInvalid } = flattenAvailabilitySlots(req.body.slots, req.rawUrlencodedBody);
  if (hasInvalid) {
    return res.redirect(settingsStatusRedirect('/settings/availability', 'availability-invalid', '#availability'));
  }

  let status = 'availability-saved';
  try {
    await callSettings(token, 'PUT', '/availability', { schedule: flat });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'availability-failed';
  }

  return res.redirect(settingsStatusRedirect('/settings/availability', status));
}));

router.post('/data-rights', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const type = allowedValue(req.body.request_type, SETTINGS_GDPR_TYPES, null);
  if (type === null) {
    return res.redirect(settingsStatusRedirect('/settings/data-rights', 'gdpr-invalid', '#request'));
  }

  const notes = trimmed(req.body.notes);
  let status = 'gdpr-requested';
  let fragment = '#your-requests';
  try {
    await callSettings(token, 'POST', '/gdpr-request', {
      type,
      notes: notes || null
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = error instanceof ApiError && error.status === 409 ? 'gdpr-duplicate' : 'gdpr-failed';
    fragment = '#request';
  }

  return res.redirect(settingsStatusRedirect('/settings/data-rights', status, fragment));
}));

router.post('/linked-accounts/request', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const email = trimmed(req.body.email);
  if (email === '' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.redirect(settingsStatusRedirect('/settings/linked-accounts', 'link-email-invalid', '#request'));
  }

  const payload = {
    email,
    relationship_type: allowedValue(req.body.relationship_type, SETTINGS_LINK_TYPES, 'family'),
    permissions: permissionPayload(req.body)
  };

  let status = 'link-requested';
  let fragment = '#children';
  try {
    await callSettings(token, 'POST', '/sub-accounts', payload);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = linkedFailureStatus(error);
    fragment = '#request';
  }

  return res.redirect(settingsStatusRedirect('/settings/linked-accounts', status, fragment));
}));

router.post('/linked-accounts/approve', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const relationshipId = positiveInteger(req.body.relationship_id);
  let status = 'link-approved';
  try {
    if (relationshipId === null) {
      status = 'link-failed';
    } else {
      await callSettings(token, 'PUT', `/sub-accounts/${relationshipId}/approve`);
    }
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'link-failed';
  }

  return res.redirect(settingsStatusRedirect('/settings/linked-accounts', status, '#parents'));
}));

router.post('/linked-accounts/permissions', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const relationshipId = positiveInteger(req.body.relationship_id);
  if (relationshipId === null) {
    return res.redirect(settingsStatusRedirect('/settings/linked-accounts', 'link-failed', '#children'));
  }

  let status = 'link-permissions-saved';
  try {
    await callSettings(token, 'PUT', `/sub-accounts/${relationshipId}/permissions`, {
      permissions: permissionPayload(req.body)
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'link-failed';
  }

  return res.redirect(settingsStatusRedirect('/settings/linked-accounts', status, '#children'));
}));

router.post('/linked-accounts/revoke', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const relationshipId = positiveInteger(req.body.relationship_id);
  let status = 'link-revoked';
  try {
    if (relationshipId === null) {
      status = 'link-failed';
    } else {
      await callSettings(token, 'DELETE', `/sub-accounts/${relationshipId}`);
    }
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'link-failed';
  }

  return res.redirect(settingsStatusRedirect('/settings/linked-accounts', status, '#children'));
}));

router.post('/insurance', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const insuranceType = allowedValue(req.body.insurance_type, SETTINGS_INSURANCE_TYPES, null);
  if (insuranceType === null) {
    return res.redirect(settingsStatusRedirect('/settings/insurance', 'insurance-type-invalid', '#upload'));
  }

  const file = uploadedFile(req, 'certificate_file');
  if (!file) {
    return res.redirect(settingsStatusRedirect('/settings/insurance', 'insurance-file-required', '#upload'));
  }

  try {
    const buffer = await fs.readFile(file.filepath);
    await uploadInsuranceCertificate(token, {
      insurance_type: insuranceType,
      provider_name: trimmed(req.body.provider_name, 255),
      policy_number: trimmed(req.body.policy_number, 255),
      coverage_amount: trimmed(req.body.coverage_amount),
      start_date: trimmed(req.body.start_date),
      expiry_date: trimmed(req.body.expiry_date),
      notes: trimmed(req.body.notes, 1000),
      file: {
        buffer,
        filename: trimmed(file.originalFilename) || 'certificate',
        contentType: trimmed(file.mimetype) || 'application/octet-stream',
        size: file.size
      }
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    return res.redirect(settingsStatusRedirect('/settings/insurance', 'insurance-failed', '#upload'));
  } finally {
    await removeUploadedFile(file);
  }

  return res.redirect(settingsStatusRedirect('/settings/insurance', 'insurance-uploaded', '#certificates'));
}));

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
