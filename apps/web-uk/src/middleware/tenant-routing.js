// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const SHARED_MOUNT_RE = /^\/([A-Za-z0-9_-]+)\/(accessible|alpha)(?=\/|$)/;
const UNPREFIXED_PATHS = [
  '/api',
  '/assets',
  '/css',
  '/downloads',
  '/favicon.ico',
  '/health',
  '/js',
  '/manifest.json',
  '/robots.txt',
  '/service-unavailable',
  '/service-worker.js',
  '/session/touch',
  '/sitemap.xml',
  '/uploads',
  '/v2'
];
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
const RESERVED_CHILD_SEGMENTS = new Set([
  'about',
  'accessibility',
  'account',
  'achievements',
  'activity',
  'blog',
  'broker',
  'caring',
  'caring-community',
  'chat',
  'classic',
  'compose',
  'clubs',
  'communities',
  'community-groups',
  'community-guidelines',
  'connections',
  'contact',
  'consent',
  'consent-required',
  'cookies',
  'acceptable-use',
  'admin',
  'admin-legacy',
  'courses',
  'cron',
  'dashboard',
  'dev',
  'events',
  'exchanges',
  'explore',
  'faq',
  'features',
  'federation',
  'feed',
  'goals',
  'group-exchanges',
  'groups',
  'guide',
  'home',
  'help',
  'how-it-works',
  'ideation',
  'impact-report',
  'impact-summary',
  'jobs',
  'kb',
  'leaderboard',
  'legal',
  'listings',
  'local-groups',
  'login',
  'marketplace',
  'matches',
  'members',
  'messages',
  'migrate-messages',
  'mobile',
  'mobile-download',
  'newsletter',
  'nexus-score',
  'news',
  'notifications',
  'onboarding',
  'organisations',
  'our-story',
  'page',
  'partner',
  'partner-timebanks',
  'partner-with-us',
  'password',
  'podcasts',
  'polls',
  'platform',
  'post',
  'premium',
  'privacy',
  'profile',
  'proposals',
  'register',
  'report-a-problem',
  'resources',
  'reviews',
  'search',
  'services',
  'settings',
  'share-target',
  'skills',
  'social-prescribing',
  'strategic-plan',
  'super-admin',
  'terms',
  'test-email',
  'timebanking-guide',
  'trust-and-safety',
  'verify-email',
  'volunteering',
  'wallet',
  '.well-known',
  'well-known'
]);

function withQuery(path, queryIndex, originalUrl) {
  if (queryIndex === -1) return path;
  return `${path}${originalUrl.slice(queryIndex)}`;
}

function splitPathSuffix(value) {
  const match = String(value || '').match(/^([^?#]*)(.*)$/);
  return {
    pathname: match ? match[1] : '',
    suffix: match ? match[2] : ''
  };
}

function shouldPrefixLocalPath(value, prefix) {
  if (!prefix || typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return false;
  }

  const { pathname } = splitPathSuffix(value);
  if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
    return false;
  }

  return !UNPREFIXED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function prefixLocalPath(value, prefix) {
  if (!shouldPrefixLocalPath(value, prefix)) {
    return value;
  }

  const { pathname, suffix } = splitPathSuffix(value);
  return pathname === '/'
    ? `${prefix}${suffix}`
    : `${prefix}${pathname}${suffix}`;
}

function rewriteHtmlLinks(content, prefix) {
  if (!prefix || typeof content !== 'string' || content === '') {
    return content;
  }

  return content.replace(/\b(href|action)=(["'])(\/[^"']*)\2/g, (match, attribute, quote, value) => {
    return `${attribute}=${quote}${prefixLocalPath(value, prefix)}${quote}`;
  });
}

function looksLikeHtml(content) {
  return /<(?:!doctype|html|head|body|main|form|a)\b/i.test(content);
}

function installSharedMountResponseRewriter(res, prefix) {
  const originalRedirect = res.redirect.bind(res);
  res.redirect = (statusOrUrl, maybeUrl) => {
    if (typeof statusOrUrl === 'number') {
      return originalRedirect(statusOrUrl, prefixLocalPath(maybeUrl, prefix));
    }
    return originalRedirect(prefixLocalPath(statusOrUrl, prefix));
  };

  const originalSend = res.send.bind(res);
  res.send = (body) => {
    const contentType = String(res.get('Content-Type') || '');
    if (typeof body === 'string' && (contentType.includes('text/html') || looksLikeHtml(body))) {
      return originalSend(rewriteHtmlLinks(body, prefix));
    }
    return originalSend(body);
  };
}

function isUnprefixedPath(pathname) {
  return UNPREFIXED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function normalizeHost(host) {
  const raw = String(host || '').trim().toLowerCase();
  if (!raw) {
    return '';
  }

  const withoutProtocol = raw.replace(/^https?:\/\//, '');
  const withoutPath = withoutProtocol.split('/')[0];
  const withoutPort = withoutPath.startsWith('[')
    ? withoutPath.replace(/^\[|\](?::\d+)?$/g, '')
    : withoutPath.split(':')[0];

  return withoutPort.replace(/^www\./, '');
}

function requestHost(req) {
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  return normalizeHost(forwardedHost || req.hostname || req.headers.host);
}

function shouldResolveCustomAccessibleDomain(host) {
  if (!host || LOCAL_HOSTS.has(host)) {
    return false;
  }

  return !host.endsWith('.localhost');
}

function tenantDataMatchesAccessibleHost(data, host) {
  return data?.slug && normalizeHost(data.accessible_domain) === host;
}

function tenantDataMatchesDomainHost(data, host) {
  return normalizeHost(data?.domain) === host && (data?.slug || Number(data?.id) === 1);
}

function tenantDataMatchesParentHost(data, host) {
  return data?.slug && normalizeHost(data.parent_domain) === host;
}

function firstRoutableSegment(pathname) {
  const segments = String(pathname || '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const first = segments[0] || '';

  if (!first || RESERVED_CHILD_SEGMENTS.has(first.toLowerCase())) {
    return '';
  }

  return first;
}

async function resolveParentDomainChildTenant(req, res, pathname, queryIndex, originalUrl) {
  if (isUnprefixedPath(pathname)) {
    return false;
  }

  const host = requestHost(req);
  if (!shouldResolveCustomAccessibleDomain(host)) {
    return false;
  }

  const childSlug = firstRoutableSegment(pathname);
  if (!childSlug) {
    return false;
  }

  const { ApiError, ApiOfflineError, getTenantBootstrap } = require('../lib/api');

  try {
    const result = await getTenantBootstrap({ slug: childSlug });
    const tenant = result?.data || result?.tenant || result;

    if (!tenantDataMatchesParentHost(tenant, host)) {
      return false;
    }

    const prefix = `/${childSlug}`;
    const rest = pathname.slice(prefix.length) || '/';

    req.accessibleRouting = {
      mode: 'parent-domain-child',
      tenantSlug: tenant.slug,
      tenant,
      prefix,
      routePath: rest
    };
    installSharedMountResponseRewriter(res, prefix);
    req.url = withQuery(rest, queryIndex, originalUrl);

    return true;
  } catch (error) {
    if (error instanceof ApiOfflineError || (error instanceof ApiError && error.status === 404)) {
      return false;
    }

    throw error;
  }
}

async function resolveCustomAccessibleDomain(req, pathname) {
  if (isUnprefixedPath(pathname)) {
    return;
  }

  const host = requestHost(req);
  if (!shouldResolveCustomAccessibleDomain(host)) {
    return;
  }

  const { ApiError, ApiOfflineError, getTenantBootstrap } = require('../lib/api');

  try {
    const result = await getTenantBootstrap({ host });
    const tenant = result?.data || result?.tenant || result;

    if (tenantDataMatchesAccessibleHost(tenant, host) || tenantDataMatchesDomainHost(tenant, host)) {
      req.accessibleRouting = {
        mode: 'custom-domain',
        tenantSlug: tenant.slug,
        tenant,
        prefix: '',
        routePath: pathname || '/'
      };
    }
  } catch (error) {
    if (error instanceof ApiOfflineError || (error instanceof ApiError && error.status === 404)) {
      return;
    }

    throw error;
  }
}

async function redirectMatchedCustomDomainMount(req, res, tenantSlug, rest, queryIndex, originalUrl) {
  const host = requestHost(req);
  if (!shouldResolveCustomAccessibleDomain(host)) {
    return false;
  }

  const { ApiError, ApiOfflineError, getTenantBootstrap } = require('../lib/api');

  try {
    const result = await getTenantBootstrap({ host });
    const tenant = result?.data || result?.tenant || result;
    const matchedHost = tenantDataMatchesAccessibleHost(tenant, host) || tenantDataMatchesDomainHost(tenant, host);
    const matchedSlug = String(tenant?.slug || '').toLowerCase() === String(tenantSlug || '').toLowerCase();

    if (!matchedHost || !matchedSlug) {
      return false;
    }

    const sluglessPath = rest === '/' ? '/' : rest;
    res.redirect(301, withQuery(sluglessPath, queryIndex, originalUrl));
    return true;
  } catch (error) {
    if (error instanceof ApiOfflineError || (error instanceof ApiError && error.status === 404)) {
      return false;
    }

    throw error;
  }
}

function tenantRouting(req, res, next) {
  const originalUrl = req.url || '/';
  const queryIndex = originalUrl.indexOf('?');
  const pathname = queryIndex === -1 ? originalUrl : originalUrl.slice(0, queryIndex);
  const match = pathname.match(SHARED_MOUNT_RE);

  if (!match) {
    resolveParentDomainChildTenant(req, res, pathname, queryIndex, originalUrl)
      .then((matchedParentChild) => {
        if (matchedParentChild) {
          return;
        }

        return resolveCustomAccessibleDomain(req, pathname);
      })
      .then(() => next())
      .catch(next);
    return;
  }

  const [, tenantSlug, mount] = match;
  const rest = pathname.slice(match[0].length) || '/';
  const accessiblePrefix = `/${tenantSlug}/accessible`;

  redirectMatchedCustomDomainMount(req, res, tenantSlug, rest, queryIndex, originalUrl)
    .then((redirected) => {
      if (redirected) {
        return;
      }

      if (mount === 'alpha') {
        res.redirect(301, withQuery(`${accessiblePrefix}${rest === '/' ? '' : rest}`, queryIndex, originalUrl));
        return;
      }

      req.accessibleRouting = {
        mode: 'shared',
        tenantSlug,
        prefix: accessiblePrefix,
        routePath: rest
      };
      installSharedMountResponseRewriter(res, accessiblePrefix);
      req.url = withQuery(rest, queryIndex, originalUrl);

      next();
    })
    .catch(next);
}

module.exports = {
  prefixLocalPath,
  rewriteHtmlLinks,
  tenantRouting
};
