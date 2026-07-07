// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const DEFAULT_WEB_BASE_URL = 'http://127.0.0.1:5180';
const DEFAULT_LARAVEL_BASE_URL = 'http://127.0.0.1:8088';
const DEFAULT_SMOKE_EMAIL = 'e2e.user.a@project-nexus.local';
const DEFAULT_SMOKE_PASSWORD = 'TestPassword123!';
const DEFAULT_SMOKE_TENANT = 'hour-timebank';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_PUBLIC_MODULE_PAGE_PATHS = ['/volunteering', '/organisations', '/organisations/browse', '/kb', '/help'];
const DEFAULT_SIGNED_MODULE_PAGE_PATHS = [
  '/explore',
  '/saved',
  '/notifications',
  '/members/discover',
  '/resources',
  '/skills',
  '/goals',
  '/clubs',
  '/wallet',
  '/messages',
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
  '/wallet/manage'
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

function resolveOptions(options = {}, env = process.env) {
  return {
    webBaseUrl: stripTrailingSlash(options.webBaseUrl || env.WEB_UK_BASE_URL || DEFAULT_WEB_BASE_URL),
    laravelBaseUrl: stripTrailingSlash(options.laravelBaseUrl || env.LARAVEL_BASE_URL || DEFAULT_LARAVEL_BASE_URL),
    email: options.email || env.SMOKE_EMAIL || DEFAULT_SMOKE_EMAIL,
    password: options.password || env.SMOKE_PASSWORD || DEFAULT_SMOKE_PASSWORD,
    tenant: options.tenant || env.SMOKE_TENANT || DEFAULT_SMOKE_TENANT,
    timeoutMs: Number(options.timeoutMs || env.SMOKE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    modulePagePaths: options.modulePagePaths || [...DEFAULT_PUBLIC_MODULE_PAGE_PATHS, ...DEFAULT_SIGNED_MODULE_PAGE_PATHS],
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
  runLaravelRuntimeSmoke,
  splitSetCookieHeader
};
