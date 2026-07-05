// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const DEFAULT_LARAVEL_BACKEND_URL = 'http://localhost';
const DEFAULT_ASPNET_BACKEND_URL = 'http://localhost:5080';

function normalizeTarget(value) {
  return String(value || 'laravel').trim().toLowerCase() === 'aspnet' ? 'aspnet' : 'laravel';
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/g, '');
}

function getAccessibleBackendConfig() {
  const target = normalizeTarget(process.env.ACCESSIBLE_BACKEND_TARGET);
  const isLaravel = target === 'laravel';
  const laravelUrl = process.env.LARAVEL_BACKEND_URL || process.env.API_BASE_URL || DEFAULT_LARAVEL_BACKEND_URL;
  const aspNetUrl = process.env.ASPNET_BACKEND_URL || process.env.API_BASE_URL || DEFAULT_ASPNET_BACKEND_URL;
  const accessibleRouteMode = String(process.env.ACCESSIBLE_ROUTE_MODE || 'tenant-slug').trim().toLowerCase() === 'custom-domain'
    ? 'custom-domain'
    : 'tenant-slug';

  return {
    target,
    baseUrl: trimTrailingSlash(isLaravel ? laravelUrl : aspNetUrl),
    adapterStatus: isLaravel ? 'laravel_first' : 'pending_backend_parity',
    isLaravel,
    isAspNetCertified: false,
    tenantSlug: process.env.ACCESSIBLE_TENANT_SLUG || '',
    tenantId: process.env.TENANT_ID || '',
    accessibleRouteMode
  };
}

function buildBackendHeaders(extraHeaders = {}) {
  const config = getAccessibleBackendConfig();
  const headers = {
    'Content-Type': 'application/json',
    'X-Accessible-Frontend': 'apps-web-uk',
    'X-Backend-Target': config.target,
    ...extraHeaders
  };

  if (config.tenantSlug) {
    headers['X-Tenant-Slug'] = config.tenantSlug;
  }

  if (config.tenantId) {
    headers['X-Tenant-ID'] = config.tenantId;
  }

  return headers;
}

function buildBackendUrl(endpoint) {
  const config = getAccessibleBackendConfig();
  const normalizedEndpoint = String(endpoint || '').startsWith('/') ? endpoint : `/${endpoint}`;
  return `${config.baseUrl}${normalizedEndpoint}`;
}

function normalizeAccessiblePath(routePath) {
  if (!routePath || routePath === '/') {
    return '/';
  }

  return String(routePath).startsWith('/') ? routePath : `/${routePath}`;
}

function buildLaravelAccessiblePath(routePath = '/') {
  const config = getAccessibleBackendConfig();
  const normalizedPath = normalizeAccessiblePath(routePath);

  if (config.accessibleRouteMode === 'custom-domain') {
    return normalizedPath;
  }

  if (!config.tenantSlug) {
    throw new Error('ACCESSIBLE_TENANT_SLUG is required for Laravel shared-domain accessible routes.');
  }

  const prefix = `/${encodeURIComponent(config.tenantSlug)}/alpha`;
  return normalizedPath === '/' ? prefix : `${prefix}${normalizedPath}`;
}

function buildLaravelAccessibleUrl(routePath = '/') {
  const config = getAccessibleBackendConfig();
  return `${config.baseUrl}${buildLaravelAccessiblePath(routePath)}`;
}

module.exports = {
  buildLaravelAccessiblePath,
  buildLaravelAccessibleUrl,
  buildBackendHeaders,
  buildBackendUrl,
  getAccessibleBackendConfig
};
