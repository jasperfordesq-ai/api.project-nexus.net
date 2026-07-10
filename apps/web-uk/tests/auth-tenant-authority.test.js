// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const express = require('express');
const request = require('supertest');

jest.mock('../src/lib/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(message, status, data) {
      super(message);
      this.status = status;
      this.data = data;
    }
  },
  ApiOfflineError: class ApiOfflineError extends Error {},
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  resendVerification: jest.fn(),
  verify2fa: jest.fn(),
  invalidateUserCache: jest.fn()
}));

jest.mock('../src/middleware/auth', () => ({
  setAuthCookies: jest.fn(),
  clearAuthCookies: jest.fn()
}));

const api = require('../src/lib/api');
const authRouter = require('../src/routes/auth');

function createApp() {
  const app = express();
  app.use(express.urlencoded({ extended: false }));

  app.use('/acme/accessible', (req, res, next) => {
    req.accessibleRouting = {
      mode: 'shared',
      tenantSlug: 'acme',
      prefix: '/acme/accessible'
    };
    res.locals.urlFor = (pathname) => `/acme/accessible${pathname}`;
    next();
  }, authRouter);

  app.use(authRouter);
  return app;
}

describe('auth tenant authority', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TURNSTILE_SECRET_KEY;
    app = createApp();
  });

  it('uses the mounted tenant for login even when a different tenant is posted', async () => {
    api.login.mockResolvedValue({ access_token: 'access-token' });

    const response = await request(app)
      .post('/acme/accessible/login')
      .type('form')
      .send({
        email: 'member@example.test',
        password: 'Test123!',
        tenant_slug: 'crafted-other-tenant'
      });

    expect(response.status).toBe(302);
    expect(api.login).toHaveBeenCalledWith('member@example.test', 'Test123!', 'acme');
  });

  it('keeps accepting the posted tenant for flat login', async () => {
    api.login.mockResolvedValue({ access_token: 'access-token' });

    const response = await request(app)
      .post('/login')
      .type('form')
      .send({
        email: 'member@example.test',
        password: 'Test123!',
        tenant_slug: 'flat-community'
      });

    expect(response.status).toBe(302);
    expect(api.login).toHaveBeenCalledWith('member@example.test', 'Test123!', 'flat-community');
  });

  it('uses the mounted tenant for registration and its automatic login', async () => {
    api.register.mockResolvedValue({});
    api.login.mockResolvedValue({ access_token: 'access-token' });

    const response = await request(app)
      .post('/acme/accessible/register')
      .type('form')
      .send({
        email: 'new-member@example.test',
        password: 'Test123!',
        confirm_password: 'Test123!',
        first_name: 'New',
        last_name: 'Member',
        tenant_slug: 'crafted-other-tenant'
      });

    expect(response.status).toBe(302);
    expect(api.register).toHaveBeenCalledWith(expect.objectContaining({
      tenant_slug: 'acme'
    }));
    expect(api.login).toHaveBeenCalledWith('new-member@example.test', 'Test123!', 'acme');
  });

  it('keeps accepting the posted tenant for flat registration', async () => {
    api.register.mockResolvedValue({});
    api.login.mockResolvedValue({ access_token: 'access-token' });

    const response = await request(app)
      .post('/register')
      .type('form')
      .send({
        email: 'new-member@example.test',
        password: 'Test123!',
        confirm_password: 'Test123!',
        first_name: 'New',
        last_name: 'Member',
        tenant_slug: 'flat-community'
      });

    expect(response.status).toBe(302);
    expect(api.register).toHaveBeenCalledWith(expect.objectContaining({
      tenant_slug: 'flat-community'
    }));
    expect(api.login).toHaveBeenCalledWith('new-member@example.test', 'Test123!', 'flat-community');
  });

  it('uses the mounted tenant for password recovery even when a different tenant is posted', async () => {
    api.forgotPassword.mockResolvedValue({});

    const response = await request(app)
      .post('/acme/accessible/login/forgot-password')
      .type('form')
      .send({
        email: 'member@example.test',
        tenant_slug: 'crafted-other-tenant'
      });

    expect(response.status).toBe(302);
    expect(api.forgotPassword).toHaveBeenCalledWith('member@example.test', 'acme');
  });

  it('keeps accepting the posted tenant for flat password recovery', async () => {
    api.forgotPassword.mockResolvedValue({});

    const response = await request(app)
      .post('/login/forgot-password')
      .type('form')
      .send({
        email: 'member@example.test',
        tenant_slug: 'flat-community'
      });

    expect(response.status).toBe(302);
    expect(api.forgotPassword).toHaveBeenCalledWith('member@example.test', 'flat-community');
  });
});
