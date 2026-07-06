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
});
