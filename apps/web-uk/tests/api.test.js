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
