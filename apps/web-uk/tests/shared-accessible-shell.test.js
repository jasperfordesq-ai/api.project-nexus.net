// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Shared accessible frontend preparation tests.
 *
 * These pin the future shared accessible shell against the Laravel Blade
 * accessible frontend's visual contract without claiming full workflow parity.
 */

const fs = require('fs');
const path = require('path');
const request = require('supertest');

jest.mock('../src/lib/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(message, status, data) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
    }
  },
  ApiOfflineError: class ApiOfflineError extends Error {
    constructor(message = 'Unable to connect') {
      super(message);
      this.name = 'ApiOfflineError';
      this.status = 503;
    }
  },
  login: jest.fn(),
  register: jest.fn(),
  validateToken: jest.fn(),
  getProfile: jest.fn(),
  getListings: jest.fn(),
  getBalance: jest.fn(),
  getUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 0 }),
  getNotificationUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 0 }),
  getTransactions: jest.fn()
}));

process.env.COOKIE_SECRET = 'test-secret-at-least-32-characters';
process.env.SESSION_SECRET = 'test-session-secret-32-chars!!';
process.env.NODE_ENV = 'test';

describe('shared accessible frontend shell', () => {
  let app;

  beforeAll(() => {
    app = require('../src/server');
  });

  it('renders the Laravel-style accessible shell on the home page', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('class="nexus-alpha-header"');
    expect(response.text).toContain('class="govuk-service-navigation"');
    expect(response.text).toContain('href="/explore"');
    expect(response.text).toContain('class="govuk-footer__navigation"');
    expect(response.text).toContain('Licensed under GNU AGPL v3');
    expect(response.text).toContain('Source code');
  });

  it('renders the shared Explore skeleton from the Laravel accessible IA', async () => {
    const response = await request(app).get('/explore');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Explore Project NEXUS Community');
    expect(response.text).toContain('class="nexus-alpha-card-list');
    expect(response.text).toContain('Browse listings');
    expect(response.text).toContain('Find members');
    expect(response.text).toContain('This page is a shared-accessible-frontend preparation skeleton');
  });

  it('keeps the rendered footer clear of official government identity claims', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).not.toContain('© Crown copyright');
    expect(response.text).not.toContain('Open Government Licence');
    expect(response.text).not.toContain('GOV.UK service');
  });

  it('documents official GOV.UK upstream repositories and shared-frontend status', () => {
    const docsPath = path.join(__dirname, '..', 'docs', 'ACCESSIBLE_SHARED_FRONTEND.md');
    const docs = fs.readFileSync(docsPath, 'utf8');

    expect(docs).toContain('alphagov/govuk-frontend');
    expect(docs).toContain('alphagov/govuk-design-system');
    expect(docs).toContain('future shared accessible frontend candidate');
    expect(docs).toContain('does not certify production readiness');
  });
});
