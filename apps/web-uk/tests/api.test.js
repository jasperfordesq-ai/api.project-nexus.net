// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Unit tests for API client
 */

// Mock fetch before requiring the module
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Set environment variable before requiring
process.env.API_BASE_URL = 'http://localhost:5000';

const { ApiError, ApiOfflineError } = require('../src/lib/api');

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('ApiError', () => {
    it('should create error with message and status', () => {
      const error = new ApiError('Test error', 400, { field: 'value' });

      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.data).toEqual({ field: 'value' });
      expect(error.name).toBe('ApiError');
    });
  });

  describe('ApiOfflineError', () => {
    it('should create offline error with default message', () => {
      const error = new ApiOfflineError();

      expect(error.message).toBe('Unable to connect to the service');
      expect(error.status).toBe(503);
      expect(error.name).toBe('ApiOfflineError');
    });

    it('should accept custom message', () => {
      const error = new ApiOfflineError('Custom offline message');

      expect(error.message).toBe('Custom offline message');
    });
  });
});

describe('API Request Functions', () => {
  // Re-require to get fresh module with mocked fetch
  let api;

  beforeEach(() => {
    jest.resetModules();
    mockFetch.mockClear();
    api = require('../src/lib/api');
  });

  describe('login', () => {
    it('should send correct request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ access_token: 'test-token', user: { id: 1 } })
      });

      const result = await api.login('test@example.com', 'password123', 'acme');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            tenant_slug: 'acme'
          })
        })
      );
      expect(result.access_token).toBe('test-token');
    });

    it('should throw ApiError on 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ error: 'Invalid credentials' })
      });

      await expect(api.login('test@example.com', 'wrong', 'acme'))
        .rejects.toThrow(api.ApiError);
    });
  });

  describe('getListings', () => {
    it('should send auth header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ data: [], pagination: {} })
      });

      await api.getListings('test-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/listings',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should include query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ data: [] })
      });

      await api.getListings('test-token', { status: 'active', page: 2 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=active'),
        expect.anything()
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.anything()
      );
    });
  });

  describe('getVolunteerOrganisations', () => {
    it('should call the Laravel volunteering organisations endpoint with search and per_page params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: [
            { id: 7, name: 'Community Club', description: 'A local volunteer organisation.' }
          ],
          meta: { per_page: 30, has_more: false }
        })
      });

      const result = await api.getVolunteerOrganisations({ search: 'club', per_page: 30 });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/volunteering/organisations?search=club&per_page=30',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result.data[0].name).toBe('Community Club');
    });
  });

  describe('getVolunteeringOpportunities', () => {
    it('should call the Laravel volunteering opportunities endpoint with search, category, remote and per_page params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: [
            { id: 77, title: 'Community Kitchen Helper', is_remote: true }
          ],
          meta: { per_page: 20, has_more: false }
        })
      });

      const result = await api.getVolunteeringOpportunities({
        search: 'kitchen',
        category_id: 3,
        is_remote: true,
        per_page: 20
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/volunteering/opportunities?search=kitchen&category_id=3&is_remote=true&per_page=20',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result.data[0].title).toBe('Community Kitchen Helper');
    });
  });

  describe('getVolunteerOrganisation', () => {
    it('should call the Laravel public volunteering organisation detail endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: {
            id: 42,
            name: 'Community Club',
            public_contract: {
              id: 42,
              name: 'Community Club',
              stats: { opportunity_count: 2, volunteer_count: 5 }
            }
          }
        })
      });

      const result = await api.getVolunteerOrganisation(42);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/volunteering/organisations/42?include=public_contract',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result.data.public_contract.name).toBe('Community Club');
    });
  });

  describe('getMyVolunteerOrganisations', () => {
    it('should call the Laravel my organisations endpoint with auth and per_page params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          items: [
            { id: 7, name: 'Community Club', status: 'approved', member_role: 'owner' }
          ],
          meta: { per_page: 50 }
        })
      });

      const result = await api.getMyVolunteerOrganisations('test-token', { per_page: 50 });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/volunteering/my-organisations?per_page=50',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(result.items[0].name).toBe('Community Club');
    });
  });

  describe('getOrganisationJobs', () => {
    it('should call the Laravel jobs endpoint for open jobs at an organisation with auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          items: [
            { id: 501, title: 'Volunteer Coordinator', type: 'volunteer' }
          ],
          meta: { limit: 20 }
        })
      });

      const result = await api.getOrganisationJobs(42, 'test-token', { limit: 20 });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/jobs?organization_id=42&status=open&limit=20',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(result.items[0].title).toBe('Volunteer Coordinator');
    });
  });

  describe('getJobs', () => {
    it('should call the Laravel jobs endpoint with browse filters and auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          items: [
            { id: 501, title: 'Volunteer Coordinator', type: 'volunteer' }
          ],
          meta: { total: 1, has_more: false, offset: 12, per_page: 12 }
        })
      });

      const result = await api.getJobs('test-token', {
        limit: 12,
        offset: 12,
        status: 'open',
        sort: 'deadline',
        search: 'coordinator',
        type: 'paid',
        commitment: 'part_time',
        is_remote: 1
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/jobs?limit=12&offset=12&status=open&sort=deadline&search=coordinator&type=paid&commitment=part_time&is_remote=1',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(result.items[0].title).toBe('Volunteer Coordinator');
    });
  });

  describe('getJob', () => {
    it('should call the Laravel job detail endpoint with auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: { id: 501, title: 'Volunteer Coordinator', type: 'volunteer' }
        })
      });

      const result = await api.getJob('test-token', 501);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/jobs/501',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(result.data.title).toBe('Volunteer Coordinator');
    });
  });

  describe('callJobApi', () => {
    it('should call Laravel v2 job action endpoints with auth, method, and optional payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ data: { message: 'updated' } })
      });

      await api.callJobApi('test-token', 'PUT', '/applications/91', {
        status: 'shortlisted',
        notes: 'Strong fit'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/jobs/applications/91',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ status: 'shortlisted', notes: 'Strong fit' })
        })
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({})
      });

      await api.callJobApi('test-token', 'DELETE', '/alerts/12');

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:5000/api/v2/jobs/alerts/12',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('getVolunteerOpportunity', () => {
    it('should call the Laravel volunteering opportunity detail endpoint with auth when present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: {
            id: 77,
            title: 'Community Kitchen Helper',
            organization_id: 42,
            org_name: 'Community Club',
            has_applied: false
          }
        })
      });

      const result = await api.getVolunteerOpportunity(77, 'test-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/volunteering/opportunities/77',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(result.data.title).toBe('Community Kitchen Helper');
    });
  });

  describe('getOrganisationOpportunities', () => {
    it('should call the Laravel volunteering opportunities endpoint for an organisation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: [
            { id: 77, title: 'Community Kitchen Helper', is_remote: true }
          ],
          meta: { per_page: 10 }
        })
      });

      const result = await api.getOrganisationOpportunities(42, { per_page: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/volunteering/opportunities?organization_id=42&per_page=10',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result.data[0].title).toBe('Community Kitchen Helper');
    });
  });

  describe('getOrganisationReviews', () => {
    it('should call the Laravel volunteering organisation reviews endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: {
            reviews: [
              { id: 12, rating: 5, comment: 'Helpful and welcoming.' }
            ]
          }
        })
      });

      const result = await api.getOrganisationReviews(42);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/volunteering/reviews/organization/42',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result.data.reviews[0].rating).toBe(5);
    });
  });

  describe('network errors', () => {
    it('should throw ApiOfflineError on connection refused', async () => {
      const error = new Error('fetch failed');
      error.code = 'ECONNREFUSED';
      mockFetch.mockRejectedValueOnce(error);

      await expect(api.login('test@example.com', 'pass', 'acme'))
        .rejects.toThrow(api.ApiOfflineError);
    });
  });

  describe('submitContact', () => {
    it('should call the Laravel v2 contact endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { message: 'received' } })
      });

      await api.submitContact({
        name: 'Ada Lovelace',
        email: 'ada@example.org',
        subject: 'technical',
        message: 'The page did not load.',
        turnstile_token: ''
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/contact',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Ada Lovelace',
            email: 'ada@example.org',
            subject: 'technical',
            message: 'The page did not load.',
            turnstile_token: ''
          })
        })
      );
    });
  });

  describe('submitSupportReport', () => {
    it('should call the Laravel v2 support report endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { report: { reference: 'NXR-260706-ABC123' } } })
      });

      await api.submitSupportReport('test-token', {
        summary: 'Broken page',
        description: 'The accessible page failed to render.',
        impact: 'major',
        page_url: '/explore',
        route: '/report-a-problem'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/support/reports',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            summary: 'Broken page',
            description: 'The accessible page failed to render.',
            impact: 'major',
            page_url: '/explore',
            route: '/report-a-problem'
          })
        })
      );
    });
  });

  describe('resetPassword', () => {
    it('should call the Laravel reset-password endpoint with confirmation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { message: 'reset' } })
      });

      await api.resetPassword('reset-token', 'correct horse battery staple', 'correct horse battery staple');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/reset-password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            token: 'reset-token',
            password: 'correct horse battery staple',
            password_confirmation: 'correct horse battery staple'
          })
        })
      );
    });
  });

  describe('resendVerification', () => {
    it('should call the Laravel resend-verification-by-email endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { message: 'sent' } })
      });

      await api.resendVerification('ada@example.org');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/resend-verification-by-email',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'ada@example.org' })
        })
      );
    });
  });

  describe('createVolunteerOrganisation', () => {
    it('should call the Laravel volunteering organisation creation endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 42 } })
      });

      await api.createVolunteerOrganisation('test-token', {
        name: 'Community Helpers',
        description: 'We coordinate local volunteering projects.',
        contact_email: 'hello@example.org',
        website: 'https://example.org'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/volunteering/organisations',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            name: 'Community Helpers',
            description: 'We coordinate local volunteering projects.',
            contact_email: 'hello@example.org',
            website: 'https://example.org'
          })
        })
      );
    });
  });

  describe('callVolunteeringApi', () => {
    it('should call Laravel v2 volunteering action endpoints with auth, method, and payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { ok: true } })
      });

      await api.callVolunteeringApi('test-token', 'PUT', '/organisations/42/wallet/auto-pay', {
        enabled: true
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/volunteering/organisations/42/wallet/auto-pay',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ enabled: true })
        })
      );
    });
  });

  describe('callMarketplaceApi', () => {
    it('should call Laravel v2 marketplace action endpoints with auth, method, and payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { ok: true } })
      });

      await api.callMarketplaceApi('test-token', 'PUT', '/listings/42', {
        title: 'Community bike'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/marketplace/listings/42',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ title: 'Community bike' })
        })
      );
    });
  });

  describe('callIdeationApi', () => {
    it('should call Laravel v2 ideation action endpoints with auth, method, and payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { ok: true } })
      });

      await api.callIdeationApi('test-token', 'PUT', '/ideation-challenges/7/status', {
        status: 'voting'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/ideation-challenges/7/status',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ status: 'voting' })
        })
      );
    });
  });

  describe('callGroupExchangeApi', () => {
    it('should call Laravel v2 group exchange action endpoints with auth, method, and payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { ok: true } })
      });

      await api.callGroupExchangeApi('test-token', 'POST', '/7/participants', {
        user_id: 55,
        role: 'provider'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/group-exchanges/7/participants',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ user_id: 55, role: 'provider' })
        })
      );
    });
  });

  describe('callEventApi', () => {
    it('should call Laravel v2 event action endpoints with auth, method, and payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { ok: true } })
      });

      await api.callEventApi('test-token', 'PUT', '/7/recurring', {
        scope: 'all'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/events/7/recurring',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ scope: 'all' })
        })
      );
    });
  });

  describe('getGoals', () => {
    it('should call the Laravel v2 goals endpoint with auth and cursor-style params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: [{ id: 42, title: 'Walk daily' }] })
      });

      await api.getGoals('test-token', {
        status: 'active',
        visibility: 'public',
        limit: 30,
        cursor: 'next-cursor'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/goals?status=active&visibility=public&per_page=30&cursor=next-cursor',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('getGoal', () => {
    it('should call the Laravel v2 goal detail endpoint with auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 42, title: 'Walk daily' } })
      });

      await api.getGoal('test-token', 42);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/goals/42',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('callGoalApi', () => {
    it('should call Laravel v2 goal action endpoints with auth, method, and optional payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { current_value: 4 } })
      });

      await api.callGoalApi('test-token', 'POST', '/42/progress', {
        increment: 2
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/goals/42/progress',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ increment: 2 })
        })
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({})
      });

      await api.callGoalApi('test-token', 'DELETE', '/42');

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:5000/api/v2/goals/42',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('callCourseApi', () => {
    it('should call Laravel v2 course action endpoints with auth, method, and optional payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { course_completed: false } })
      });

      await api.callCourseApi('test-token', 'POST', '/42/lessons/7/complete', {
        watch_percent: 100
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/courses/42/lessons/7/complete',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ watch_percent: 100 })
        })
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { deleted: true } })
      });

      await api.callCourseApi('test-token', 'DELETE', '/42');

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:5000/api/v2/courses/42',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: [] })
      });

      await api.callCourseApi('test-token', 'GET', '?per_page=30&q=care');

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:5000/api/v2/courses?per_page=30&q=care',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should call Laravel v2 member course enrolments with auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: [] })
      });

      await api.getMyCourses('test-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/me/courses',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('callGroupApi', () => {
    it('should call Laravel v2 group depth endpoints with auth, method, and optional payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { frequency: 'digest' } })
      });

      await api.callGroupApi('test-token', 'PUT', '/42/notification-prefs', {
        frequency: 'digest'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/groups/42/notification-prefs',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ frequency: 'digest' })
        })
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { deleted: true } })
      });

      await api.callGroupApi('test-token', 'DELETE', '/42/files/5');

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:5000/api/v2/groups/42/files/5',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('callUserSettingsApi', () => {
    it('should call Laravel v2 user settings endpoints with auth, method, and optional payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { theme: 'dark' } })
      });

      await api.callUserSettingsApi('test-token', 'PUT', '/theme', {
        theme: 'dark'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/users/me/theme',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ theme: 'dark' })
        })
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { message: 'revoked' } })
      });

      await api.callUserSettingsApi('test-token', 'DELETE', '/sub-accounts/77');

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:5000/api/v2/users/me/sub-accounts/77',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('callProfileApi', () => {
    it('should call arbitrary Laravel v2 profile-adjacent endpoints with auth, method, and optional payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { language: 'ga' } })
      });

      await api.callProfileApi('test-token', 'PUT', '/users/me/language', {
        language: 'ga'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/users/me/language',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ language: 'ga' })
        })
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { revoked: true } })
      });

      await api.callProfileApi('test-token', 'POST', '/safeguarding/revoke', {
        option_id: 9
      });

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:5000/api/v2/safeguarding/revoke',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ option_id: 9 })
        })
      );
    });
  });

  describe('callWebAuthnApi', () => {
    it('should call Laravel passkey endpoints with auth, method, and optional payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { device_name: 'Laptop' } })
      });

      await api.callWebAuthnApi('test-token', 'POST', '/rename', {
        credential_id: 'cred-1',
        device_name: 'Laptop'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/webauthn/rename',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            credential_id: 'cred-1',
            device_name: 'Laptop'
          })
        })
      );
    });
  });

  describe('callListingApi', () => {
    it('should call Laravel v2 listing action endpoints with auth, method, and optional payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { saved: true } })
      });

      await api.callListingApi('test-token', 'POST', '/42/save');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/listings/42/save',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { description: 'Generated listing copy' } })
      });

      await api.callListingApi('test-token', 'POST', '/generate-description', {
        title: 'Garden help'
      });

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:5000/api/v2/listings/generate-description',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ title: 'Garden help' })
        })
      );
    });
  });

  describe('createExchangeRequest', () => {
    it('should create a Laravel v2 exchange request with listing payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 88 } })
      });

      await api.createExchangeRequest('test-token', {
        listing_id: 42,
        proposed_hours: 2.5
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/exchanges',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            listing_id: 42,
            proposed_hours: 2.5
          })
        })
      );
    });
  });

  describe('callUgcTranslateApi', () => {
    it('should call the Laravel v2 UGC translation endpoint with auth and payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { translated_text: 'Dia duit' } })
      });

      await api.callUgcTranslateApi('test-token', {
        content_type: 'event',
        content_id: 7,
        source_text: 'Hello',
        target_locale: 'ga'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/ugc-translate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            content_type: 'event',
            content_id: 7,
            source_text: 'Hello',
            target_locale: 'ga'
          })
        })
      );
    });
  });

  describe('Laravel message helpers', () => {
    it('should call Laravel v2 message and conversation endpoints with auth, method, and optional payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 12 } })
      });

      await api.callMessageApi('test-token', 'PUT', '/12', {
        body: 'Updated message'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/messages/12',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ body: 'Updated message' })
        })
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 33 } })
      });

      await api.callConversationApi('test-token', 'POST', '/33/messages', {
        body: 'Hello group'
      });

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:5000/api/v2/conversations/33/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ body: 'Hello group' })
        })
      );
    });
  });

  describe('callPodcastApi', () => {
    it('should call Laravel v2 podcast endpoints with auth, method, and optional payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 42 } })
      });

      await api.callPodcastApi('test-token', 'POST', '/42/episodes', {
        title: 'Community update',
        audio_url: 'https://media.example/audio.mp3'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/podcasts/42/episodes',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            title: 'Community update',
            audio_url: 'https://media.example/audio.mp3'
          })
        })
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { deleted: true } })
      });

      await api.callPodcastApi('test-token', 'DELETE', '/42');

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:5000/api/v2/podcasts/42',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('callFederationApi', () => {
    it('should call Laravel v2 federation endpoints with auth, method, and optional payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 12 } })
      });

      await api.callFederationApi('test-token', 'POST', '/messages', {
        receiver_id: 77,
        receiver_tenant_id: 12,
        body: 'Hello federation'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/federation/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            receiver_id: 77,
            receiver_tenant_id: 12,
            body: 'Hello federation'
          })
        })
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { removed: true } })
      });

      await api.callFederationApi('test-token', 'DELETE', '/connections/91');

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:5000/api/v2/federation/connections/91',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('donateCredits', () => {
    it('should call the Laravel wallet donation endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { message: 'sent' } })
      });

      await api.donateCredits('test-token', {
        recipient_type: 'community_fund',
        amount: 2,
        message: 'Thank you'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/wallet/donate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            recipient_type: 'community_fund',
            amount: 2,
            message: 'Thank you'
          })
        })
      );
    });
  });

  describe('Laravel saved and appreciation helpers', () => {
    it('should remove a saved item by item pair through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => '' },
        text: async () => ''
      });

      await api.unsaveSavedItem('test-token', 'listing', 42);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/me/saved-items?item_type=listing&item_id=42',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should send an appreciation through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 55 } })
      });

      await api.sendAppreciation('test-token', {
        receiver_id: 77,
        message: 'Thank you',
        context_type: 'general',
        is_public: true
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/appreciations',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            receiver_id: 77,
            message: 'Thank you',
            context_type: 'general',
            is_public: true
          })
        })
      );
    });

    it('should react to an appreciation through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { reaction_type: 'heart' } })
      });

      await api.reactToAppreciation('test-token', 55, 'heart');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/appreciations/55/react',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ reaction_type: 'heart' })
        })
      );
    });

    it('should create a saved collection through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 12 } })
      });

      await api.createSavedCollection('test-token', {
        name: 'Useful links',
        description: 'Things to revisit',
        is_public: true
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/me/collections',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            name: 'Useful links',
            description: 'Things to revisit',
            is_public: true
          })
        })
      );
    });

    it('should update a saved collection through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 12 } })
      });

      await api.updateSavedCollection('test-token', 12, {
        name: 'Updated',
        description: null,
        is_public: false
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/me/collections/12',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            name: 'Updated',
            description: null,
            is_public: false
          })
        })
      );
    });

    it('should delete a saved collection through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => '' },
        text: async () => ''
      });

      await api.deleteSavedCollection('test-token', 12);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/me/collections/12',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should delete a saved item through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => '' },
        text: async () => ''
      });

      await api.deleteSavedItem('test-token', 99);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/me/saved-items/99',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('Laravel matching helpers', () => {
    it('should dismiss a match through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { dismissed: true } })
      });

      await api.dismissMatch('test-token', 77, 'too_far');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/matches/77/dismiss',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ reason: 'too_far' })
        })
      );
    });
  });

  describe('Laravel exchange helpers', () => {
    it('should perform an exchange action through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 88 } })
      });

      await api.performExchangeAction('test-token', 88, 'confirm', { hours: 2.5 });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/exchanges/88/confirm',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ hours: 2.5 })
        })
      );
    });

    it('should cancel an exchange through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { message: 'cancelled' } })
      });

      await api.performExchangeAction('test-token', 88, 'cancel', { reason: 'No longer needed' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/exchanges/88',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ reason: 'No longer needed' })
        })
      );
    });

    it('should rate an exchange through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { ratings: [] } })
      });

      await api.rateExchange('test-token', 88, {
        rating: 5,
        comment: 'Great exchange'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/exchanges/88/rate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            rating: 5,
            comment: 'Great exchange'
          })
        })
      );
    });
  });

  describe('Laravel AI chat helpers', () => {
    it('should send a chat message through the Laravel AI endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { conversation_id: 123 } })
      });

      await api.sendAiChat('test-token', {
        message: 'Find me a gardener',
        conversation_id: 44
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/ai/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            message: 'Find me a gardener',
            conversation_id: 44
          })
        })
      );
    });
  });

  describe('Laravel saved search helpers', () => {
    it('should save a search through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 12 } })
      });

      await api.saveSavedSearch('test-token', {
        name: 'Gardeners',
        query_params: {
          q: 'gardening',
          type: 'listings'
        },
        notify_on_new: false
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/search/saved',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            name: 'Gardeners',
            query_params: {
              q: 'gardening',
              type: 'listings'
            },
            notify_on_new: false
          })
        })
      );
    });

    it('should delete a saved search through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ deleted: true })
      });

      await api.deleteSavedSearch('test-token', 12);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/search/saved/12',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should run a saved search through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 12, query_params: { q: 'gardening' } } })
      });

      await api.runSavedSearch('test-token', 12);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/search/saved/12/run',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({})
        })
      );
    });
  });

  describe('Laravel gamification helpers', () => {
    it('should claim the daily reward through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { claimed: true } })
      });

      await api.claimDailyReward('test-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/gamification/daily-reward',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should claim a gamification challenge through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { claimed: true, challenge_id: 7 } })
      });

      await api.claimGamificationChallenge('test-token', 7);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/gamification/challenges/7/claim',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should purchase a gamification shop item through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { success: true } })
      });

      await api.purchaseGamificationShopItem('test-token', 42);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/gamification/shop/purchase',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ item_id: 42 })
        })
      );
    });

    it('should update the gamification showcase through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { message: 'updated' } })
      });

      await api.updateGamificationShowcase('test-token', ['helper', 'mentor']);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/gamification/showcase',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ badge_keys: ['helper', 'mentor'] })
        })
      );
    });
  });

  describe('Laravel member profile action helpers', () => {
    it('should fetch member connection status through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { status: 'none' } })
      });

      await api.getMemberConnectionStatus('test-token', 77);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/connections/status/77',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should send a member connection request through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 12 } })
      });

      await api.sendMemberConnectionRequest('test-token', 77);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/connections/request',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ user_id: 77 })
        })
      );
    });

    it('should accept and decline member connections through Laravel v2 endpoints', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { status: 'connected' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({})
        });

      await api.acceptMemberConnection('test-token', 12);
      await api.declineMemberConnection('test-token', 13);

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:5000/api/v2/connections/12/accept',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:5000/api/v2/connections/13/decline',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' })
        })
      );
    });

    it('should remove a member connection through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({})
      });

      await api.removeMemberConnection('test-token', 12);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/connections/12',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should block and unblock members through Laravel v2 endpoints', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { success: true } })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { success: true } })
        });

      await api.blockMember('test-token', 77, 'spam');
      await api.unblockMember('test-token', 77);

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:5000/api/v2/users/77/block',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
          body: JSON.stringify({ reason: 'spam' })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:5000/api/v2/users/77/block',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' })
        })
      );
    });

    it('should add and remove member endorsements through Laravel v2 endpoints', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { endorsement_id: 22 } })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { message: 'removed' } })
        });

      await api.endorseMemberSkill('test-token', 77, { skill_name: 'Gardening' });
      await api.removeMemberEndorsement('test-token', 77, 'Gardening');

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:5000/api/v2/members/77/endorse',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
          body: JSON.stringify({ skill_name: 'Gardening' })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:5000/api/v2/members/77/endorse',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
          body: JSON.stringify({ skill_name: 'Gardening' })
        })
      );
    });

    it('should transfer wallet credits through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { transaction_id: 99 } })
      });

      await api.transferWalletCredits('test-token', {
        recipient: 77,
        amount: 5,
        description: 'Thanks',
        idempotency_key: 'idem-1'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/wallet/transfer',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            recipient: 77,
            amount: 5,
            description: 'Thanks',
            idempotency_key: 'idem-1'
          })
        })
      );
    });
  });

  describe('Laravel member premium helpers', () => {
    it('should fetch member premium tiers through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { tiers: [] } })
      });

      await api.getMemberPremiumTiers('test-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/member-premium/tiers',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should fetch the current member premium subscription through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { subscription: null, entitled_tier: null } })
      });

      await api.getMemberPremiumMe('test-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/member-premium/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should create a member premium checkout session through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { checkout_url: 'https://checkout.stripe.test/session' } })
      });

      await api.createMemberPremiumCheckout('test-token', {
        tier_id: 7,
        interval: 'yearly',
        return_url: '/premium/return?status=success'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/member-premium/checkout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            tier_id: 7,
            interval: 'yearly',
            return_url: '/premium/return?status=success'
          })
        })
      );
    });

    it('should create a member premium billing portal session through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { portal_url: 'https://billing.stripe.test/session' } })
      });

      await api.createMemberPremiumPortal('test-token', {
        return_url: '/premium/manage'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/member-premium/billing-portal',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            return_url: '/premium/manage'
          })
        })
      );
    });

    it('should cancel member premium through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { cancelled: true } })
      });

      await api.cancelMemberPremium('test-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/member-premium/cancel',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('Laravel blog helpers', () => {
    it('should fetch blog posts through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: [] })
      });

      await api.getBlogPosts('test-token', {
        q: 'community',
        category: 7,
        cursor: 'abc',
        limit: 12
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/blog?search=community&category_id=7&cursor=abc&per_page=12',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should fetch a blog post by slug through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 42, slug: 'community-news' } })
      });

      await api.getBlogPost('test-token', 'community-news');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/blog/community-news',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('Laravel poll helpers', () => {
    it('should fetch polls through the Laravel v2 endpoint with supported filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: [] })
      });

      await api.getPolls('test-token', {
        status: 'open',
        limit: 30,
        cursor: 'abc',
        mine: true,
        category: 'local',
        event_id: 5
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/polls?status=open&per_page=30&cursor=abc&mine=1&category=local&event_id=5',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should fetch a poll by ID through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 42 } })
      });

      await api.getPoll('test-token', 42);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/polls/42',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should create a poll through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 42 } })
      });

      await api.createPoll('test-token', {
        question: 'Which project?',
        poll_type: 'standard',
        options: ['Garden', 'Cafe']
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/polls',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            question: 'Which project?',
            poll_type: 'standard',
            options: ['Garden', 'Cafe']
          })
        })
      );
    });

    it('should vote on a poll through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 42 } })
      });

      await api.votePoll('test-token', 42, { option_id: 7 });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/polls/42/vote',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ option_id: 7 })
        })
      );
    });

    it('should submit ranked poll choices through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { ranked_results: [] } })
      });

      await api.rankPoll('test-token', 42, {
        rankings: [
          { option_id: 9, rank: 1 },
          { option_id: 8, rank: 2 }
        ]
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/polls/42/rank',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            rankings: [
              { option_id: 9, rank: 1 },
              { option_id: 8, rank: 2 }
            ]
          })
        })
      );
    });

    it('should delete a poll through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { deleted: true } })
      });

      await api.deletePoll('test-token', 42);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/polls/42',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should toggle a polymorphic feed like through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { action: 'liked' } })
      });

      await api.toggleFeedLike('test-token', {
        target_type: 'poll',
        target_id: 42
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/feed/like',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            target_type: 'poll',
            target_id: 42
          })
        })
      );
    });
  });

  describe('Laravel feed action helpers', () => {
    it('should create, update, and delete feed posts through Laravel v2 endpoints', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { id: 42 } })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { id: 42 } })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { deleted: true } })
        });

      await api.createFeedPostV2('test-token', { content: 'Hello', visibility: 'public' });
      await api.updateFeedPostV2('test-token', 42, { content: 'Updated' });
      await api.deleteFeedPostV2('test-token', 42);

      expect(mockFetch).toHaveBeenNthCalledWith(1,
        'http://localhost:5000/api/v2/feed/posts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
          body: JSON.stringify({ content: 'Hello', visibility: 'public' })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(2,
        'http://localhost:5000/api/v2/feed/posts/42',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
          body: JSON.stringify({ content: 'Updated' })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(3,
        'http://localhost:5000/api/v2/feed/posts/42',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' })
        })
      );
    });

    it('should call Laravel v2 feed moderation helpers', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { hidden: true } })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { success: true } })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { reported: true } })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { muted: true } })
        });

      await api.hideFeedItem('test-token', 42, { type: 'poll' });
      await api.markFeedItemNotInterested('test-token', 42, { type: 'resource' });
      await api.reportFeedItem('test-token', 'listing', 77, { reason: 'Spam' });
      await api.muteFeedUser('test-token', 99);

      expect(mockFetch).toHaveBeenNthCalledWith(1,
        'http://localhost:5000/api/v2/feed/posts/42/hide',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
          body: JSON.stringify({ type: 'poll' })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(2,
        'http://localhost:5000/api/v2/feed/posts/42/not-interested',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
          body: JSON.stringify({ type: 'resource' })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(3,
        'http://localhost:5000/api/v2/feed/items/listing/77/report',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
          body: JSON.stringify({ reason: 'Spam' })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(4,
        'http://localhost:5000/api/v2/feed/users/99/mute',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' })
        })
      );
    });

    it('should call Laravel v2 feed share, save, saved-check, and poll vote helpers', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { shared: true } })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { id: 72 } })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { saved: false } })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: { id: 42 } })
        });

      await api.shareFeedItem('test-token', { type: 'post', id: 42, comment: 'Worth reading' });
      await api.saveSavedItem('test-token', { item_type: 'post', item_id: 42 });
      await api.checkSavedItem('test-token', 'post', 42);
      await api.voteFeedPoll('test-token', 42, { option_id: 9 });

      expect(mockFetch).toHaveBeenNthCalledWith(1,
        'http://localhost:5000/api/v2/shares',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
          body: JSON.stringify({ type: 'post', id: 42, comment: 'Worth reading' })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(2,
        'http://localhost:5000/api/v2/me/saved-items',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
          body: JSON.stringify({ item_type: 'post', item_id: 42 })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(3,
        'http://localhost:5000/api/v2/me/saved-items/check?item_type=post&item_id=42',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(4,
        'http://localhost:5000/api/v2/feed/polls/42/vote',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
          body: JSON.stringify({ option_id: 9 })
        })
      );
    });
  });

  describe('Laravel resource helpers', () => {
    it('should fetch resources through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: [] })
      });

      await api.getResources('test-token', {
        search: 'handbook',
        category_id: 3,
        cursor: 'abc',
        per_page: 50
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/resources?search=handbook&category_id=3&cursor=abc&per_page=50',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should delete a resource through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { deleted: true } })
      });

      await api.deleteResource('test-token', 42);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/resources/42',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should reorder resources through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { message: 'reordered' } })
      });

      await api.reorderResources('test-token', {
        items: [
          { id: 20, sort_order: 0 },
          { id: 10, sort_order: 1 }
        ]
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/resources/reorder',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            items: [
              { id: 20, sort_order: 0 },
              { id: 10, sort_order: 1 }
            ]
          })
        })
      );
    });

    it('should fetch resource categories and category tree through Laravel v2 endpoints', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: [{ id: 7, name: 'Guides' }] })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: [{ id: 7, name: 'Guides', children: [] }] })
        });

      await api.getResourceCategories('test-token');
      await api.getResourceCategoryTree('test-token');

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:5000/api/v2/resources/categories',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:5000/api/v2/resources/categories/tree',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('Laravel review social helpers', () => {
    it('should create an exchange review through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 91 } })
      });

      await api.createReview('test-token', {
        receiver_id: 77,
        rating: 5,
        comment: 'Great exchange',
        transaction_id: 22
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/reviews',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            receiver_id: 77,
            rating: 5,
            comment: 'Great exchange',
            transaction_id: 22
          })
        })
      );
    });

    it('should create a polymorphic comment through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 12 } })
      });

      await api.createComment('test-token', {
        target_type: 'review',
        target_id: 91,
        content: 'Helpful context',
        parent_id: 4
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/comments',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            target_type: 'review',
            target_id: 91,
            content: 'Helpful context',
            parent_id: 4
          })
        })
      );
    });

    it('should update a polymorphic comment through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { id: 12, content: 'Updated' } })
      });

      await api.updateComment('test-token', 12, { content: 'Updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/comments/12',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ content: 'Updated' })
        })
      );
    });

    it('should toggle a polymorphic reaction through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { action: 'added' } })
      });

      await api.toggleReaction('test-token', {
        target_type: 'review',
        target_id: 91,
        reaction_type: 'love'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/reactions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            target_type: 'review',
            target_id: 91,
            reaction_type: 'love'
          })
        })
      );
    });

    it('should delete a polymorphic comment through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { deleted: true } })
      });

      await api.deleteComment('test-token', 12);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/comments/12',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('Laravel onboarding helpers', () => {
    it('should save safeguarding preferences through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { preferences_count: 1 } })
      });

      await api.saveOnboardingSafeguarding('test-token', [
        { option_id: 9, value: 'yes' }
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/onboarding/safeguarding',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            preferences: [{ option_id: 9, value: 'yes' }]
          })
        })
      );
    });

    it('should complete onboarding through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { message: 'complete' } })
      });

      await api.completeOnboarding('test-token', {
        interests: [2, 3],
        offers: [5],
        needs: [6]
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/onboarding/complete',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            interests: [2, 3],
            offers: [5],
            needs: [6]
          })
        })
      );
    });
  });

  describe('Laravel notification helpers', () => {
    it('should mark all notifications read through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { marked_read: 2 } })
      });

      await api.markAllNotificationsRead('test-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/notifications/read-all',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should mark a notification group read through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { marked_read: 2 } })
      });

      await api.markNotificationGroupRead('test-token', 'post_like:/feed/posts/7');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/notifications/group/read',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ group_key: 'post_like:/feed/posts/7' })
        })
      );
    });

    it('should delete all notifications through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { deleted: 2 } })
      });

      await api.deleteAllNotifications('test-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/notifications',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('getExplore', () => {
    it('should request the Laravel v2 Explore aggregate with auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ data: { popular_listings: [] } })
      });

      await api.getExplore('test-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/explore',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });
});
