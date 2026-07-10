// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const request = require('supertest');

jest.mock('../src/lib/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(message, status, data = {}) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
    }
  },
  callProfileApi: jest.fn(),
  callUserSettingsApi: jest.fn(),
  callWebAuthnApi: jest.fn(),
  getProfile: jest.fn(),
  invalidateUserCache: jest.fn(),
  requestAccountDeletion: jest.fn()
}));

jest.mock('../src/middleware/auth', () => ({
  clearAuthCookies: jest.fn(),
  requireAuth: (req, res, next) => next()
}));

const api = require('../src/lib/api');
const { createTranslator } = require('../src/lib/localization');
const profileRouter = require('../src/routes/profile');

function createApp(locale) {
  const app = express();

  app.use(express.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    req.accessibleRouting = {
      tenant: { id: 7, slug: 'test-community' },
      tenantSlug: 'test-community'
    };
    req.signedCookies = { token: 'test-token' };
    req.token = 'test-token';
    req.session = { locale: locale || 'en' };
    req.flash = () => [];
    if (locale) req.t = createTranslator(locale);
    res.locals.urlFor = (pathname) => pathname;
    res.render = (view, locals = {}) => res.json({ view, locals });
    next();
  });
  app.use('/profile', profileRouter);

  return app;
}

describe('request-scoped profile status localization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getProfile.mockResolvedValue({
      data: {
        first_name: 'Ada',
        last_name: 'Lovelace',
        preferred_language: 'en'
      }
    });
    api.callUserSettingsApi.mockResolvedValue({ data: {} });
    api.callProfileApi.mockResolvedValue({ data: {} });
    api.callWebAuthnApi.mockResolvedValue({ data: {} });
  });

  it.each([
    ['profile-updated', 'profile_settings.success'],
    ['data-export-requested', 'states.data-export-requested'],
    ['notifications-saved', 'profile_settings.notifications.saved'],
    ['passkey-name-required', 'profile_settings.passkeys.name_required'],
    ['safeguarding-failed', 'profile_settings.safeguarding.failed']
  ])('renders the %s settings status in Irish', async (status, translationKey) => {
    const response = await request(createApp('ga')).get(`/profile/settings?status=${status}`);

    expect(response.status).toBe(200);
    expect(response.body.locals.status).toBe(status);
    expect(response.body.locals.statusConfig.message).toBe(createTranslator('ga')(translationKey));
  });

  it.each([
    ['email-password-incorrect', 'profile_settings.email_password_incorrect'],
    ['password-mismatch', 'profile_settings.password_mismatch'],
    ['personalisation-failed', 'profile_settings.personalisation.failed'],
    ['match-prefs-saved', 'profile_settings.match.saved'],
    ['skill-failed', 'profile_settings.skills.failed']
  ])('renders the %s settings status in Arabic', async (status, translationKey) => {
    const response = await request(createApp('ar')).get(`/profile/settings?status=${status}`);

    expect(response.status).toBe(200);
    expect(response.body.locals.status).toBe(status);
    expect(response.body.locals.statusConfig.message).toBe(createTranslator('ar')(translationKey));
  });

  it.each([
    ['avatar-invalid', 'Upload a JPG, PNG, GIF or WEBP image smaller than 10MB.'],
    ['email-reauthentication-unavailable', 'Email changes are temporarily unavailable because we cannot securely confirm your password. Your email was not changed.'],
    ['language-failed', 'Your language could not be updated.'],
    ['passkey-failed', 'Your passkey could not be updated.']
  ])('keeps the English fallback for %s because Laravel has no exact message key', async (status, fallback) => {
    const response = await request(createApp('ga')).get(`/profile/settings?status=${status}`);

    expect(response.status).toBe(200);
    expect(response.body.locals.statusConfig.message).toBe(fallback);
  });

  it('localizes delete-account errors in Arabic', async () => {
    const t = createTranslator('ar');
    const response = await request(createApp('ar'))
      .get('/profile/delete-account?status=delete-password-incorrect');

    expect(response.status).toBe(200);
    expect(response.body.locals.status).toBe('delete-password-incorrect');
    expect(response.body.locals.errorMessage).toBe(t('delete_account.error_password_incorrect'));
  });

  it('localizes two-factor statuses in Irish', async () => {
    const t = createTranslator('ga');
    const response = await request(createApp('ga'))
      .get('/profile/two-factor?status=2fa-code-invalid');

    expect(response.status).toBe(200);
    expect(response.body.locals.status).toBe('2fa-code-invalid');
    expect(response.body.locals.statusConfig.message).toBe(t('security_2fa.code_invalid'));
  });

  it('renders the neutral profile-updated query status in Arabic on the destination page', async () => {
    const t = createTranslator('ar');
    const response = await request(createApp('ar')).get('/profile?status=profile-updated');

    expect(response.status).toBe(200);
    expect(response.body.locals.successMessage).toBe(t('profile_settings.success'));
  });

  it('keeps redirects locale-neutral and translates only on the destination request', async () => {
    const app = createApp('ar');
    const updateResponse = await request(app)
      .post('/profile/email')
      .type('form')
      .send({ email: 'not-an-email' });

    expect(updateResponse.status).toBe(302);
    expect(updateResponse.headers.location).toBe('/profile/settings?status=email-invalid');

    const destinationResponse = await request(app).get(updateResponse.headers.location);
    expect(destinationResponse.body.locals.status).toBe('email-invalid');
    expect(destinationResponse.body.locals.statusConfig.message).toBe(
      createTranslator('ar')('profile_settings.email_invalid')
    );
  });

  it('uses the English catalog when isolated routes do not install req.t', async () => {
    const response = await request(createApp()).get('/profile/settings?status=notifications-failed');

    expect(response.status).toBe(200);
    expect(response.body.locals.statusConfig.message).toBe(
      createTranslator('en')('profile_settings.notifications.failed')
    );
  });
});
