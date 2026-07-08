// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getProfile,
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
const PROFILE_LOCALE_LABELS = {
  en: 'English',
  ga: 'Irish',
  cy: 'Welsh',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  pl: 'Polish',
  ar: 'Arabic',
  ur: 'Urdu'
};
const PROFILE_PRIVACY_LABELS = {
  public: 'Anyone signed in to the community',
  members: 'Members only',
  connections: 'Connections only'
};
const PROFILE_TYPE_LABELS = {
  individual: 'Individual',
  organisation: 'Organisation'
};
const PROFILE_DIGEST_LABELS = {
  off: 'Off',
  instant: 'Immediately',
  daily: 'Daily',
  monthly: 'Monthly'
};
const PROFILE_MATCH_FREQUENCY_LABELS = {
  daily: 'Every day',
  weekly: 'Every week',
  fortnightly: 'Every fortnight',
  monthly: 'Every month',
  never: 'Never'
};
const PROFILE_STATUS_MESSAGES = {
  'profile-updated': { type: 'success', message: 'Your profile has been updated.' },
  'profile-update-failed': {
    type: 'error',
    message: 'Your profile could not be updated. Check the details and try again.',
    anchor: 'first_name'
  },
  'data-export-requested': {
    type: 'success',
    message: 'Your data export request has been received. We will email you when it is ready.'
  },
  'data-export-exists': {
    type: 'info',
    message: 'A data export request is already being prepared.'
  },
  'data-export-failed': {
    type: 'error',
    message: 'We could not request your data export. Please try again.',
    anchor: 'data-export'
  },
  'avatar-invalid': {
    type: 'error',
    message: 'Upload a JPG, PNG, GIF or WEBP image smaller than 10MB.',
    anchor: 'avatar'
  },
  'email-changed': { type: 'success', message: 'Your email address has been updated.' },
  'email-unchanged': { type: 'info', message: 'That is already your email address.' },
  'email-invalid': { type: 'error', message: 'Enter a valid email address', anchor: 'email' },
  'email-password-incorrect': {
    type: 'error',
    message: 'Your current password was incorrect. Your email was not changed.',
    anchor: 'current_password'
  },
  'email-failed': {
    type: 'error',
    message: 'Your email address could not be updated. It may already be in use.',
    anchor: 'email'
  },
  'password-changed': { type: 'success', message: 'Your password has been changed.' },
  'password-current-required': {
    type: 'error',
    message: 'Enter your current password',
    anchor: 'current_password_for_password'
  },
  'password-current-incorrect': {
    type: 'error',
    message: 'Your current password was incorrect',
    anchor: 'current_password_for_password'
  },
  'password-weak': {
    type: 'error',
    message: 'Your new password must be at least 12 characters',
    anchor: 'new_password'
  },
  'password-mismatch': {
    type: 'error',
    message: 'The new passwords you entered do not match',
    anchor: 'new_password_confirmation'
  },
  'password-reused': {
    type: 'error',
    message: 'You cannot reuse a recent password. Choose a different one.',
    anchor: 'new_password'
  },
  'password-failed': {
    type: 'error',
    message: 'Your password could not be changed. Try again.',
    anchor: 'current_password_for_password'
  },
  'language-changed': { type: 'success', message: 'Your language has been updated.' },
  'language-invalid': { type: 'error', message: 'Choose a language from the list', anchor: 'language' },
  'language-failed': { type: 'error', message: 'Your language could not be updated.', anchor: 'language' },
  'notifications-saved': { type: 'success', message: 'Your notification preferences have been saved.' },
  'notifications-failed': {
    type: 'error',
    message: 'Your notification preferences could not be saved.',
    anchor: 'notifications'
  },
  'passkey-renamed': { type: 'success', message: 'Your passkey has been renamed.' },
  'passkey-removed': { type: 'success', message: 'Your passkey has been removed.' },
  'passkey-name-required': { type: 'error', message: 'Enter a passkey name.', anchor: 'passkeys' },
  'passkey-not-found': { type: 'error', message: 'We could not find that passkey.', anchor: 'passkeys' },
  'passkey-failed': { type: 'error', message: 'Your passkey could not be updated.', anchor: 'passkeys' },
  'personalisation-saved': { type: 'success', message: 'Your personalisation preferences have been saved.' },
  'personalisation-failed': {
    type: 'error',
    message: 'Your personalisation preferences could not be saved.',
    anchor: 'personalisation'
  },
  'match-prefs-saved': { type: 'success', message: 'Your match notification preferences have been saved.' },
  'match-prefs-failed': {
    type: 'error',
    message: 'Your match notification preferences could not be saved.',
    anchor: 'match-preferences'
  },
  'skill-added': { type: 'success', message: 'Your skill has been added.' },
  'skill-removed': { type: 'success', message: 'Your skill has been removed.' },
  'skill-name-required': { type: 'error', message: 'Enter a skill name.', anchor: 'skill_name' },
  'skill-failed': { type: 'error', message: 'Your skill could not be saved.', anchor: 'skills' },
  'safeguarding-revoked': { type: 'success', message: 'The safeguarding preference has been removed.' },
  'safeguarding-failed': {
    type: 'error',
    message: 'The safeguarding preference could not be updated.',
    anchor: 'safeguarding'
  }
};
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
const DELETE_ACCOUNT_ERRORS = {
  'delete-password-required': 'Enter your password to confirm.',
  'delete-confirm-required': 'Confirm that you understand your account will be deleted.',
  'delete-password-incorrect': 'The password you entered is incorrect.',
  'delete-failed': 'Your account could not be deleted. Try again or contact support.'
};
const TWO_FACTOR_STATUS_MESSAGES = {
  '2fa-enabled': { type: 'success', message: 'Two-step verification is now turned on.' },
  '2fa-disabled': { type: 'success', message: 'Two-step verification has been turned off.' },
  '2fa-code-required': {
    type: 'error',
    message: 'Enter the 6-digit code from your authenticator app.',
    anchor: 'tfa-form'
  },
  '2fa-code-invalid': {
    type: 'error',
    message: 'That code was not correct or has expired. Try the current code from your app.',
    anchor: 'tfa-form'
  },
  '2fa-password-required': {
    type: 'error',
    message: 'Enter your password to turn off two-step verification.',
    anchor: 'tfa-form'
  },
  '2fa-disable-failed': {
    type: 'error',
    message: 'We could not turn off two-step verification. Check your password and try again.',
    anchor: 'tfa-form'
  }
};

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

function payloadFrom(result) {
  if (!result || typeof result !== 'object') return result || {};
  if (Object.prototype.hasOwnProperty.call(result, 'data')) return result.data || {};
  return result;
}

function arrayFromPayload(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }

  return [];
}

function normalizeProfilePayload(result) {
  const payload = payloadFrom(result);
  const profile = payload && typeof payload === 'object' ? payload : {};
  const nested = profile.profile && typeof profile.profile === 'object' ? profile.profile : {};
  return { ...profile, ...nested };
}

function profileValue(profile, key, fallback = '') {
  const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  return profile[key] ?? profile[camelKey] ?? fallback;
}

function boolValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return checked(value);
  }
  return false;
}

function optionsWithSelected(values, labels, selectedValue) {
  return values.map((value) => ({
    value,
    label: labels[value] || value,
    selected: value === selectedValue
  }));
}

function formatProfileDate(value, includeTime = false) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const options = includeTime
    ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleString('en-GB', options);
}

function humanizeProfileLabel(value, fallback = 'Not specified') {
  const text = trimmed(value);
  if (text === '') return fallback;
  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function profileStatusConfig(status) {
  return PROFILE_STATUS_MESSAGES[status] || null;
}

function normalizeNotificationPrefs(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  return {
    email_messages: boolValue(source.email_messages),
    email_connections: boolValue(source.email_connections),
    caring_smart_nudges: boolValue(source.caring_smart_nudges),
    email_listings: boolValue(source.email_listings),
    email_transactions: boolValue(source.email_transactions),
    email_reviews: boolValue(source.email_reviews),
    email_gamification_digest: boolValue(source.email_gamification_digest),
    email_gamification_milestones: boolValue(source.email_gamification_milestones),
    email_digest: boolValue(source.email_digest),
    email_org_payments: boolValue(source.email_org_payments),
    email_org_transfers: boolValue(source.email_org_transfers),
    email_org_membership: boolValue(source.email_org_membership),
    email_org_admin: boolValue(source.email_org_admin),
    push_enabled: boolValue(source.push_enabled),
    push_campaigns_opted_in: boolValue(source.push_campaigns_opted_in),
    federation_notifications_enabled: boolValue(source.federation_notifications_enabled),
    digest_frequency: allowedValue(source.digest_frequency, PROFILE_DIGEST_FREQUENCIES, 'monthly')
  };
}

function normalizeMatchPrefs(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  return {
    notification_frequency: allowedValue(source.notification_frequency, PROFILE_MATCH_FREQUENCIES, 'monthly'),
    notify_hot_matches: boolValue(source.notify_hot_matches, true),
    notify_mutual_matches: boolValue(source.notify_mutual_matches, true)
  };
}

function normalizeSkills(payload) {
  return arrayFromPayload(payload, ['skills', 'items']).map((skill) => ({
    id: skill.id || skill.user_skill_id || '',
    skill_name: skill.skill_name || skill.name || '',
    is_offering: boolValue(skill.is_offering),
    is_requesting: boolValue(skill.is_requesting),
    endorsement_count: Number(skill.endorsement_count || skill.endorsements_count || 0)
  })).filter((skill) => skill.skill_name !== '');
}

function normalizePasskeys(payload) {
  return arrayFromPayload(payload, ['credentials', 'passkeys', 'items']).map((passkey) => ({
    credential_id: passkey.credential_id || passkey.id || '',
    device_name: passkey.device_name || passkey.name || 'Passkey',
    authenticator_type: humanizeProfileLabel(passkey.authenticator_type || passkey.type || ''),
    created_label: formatProfileDate(passkey.created_at || passkey.createdAt),
    last_used_label: formatProfileDate(passkey.last_used_at || passkey.lastUsedAt)
  }));
}

function normalizeSessions(payload) {
  return arrayFromPayload(payload, ['sessions', 'items']).map((session) => ({
    id: session.id || '',
    device_label: humanizeProfileLabel(session.device_type || session.device || session.user_agent, 'Unknown device'),
    ip_address: session.ip_address || session.ip || '',
    last_active_label: formatProfileDate(session.last_active || session.last_active_at || session.updated_at, true)
  }));
}

function normalizeSafeguarding(payload) {
  return arrayFromPayload(payload, ['preferences', 'items']).map((option) => ({
    option_id: option.option_id || option.id || '',
    label: option.label || option.name || 'Safeguarding preference',
    description: option.description || '',
    activation_label: option.requires_broker_approval
      ? 'Exchanges need broker approval'
      : option.requires_guardian_approval
        ? 'Exchanges need guardian approval'
        : 'Active'
  }));
}

function buildProfileSettingsViewModel(req, data) {
  const profile = data.profile || {};
  const account = data.account || {};
  const preferredLanguage = allowedValue(
    account.preferred_language || profileValue(profile, 'preferred_language'),
    PROFILE_LOCALES,
    'en'
  );
  const privacyProfile = allowedValue(
    profileValue(profile, 'privacy_profile', account.privacy_profile),
    PROFILE_PRIVACY_OPTIONS,
    'public'
  );
  const profileType = allowedValue(profileValue(profile, 'profile_type'), PROFILE_TYPES, 'individual');
  const autoTranslateLocale = allowedValue(
    account.auto_translate_target_locale || profileValue(profile, 'auto_translate_target_locale'),
    PROFILE_LOCALES,
    preferredLanguage
  );
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const statusConfig = profileStatusConfig(status);

  return {
    title: 'Edit your profile',
    activeNav: 'profile',
    status,
    statusConfig,
    successStatus: statusConfig && statusConfig.type === 'success',
    infoStatus: statusConfig && statusConfig.type === 'info',
    errorStatus: statusConfig && statusConfig.type === 'error',
    errorAnchor: statusConfig ? statusConfig.anchor || 'profile-settings' : '',
    csrfToken: req.csrfToken ? req.csrfToken() : '',
    profile: {
      id: profileValue(profile, 'id'),
      first_name: profileValue(profile, 'first_name'),
      last_name: profileValue(profile, 'last_name'),
      email: account.email || profileValue(profile, 'email'),
      phone: profileValue(profile, 'phone'),
      profile_type: profileType,
      organization_name: profileValue(profile, 'organization_name'),
      tagline: profileValue(profile, 'tagline'),
      bio: profileValue(profile, 'bio'),
      location: profileValue(profile, 'location'),
      avatar_url: profileValue(profile, 'avatar_url'),
      privacy_profile: privacyProfile,
      privacy_search: boolValue(profileValue(profile, 'privacy_search'), true),
      privacy_contact: boolValue(account.privacy_contact, profileValue(profile, 'privacy_contact'), true),
      newsletter_opt_in: boolValue(account.newsletter_opt_in, profileValue(profile, 'newsletter_opt_in')),
      prefers_chronological_feed: boolValue(
        account.prefers_chronological_feed,
        profileValue(profile, 'prefers_chronological_feed')
      ),
      auto_translate_ugc: boolValue(account.auto_translate_ugc, profileValue(profile, 'auto_translate_ugc')),
      auto_translate_target_locale: autoTranslateLocale
    },
    currentLanguageLabel: PROFILE_LOCALE_LABELS[preferredLanguage] || preferredLanguage,
    privacyProfileLabel: PROFILE_PRIVACY_LABELS[privacyProfile] || privacyProfile,
    profileTypeOptions: optionsWithSelected(PROFILE_TYPES, PROFILE_TYPE_LABELS, profileType),
    privacyOptions: optionsWithSelected(PROFILE_PRIVACY_OPTIONS, PROFILE_PRIVACY_LABELS, privacyProfile),
    localeOptions: optionsWithSelected(PROFILE_LOCALES, PROFILE_LOCALE_LABELS, preferredLanguage),
    autoTranslateLocaleOptions: optionsWithSelected(PROFILE_LOCALES, PROFILE_LOCALE_LABELS, autoTranslateLocale),
    digestOptions: optionsWithSelected(
      PROFILE_DIGEST_FREQUENCIES,
      PROFILE_DIGEST_LABELS,
      data.notificationPrefs.digest_frequency
    ),
    matchFrequencyOptions: optionsWithSelected(
      PROFILE_MATCH_FREQUENCIES,
      PROFILE_MATCH_FREQUENCY_LABELS,
      data.matchPrefs.notification_frequency
    ),
    notificationPrefs: data.notificationPrefs,
    digestFrequencyLabel: PROFILE_DIGEST_LABELS[data.notificationPrefs.digest_frequency],
    matchPrefs: data.matchPrefs,
    matchFrequencyLabel: PROFILE_MATCH_FREQUENCY_LABELS[data.matchPrefs.notification_frequency],
    mySkills: data.skills,
    passkeys: data.passkeys,
    sessions: data.sessions,
    safeguarding: data.safeguarding,
    settingsLinks: [
      {
        href: '/settings/linked-accounts',
        title: 'Linked accounts',
        text: 'Manage social sign-in providers connected to your account.'
      },
      {
        href: '/settings/appearance',
        title: 'Appearance',
        text: 'Choose display, colour and accessibility preferences.'
      },
      {
        href: '/settings/data-rights',
        title: 'Your data rights',
        text: 'Review privacy controls and data protection requests.'
      },
      {
        href: '/settings/insurance',
        title: 'Insurance certificates',
        text: 'Upload or review proof of insurance for verified activity.'
      },
      {
        href: '/settings/availability',
        title: 'Your availability',
        text: 'Keep times and preferred ways to help up to date.'
      }
    ],
    notificationGroups: [
      {
        title: 'Messages and connections',
        items: [
          { key: 'email_messages', label: 'Messages from other members' },
          { key: 'email_connections', label: 'Connection requests and updates' }
        ]
      },
      {
        title: 'Marketplace and organisations',
        items: [
          { key: 'email_listings', label: 'Listing updates' },
          { key: 'email_transactions', label: 'Transaction updates' },
          { key: 'email_reviews', label: 'Review reminders' },
          { key: 'email_org_payments', label: 'Organisation payment updates' },
          { key: 'email_org_transfers', label: 'Organisation transfer updates' },
          { key: 'email_org_membership', label: 'Organisation membership updates' },
          { key: 'email_org_admin', label: 'Organisation admin updates' }
        ]
      },
      {
        title: 'Community updates',
        items: [
          { key: 'caring_smart_nudges', label: 'Caring community nudges' },
          { key: 'email_gamification_digest', label: 'Gamification digest emails' },
          { key: 'email_gamification_milestones', label: 'Milestone emails' },
          { key: 'email_digest', label: 'Activity digest emails' },
          { key: 'push_enabled', label: 'Push notifications' },
          { key: 'push_campaigns_opted_in', label: 'Campaign notifications' },
          { key: 'federation_notifications_enabled', label: 'Federation notifications' }
        ]
      }
    ]
  };
}

function twoFactorStatusConfig(status) {
  return TWO_FACTOR_STATUS_MESSAGES[status] || null;
}

function backupCodesRemainingLabel(count) {
  const number = Number(count || 0);
  if (number === 0) return 'You have no backup codes left.';
  if (number === 1) return 'You have 1 backup code left.';
  return `You have ${number} backup codes left.`;
}

function normalizeTwoFactorPayload(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const setup = source.setup && typeof source.setup === 'object' ? source.setup : source;
  const enabled = boolValue(source.enabled, source.is_enabled, source.two_factor_enabled);
  const qrDataUri = setup.qr_data_uri || setup.qrDataUri || setup.qr_code_data_uri || '';
  const secret = setup.secret || setup.setup_key || setup.manual_key || '';
  const backupCodes = arrayFromPayload(source, ['backup_codes', 'backupCodes']);
  const backupCodesRemaining = Number(
    source.backup_codes_remaining ?? source.backupCodesRemaining ?? source.backup_code_count ?? backupCodes.length
  );

  return {
    enabled,
    setup: enabled || (qrDataUri === '' && secret === '')
      ? null
      : {
          qr_data_uri: qrDataUri,
          secret
        },
    backupCodes,
    backupCodesRemaining: Number.isFinite(backupCodesRemaining) ? backupCodesRemaining : 0,
    backupCodesRemainingLabel: backupCodesRemainingLabel(backupCodesRemaining)
  };
}

function normalizeBlockedUsers(payload) {
  return arrayFromPayload(payload, ['blocked', 'users', 'items']).map((blockedUser) => {
    const name = trimmed(blockedUser.name || blockedUser.display_name || blockedUser.full_name || 'Unknown member');
    return {
      user_id: Number(blockedUser.user_id || blockedUser.id || blockedUser.blocked_user_id || 0),
      name,
      initial: (name || 'U').slice(0, 1).toUpperCase(),
      avatar_url: blockedUser.avatar_url || blockedUser.avatarUrl || '',
      reason: blockedUser.reason || ''
    };
  });
}

router.get('/settings', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const data = {
    profile: {},
    account: {},
    notificationPrefs: normalizeNotificationPrefs({}),
    matchPrefs: normalizeMatchPrefs({}),
    skills: [],
    passkeys: [],
    sessions: [],
    safeguarding: []
  };

  try {
    data.profile = normalizeProfilePayload(await getProfile(token));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  try {
    data.account = payloadFrom(await callUserSettings(token, 'GET', ''));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  try {
    data.notificationPrefs = normalizeNotificationPrefs(
      payloadFrom(await callUserSettings(token, 'GET', '/notifications'))
    );
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  try {
    data.matchPrefs = normalizeMatchPrefs(payloadFrom(await callUserSettings(token, 'GET', '/match-preferences')));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  try {
    data.skills = normalizeSkills(payloadFrom(await callUserSettings(token, 'GET', '/skills')));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  try {
    data.passkeys = normalizePasskeys(payloadFrom(await callWebAuthn(token, 'GET', '/credentials')));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  try {
    data.sessions = normalizeSessions(payloadFrom(await callProfile(token, 'GET', '/sessions')));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  try {
    data.safeguarding = normalizeSafeguarding(payloadFrom(await callProfile(token, 'GET', '/safeguarding/preferences')));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  return res.render('profile/settings', buildProfileSettingsViewModel(req, data));
}));

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

router.get('/delete-account', (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const errorMessage = DELETE_ACCOUNT_ERRORS[status] || '';

  return res.render('profile/delete', {
    title: 'Delete your account',
    activeNav: 'profile',
    status,
    errorMessage,
    passwordError: ['delete-password-required', 'delete-password-incorrect'].includes(status),
    confirmError: status === 'delete-confirm-required',
    communityName: res.locals.tenantName || res.locals.serviceName || 'this community'
  });
});

router.get('/two-factor', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  let twoFactor = normalizeTwoFactorPayload({});
  try {
    twoFactor = normalizeTwoFactorPayload(payloadFrom(await callProfile(token, 'GET', '/auth/2fa/setup')));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  const status = typeof req.query.status === 'string' ? req.query.status : '';
  const statusConfig = twoFactorStatusConfig(status);

  return res.render('profile/two-factor', {
    title: 'Authenticator app (two-step verification)',
    activeNav: 'profile',
    status,
    statusConfig,
    successStatus: statusConfig && statusConfig.type === 'success',
    errorStatus: statusConfig && statusConfig.type === 'error',
    errorAnchor: statusConfig ? statusConfig.anchor || 'tfa-form' : '',
    enabled: twoFactor.enabled,
    setup: twoFactor.setup,
    backupCodes: twoFactor.backupCodes,
    backupCodesRemaining: twoFactor.backupCodesRemaining,
    backupCodesRemainingLabel: twoFactor.backupCodesRemainingLabel,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
}));

router.get('/blocked', asyncRoute(async (req, res) => {
  const token = tokenFrom(req);
  if (!token) return res.redirect(loginRedirect());

  let blocked = [];
  try {
    blocked = normalizeBlockedUsers(payloadFrom(await callProfile(token, 'GET', '/users/blocked')));
  } catch (error) {
    if (redirectOnAuthError(error, res)) return undefined;
  }

  const status = typeof req.query.status === 'string' ? req.query.status : '';

  return res.render('profile/blocked', {
    title: 'Blocked members',
    activeNav: 'profile',
    status,
    successStatus: status === 'member-unblocked',
    blocked,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
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

// View profile
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const profile = await getProfile(req.token);

  res.render('profile/index', {
    title: 'Your profile',
    profile,
    successMessage: req.flash ? req.flash('success')[0] : null
  });
}));

module.exports = router;
