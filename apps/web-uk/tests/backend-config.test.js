// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

describe('accessible backend configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.ACCESSIBLE_BACKEND_TARGET;
    delete process.env.LARAVEL_BACKEND_URL;
    delete process.env.ASPNET_BACKEND_URL;
    delete process.env.API_BASE_URL;
    delete process.env.TENANT_ID;
    delete process.env.ACCESSIBLE_TENANT_SLUG;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults apps/web-uk to the Laravel backend target', () => {
    const { getAccessibleBackendConfig } = require('../src/lib/backend-config');

    expect(getAccessibleBackendConfig()).toEqual(expect.objectContaining({
      target: 'laravel',
      baseUrl: 'http://localhost',
      adapterStatus: 'laravel_first',
      isLaravel: true,
      isAspNetCertified: false
    }));
  });

  it('uses the Laravel backend URL ahead of the legacy API_BASE_URL fallback', () => {
    process.env.LARAVEL_BACKEND_URL = 'http://laravel.test';
    process.env.API_BASE_URL = 'http://aspnet.test';

    const { getAccessibleBackendConfig } = require('../src/lib/backend-config');

    expect(getAccessibleBackendConfig().baseUrl).toBe('http://laravel.test');
  });

  it('keeps ASP.NET backend targeting explicitly marked as pending', () => {
    process.env.ACCESSIBLE_BACKEND_TARGET = 'aspnet';
    process.env.ASPNET_BACKEND_URL = 'http://aspnet.test';

    const { getAccessibleBackendConfig } = require('../src/lib/backend-config');

    expect(getAccessibleBackendConfig()).toEqual(expect.objectContaining({
      target: 'aspnet',
      baseUrl: 'http://aspnet.test',
      adapterStatus: 'pending_backend_parity',
      isLaravel: false,
      isAspNetCertified: false
    }));
  });

  it('builds Laravel-friendly request headers without claiming Blade is an API', () => {
    process.env.LARAVEL_BACKEND_URL = 'http://laravel.test';
    process.env.ACCESSIBLE_TENANT_SLUG = 'acme';
    process.env.TENANT_ID = 'legacy-tenant-id';

    const { buildBackendHeaders } = require('../src/lib/backend-config');

    expect(buildBackendHeaders()).toEqual(expect.objectContaining({
      'Content-Type': 'application/json',
      'X-Accessible-Frontend': 'apps-web-uk',
      'X-Backend-Target': 'laravel',
      'X-Tenant-Slug': 'acme',
      'X-Tenant-ID': 'legacy-tenant-id'
    }));
  });

  it('builds API URLs from the configured backend base URL', () => {
    process.env.LARAVEL_BACKEND_URL = 'http://laravel.test/';

    const { buildBackendUrl } = require('../src/lib/backend-config');

    expect(buildBackendUrl('/api/auth/login')).toBe('http://laravel.test/api/auth/login');
  });

  it('builds Laravel shared-domain accessible paths with tenant slug and alpha prefix', () => {
    process.env.LARAVEL_BACKEND_URL = 'http://laravel.test/';
    process.env.ACCESSIBLE_TENANT_SLUG = 'acme';

    const { buildLaravelAccessiblePath, buildLaravelAccessibleUrl } = require('../src/lib/backend-config');

    expect(buildLaravelAccessiblePath('/')).toBe('/acme/alpha');
    expect(buildLaravelAccessiblePath('/dashboard')).toBe('/acme/alpha/dashboard');
    expect(buildLaravelAccessibleUrl('/dashboard')).toBe('http://laravel.test/acme/alpha/dashboard');
  });

  it('builds Laravel custom accessible-domain paths without tenant slug prefix', () => {
    process.env.LARAVEL_BACKEND_URL = 'https://accessible.example/';
    process.env.ACCESSIBLE_ROUTE_MODE = 'custom-domain';
    process.env.ACCESSIBLE_TENANT_SLUG = 'acme';

    const { buildLaravelAccessiblePath, buildLaravelAccessibleUrl } = require('../src/lib/backend-config');

    expect(buildLaravelAccessiblePath('/')).toBe('/');
    expect(buildLaravelAccessiblePath('/dashboard')).toBe('/dashboard');
    expect(buildLaravelAccessibleUrl('/dashboard')).toBe('https://accessible.example/dashboard');
  });

  it('requires a tenant slug for Laravel shared-domain accessible paths', () => {
    const { buildLaravelAccessiblePath } = require('../src/lib/backend-config');

    expect(() => buildLaravelAccessiblePath('/dashboard')).toThrow('ACCESSIBLE_TENANT_SLUG');
  });
});
