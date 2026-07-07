// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const http = require('http');

const { resolveOptions, runLaravelRuntimeSmoke } = require('../scripts/laravel-runtime-smoke');

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
  });
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createLaravelServer(requests) {
  return http.createServer((req, res) => {
    requests.push({ surface: 'laravel', method: req.method, url: req.url });

    if (req.method === 'GET' && req.url === '/api/v2/groups?limit=1') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: [] }));
      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('missing');
  });
}

function createWebServer(requests, { loginRedirect = '/dashboard', delayedPaths = {} } = {}) {
  return http.createServer(async (req, res) => {
    requests.push({
      surface: 'web',
      method: req.method,
      url: req.url,
      cookie: req.headers.cookie || ''
    });

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'GET' && req.url === '/account') {
      if ((req.headers.cookie || '').includes('token=signed-token')) {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<h1>My account</h1>');
        return;
      }

      res.writeHead(302, { location: '/login' });
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/login') {
      res.writeHead(200, {
        'content-type': 'text/html',
        'set-cookie': 'nexus.csrf=csrf-cookie; Path=/; HttpOnly'
      });
      res.end('<form method="post"><input type="hidden" name="_csrf" value="csrf-token"></form>');
      return;
    }

    const signedPublicAuthPages = new Set([
      '/login/forgot-password',
      '/password/reset?token=reset-token',
      '/register'
    ]);
    if (req.method === 'GET' && signedPublicAuthPages.has(req.url)) {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<h1>${req.url}</h1>`);
      return;
    }

    if (req.method === 'POST' && req.url === '/login') {
      const body = await readBody(req);
      const params = new URLSearchParams(body);
      requests[requests.length - 1].body = body;
      const hasExpectedCsrf = params.get('_csrf') === 'csrf-token' && (req.headers.cookie || '').includes('nexus.csrf=csrf-cookie');
      if (hasExpectedCsrf && loginRedirect) {
        res.writeHead(302, {
          location: loginRedirect,
          'set-cookie': [
            'token=signed-token; Path=/; HttpOnly',
            'refresh_token=signed-refresh; Path=/; HttpOnly'
          ]
        });
        res.end();
        return;
      }

      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<p>Email, password or tenant is incorrect</p>');
      return;
    }

    const modulePages = new Set(['/volunteering', '/organisations', '/organisations/browse', '/kb', '/help']);
    if (req.method === 'GET' && modulePages.has(req.url)) {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<h1>${req.url}</h1>`);
      return;
    }

    const signedModulePages = new Set([
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
    ]);
    if (req.method === 'GET' && signedModulePages.has(req.url)) {
      if (delayedPaths[req.url]) {
        await delay(delayedPaths[req.url]);
      }

      if ((req.headers.cookie || '').includes('token=signed-token')) {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(`<h1>${req.url}</h1>`);
        return;
      }

      res.writeHead(302, { location: '/login?status=auth-required' });
      res.end();
      return;
    }

    const signedGatedPages = new Set([
      '/jobs/bias-audit',
      '/jobs/talent-search',
      '/marketplace/coupons'
    ]);
    if (req.method === 'GET' && signedGatedPages.has(req.url)) {
      if ((req.headers.cookie || '').includes('token=signed-token')) {
        res.writeHead(403, { 'content-type': 'text/html' });
        res.end('<h1>Forbidden</h1>');
        return;
      }

      res.writeHead(302, { location: '/login?status=auth-required' });
      res.end();
      return;
    }

    const signedRedirectPages = new Map([
      ['/login/two-factor', '/login?status=two-factor-expired'],
      ['/onboarding', '/dashboard'],
      ['/premium/manage', '/premium?status=no-subscription']
    ]);
    if (req.method === 'GET' && signedRedirectPages.has(req.url)) {
      if ((req.headers.cookie || '').includes('token=signed-token')) {
        res.writeHead(302, { location: signedRedirectPages.get(req.url) });
        res.end();
        return;
      }

      res.writeHead(302, { location: '/login?status=auth-required' });
      res.end();
      return;
    }

    const unsignedAuthRequiredPages = new Set([
      '/federation/listings/1/1',
      '/federation/partners/1',
      '/ideation/1',
      '/organisations/1',
      '/podcasts/1',
      '/podcasts/1/episodes/1',
      '/resources/1/download',
      '/users/1/collections'
    ]);
    if (req.method === 'GET' && unsignedAuthRequiredPages.has(req.url)) {
      res.writeHead(302, { location: '/login?status=auth-required' });
      res.end();
      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('missing');
  });
}

describe('Laravel runtime smoke harness', () => {
  const servers = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    })));
  });

  it('uses a 60 second default request timeout for slower Laravel-backed pages', () => {
    expect(resolveOptions({}, {}).timeoutMs).toBe(60000);
  });

  it('allows CLI environment overrides for targeted smoke page groups', () => {
    const options = resolveOptions({}, {
      SMOKE_MODULE_PAGE_PATHS: '/login, /register',
      SMOKE_UNSIGNED_AUTH_REQUIRED_PAGE_PATHS: "/federation/partners/1\n/podcasts/1",
      SMOKE_GATED_PAGE_PATHS: '',
      SMOKE_REDIRECT_PAGE_PATHS: ''
    });

    expect(options.modulePagePaths).toEqual(['/login', '/register']);
    expect(options.unsignedAuthRequiredPagePaths).toEqual(['/federation/partners/1', '/podcasts/1']);
    expect(options.gatedPagePaths).toEqual([]);
    expect(options.redirectPagePaths).toEqual([]);
  });

  it('treats none as a portable CLI sentinel for disabled smoke page groups', () => {
    const options = resolveOptions({}, {
      SMOKE_MODULE_PAGE_PATHS: 'none',
      SMOKE_UNSIGNED_AUTH_REQUIRED_PAGE_PATHS: 'none',
      SMOKE_GATED_PAGE_PATHS: 'none',
      SMOKE_REDIRECT_PAGE_PATHS: 'none'
    });

    expect(options.modulePagePaths).toEqual([]);
    expect(options.unsignedAuthRequiredPagePaths).toEqual([]);
    expect(options.gatedPagePaths).toEqual([]);
    expect(options.redirectPagePaths).toEqual([]);
  });

  it('proves the Laravel-backed login path with CSRF, cookies, redirects, and a signed account page', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests);
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({
      laravelBaseUrl,
      webBaseUrl,
      email: 'member@acme.test',
      password: 'Test123!',
      tenant: 'acme'
    });

    expect(result.ok).toBe(true);
    expect(result.checks.map((check) => [check.name, check.ok])).toEqual(expect.arrayContaining([
      ['laravel-api-reachable', true],
      ['web-health', true],
      ['protected-account-redirects-to-login', true],
      ['login-form-csrf', true],
      ['login-post-redirects-dashboard', true],
      ['signed-account-renders', true]
    ]));
    expect(requests.map((request) => `${request.surface} ${request.method} ${request.url}`)).toContain('laravel GET /api/v2/groups?limit=1');
    expect(requests.map((request) => `${request.surface} ${request.method} ${request.url}`)).toContain('web POST /login');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/account').at(-1).cookie).toContain('token=signed-token');
  });

  it('reports a failed login as an auth smoke failure instead of certifying the run', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests, { loginRedirect: null });
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({
      laravelBaseUrl,
      webBaseUrl,
      email: 'member@acme.test',
      password: 'wrong-password',
      tenant: 'acme'
    });

    const authCheck = result.checks.find((check) => check.name === 'login-post-redirects-dashboard');
    expect(result.ok).toBe(false);
    expect(authCheck.ok).toBe(false);
    expect(authCheck.detail).toContain('expected 302 redirect to /dashboard');
  });

  it('defaults to the Laravel E2E tenant fixture credentials', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests);
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({ laravelBaseUrl, webBaseUrl });

    const loginRequest = requests.find((request) => request.method === 'POST' && request.url === '/login');
    const body = new URLSearchParams(loginRequest.body);
    expect(result.ok).toBe(true);
    expect(body.get('email')).toBe('e2e.user.a@project-nexus.local');
    expect(body.get('password')).toBe('TestPassword123!');
    expect(body.get('tenant_slug')).toBe('hour-timebank');
  });

  it('smokes the default public Laravel-backed module pages', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests);
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({ laravelBaseUrl, webBaseUrl });
    const checks = Object.fromEntries(result.checks.map((check) => [check.name, check.ok]));

    expect(checks).toEqual(expect.objectContaining({
      'module-page-volunteering-renders': true,
      'module-page-organisations-renders': true,
      'module-page-organisations-browse-renders': true,
      'module-page-kb-renders': true,
      'module-page-help-renders': true
    }));
    expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual(expect.arrayContaining([
      'GET /volunteering',
      'GET /organisations',
      'GET /organisations/browse',
      'GET /kb',
      'GET /help'
    ]));
  });

  it('smokes the default signed Laravel-backed module pages after login', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests);
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({ laravelBaseUrl, webBaseUrl });
    const checks = Object.fromEntries(result.checks.map((check) => [check.name, check.ok]));
    const checkByName = Object.fromEntries(result.checks.map((check) => [check.name, check]));

    expect(checks).toEqual(expect.objectContaining({
      'module-page-login-renders': true,
      'module-page-login-forgot-password-renders': true,
      'module-page-password-reset-token-reset-token-renders': true,
      'module-page-register-renders': true,
      'module-page-explore-renders': true,
      'module-page-saved-renders': true,
      'module-page-notifications-renders': true,
      'module-page-members-renders': true,
      'module-page-members-discover-renders': true,
      'module-page-resources-renders': true,
      'module-page-skills-renders': true,
      'module-page-goals-renders': true,
      'module-page-clubs-renders': true,
      'module-page-wallet-renders': true,
      'module-page-messages-renders': true,
      'module-page-connections-renders': true,
      'module-page-connections-network-renders': true,
      'module-page-matches-renders': true,
      'module-page-matches-board-renders': true,
      'module-page-activity-renders': true,
      'module-page-achievements-renders': true,
      'module-page-leaderboard-renders': true,
      'module-page-nexus-score-renders': true,
      'module-page-profile-settings-renders': true,
      'module-page-settings-appearance-renders': true,
      'module-page-settings-data-rights-renders': true,
      'module-page-federation-renders': true,
      'module-page-courses-renders': true,
      'module-page-courses-mine-renders': true,
      'module-page-marketplace-renders': true,
      'module-page-marketplace-mine-renders': true,
      'module-page-events-renders': true,
      'module-page-events-new-renders': true,
      'module-page-listings-renders': true,
      'module-page-search-advanced-renders': true,
      'module-page-premium-renders': true,
      'module-page-podcasts-renders': true,
      'module-page-profile-delete-account-renders': true,
      'module-page-profile-two-factor-renders': true,
      'module-page-profile-blocked-renders': true,
      'module-page-settings-availability-renders': true,
      'module-page-settings-linked-accounts-renders': true,
      'module-page-settings-insurance-renders': true,
      'module-page-activity-insights-renders': true,
      'module-page-achievements-shop-renders': true,
      'module-page-achievements-collections-renders': true,
      'module-page-achievements-engagement-renders': true,
      'module-page-achievements-showcase-renders': true,
      'module-page-leaderboard-competitive-renders': true,
      'module-page-leaderboard-seasons-renders': true,
      'module-page-leaderboard-journey-renders': true,
      'module-page-leaderboard-spotlight-renders': true,
      'module-page-nexus-score-tiers-renders': true,
      'module-page-federation-partners-renders': true,
      'module-page-federation-members-renders': true,
      'module-page-federation-settings-renders': true,
      'module-page-federation-opt-in-renders': true,
      'module-page-federation-opt-out-renders': true,
      'module-page-federation-onboarding-renders': true,
      'module-page-federation-groups-renders': true,
      'module-page-federation-listings-renders': true,
      'module-page-federation-events-renders': true,
      'module-page-federation-connections-renders': true,
      'module-page-federation-messages-renders': true,
      'module-page-courses-instructor-renders': true,
      'module-page-courses-instructor-new-renders': true,
      'module-page-marketplace-saved-renders': true,
      'module-page-marketplace-free-renders': true,
      'module-page-marketplace-offers-renders': true,
      'module-page-marketplace-orders-renders': true,
      'module-page-marketplace-sales-renders': true,
      'module-page-marketplace-pickups-renders': true,
      'module-page-marketplace-onboarding-renders': true,
      'module-page-marketplace-slots-renders': true,
      'module-page-volunteering-accessibility-renders': true,
      'module-page-volunteering-certificates-renders': true,
      'module-page-volunteering-opportunities-create-renders': true,
      'module-page-volunteering-credentials-renders': true,
      'module-page-volunteering-hours-renders': true,
      'module-page-volunteering-wellbeing-renders': true,
      'module-page-volunteering-donations-renders': true,
      'module-page-volunteering-expenses-renders': true,
      'module-page-volunteering-emergency-alerts-renders': true,
      'module-page-volunteering-group-signups-renders': true,
      'module-page-volunteering-training-renders': true,
      'module-page-volunteering-incidents-renders': true,
      'module-page-volunteering-waitlist-renders': true,
      'module-page-volunteering-swaps-renders': true,
      'module-page-volunteering-my-organisations-renders': true,
      'module-page-volunteering-recommended-shifts-renders': true,
      'module-page-about-renders': true,
      'module-page-accessibility-renders': true,
      'module-page-blog-renders': true,
      'module-page-chat-renders': true,
      'module-page-contact-renders': true,
      'module-page-cookies-renders': true,
      'module-page-dashboard-renders': true,
      'module-page-events-browse-renders': true,
      'module-page-exchanges-renders': true,
      'module-page-faq-renders': true,
      'module-page-features-renders': true,
      'module-page-feed-hashtags-renders': true,
      'module-page-feed-renders': true,
      'module-page-goals-buddying-renders': true,
      'module-page-goals-discover-renders': true,
      'module-page-goals-templates-renders': true,
      'module-page-group-exchanges-renders': true,
      'module-page-group-exchanges-new-renders': true,
      'module-page-groups-renders': true,
      'module-page-groups-new-renders': true,
      'module-page-guide-renders': true,
      'module-page-ideation-renders': true,
      'module-page-ideation-campaigns-renders': true,
      'module-page-ideation-new-renders': true,
      'module-page-ideation-outcomes-renders': true,
      'module-page-ideation-tags-renders': true,
      'module-page-jobs-renders': true,
      'module-page-jobs-alerts-renders': true,
      'module-page-jobs-applications-renders': true,
      'module-page-jobs-create-renders': true,
      'module-page-jobs-employer-onboarding-renders': true,
      'module-page-jobs-mine-renders': true,
      'module-page-jobs-responses-renders': true,
      'module-page-jobs-saved-renders': true,
      'gated-page-jobs-bias-audit-returns-403': true,
      'gated-page-jobs-talent-search-returns-403': true,
      'module-page-legal-renders': true,
      'module-page-legal-acceptable-use-renders': true,
      'module-page-legal-community-guidelines-renders': true,
      'module-page-legal-cookies-renders': true,
      'module-page-legal-privacy-renders': true,
      'module-page-legal-terms-renders': true,
      'module-page-listings-new-renders': true,
      'module-page-marketplace-create-renders': true,
      'module-page-marketplace-search-renders': true,
      'gated-page-marketplace-coupons-returns-403': true,
      'module-page-me-collections-renders': true,
      'module-page-members-nearby-renders': true,
      'module-page-messages-groups-renders': true,
      'module-page-messages-groups-new-renders': true,
      'module-page-newsletter-unsubscribe-renders': true,
      'module-page-organisations-manage-renders': true,
      'module-page-organisations-register-renders': true,
      'module-page-podcasts-studio-renders': true,
      'module-page-podcasts-studio-new-renders': true,
      'module-page-polls-renders': true,
      'module-page-polls-parity-create-renders': true,
      'module-page-polls-parity-manage-renders': true,
      'module-page-premium-return-renders': true,
      'module-page-profile-renders': true,
      'module-page-report-a-problem-renders': true,
      'redirect-page-login-two-factor-redirects-login-status-two-factor-expired': true,
      'redirect-page-onboarding-redirects-dashboard': true,
      'redirect-page-premium-manage-redirects-premium-status-no-subscription': true,
      'module-page-resources-library-renders': true,
      'module-page-resources-upload-renders': true,
      'module-page-reviews-renders': true,
      'module-page-reviews-list-renders': true,
      'module-page-search-renders': true,
      'module-page-trust-and-safety-renders': true,
      'module-page-verify-email-renders': true,
      'module-page-wallet-manage-renders': true
    }));
    expect(checkByName['gated-page-jobs-bias-audit-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-jobs-talent-search-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-marketplace-coupons-returns-403'].status).toBe(403);
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/explore').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/wallet').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/messages').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/listings').at(-1).cookie).toContain('token=signed-token');
  });

  it('smokes unsigned redirects for auth-required parameterised Laravel routes', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests);
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({ laravelBaseUrl, webBaseUrl });
    const checks = Object.fromEntries(result.checks.map((check) => [check.name, check.ok]));
    const checkByName = Object.fromEntries(result.checks.map((check) => [check.name, check]));

    expect(checks).toEqual(expect.objectContaining({
      'auth-required-page-federation-listings-1-1-redirects-login-status-auth-required': true,
      'auth-required-page-federation-partners-1-redirects-login-status-auth-required': true,
      'auth-required-page-ideation-1-redirects-login-status-auth-required': true,
      'auth-required-page-organisations-1-redirects-login-status-auth-required': true,
      'auth-required-page-podcasts-1-redirects-login-status-auth-required': true,
      'auth-required-page-podcasts-1-episodes-1-redirects-login-status-auth-required': true,
      'auth-required-page-resources-1-download-redirects-login-status-auth-required': true,
      'auth-required-page-users-1-collections-redirects-login-status-auth-required': true
    }));
    expect(checkByName['auth-required-page-federation-partners-1-redirects-login-status-auth-required'].location).toBe('/login?status=auth-required');
    expect(requests.find((request) => request.method === 'GET' && request.url === '/federation/partners/1').cookie).not.toContain('token=signed-token');
  });

  it('allows slower signed module pages in the default smoke timeout budget', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests, {
      delayedPaths: {
        '/profile/settings': 8500
      }
    });
    servers.push(laravel, web);

    const [laravelBaseUrl, webBaseUrl] = await Promise.all([listen(laravel), listen(web)]);

    const result = await runLaravelRuntimeSmoke({
      laravelBaseUrl,
      webBaseUrl,
      modulePagePaths: ['/profile/settings']
    });
    const profileSettingsCheck = result.checks.find((check) => check.name === 'module-page-profile-settings-renders');

    expect(result.ok).toBe(true);
    expect(profileSettingsCheck).toEqual(expect.objectContaining({
      ok: true,
      status: 200
    }));
  }, 15000);
});
