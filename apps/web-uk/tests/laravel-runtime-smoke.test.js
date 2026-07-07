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

function createWebServer(requests, { loginRedirect = '/dashboard', delayedPaths = {}, gatedRequiresFreshLogin = false } = {}) {
  let loginCount = 0;

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
        loginCount += 1;
        const token = gatedRequiresFreshLogin ? `signed-token-${loginCount}` : 'signed-token';
        res.writeHead(302, {
          location: loginRedirect,
          'set-cookie': [
            `token=${token}; Path=/; HttpOnly`,
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
      '/',
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
      '/ideation/2/ideas/1',
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
      '/blog/90001/likers/1',
      '/events/14',
      '/events/14/map',
      '/events/14/polls',
      '/events/14/translate',
      '/groups/482',
      '/groups/482/announcements',
      '/groups/482/discussions',
      '/groups/482/discussions/new',
      '/groups/482/files',
      '/groups/482/manage',
      '/groups/482/invite',
      '/groups/482/notifications',
      '/groups/482/image',
      '/marketplace/6',
      '/marketplace/6/buy',
      '/marketplace/6/offer',
      '/marketplace/6/report',
      '/marketplace/6/edit',
      '/polls/8',
      '/polls/4',
      '/feed/item/listing/90967',
      '/feed/item/listing/90966',
      '/feed/item/listing/90965',
      '/feed/item/listing/90964',
      '/feed/item/listing/90963',
      '/feed/item/listing/90962',
      '/users/14/appreciations',
      '/jobs/employers/14',
      '/blog/64/likers/1',
      '/blog/test-sitemap-blog-post',
      '/blog/test-sitemap-blog-post/comments',
      '/blog/timebank-ireland',
      '/blog/timebank-ireland/comments',
      '/kb/90001',
      '/marketplace/category/electronics',
      '/marketplace/category/home-garden',
      '/marketplace/category/free-items',
      '/marketplace/category/services',
      '/marketplace/seller/1',
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
      '/coupons',
      '/jobs/bias-audit',
      '/jobs/talent-search',
      '/events/6/edit',
      '/events/14/edit',
      '/jobs/90764/edit',
      '/jobs/90764/analytics',
      '/jobs/90764/pipeline',
      '/jobs/90764/applications',
      '/courses/instructor/1/analytics',
      '/courses/instructor/1/grading',
      '/listings/42/analytics',
      '/listings/90967/analytics',
      '/jobs/talent-search/77',
      '/group-exchanges/1',
      '/messages/groups/33',
      '/resources/10/delete',
      '/coupons/1',
      '/coupons/2',
      '/marketplace/coupons',
      '/marketplace/coupons/5/edit'
    ]);
    if (req.method === 'GET' && signedGatedPages.has(req.url)) {
      const expectedToken = gatedRequiresFreshLogin ? 'token=signed-token-2' : 'token=signed-token';
      if ((req.headers.cookie || '').includes(expectedToken)) {
        res.writeHead(403, { 'content-type': 'text/html' });
        res.end('<h1>Forbidden</h1>');
        return;
      }

      res.writeHead(302, { location: '/login?status=auth-required' });
      res.end();
      return;
    }

    const signedRedirectPages = new Map([
      ['/password/reset', '/login/forgot-password'],
      ['/login/two-factor', '/login?status=two-factor-expired'],
      ['/onboarding', '/dashboard'],
      ['/events/6/recurring-edit', '/events/6/edit'],
      ['/groups/484/edit', '/groups/484'],
      ['/courses/42/certificate', '/courses/42?status=certificate-failed'],
      ['/courses/1/certificate', '/courses/1?status=certificate-failed'],
      ['/federation/messages/conversation/77', '/federation/messages'],
      ['/jobs/90764/applications/export.csv', '/jobs/90764/applications?status=export-failed'],
      ['/courses/1/learn', '/courses/1?status=enrol-required'],
      ['/courses/2/learn', '/courses/2?status=enrol-required'],
      ['/federation/messages/conversation/353', '/federation/messages'],
      ['/onboarding/profile', '/dashboard'],
      ['/events/14/recurring-edit', '/events/14/edit'],
      ['/groups/482/edit', '/groups/482'],
      ['/courses/2/certificate', '/courses/2?status=certificate-failed'],
      ['/groups/484/files/1/download', '/groups/484/files?status=file-not-found'],
      ['/onboarding/interests', '/dashboard'],
      ['/onboarding/safeguarding', '/dashboard'],
      ['/onboarding/confirm', '/dashboard'],
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

  it('allows CLI module page smoke runs to be split into deterministic chunks', () => {
    const options = resolveOptions({}, {
      SMOKE_MODULE_PAGE_PATHS: '/alpha,/bravo,/charlie,/delta,/echo,/foxtrot,/golf',
      SMOKE_MODULE_PAGE_CHUNK: '2/3'
    });

    expect(options.modulePagePaths).toEqual(['/bravo', '/echo']);
  });

  it('includes stable real-fixture parameterised pages in the default module smoke scope', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/events/6',
      '/events/6/map',
      '/events/6/polls',
      '/events/6/translate',
      '/volunteering/opportunities/307',
      '/organisations/636',
      '/organisations/636/jobs',
      '/organisations/opportunities/307/apply',
      '/jobs/90764',
      '/groups/484',
      '/groups/484/invite',
      '/groups/484/notifications',
      '/groups/484/image',
      '/groups/484/announcements',
      '/groups/484/discussions',
      '/groups/484/files',
      '/groups/484/manage',
      '/resources/10/comments'
    ]));
  });

  it('includes stable real-fixture secondary page outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/groups/484/discussions/new',
      '/jobs/90764/qualified'
    ]));
    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/jobs/90764/edit', status: 403 },
      { path: '/jobs/90764/analytics', status: 403 },
      { path: '/jobs/90764/pipeline', status: 403 },
      { path: '/jobs/90764/applications', status: 403 }
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/events/6/recurring-edit', location: '/events/6/edit' },
      { path: '/groups/484/edit', location: '/groups/484' }
    ]));
  });

  it('includes stable listing, member, feed, and course fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/members/77/insights',
      '/listings/42/report',
      '/listings/42/exchange-request',
      '/listings/42/comments',
      '/feed/hashtag/timebank',
      '/feed/item/listing/42'
    ]));
    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/listings/42/analytics', status: 403 }
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/courses/42/certificate', location: '/courses/42?status=certificate-failed' }
    ]));
  });

  it('includes stable message and volunteering owner fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/messages/77',
      '/messages/new/77',
      '/volunteering/organisations/636/dashboard',
      '/volunteering/organisations/636/manage',
      '/volunteering/organisations/636/settings',
      '/volunteering/organisations/636/volunteers',
      '/volunteering/organisations/636/wallet'
    ]));
    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/group-exchanges/1', status: 403 },
      { path: '/messages/groups/33', status: 403 }
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/federation/messages/conversation/77', location: '/federation/messages' }
    ]));
  });

  it('includes stable course, federation, ideation, resource, and coupon fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
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
      '/ideation/23/outcome'
    ]));
    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/resources/10/delete', status: 403 },
      { path: '/coupons/1', status: 403 },
      { path: '/coupons/2', status: 403 }
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/courses/1/learn', location: '/courses/1?status=enrol-required' },
      { path: '/courses/2/learn', location: '/courses/2?status=enrol-required' },
      { path: '/federation/messages/conversation/353', location: '/federation/messages' }
    ]));
  });

  it('includes stable home, blog feed, wallet export, and coupon management outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/',
      '/blog/feed.xml',
      '/wallet/export.csv',
      '/wallet/recipients',
      '/marketplace/coupons/new'
    ]));
    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/coupons', status: 403 },
      { path: '/marketplace/coupons/5/edit', status: 403 }
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/password/reset', location: '/login/forgot-password' }
    ]));
  });

  it('includes stable account, poll, listing, course certificate, job export, and onboarding outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/account',
      '/polls/20',
      '/polls/20/rank',
      '/listings/90967/comments',
      '/listings/90967/report',
      '/listings/90967/exchange-request'
    ]));
    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/listings/90967/analytics', status: 403 },
      { path: '/jobs/talent-search/77', status: 403 }
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/courses/1/certificate', location: '/courses/1?status=certificate-failed' },
      { path: '/jobs/90764/applications/export.csv', location: '/jobs/90764/applications?status=export-failed' },
      { path: '/onboarding/profile', location: '/dashboard' }
    ]));
  });

  it('includes stable marketplace action and blog liker fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/marketplace/267',
      '/marketplace/267/buy',
      '/marketplace/267/offer',
      '/marketplace/267/report',
      '/marketplace/267/edit',
      '/blog/90001/likers/1'
    ]));
  });

  it('includes stable secondary event, group, marketplace, poll, feed, blog, course, and onboarding outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/events/14',
      '/events/14/map',
      '/events/14/polls',
      '/events/14/translate',
      '/groups/482',
      '/groups/482/announcements',
      '/groups/482/discussions',
      '/groups/482/discussions/new',
      '/groups/482/files',
      '/groups/482/manage',
      '/groups/482/invite',
      '/groups/482/notifications',
      '/groups/482/image',
      '/marketplace/6',
      '/marketplace/6/buy',
      '/marketplace/6/offer',
      '/marketplace/6/report',
      '/marketplace/6/edit',
      '/polls/8',
      '/polls/4',
      '/feed/item/listing/90967',
      '/blog/64/likers/1'
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/events/14/recurring-edit', location: '/events/14/edit' },
      { path: '/groups/482/edit', location: '/groups/482' },
      { path: '/courses/2/certificate', location: '/courses/2?status=certificate-failed' },
      { path: '/onboarding/interests', location: '/dashboard' },
      { path: '/onboarding/safeguarding', location: '/dashboard' },
      { path: '/onboarding/confirm', location: '/dashboard' }
    ]));
  });

  it('includes stable marketplace category and seller fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/marketplace/category/electronics',
      '/marketplace/category/home-garden',
      '/marketplace/category/free-items',
      '/marketplace/category/services',
      '/marketplace/seller/1'
    ]));
  });

  it('includes stable blog and knowledge-base fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/blog/test-sitemap-blog-post',
      '/blog/test-sitemap-blog-post/comments',
      '/blog/timebank-ireland',
      '/blog/timebank-ireland/comments',
      '/kb/90001'
    ]));
  });

  it('includes stable feed item fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/feed/item/listing/90966',
      '/feed/item/listing/90965',
      '/feed/item/listing/90964',
      '/feed/item/listing/90963',
      '/feed/item/listing/90962'
    ]));
  });

  it('includes stable user appreciation, employer brand, and group file fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/users/14/appreciations',
      '/jobs/employers/14'
    ]));
    expect(options.redirectPagePaths).toEqual(expect.arrayContaining([
      { path: '/groups/484/files/1/download', location: '/groups/484/files?status=file-not-found' }
    ]));
  });

  it('includes the stable ideation idea fixture outcome in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.modulePagePaths).toEqual(expect.arrayContaining([
      '/ideation/2/ideas/1'
    ]));
  });

  it('includes stable course instructor gated fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/courses/instructor/1/analytics', status: 403 },
      { path: '/courses/instructor/1/grading', status: 403 }
    ]));
  });

  it('includes stable event edit gated fixture outcomes in the default smoke scopes', () => {
    const options = resolveOptions({}, {});

    expect(options.gatedPagePaths).toEqual(expect.arrayContaining([
      { path: '/events/6/edit', status: 403 },
      { path: '/events/14/edit', status: 403 }
    ]));
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
      'module-page-home-renders': true,
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
      'module-page-events-6-renders': true,
      'module-page-events-6-map-renders': true,
      'module-page-events-6-polls-renders': true,
      'module-page-events-6-translate-renders': true,
      'module-page-volunteering-opportunities-307-renders': true,
      'module-page-organisations-636-renders': true,
      'module-page-organisations-636-jobs-renders': true,
      'module-page-organisations-opportunities-307-apply-renders': true,
      'module-page-members-77-insights-renders': true,
      'module-page-listings-42-report-renders': true,
      'module-page-listings-42-exchange-request-renders': true,
      'module-page-listings-42-comments-renders': true,
      'module-page-feed-hashtag-timebank-renders': true,
      'module-page-feed-item-listing-42-renders': true,
      'module-page-messages-77-renders': true,
      'module-page-messages-new-77-renders': true,
      'module-page-jobs-90764-renders': true,
      'module-page-jobs-90764-qualified-renders': true,
      'module-page-groups-484-renders': true,
      'module-page-groups-484-invite-renders': true,
      'module-page-groups-484-notifications-renders': true,
      'module-page-groups-484-image-renders': true,
      'module-page-groups-484-announcements-renders': true,
      'module-page-groups-484-discussions-renders': true,
      'module-page-groups-484-discussions-new-renders': true,
      'module-page-groups-484-files-renders': true,
      'module-page-groups-484-manage-renders': true,
      'module-page-resources-10-comments-renders': true,
      'module-page-volunteering-organisations-636-dashboard-renders': true,
      'module-page-volunteering-organisations-636-manage-renders': true,
      'module-page-volunteering-organisations-636-settings-renders': true,
      'module-page-volunteering-organisations-636-volunteers-renders': true,
      'module-page-volunteering-organisations-636-wallet-renders': true,
      'module-page-courses-1-renders': true,
      'module-page-courses-2-renders': true,
      'module-page-courses-instructor-1-edit-renders': true,
      'module-page-courses-instructor-2-edit-renders': true,
      'module-page-federation-partners-1-renders': true,
      'module-page-federation-partners-5-renders': true,
      'module-page-federation-members-353-renders': true,
      'module-page-federation-members-353-transfer-renders': true,
      'module-page-federation-members-351-renders': true,
      'module-page-ideation-23-renders': true,
      'module-page-ideation-22-renders': true,
      'module-page-ideation-2-renders': true,
      'module-page-ideation-23-edit-renders': true,
      'module-page-ideation-23-manage-renders': true,
      'module-page-ideation-23-drafts-renders': true,
      'module-page-ideation-23-outcome-renders': true,
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
      'module-page-blog-feed-xml-renders': true,
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
      'gated-page-jobs-90764-edit-returns-403': true,
      'gated-page-jobs-90764-analytics-returns-403': true,
      'gated-page-jobs-90764-pipeline-returns-403': true,
      'gated-page-jobs-90764-applications-returns-403': true,
      'gated-page-listings-42-analytics-returns-403': true,
      'gated-page-group-exchanges-1-returns-403': true,
      'gated-page-messages-groups-33-returns-403': true,
      'gated-page-resources-10-delete-returns-403': true,
      'gated-page-coupons-1-returns-403': true,
      'gated-page-coupons-2-returns-403': true,
      'module-page-legal-renders': true,
      'module-page-legal-acceptable-use-renders': true,
      'module-page-legal-community-guidelines-renders': true,
      'module-page-legal-cookies-renders': true,
      'module-page-legal-privacy-renders': true,
      'module-page-legal-terms-renders': true,
      'module-page-listings-new-renders': true,
      'module-page-marketplace-create-renders': true,
      'module-page-marketplace-search-renders': true,
      'module-page-marketplace-coupons-new-renders': true,
      'gated-page-coupons-returns-403': true,
      'gated-page-marketplace-coupons-returns-403': true,
      'gated-page-marketplace-coupons-5-edit-returns-403': true,
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
      'redirect-page-password-reset-redirects-login-forgot-password': true,
      'redirect-page-login-two-factor-redirects-login-status-two-factor-expired': true,
      'redirect-page-onboarding-redirects-dashboard': true,
      'redirect-page-events-6-recurring-edit-redirects-events-6-edit': true,
      'redirect-page-groups-484-edit-redirects-groups-484': true,
      'redirect-page-courses-42-certificate-redirects-courses-42-status-certificate-failed': true,
      'redirect-page-federation-messages-conversation-77-redirects-federation-messages': true,
      'redirect-page-courses-1-learn-redirects-courses-1-status-enrol-required': true,
      'redirect-page-courses-2-learn-redirects-courses-2-status-enrol-required': true,
      'redirect-page-federation-messages-conversation-353-redirects-federation-messages': true,
      'redirect-page-premium-manage-redirects-premium-status-no-subscription': true,
      'module-page-resources-library-renders': true,
      'module-page-resources-upload-renders': true,
      'module-page-reviews-renders': true,
      'module-page-reviews-list-renders': true,
      'module-page-search-renders': true,
      'module-page-trust-and-safety-renders': true,
      'module-page-verify-email-renders': true,
      'module-page-wallet-export-csv-renders': true,
      'module-page-wallet-manage-renders': true,
      'module-page-wallet-recipients-renders': true
    }));
    expect(checkByName['gated-page-coupons-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-jobs-bias-audit-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-jobs-talent-search-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-jobs-90764-edit-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-jobs-90764-analytics-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-jobs-90764-pipeline-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-jobs-90764-applications-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-listings-42-analytics-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-group-exchanges-1-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-messages-groups-33-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-resources-10-delete-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-coupons-1-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-coupons-2-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-marketplace-coupons-returns-403'].status).toBe(403);
    expect(checkByName['gated-page-marketplace-coupons-5-edit-returns-403'].status).toBe(403);
    expect(checkByName['redirect-page-password-reset-redirects-login-forgot-password'].location).toBe('/login/forgot-password');
    expect(checkByName['redirect-page-events-6-recurring-edit-redirects-events-6-edit'].location).toBe('/events/6/edit');
    expect(checkByName['redirect-page-groups-484-edit-redirects-groups-484'].location).toBe('/groups/484');
    expect(checkByName['redirect-page-courses-42-certificate-redirects-courses-42-status-certificate-failed'].location).toBe('/courses/42?status=certificate-failed');
    expect(checkByName['redirect-page-federation-messages-conversation-77-redirects-federation-messages'].location).toBe('/federation/messages');
    expect(checkByName['redirect-page-courses-1-learn-redirects-courses-1-status-enrol-required'].location).toBe('/courses/1?status=enrol-required');
    expect(checkByName['redirect-page-courses-2-learn-redirects-courses-2-status-enrol-required'].location).toBe('/courses/2?status=enrol-required');
    expect(checkByName['redirect-page-federation-messages-conversation-353-redirects-federation-messages'].location).toBe('/federation/messages');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/explore').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/wallet').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/messages').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/listings').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/events/6').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/groups/484').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/jobs/90764/qualified').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/groups/484/discussions/new').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/members/77/insights').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/feed/item/listing/42').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/messages/77').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/volunteering/organisations/636/manage').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/courses/1').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/federation/members/353').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/ideation/23').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/wallet/export.csv').at(-1).cookie).toContain('token=signed-token');
    expect(requests.filter((request) => request.method === 'GET' && request.url === '/marketplace/coupons/new').at(-1).cookie).toContain('token=signed-token');
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

  it('refreshes the signed session before gated checks after long module-page batches', async () => {
    const requests = [];
    const laravel = createLaravelServer(requests);
    const web = createWebServer(requests, { gatedRequiresFreshLogin: true });
    servers.push(laravel, web);

    const laravelBaseUrl = await listen(laravel);
    const webBaseUrl = await listen(web);
    const result = await runLaravelRuntimeSmoke({
      laravelBaseUrl,
      webBaseUrl,
      modulePagePaths: ['/explore'],
      unsignedAuthRequiredPagePaths: [],
      gatedPagePaths: [{ path: '/jobs/bias-audit', status: 403 }],
      redirectPagePaths: []
    });

    const checkByName = Object.fromEntries(result.checks.map((check) => [check.name, check]));
    expect(checkByName['gated-page-jobs-bias-audit-returns-403'].ok).toBe(true);
    expect(requests.filter((request) => request.method === 'POST' && request.url === '/login')).toHaveLength(2);
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
