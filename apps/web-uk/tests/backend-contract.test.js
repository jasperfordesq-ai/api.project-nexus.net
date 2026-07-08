// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('backend contract configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockFetch.mockReset();
    process.env = { ...originalEnv };
    delete process.env.ACCESSIBLE_BACKEND_TARGET;
    delete process.env.API_BASE_URL;
    delete process.env.LARAVEL_BASE_URL;
    delete process.env.ASPNET_BASE_URL;
    delete process.env.TENANT_ID;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults the accessible frontend backend contract to Laravel', () => {
    const { resolveBackendContract } = require('../src/lib/backend-contract');

    expect(resolveBackendContract()).toEqual({
      target: 'laravel',
      baseUrl: 'http://127.0.0.1:8088',
      baseUrlSource: 'laravel-base-url',
      status: 'source-of-truth'
    });
  });

  it('uses the Laravel base URL when the API client has no explicit override', async () => {
    const api = require('../src/lib/api');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ access_token: 'laravel-token' })
    });

    await api.login('person@example.test', 'password', 'acme');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8088/api/auth/login',
      expect.anything()
    );
  });

  it('allows an explicit Laravel base URL override without changing target status', () => {
    process.env.LARAVEL_BASE_URL = 'https://laravel.example.test/';
    const { resolveBackendContract } = require('../src/lib/backend-contract');

    expect(resolveBackendContract()).toEqual({
      target: 'laravel',
      baseUrl: 'https://laravel.example.test',
      baseUrlSource: 'laravel-base-url',
      status: 'source-of-truth'
    });
  });

  it('labels explicit API base URL overrides so they cannot look like certified defaults', () => {
    process.env.API_BASE_URL = 'https://override.example.test/';
    const { resolveBackendContract } = require('../src/lib/backend-contract');

    expect(resolveBackendContract()).toEqual({
      target: 'laravel',
      baseUrl: 'https://override.example.test',
      baseUrlSource: 'api-base-url',
      status: 'source-of-truth'
    });
  });

  it('marks ASP.NET as future work instead of a certified adapter', () => {
    process.env.ACCESSIBLE_BACKEND_TARGET = 'aspnet';
    const { resolveBackendContract } = require('../src/lib/backend-contract');

    expect(resolveBackendContract()).toEqual({
      target: 'aspnet',
      baseUrl: 'http://localhost:5080',
      baseUrlSource: 'aspnet-base-url',
      status: 'future-not-certified'
    });
  });

  it('rejects unknown backend targets', () => {
    process.env.ACCESSIBLE_BACKEND_TARGET = 'rails';
    const { resolveBackendContract } = require('../src/lib/backend-contract');

    expect(() => resolveBackendContract()).toThrow('Unsupported accessible backend target: rails');
  });
});
