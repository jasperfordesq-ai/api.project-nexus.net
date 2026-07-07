// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

const http = require('http');

const { runLaravelRuntimeSmoke } = require('../scripts/laravel-runtime-smoke');

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
      '/podcasts'
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

    expect(checks).toEqual(expect.objectContaining({
      'module-page-explore-renders': true,
      'module-page-saved-renders': true,
      'module-page-notifications-renders': true,
      'module-page-members-discover-renders': true,
      'module-page-resources-renders': true,
      'module-page-skills-renders': true,
      'module-page-goals-renders': true,
      'module-page-clubs-renders': true,
      'module-page-wallet-renders': true,
      'module-page-messages-renders': true,
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
      'module-page-listings-renders': true,
      'module-page-search-advanced-renders': true,
      'module-page-premium-renders': true,
      'module-page-podcasts-renders': true
    }));
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/explore').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/wallet').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/messages').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/listings').at(-1).cookie).toContain('token=signed-token');
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
