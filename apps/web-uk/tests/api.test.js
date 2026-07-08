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

    it('should resolve Laravel login tenant context from the submitted community code', async () => {
      process.env.TENANT_ID = '1';
      jest.resetModules();
      api = require('../src/lib/api');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ access_token: 'test-token', user: { id: 1, tenant_id: 2 } })
      });

      await api.login('test@example.com', 'password123', 'hour-timebank');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/auth/login',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-Slug': 'hour-timebank'
          })
        })
      );
      expect(mockFetch.mock.calls[0][1].headers).not.toHaveProperty('X-Tenant-ID');
    });

    it('should not send the default tenant id on authenticated Laravel requests', async () => {
      process.env.TENANT_ID = '1';
      jest.resetModules();
      api = require('../src/lib/api');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ id: 123, email: 'test@example.com' })
      });

      await api.getProfile('test-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/users/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(mockFetch.mock.calls[0][1].headers).not.toHaveProperty('X-Tenant-ID');
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

    it('should surface Laravel errors array messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          errors: [
            { code: 'ALREADY_EXISTS', message: 'A connection with this user already exists' }
          ]
        })
      });

      await expect(api.sendConnectionRequest('test-token', 2))
        .rejects.toThrow('A connection with this user already exists');
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
        'http://localhost:5000/api/v2/listings',
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

    it('should call the Laravel v2 listings endpoint with accessible filter params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ data: [], meta: { total_items: 0 } })
      });

      await api.getListings('test-token', {
        search: 'garden',
        type: 'offer',
        category_id: 3,
        hours: 'quick',
        service: 'remote',
        posted: '7',
        sort: 'newest',
        near: '10',
        cursor: 'abc',
        per_page: 20
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/listings?type=offer&search=garden&category_id=3&hours=quick&service=remote&posted=7&sort=newest&near=10&cursor=abc&per_page=20',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should call the Laravel v2 listing detail endpoint with auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: {
            id: 90992,
            title: 'E2E Fixture Listing - Gardening Help'
          }
        })
      });

      const result = await api.getListing('test-token', 90992);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/listings/90992',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(result.data.title).toBe('E2E Fixture Listing - Gardening Help');
    });

    it('should call the Laravel v2 listing detail endpoint with tenant slug for public fallback', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: {
            id: 90992,
            title: 'E2E Fixture Listing - Gardening Help'
          }
        })
      });

      const result = await api.getPublicListing(90992, 'hour-timebank');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/listings/90992',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-Slug': 'hour-timebank'
          })
        })
      );
      expect(mockFetch.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
      expect(mockFetch.mock.calls[0][1].headers).not.toHaveProperty('X-Tenant-ID');
      expect(result.data.title).toBe('E2E Fixture Listing - Gardening Help');
    });
  });

  describe('getFeedPosts', () => {
    it('should call the Laravel v2 feed endpoint with filters and auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: [
            { id: 11, type: 'listing', title: 'Community update' }
          ],
          meta: { has_more: false }
        })
      });

      const result = await api.getFeedPosts('test-token', {
        limit: 5,
        type: 'listings',
        mode: 'recent',
        subtype: 'offer',
        cursor: 'abc'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/feed?limit=5&type=listings&mode=recent&subtype=offer&cursor=abc',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(result.data[0].title).toBe('Community update');
    });
  });

  describe('getMembers', () => {
    it('should call the Laravel v2 users endpoint with directory filters and auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: [
            { id: 26554, name: 'E2E User A' }
          ],
          meta: { total_items: 1, has_more: false }
        })
      });

      const result = await api.getMembers('test-token', {
        q: 'e2e',
        sort: 'joined',
        order: 'DESC',
        limit: 20,
        offset: 20
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/users?q=e2e&sort=joined&order=DESC&limit=20&offset=20',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(result.data[0].name).toBe('E2E User A');
    });
  });

  describe('connections', () => {
    it('should call the Laravel v2 connection request endpoint with auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: { id: 77, status: 'pending' }
        })
      });

      const result = await api.sendConnectionRequest('test-token', 2);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/connections/request',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({ user_id: 2 })
        })
      );
      expect(result.data.status).toBe('pending');
    });

    it('should call Laravel v2 connection action endpoints with POST', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ data: { status: 'accepted' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ data: { status: 'declined' } })
        });

      await api.acceptConnection('test-token', 77);
      await api.declineConnection('test-token', 77);

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:5000/api/v2/connections/77/accept',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:5000/api/v2/connections/77/decline',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });

    it('should call the Laravel v2 connection status endpoint with auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: { status: 'pending_sent', connection_id: 73, direction: 'sent' }
        })
      });

      const result = await api.getConnectionStatus('test-token', 2);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/connections/status/2',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(result.data.status).toBe('pending_sent');
    });
  });

  describe('reviews', () => {
    it('should call the Laravel v2 user reviews endpoint with auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: [
            { id: 91, rating: 5, comment: 'Helpful exchange' }
          ],
          meta: { per_page: 20, has_more: false }
        })
      });

      const result = await api.getUserReviews('test-token', 267, 1, 20);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/reviews/user/267?per_page=20',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(result.data[0].comment).toBe('Helpful exchange');
    });

    it('should create member reviews through the Laravel v2 reviews endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: { id: 91, receiver_id: 267, rating: 4 }
        })
      });

      const result = await api.createUserReview('test-token', 267, {
        rating: 4,
        comment: 'Helpful exchange'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/reviews',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            receiver_id: 267,
            rating: 4,
            comment: 'Helpful exchange'
          })
        })
      );
      expect(result.data.receiver_id).toBe(267);
    });

    it('should call the Laravel v2 review detail and delete endpoints', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ data: { id: 91, rating: 5 } })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => '' },
          text: () => Promise.resolve('')
        });

      await api.getReview('test-token', 91);
      await api.deleteReview('test-token', 91);

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:5000/api/v2/reviews/91',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:5000/api/v2/reviews/91',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('events', () => {
    it('should call the Laravel v2 event detail endpoint with auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: {
            id: 6,
            title: 'Community Meetup 3',
            description: 'Third monthly gathering'
          }
        })
      });

      const result = await api.getEvent('test-token', 6);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/events/6',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(result.data.title).toBe('Community Meetup 3');
    });

    it('should call the Laravel v2 event attendee endpoint with auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: [
            { id: 26554, first_name: 'E2E', last_name: 'UserA', status: 'going' }
          ],
          meta: { per_page: 20, has_more: false }
        })
      });

      const result = await api.getEventRsvps('test-token', 6, 'going');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/events/6/attendees?status=going&per_page=20',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(result.data[0].status).toBe('going');
    });
  });

  describe('exchanges', () => {
    it('should call the Laravel v2 exchanges list endpoint with filters and auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: [
            { id: 42, status: 'pending_provider' }
          ],
          meta: { has_more: false }
        })
      });

      const result = await api.getExchanges('test-token', {
        status: 'active',
        per_page: 20,
        cursor: 'abc'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/exchanges?per_page=20&status=active&cursor=abc',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
      expect(result.data[0].id).toBe(42);
    });

    it('should create exchange requests through the Laravel v2 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({
          data: { id: 42, listing_id: 90992, status: 'pending_provider' }
        })
      });

      const result = await api.createExchangeRequest('test-token', 90992, {
        proposed_hours: 2,
        prep_time: 0.5,
        message: 'I can help with this.'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v2/exchanges',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          }),
          body: JSON.stringify({
            listing_id: 90992,
            proposed_hours: 2,
            prep_time: 0.5,
            message: 'I can help with this.'
          })
        })
      );
      expect(result.data.id).toBe(42);
    });

    it('should call exchange lifecycle and rating endpoints', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ data: { id: 42, status: 'accepted' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ data: { id: 42, status: 'completed' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ data: [{ rating: 5 }] })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ data: { message: 'Exchange cancelled' } })
        });

      await api.acceptExchange('test-token', 42);
      await api.confirmExchange('test-token', 42, { hours: 2 });
      await api.rateExchange('test-token', 42, { rating: 5, comment: 'Great help' });
      await api.cancelExchange('test-token', 42, { reason: 'No longer needed' });

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:5000/api/v2/exchanges/42/accept',
        expect.objectContaining({ method: 'POST' })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:5000/api/v2/exchanges/42/confirm',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ hours: 2 })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        'http://localhost:5000/api/v2/exchanges/42/rate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ rating: 5, comment: 'Great help' })
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        4,
        'http://localhost:5000/api/v2/exchanges/42',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ reason: 'No longer needed' })
        })
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
});
