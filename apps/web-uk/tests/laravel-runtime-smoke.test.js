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

function createWebServer(requests, { loginRedirect = '/dashboard' } = {}) {
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
    expect(result.checks.map((check) => [check.name, check.ok])).toEqual([
      ['laravel-api-reachable', true],
      ['web-health', true],
      ['protected-account-redirects-to-login', true],
      ['login-form-csrf', true],
      ['login-post-redirects-dashboard', true],
      ['signed-account-renders', true]
    ]);
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
});
