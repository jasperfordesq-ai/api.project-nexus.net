// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const DEFAULT_WEB_BASE_URL = 'http://127.0.0.1:5180';
const DEFAULT_LARAVEL_BASE_URL = 'http://127.0.0.1:8088';
const DEFAULT_SMOKE_EMAIL = 'e2e.user.a@project-nexus.local';
const DEFAULT_SMOKE_PASSWORD = 'TestPassword123!';
const DEFAULT_SMOKE_TENANT = 'hour-timebank';
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_PUBLIC_MODULE_PAGE_PATHS = ['/volunteering', '/organisations', '/organisations/browse', '/kb', '/help'];
const DEFAULT_REAL_FIXTURE_MODULE_PAGE_PATHS = [
  '/events/6',
  '/events/6/map',
  '/events/6/polls',
  '/events/6/translate',
  '/volunteering/opportunities/307',
  '/organisations/636',
  '/organisations/636/jobs',
  '/organisations/opportunities/307/apply',
  '/members/77/insights',
  '/listings/42/report',
  '/listings/42/exchange-request',
  '/listings/42/comments',
  '/listings/90967/report',
  '/listings/90967/exchange-request',
  '/listings/90967/comments',
  '/feed/hashtag/timebank',
  '/feed/item/listing/42',
  '/messages/77',
  '/messages/new/77',
  '/jobs/90764',
  '/jobs/90764/qualified',
  '/groups/484',
  '/groups/484/invite',
  '/groups/484/notifications',
  '/groups/484/image',
  '/groups/484/announcements',
  '/groups/484/discussions',
  '/groups/484/discussions/new',
  '/groups/484/files',
  '/groups/484/manage',
  '/resources/10/comments',
  '/volunteering/organisations/636/dashboard',
  '/volunteering/organisations/636/manage',
  '/volunteering/organisations/636/settings',
  '/volunteering/organisations/636/volunteers',
  '/volunteering/organisations/636/wallet',
  '/courses/1',
  '/courses/2',
  '/courses/instructor/1/edit',
  '/courses/instructor/2/edit',
  '/federation/partners/1',
  '/federation/partners/5',
  '/federation/members/353',
  '/federation/members/353/transfer',
  '/federation/members/351',
  '/ideation/23',
  '/ideation/22',
  '/ideation/2',
  '/ideation/23/edit',
  '/ideation/23/manage',
  '/ideation/23/drafts',
  '/ideation/23/outcome',
  '/polls/20',
  '/polls/20/rank',
  '/marketplace/267',
  '/marketplace/267/buy',
  '/marketplace/267/offer',
  '/marketplace/267/report',
  '/marketplace/267/edit',
  '/blog/90001/likers/1'
];
const DEFAULT_UNSIGNED_AUTH_REQUIRED_PAGE_PATHS = [
  '/federation/listings/1/1',
  '/federation/partners/1',
  '/ideation/1',
  '/organisations/1',
  '/podcasts/1',
  '/podcasts/1/episodes/1',
  '/resources/1/download',
  '/users/1/collections'
];
const DEFAULT_SIGNED_GATED_PAGE_PATHS = [
  { path: '/coupons', status: 403 },
  { path: '/jobs/bias-audit', status: 403 },
  { path: '/jobs/talent-search', status: 403 },
  { path: '/jobs/90764/edit', status: 403 },
  { path: '/jobs/90764/analytics', status: 403 },
  { path: '/jobs/90764/pipeline', status: 403 },
  { path: '/jobs/90764/applications', status: 403 },
  { path: '/listings/42/analytics', status: 403 },
  { path: '/listings/90967/analytics', status: 403 },
  { path: '/jobs/talent-search/77', status: 403 },
  { path: '/group-exchanges/1', status: 403 },
  { path: '/messages/groups/33', status: 403 },
  { path: '/resources/10/delete', status: 403 },
  { path: '/coupons/1', status: 403 },
  { path: '/coupons/2', status: 403 },
  { path: '/marketplace/coupons', status: 403 },
  { path: '/marketplace/coupons/5/edit', status: 403 }
];
const DEFAULT_SIGNED_REDIRECT_PAGE_PATHS = [
  { path: '/password/reset', location: '/login/forgot-password' },
  { path: '/login/two-factor', location: '/login?status=two-factor-expired' },
  { path: '/onboarding', location: '/dashboard' },
  { path: '/events/6/recurring-edit', location: '/events/6/edit' },
  { path: '/groups/484/edit', location: '/groups/484' },
  { path: '/courses/42/certificate', location: '/courses/42?status=certificate-failed' },
  { path: '/courses/1/certificate', location: '/courses/1?status=certificate-failed' },
  { path: '/federation/messages/conversation/77', location: '/federation/messages' },
  { path: '/jobs/90764/applications/export.csv', location: '/jobs/90764/applications?status=export-failed' },
  { path: '/courses/1/learn', location: '/courses/1?status=enrol-required' },
  { path: '/courses/2/learn', location: '/courses/2?status=enrol-required' },
  { path: '/federation/messages/conversation/353', location: '/federation/messages' },
  { path: '/onboarding/profile', location: '/dashboard' },
  { path: '/premium/manage', location: '/premium?status=no-subscription' }
];
const DEFAULT_SIGNED_MODULE_PAGE_PATHS = [
  '/',
  '/account',
  '/login',
  '/login/forgot-password',
  '/password/reset?token=reset-token',
  '/register',
  '/explore',
  '/saved',
  '/notifications',
  '/members',
  '/members/discover',
  '/resources',
  '/skills',
  '/goals',
  '/clubs',
  '/wallet',
  '/messages',
  '/connections',
  '/connections/network',
  '/matches',
  '/matches/board',
  '/activity',
  '/achievements',
  '/leaderboard',
  '/nexus-score',
  '/profile/settings',
  '/settings/appearance',
  '/settings/data-rights',
  '/federation',
  '/courses',
  '/courses/mine',
  '/marketplace',
  '/marketplace/mine',
  '/events',
  '/events/new',
  '/listings',
  '/search/advanced',
  '/premium',
  '/podcasts',
  '/profile/delete-account',
  '/profile/two-factor',
  '/profile/blocked',
  '/settings/availability',
  '/settings/linked-accounts',
  '/settings/insurance',
  '/activity/insights',
  '/achievements/shop',
  '/achievements/collections',
  '/achievements/engagement',
  '/achievements/showcase',
  '/leaderboard/competitive',
  '/leaderboard/seasons',
  '/leaderboard/journey',
  '/leaderboard/spotlight',
  '/nexus-score/tiers',
  '/federation/partners',
  '/federation/members',
  '/federation/settings',
  '/federation/opt-in',
  '/federation/opt-out',
  '/federation/onboarding',
  '/federation/groups',
  '/federation/listings',
  '/federation/events',
  '/federation/connections',
  '/federation/messages',
  '/courses/instructor',
  '/courses/instructor/new',
  '/marketplace/saved',
  '/marketplace/free',
  '/marketplace/offers',
  '/marketplace/orders',
  '/marketplace/sales',
  '/marketplace/pickups',
  '/marketplace/onboarding',
  '/marketplace/slots',
  '/volunteering/accessibility',
  '/volunteering/certificates',
  '/volunteering/opportunities/create',
  '/volunteering/credentials',
  '/volunteering/hours',
  '/volunteering/wellbeing',
  '/volunteering/donations',
  '/volunteering/expenses',
  '/volunteering/emergency-alerts',
  '/volunteering/group-signups',
  '/volunteering/training',
  '/volunteering/incidents',
  '/volunteering/waitlist',
  '/volunteering/swaps',
  '/volunteering/my-organisations',
  '/volunteering/recommended-shifts',
  '/about',
  '/accessibility',
  '/blog',
  '/blog/feed.xml',
  '/chat',
  '/contact',
  '/cookies',
  '/dashboard',
  '/events/browse',
  '/exchanges',
  '/faq',
  '/features',
  '/feed',
  '/feed/hashtags',
  '/goals/buddying',
  '/goals/discover',
  '/goals/templates',
  '/group-exchanges',
  '/group-exchanges/new',
  '/groups',
  '/groups/new',
  '/guide',
  '/ideation',
  '/ideation/campaigns',
  '/ideation/new',
  '/ideation/outcomes',
  '/ideation/tags',
  '/jobs',
  '/jobs/alerts',
  '/jobs/applications',
  '/jobs/create',
  '/jobs/employer-onboarding',
  '/jobs/mine',
  '/jobs/responses',
  '/jobs/saved',
  '/legal',
  '/legal/acceptable-use',
  '/legal/community-guidelines',
  '/legal/cookies',
  '/legal/privacy',
  '/legal/terms',
  '/listings/new',
  '/marketplace/create',
  '/marketplace/search',
  '/marketplace/coupons/new',
  '/me/collections',
  '/members/nearby',
  '/messages/groups',
  '/messages/groups/new',
  '/newsletter/unsubscribe',
  '/organisations/manage',
  '/organisations/register',
  '/podcasts/studio',
  '/podcasts/studio/new',
  '/polls',
  '/polls/parity/create',
  '/polls/parity/manage',
  '/premium/return',
  '/profile',
  '/report-a-problem',
  '/resources/library',
  '/resources/upload',
  '/reviews',
  '/reviews/list',
  '/search',
  '/trust-and-safety',
  '/verify-email',
  '/wallet/export.csv',
  '/wallet/manage',
  '/wallet/recipients'
];

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  header() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  storeFrom(headers) {
    for (const header of getSetCookieHeaders(headers)) {
      const pair = String(header).split(';')[0];
      const separator = pair.indexOf('=');
      if (separator > 0) {
        this.cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
      }
    }
  }
}

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function joinUrl(baseUrl, path) {
  return `${stripTrailingSlash(baseUrl)}${path.startsWith('/') ? path : `/${path}`}`;
}

function splitSetCookieHeader(value) {
  if (!value) return [];
  return String(value).split(/,(?=\s*[^;,]+=)/).map((part) => part.trim()).filter(Boolean);
}

function getSetCookieHeaders(headers) {
  if (!headers) return [];
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  if (typeof headers.raw === 'function') return headers.raw()['set-cookie'] || [];
  if (typeof headers.get === 'function') return splitSetCookieHeader(headers.get('set-cookie'));
  return [];
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function smokeRequest({ fetchImpl, timeoutMs, cookieJar, url, options = {} }) {
  const headers = { ...(options.headers || {}) };
  const cookieHeader = cookieJar?.header();
  if (cookieHeader) headers.cookie = cookieHeader;

  const response = await fetchWithTimeout(fetchImpl, url, {
    redirect: 'manual',
    ...options,
    headers
  }, timeoutMs);

  if (cookieJar) cookieJar.storeFrom(response.headers);
  return response;
}

function responseLocation(response) {
  return response.headers.get('location') || '';
}

function isRedirectTo(response, expectedPath) {
  const location = responseLocation(response);
  return response.status >= 300 && response.status < 400 && (
    location === expectedPath ||
    location.startsWith(`${expectedPath}?`) ||
    location.startsWith(`${expectedPath}#`)
  );
}

async function readTextSafely(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function extractCsrfToken(html) {
  const match = String(html || '').match(/name=["']_csrf["'][^>]*value=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

function addCheck(checks, name, ok, detail, meta = {}) {
  checks.push({
    name,
    ok,
    detail,
    ...meta
  });
}

function modulePageCheckName(path) {
  const slug = String(path || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase();
  return `module-page-${slug || 'home'}-renders`;
}

function gatedPageCheckName(path, status) {
  const slug = String(path || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase();
  return `gated-page-${slug || 'home'}-returns-${status}`;
}

function redirectPageCheckName(path, location) {
  const pathSlug = String(path || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase();
  const locationSlug = String(location || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase();
  return `redirect-page-${pathSlug || 'home'}-redirects-${locationSlug || 'home'}`;
}

function authRequiredPageCheckName(path, location) {
  const pathSlug = String(path || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase();
  const locationSlug = String(location || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase();
  return `auth-required-page-${pathSlug || 'home'}-redirects-${locationSlug || 'home'}`;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function splitSmokeList(value) {
  const text = String(value || '').trim();
  if (/^(none|off|false)$/i.test(text)) return [];
  return text
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolvePathList(options, optionName, env, envName, fallback) {
  if (hasOwn(options, optionName)) return options[optionName];
  if (hasOwn(env, envName)) return splitSmokeList(env[envName]);
  return fallback;
}

function applySmokeChunk(paths, chunk) {
  const match = String(chunk || '').trim().match(/^(\d+)\/(\d+)$/);
  if (!match) return paths;

  const index = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || total < 1 || index > total) {
    return paths;
  }

  return paths.filter((_, position) => position % total === index - 1);
}

function resolveModulePagePaths(options, env) {
  const paths = resolvePathList(
    options,
    'modulePagePaths',
    env,
    'SMOKE_MODULE_PAGE_PATHS',
    [...DEFAULT_PUBLIC_MODULE_PAGE_PATHS, ...DEFAULT_SIGNED_MODULE_PAGE_PATHS, ...DEFAULT_REAL_FIXTURE_MODULE_PAGE_PATHS]
  );

  if (hasOwn(options, 'modulePagePaths')) return paths;
  return applySmokeChunk(paths, env.SMOKE_MODULE_PAGE_CHUNK);
}

function parseGatedPages(value) {
  return splitSmokeList(value).map((item) => {
    const separator = item.lastIndexOf(':');
    if (separator <= 0) return { path: item, status: 403 };
    return {
      path: item.slice(0, separator),
      status: Number(item.slice(separator + 1)) || 403
    };
  });
}

function parseRedirectPages(value) {
  return splitSmokeList(value).map((item) => {
    const separator = item.indexOf('=>');
    if (separator <= 0) return { path: item, location: '/login' };
    return {
      path: item.slice(0, separator).trim(),
      location: item.slice(separator + 2).trim()
    };
  }).filter((item) => item.path && item.location);
}

function resolveGatedPages(options, env) {
  if (hasOwn(options, 'gatedPagePaths')) return options.gatedPagePaths;
  if (hasOwn(env, 'SMOKE_GATED_PAGE_PATHS')) return parseGatedPages(env.SMOKE_GATED_PAGE_PATHS);
  return DEFAULT_SIGNED_GATED_PAGE_PATHS;
}

function resolveRedirectPages(options, env) {
  if (hasOwn(options, 'redirectPagePaths')) return options.redirectPagePaths;
  if (hasOwn(env, 'SMOKE_REDIRECT_PAGE_PATHS')) return parseRedirectPages(env.SMOKE_REDIRECT_PAGE_PATHS);
  return DEFAULT_SIGNED_REDIRECT_PAGE_PATHS;
}

function resolveOptions(options = {}, env = process.env) {
  return {
    webBaseUrl: stripTrailingSlash(options.webBaseUrl || env.WEB_UK_BASE_URL || DEFAULT_WEB_BASE_URL),
    laravelBaseUrl: stripTrailingSlash(options.laravelBaseUrl || env.LARAVEL_BASE_URL || DEFAULT_LARAVEL_BASE_URL),
    email: options.email || env.SMOKE_EMAIL || DEFAULT_SMOKE_EMAIL,
    password: options.password || env.SMOKE_PASSWORD || DEFAULT_SMOKE_PASSWORD,
    tenant: options.tenant || env.SMOKE_TENANT || DEFAULT_SMOKE_TENANT,
    timeoutMs: Number(options.timeoutMs || env.SMOKE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    modulePagePaths: resolveModulePagePaths(options, env),
    unsignedAuthRequiredPagePaths: resolvePathList(
      options,
      'unsignedAuthRequiredPagePaths',
      env,
      'SMOKE_UNSIGNED_AUTH_REQUIRED_PAGE_PATHS',
      DEFAULT_UNSIGNED_AUTH_REQUIRED_PAGE_PATHS
    ),
    gatedPagePaths: resolveGatedPages(options, env),
    redirectPagePaths: resolveRedirectPages(options, env),
    fetchImpl: options.fetchImpl || globalThis.fetch
  };
}

async function runLaravelRuntimeSmoke(options = {}) {
  const config = resolveOptions(options);
  const checks = [];
  const cookieJar = new CookieJar();

  if (typeof config.fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required to run the Laravel runtime smoke test.');
  }

  try {
    const response = await smokeRequest({
      fetchImpl: config.fetchImpl,
      timeoutMs: config.timeoutMs,
      url: joinUrl(config.laravelBaseUrl, '/api/v2/groups?limit=1')
    });
    addCheck(checks, 'laravel-api-reachable', response.ok, response.ok ? 'Laravel API returned a successful response.' : `expected 2xx from Laravel API, got ${response.status}`, { status: response.status });
  } catch (error) {
    addCheck(checks, 'laravel-api-reachable', false, error.message);
  }

  try {
    const response = await smokeRequest({
      fetchImpl: config.fetchImpl,
      timeoutMs: config.timeoutMs,
      url: joinUrl(config.webBaseUrl, '/health')
    });
    addCheck(checks, 'web-health', response.ok, response.ok ? 'web-uk health endpoint returned a successful response.' : `expected 2xx from web-uk health, got ${response.status}`, { status: response.status });
  } catch (error) {
    addCheck(checks, 'web-health', false, error.message);
  }

  try {
    const response = await smokeRequest({
      fetchImpl: config.fetchImpl,
      timeoutMs: config.timeoutMs,
      cookieJar,
      url: joinUrl(config.webBaseUrl, '/account')
    });
    addCheck(
      checks,
      'protected-account-redirects-to-login',
      isRedirectTo(response, '/login'),
      isRedirectTo(response, '/login')
        ? 'Unsigned /account redirects to login.'
        : `expected 302 redirect to /login, got ${response.status} ${responseLocation(response)}`,
      { status: response.status, location: responseLocation(response) }
    );
  } catch (error) {
    addCheck(checks, 'protected-account-redirects-to-login', false, error.message);
  }

  for (const path of config.unsignedAuthRequiredPagePaths) {
    const expectedLocation = '/login?status=auth-required';
    try {
      const response = await smokeRequest({
        fetchImpl: config.fetchImpl,
        timeoutMs: config.timeoutMs,
        cookieJar,
        url: joinUrl(config.webBaseUrl, path)
      });
      const ok = isRedirectTo(response, expectedLocation);
      addCheck(
        checks,
        authRequiredPageCheckName(path, expectedLocation),
        ok,
        ok ? `${path} redirected to ${expectedLocation}.` : `expected redirect to ${expectedLocation} from ${path}, got ${response.status} ${responseLocation(response)}`,
        { status: response.status, location: responseLocation(response), path }
      );
    } catch (error) {
      addCheck(checks, authRequiredPageCheckName(path, expectedLocation), false, error.message, { path });
    }
  }

  let csrfToken = '';
  try {
    const response = await smokeRequest({
      fetchImpl: config.fetchImpl,
      timeoutMs: config.timeoutMs,
      cookieJar,
      url: joinUrl(config.webBaseUrl, '/login')
    });
    const html = await readTextSafely(response);
    csrfToken = extractCsrfToken(html);
    addCheck(
      checks,
      'login-form-csrf',
      response.ok && Boolean(csrfToken),
      response.ok && csrfToken ? 'Login form rendered a CSRF token.' : `expected login form with CSRF token, got ${response.status}`,
      { status: response.status }
    );
  } catch (error) {
    addCheck(checks, 'login-form-csrf', false, error.message);
  }

  try {
    const form = new URLSearchParams({
      _csrf: csrfToken,
      email: config.email,
      password: config.password,
      tenant_slug: config.tenant
    });
    const response = await smokeRequest({
      fetchImpl: config.fetchImpl,
      timeoutMs: config.timeoutMs,
      cookieJar,
      url: joinUrl(config.webBaseUrl, '/login'),
      options: {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      }
    });
    addCheck(
      checks,
      'login-post-redirects-dashboard',
      isRedirectTo(response, '/dashboard'),
      isRedirectTo(response, '/dashboard')
        ? 'Login POST redirected to dashboard.'
        : `expected 302 redirect to /dashboard, got ${response.status} ${responseLocation(response)}`,
      { status: response.status, location: responseLocation(response) }
    );
  } catch (error) {
    addCheck(checks, 'login-post-redirects-dashboard', false, error.message);
  }

  try {
    const response = await smokeRequest({
      fetchImpl: config.fetchImpl,
      timeoutMs: config.timeoutMs,
      cookieJar,
      url: joinUrl(config.webBaseUrl, '/account')
    });
    addCheck(
      checks,
      'signed-account-renders',
      response.ok,
      response.ok ? 'Signed account page rendered successfully.' : `expected 2xx from signed account page, got ${response.status} ${responseLocation(response)}`,
      { status: response.status, location: responseLocation(response) }
    );
  } catch (error) {
    addCheck(checks, 'signed-account-renders', false, error.message);
  }

  for (const path of config.modulePagePaths) {
    try {
      const response = await smokeRequest({
        fetchImpl: config.fetchImpl,
        timeoutMs: config.timeoutMs,
        cookieJar,
        url: joinUrl(config.webBaseUrl, path)
      });
      addCheck(
        checks,
        modulePageCheckName(path),
        response.ok,
        response.ok ? `${path} rendered successfully.` : `expected 2xx from ${path}, got ${response.status} ${responseLocation(response)}`,
        { status: response.status, location: responseLocation(response), path }
      );
    } catch (error) {
      addCheck(checks, modulePageCheckName(path), false, error.message, { path });
    }
  }

  for (const gatedPage of config.gatedPagePaths) {
    const path = gatedPage.path;
    const expectedStatus = gatedPage.status;
    try {
      const response = await smokeRequest({
        fetchImpl: config.fetchImpl,
        timeoutMs: config.timeoutMs,
        cookieJar,
        url: joinUrl(config.webBaseUrl, path)
      });
      addCheck(
        checks,
        gatedPageCheckName(path, expectedStatus),
        response.status === expectedStatus,
        response.status === expectedStatus ? `${path} returned expected ${expectedStatus}.` : `expected ${expectedStatus} from ${path}, got ${response.status} ${responseLocation(response)}`,
        { status: response.status, location: responseLocation(response), path }
      );
    } catch (error) {
      addCheck(checks, gatedPageCheckName(path, expectedStatus), false, error.message, { path });
    }
  }

  for (const redirectPage of config.redirectPagePaths) {
    const path = redirectPage.path;
    const expectedLocation = redirectPage.location;
    try {
      const response = await smokeRequest({
        fetchImpl: config.fetchImpl,
        timeoutMs: config.timeoutMs,
        cookieJar,
        url: joinUrl(config.webBaseUrl, path)
      });
      const ok = isRedirectTo(response, expectedLocation);
      addCheck(
        checks,
        redirectPageCheckName(path, expectedLocation),
        ok,
        ok ? `${path} redirected to ${expectedLocation}.` : `expected redirect to ${expectedLocation} from ${path}, got ${response.status} ${responseLocation(response)}`,
        { status: response.status, location: responseLocation(response), path }
      );
    } catch (error) {
      addCheck(checks, redirectPageCheckName(path, expectedLocation), false, error.message, { path });
    }
  }

  return {
    ok: checks.every((check) => check.ok),
    webBaseUrl: config.webBaseUrl,
    laravelBaseUrl: config.laravelBaseUrl,
    tenant: config.tenant,
    email: config.email,
    checks
  };
}

async function main() {
  const result = await runLaravelRuntimeSmoke();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  CookieJar,
  extractCsrfToken,
  resolveOptions,
  runLaravelRuntimeSmoke,
  splitSetCookieHeader
};
