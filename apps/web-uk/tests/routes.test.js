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
      expect(response.text).toContain('Create an account');
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

    it('GET /settings should redirect to login', async () => {
      const response = await request(app).get('/settings');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');
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
