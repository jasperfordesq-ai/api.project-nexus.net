// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  updateProfile,
  saveOnboardingSafeguarding,
  completeOnboarding,
  ApiError
} = require('../lib/api');
const { asyncRoute } = require('../lib/routeHelpers');

const router = express.Router();
const SESSION_KEY = 'alphaOnboarding';
const DEFAULT_STEPS = ['welcome', 'profile', 'interests', 'skills', 'safeguarding', 'confirm'];

function getBag(req) {
  if (!req.session) return {};
  req.session[SESSION_KEY] = req.session[SESSION_KEY] || {};
  return req.session[SESSION_KEY];
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function collectIds(value) {
  return [...new Set(asArray(value)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0))];
}

function collectSafeguarding(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];

  return Object.entries(raw)
    .map(([optionId, value]) => ({
      option_id: Number(optionId),
      value: Array.isArray(value) ? String(value[0] || '').trim() : String(value || '').trim()
    }))
    .filter((preference) => Number.isInteger(preference.option_id) && preference.option_id > 0 && preference.value);
}

function collectSafeguardingFromRaw(rawBody) {
  const preferences = [];
  const params = new URLSearchParams(String(rawBody || ''));

  for (const [key, value] of params.entries()) {
    const match = key.match(/^safeguarding\[(\d+)\]$/);
    const text = String(value || '').trim();
    if (match && text) {
      preferences.push({ option_id: Number(match[1]), value: text });
    }
  }

  return preferences.filter((preference) => Number.isInteger(preference.option_id) && preference.option_id > 0);
}

function collectSafeguardingFromBody(body, rawBody) {
  const raw = collectSafeguardingFromRaw(rawBody);
  if (raw.length > 0) return raw;

  const nested = collectSafeguarding(body.safeguarding);
  if (nested.length > 0) return nested;

  const flat = {};
  for (const [key, value] of Object.entries(body)) {
    const match = key.match(/^safeguarding\[(\d+)\]$/);
    if (match) flat[match[1]] = value;
  }
  return collectSafeguarding(flat);
}

function nextStep(step) {
  const index = DEFAULT_STEPS.indexOf(step);
  if (index === -1) return '/onboarding';
  return DEFAULT_STEPS[index + 1] ? `/onboarding/${DEFAULT_STEPS[index + 1]}` : '/dashboard?status=onboarding-complete';
}

function isAuthError(error) {
  return error instanceof ApiError && error.status === 401;
}

function completeFailureRedirect(error) {
  if (!(error instanceof ApiError)) {
    return '/onboarding/confirm?status=complete-failed';
  }

  const field = String(error.data?.field || '');
  const message = String(error.message || '');
  if (field === 'avatar_url' || /avatar/i.test(message)) {
    return '/onboarding/profile?status=avatar-required';
  }
  if (field === 'bio' || /bio/i.test(message)) {
    return '/onboarding/profile?status=bio-too-short';
  }
  return '/onboarding/confirm?status=complete-failed';
}

router.post('/avatar', requireAuth, (req, res) => {
  res.redirect('/onboarding/profile?status=avatar-failed');
});

router.post('/:step([a-z]+)', requireAuth, asyncRoute(async (req, res) => {
  const step = String(req.params.step || '');
  if (!DEFAULT_STEPS.includes(step)) {
    return res.redirect('/onboarding');
  }

  const bag = getBag(req);

  if (step === 'profile') {
    const bio = String(req.body.bio || '').trim();
    try {
      await updateProfile(req.token, { bio: bio || null });
    } catch (error) {
      if (isAuthError(error)) throw error;
      return res.redirect('/onboarding/profile?status=bio-too-short');
    }
  }

  if (step === 'interests') {
    bag.interests = collectIds(req.body.interests);
  }

  if (step === 'skills') {
    bag.offers = collectIds(req.body.offers);
    bag.needs = collectIds(req.body.needs);
  }

  if (step === 'safeguarding') {
    const preferences = collectSafeguardingFromBody(req.body, req.rawUrlencodedBody);
    if (preferences.length > 0) {
      try {
        await saveOnboardingSafeguarding(req.token, preferences);
      } catch (error) {
        if (isAuthError(error)) throw error;
        return res.redirect('/onboarding/safeguarding?status=safeguarding-failed');
      }
    }
  }

  if (step === 'confirm') {
    try {
      await completeOnboarding(req.token, {
        interests: collectIds(bag.interests),
        offers: collectIds(bag.offers),
        needs: collectIds(bag.needs)
      });
      if (req.session) delete req.session[SESSION_KEY];
      return res.redirect('/dashboard?status=onboarding-complete');
    } catch (error) {
      if (isAuthError(error)) throw error;
      return res.redirect(completeFailureRedirect(error));
    }
  }

  return res.redirect(nextStep(step));
}));

module.exports = router;
