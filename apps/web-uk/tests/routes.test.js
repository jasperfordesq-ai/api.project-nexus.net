// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Integration tests for routes
 */

const request = require('supertest');

// Mock the API module before requiring the app
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
  getUnreadCount: jest.fn(),
  getTransactions: jest.fn()
}));

// Set required env vars
process.env.COOKIE_SECRET = 'test-secret-at-least-32-characters';
process.env.SESSION_SECRET = 'test-session-secret-32-chars!!';
process.env.NODE_ENV = 'test';

describe('Public Routes', () => {
  let app;

  beforeAll(() => {
    // Require app after mocks are set up
    app = require('../src/server');
  });

  describe('GET /', () => {
    it('should return 200 and render home page', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Project NEXUS Community');
    });
  });

  describe('GET /health', () => {
    it('should return OK', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });
  });

  describe('GET /login', () => {
    it('should return login page', async () => {
      const response = await request(app).get('/login');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Sign in');
    });
  });

  describe('GET /register', () => {
    it('should return registration page', async () => {
      const response = await request(app).get('/register');

      expect(response.status).toBe(200);
      expect(response.text).toContain('<h1 class="govuk-heading-xl">Register</h1>');
    });
  });

  describe('GET /nonexistent', () => {
    it('should return 404', async () => {
      const response = await request(app).get('/nonexistent-page');

      expect(response.status).toBe(404);
      expect(response.text).toContain('Page not found');
    });
  });
});

describe('Protected Routes', () => {
  let app;

  beforeAll(() => {
    app = require('../src/server');
  });

  describe('without authentication', () => {
    it('GET /dashboard should redirect to login', async () => {
      const response = await request(app).get('/dashboard');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');
    });

    it('GET /listings should redirect to login', async () => {
      const response = await request(app).get('/listings');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');
    });

    it('GET /wallet should redirect to login', async () => {
      const response = await request(app).get('/wallet');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');
    });

    it('GET /messages should redirect to login', async () => {
      const response = await request(app).get('/messages');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');
    });

    it('GET /profile should redirect to login', async () => {
      const response = await request(app).get('/profile');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');
    });

    it('GET /settings should return not found', async () => {
      const response = await request(app).get('/settings');

      expect(response.status).toBe(404);
      expect(response.text).toContain('Page not found');
    });

    it('GET /progress should return not found', async () => {
      const response = await request(app).get('/progress');

      expect(response.status).toBe(404);
      expect(response.text).toContain('Page not found');
    });

    it('GET /profile/edit should return not found', async () => {
      const response = await request(app).get('/profile/edit');

      expect(response.status).toBe(404);
      expect(response.text).toContain('Page not found');
    });

    it('legacy wallet GET pages should return not found', async () => {
      for (const path of ['/wallet/transactions', '/wallet/transactions/42', '/wallet/transfer']) {
        const response = await request(app).get(path);

        expect(response.status).toBe(404);
        expect(response.text).toContain('Page not found');
      }
    });

    it('bare /messages/new should return not found', async () => {
      const getResponse = await request(app).get('/messages/new');
      expect(getResponse.status).toBe(404);
      expect(getResponse.text).toContain('Page not found');

      const agent = request.agent(app);
      const csrfPage = await agent.get('/login');
      const csrfMatch = csrfPage.text.match(/name="_csrf" value="([^"]+)"/);
      expect(csrfMatch).not.toBeNull();

      const postResponse = await agent
        .post('/messages/new')
        .type('form')
        .send({ _csrf: csrfMatch[1] });

      expect(postResponse.status).toBe(404);
      expect(postResponse.text).toContain('Page not found');
    });

    it('legacy feed post routes should return not found', async () => {
      for (const path of ['/feed/new', '/feed/42', '/feed/42/edit']) {
        const response = await request(app).get(path);

        expect(response.status).toBe(404);
        expect(response.text).toContain('Page not found');
      }

      const agent = request.agent(app);
      const csrfPage = await agent.get('/login');
      const csrfMatch = csrfPage.text.match(/name="_csrf" value="([^"]+)"/);
      expect(csrfMatch).not.toBeNull();

      for (const path of [
        '/feed/new',
        '/feed/42/edit',
        '/feed/42/delete',
        '/feed/42/like',
        '/feed/42/unlike',
        '/feed/42/comments',
        '/feed/42/comments/12/delete'
      ]) {
        const response = await agent
          .post(path)
          .type('form')
          .send({ _csrf: csrfMatch[1] });

        expect(response.status).toBe(404);
        expect(response.text).toContain('Page not found');
      }
    });

    it('legacy event routes should return not found', async () => {
      const myEventsResponse = await request(app).get('/events/my');
      expect(myEventsResponse.status).toBe(404);
      expect(myEventsResponse.text).toContain('Page not found');

      const agent = request.agent(app);
      const csrfPage = await agent.get('/login');
      const csrfMatch = csrfPage.text.match(/name="_csrf" value="([^"]+)"/);
      expect(csrfMatch).not.toBeNull();

      const removeRsvpResponse = await agent
        .post('/events/42/rsvp/remove')
        .type('form')
        .send({ _csrf: csrfMatch[1] });

      expect(removeRsvpResponse.status).toBe(404);
      expect(removeRsvpResponse.text).toContain('Page not found');
    });

    it('legacy group member-management routes should return not found', async () => {
      for (const path of ['/groups/my', '/groups/42/members']) {
        const response = await request(app).get(path);

        expect(response.status).toBe(404);
        expect(response.text).toContain('Page not found');
      }

      const agent = request.agent(app);
      const csrfPage = await agent.get('/login');
      const csrfMatch = csrfPage.text.match(/name="_csrf" value="([^"]+)"/);
      expect(csrfMatch).not.toBeNull();

      for (const path of [
        '/groups/42/members/add',
        '/groups/42/members/55/remove',
        '/groups/42/members/55/role',
        '/groups/42/transfer-ownership'
      ]) {
        const response = await agent
          .post(path)
          .type('form')
          .send({ _csrf: csrfMatch[1] });

        expect(response.status).toBe(404);
        expect(response.text).toContain('Page not found');
      }
    });
  });
});

describe('Security Headers', () => {
  let app;

  beforeAll(() => {
    app = require('../src/server');
  });

  it('should include security headers', async () => {
    const response = await request(app).get('/');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});
