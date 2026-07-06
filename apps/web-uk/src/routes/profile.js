// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  callUserSettingsApi,
  callProfileApi,
  callWebAuthnApi,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();

const PROFILE_LOCALES = ['en', 'ga', 'cy', 'fr', 'de', 'es', 'it', 'pt', 'pl', 'ar', 'ur'];
const PROFILE_DIGEST_FREQUENCIES = ['off', 'instant', 'daily', 'monthly'];
const PROFILE_PRIVACY_OPTIONS = ['public', 'members', 'connections'];
const PROFILE_TYPES = ['individual', 'organisation'];
const PROFILE_MATCH_FREQUENCIES = ['daily', 'weekly', 'monthly', 'fortnightly', 'never'];
const PROFILE_NOTIFICATION_KEYS = [
  'email_messages',
  'email_connections',
  'caring_smart_nudges',
  'email_listings',
  'email_transactions',
  'email_reviews',
  'email_gamification_digest',
  'email_gamification_milestones',
  'email_digest',
  'email_org_payments',
  'email_org_transfers',
  'email_org_membership',
  'email_org_admin',
  'push_enabled',
  'push_campaigns_opted_in'
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

async function callUserSettings(token, method, path, data = undefined) {
  if (data === undefined) {
    return callUserSettingsApi(token, method, path);
  }

  return callUserSettingsApi(token, method, path, data);
}

async function callProfile(token, method, path, data = undefined) {
  if (data === undefined) {
    return callProfileApi(token, method, path);
  }

  return callProfileApi(token, method, path, data);
}

async function callWebAuthn(token, method, path, data = undefined) {
  if (data === undefined) {
    return callWebAuthnApi(token, method, path);
  }

  return callWebAuthnApi(token, method, path, data);
}

function statusRedirect(path, status, fragment = '') {
  return `${path}?status=${encodeURIComponent(status)}${fragment}`;
}

function profileSettingsRedirect(status, fragment = '') {
  return statusRedirect('/profile/settings', status, fragment);
}

function twoFactorRedirect(status) {
  return statusRedirect('/profile/two-factor', status);
}

function deleteAccountRedirect(status) {
  return statusRedirect('/profile/delete-account', status);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function notificationPayload(body) {
  const payload = PROFILE_NOTIFICATION_KEYS.reduce((prefs, key) => {
    prefs[key] = checked(body[key]);
    return prefs;
  }, {});

  payload.federation_notifications_enabled = checked(body.federation_notifications_enabled);

  const digestFrequency = allowedValue(body.digest_frequency, PROFILE_DIGEST_FREQUENCIES, null);
  if (digestFrequency !== null) {
    payload.digest_frequency = digestFrequency;
  }

  return payload;
}

router.post('/settings', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const profilePayload = {
    first_name: trimmed(req.body.first_name, 100),
    last_name: trimmed(req.body.last_name, 100),
    phone: trimmed(req.body.phone, 50),
    profile_type: allowedValue(req.body.profile_type, PROFILE_TYPES, 'individual'),
    organization_name: trimmed(req.body.organization_name, 150),
    tagline: trimmed(req.body.tagline, 160),
    bio: trimmed(req.body.bio, 5000),
    location: trimmed(req.body.location, 255),
    newsletter_opt_in: checked(req.body.newsletter_opt_in)
  };

  if (profilePayload.first_name === '' || profilePayload.last_name === '') {
    return res.redirect(profileSettingsRedirect('profile-update-failed'));
  }

  let status = 'profile-updated';
  try {
    await callUserSettings(token, 'PUT', '', profilePayload);
    await callUserSettings(token, 'PUT', '/preferences', {
      privacy: {
        privacy_profile: allowedValue(req.body.privacy_profile, PROFILE_PRIVACY_OPTIONS, 'public'),
        privacy_search: checked(req.body.privacy_search),
        privacy_contact: checked(req.body.privacy_contact)
      }
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'profile-update-failed';
  }

  return res.redirect(statusRedirect('/profile', status));
}));

router.post('/email', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const email = trimmed(req.body.email, 255);
  if (email === '' || !validEmail(email)) {
    return res.redirect(profileSettingsRedirect('email-invalid'));
  }

  let status = 'email-changed';
  try {
    await callUserSettings(token, 'PUT', '', {
      email,
      current_password: String(req.body.current_password || '')
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = error instanceof ApiError && error.status === 403 ? 'email-password-incorrect' : 'email-failed';
  }

  return res.redirect(profileSettingsRedirect(status));
}));

router.post('/password', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const currentPassword = String(req.body.current_password || '');
  const newPassword = String(req.body.new_password || '');
  const confirmPassword = String(req.body.new_password_confirmation || req.body.confirm_password || '');
  const preStatus = currentPassword === ''
    ? 'password-current-required'
    : newPassword === '' || newPassword.length < 12
      ? 'password-weak'
      : newPassword !== confirmPassword
        ? 'password-mismatch'
        : null;

  if (preStatus !== null) {
    return res.redirect(profileSettingsRedirect(preStatus));
  }

  let status = 'password-changed';
  try {
    await callUserSettings(token, 'POST', '/password', {
      current_password: currentPassword,
      new_password: newPassword
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    const code = String(error?.data?.code || error?.data?.error || '').toUpperCase();
    status = code.includes('INVALID')
      ? 'password-current-incorrect'
      : code.includes('REUSED')
        ? 'password-reused'
        : code.includes('WEAK')
          ? 'password-weak'
          : 'password-failed';
  }

  return res.redirect(profileSettingsRedirect(status));
}));

router.post('/language', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const language = allowedValue(req.body.language, PROFILE_LOCALES, null);
  if (language === null) {
    return res.redirect(profileSettingsRedirect('language-invalid'));
  }

  let status = 'language-changed';
  try {
    await callUserSettings(token, 'PUT', '/language', { language });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'language-failed';
  }

  return res.redirect(profileSettingsRedirect(status));
}));

router.post('/notifications', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  let status = 'notifications-saved';
  try {
    await callUserSettings(token, 'PUT', '/notifications', notificationPayload(req.body));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'notifications-failed';
  }

  return res.redirect(profileSettingsRedirect(status, '#notifications'));
}));

router.post('/passkeys/rename', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const credentialId = trimmed(req.body.credential_id);
  const deviceName = trimmed(req.body.device_name, 100);
  if (credentialId === '' || deviceName === '') {
    return res.redirect(profileSettingsRedirect('passkey-name-required', '#passkeys'));
  }

  let status = 'passkey-renamed';
  try {
    await callWebAuthn(token, 'POST', '/rename', {
      credential_id: credentialId,
      device_name: deviceName
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = error instanceof ApiError && error.status === 404 ? 'passkey-not-found' : 'passkey-failed';
  }

  return res.redirect(profileSettingsRedirect(status, '#passkeys'));
}));

router.post('/passkeys/remove', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const credentialId = trimmed(req.body.credential_id);
  if (credentialId === '') {
    return res.redirect(profileSettingsRedirect('passkey-not-found', '#passkeys'));
  }

  let status = 'passkey-removed';
  try {
    await callWebAuthn(token, 'POST', '/remove', {
      credential_id: credentialId
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = error instanceof ApiError && error.status === 404 ? 'passkey-not-found' : 'passkey-failed';
  }

  return res.redirect(profileSettingsRedirect(status, '#passkeys'));
}));

router.post('/personalisation', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const locale = allowedValue(req.body.auto_translate_target_locale, PROFILE_LOCALES, null);
  let status = 'personalisation-saved';
  try {
    await callUserSettings(token, 'PUT', '/preferences', {
      feed: {
        prefers_chronological: checked(req.body.prefers_chronological || req.body.prefers_chronological_feed)
      },
      translation: {
        auto_translate_ugc: checked(req.body.auto_translate_ugc),
        auto_translate_target_locale: locale
      }
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'personalisation-failed';
  }

  return res.redirect(profileSettingsRedirect(status, '#personalisation'));
}));

router.post('/match-preferences', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const notificationFrequency = allowedValue(req.body.notification_frequency, PROFILE_MATCH_FREQUENCIES, 'monthly');
  let status = 'match-prefs-saved';
  try {
    await callUserSettings(token, 'PUT', '/match-preferences', {
      notification_frequency: notificationFrequency,
      notify_hot_matches: checked(req.body.notify_hot_matches),
      notify_mutual_matches: checked(req.body.notify_mutual_matches)
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'match-prefs-failed';
  }

  return res.redirect(profileSettingsRedirect(status, '#match-preferences'));
}));

router.post('/skills/add', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const skillName = trimmed(req.body.skill_name, 100);
  if (skillName === '') {
    return res.redirect(profileSettingsRedirect('skill-name-required', '#skills'));
  }

  const isRequesting = checked(req.body.is_requesting);
  let status = 'skill-added';
  try {
    await callUserSettings(token, 'POST', '/skills', {
      skill_name: skillName,
      is_offering: checked(req.body.is_offering) || !isRequesting,
      is_requesting: isRequesting
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'skill-failed';
  }

  return res.redirect(profileSettingsRedirect(status, '#skills'));
}));

router.post('/skills/remove', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const skillId = positiveInteger(req.body.user_skill_id);
  if (skillId === null) {
    return res.redirect(profileSettingsRedirect('skill-failed', '#skills'));
  }

  let status = 'skill-removed';
  try {
    await callUserSettings(token, 'DELETE', `/skills/${skillId}`);
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'skill-failed';
  }

  return res.redirect(profileSettingsRedirect(status, '#skills'));
}));

router.post('/safeguarding/revoke', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const optionId = positiveInteger(req.body.option_id);
  if (optionId === null) {
    return res.redirect(profileSettingsRedirect('safeguarding-failed', '#safeguarding'));
  }

  let status = 'safeguarding-revoked';
  try {
    await callProfile(token, 'POST', '/safeguarding/revoke', {
      option_id: optionId
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = 'safeguarding-failed';
  }

  return res.redirect(profileSettingsRedirect(status, '#safeguarding'));
}));

router.post('/data-export', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  let status = 'data-export-requested';
  try {
    await callUserSettings(token, 'POST', '/gdpr-request', {
      type: 'portability',
      notes: 'Accessible frontend data export request'
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = error instanceof ApiError && error.status === 409 ? 'data-export-exists' : 'data-export-failed';
  }

  return res.redirect(profileSettingsRedirect(status));
}));

router.post('/delete-account', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const password = String(req.body.password || '');
  if (password === '') {
    return res.redirect(deleteAccountRedirect('delete-password-required'));
  }
  if (!checked(req.body.confirm)) {
    return res.redirect(deleteAccountRedirect('delete-confirm-required'));
  }

  try {
    await callUserSettings(token, 'DELETE', '', {
      password,
      reason: trimmed(req.body.reason, 1000) || null
    });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    const status = error instanceof ApiError && error.status === 403 ? 'delete-password-incorrect' : 'delete-failed';
    return res.redirect(deleteAccountRedirect(status));
  }

  return res.redirect('/login?status=account-deletion-requested');
}));

router.post('/two-factor/verify', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const code = trimmed(req.body.code);
  if (code === '') {
    return res.redirect(twoFactorRedirect('2fa-code-required'));
  }

  let status = '2fa-enabled';
  try {
    await callProfile(token, 'POST', '/auth/2fa/verify', { code });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = '2fa-code-invalid';
  }

  return res.redirect(twoFactorRedirect(status));
}));

router.post('/two-factor/disable', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const password = String(req.body.password || '');
  if (password === '') {
    return res.redirect(twoFactorRedirect('2fa-password-required'));
  }

  let status = '2fa-disabled';
  try {
    await callProfile(token, 'POST', '/auth/2fa/disable', { password });
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
    status = '2fa-disable-failed';
  }

  return res.redirect(twoFactorRedirect(status));
}));

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
      first_name: first_name.trim(),
      last_name: last_name.trim()
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
    if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
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
