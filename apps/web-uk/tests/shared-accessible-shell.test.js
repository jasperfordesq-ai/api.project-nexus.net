// Copyright © 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

/**
 * Shared accessible frontend preparation tests.
 *
 * These pin the future shared accessible shell against the Laravel Blade
 * accessible frontend's visual contract without claiming full workflow parity.
 */

const fs = require('fs');
const path = require('path');
const signature = require('cookie-signature');
const request = require('supertest');
const staticPageRoutes = require('../src/routes/static-pages');

jest.mock('../src/lib/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(message, status, data) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
    }
  },
  ApiOfflineError: class ApiOfflineError extends Error {
    constructor(message = 'Unable to connect') {
      super(message);
      this.name = 'ApiOfflineError';
      this.status = 503;
    }
  },
  login: jest.fn(),
  register: jest.fn(),
  validateToken: jest.fn(),
  getProfile: jest.fn(),
  getListings: jest.fn(),
  getBlogPosts: jest.fn(),
  getBlogPost: jest.fn(),
  getGoals: jest.fn(),
  getGoal: jest.fn(),
  getJobs: jest.fn(),
  getJob: jest.fn(),
  applyForJob: jest.fn(),
  getPolls: jest.fn(),
  getPoll: jest.fn(),
  votePoll: jest.fn(),
  getBalance: jest.fn(),
  getUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 0 }),
  getNotificationUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 0 }),
  getTransactions: jest.fn()
}));

process.env.COOKIE_SECRET = 'test-secret-at-least-32-characters';
process.env.SESSION_SECRET = 'test-session-secret-32-chars!!';
process.env.NODE_ENV = 'test';

function signedCookie(name, value) {
  return `${name}=s%3A${signature.sign(value, process.env.COOKIE_SECRET)}`;
}

describe('shared accessible frontend shell', () => {
  let app;

  beforeAll(() => {
    app = require('../src/server');
  });

  it('renders the Laravel-style accessible shell on the home page', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('class="nexus-alpha-header"');
    expect(response.text).toContain('Project NEXUS Accessible');
    expect(response.text).toContain('class="govuk-service-navigation"');
    expect(response.text).toContain('Beta');
    expect(response.text).toContain('Give feedback');
    expect(response.text).toContain('href="/volunteering"');
    expect(response.text).toContain('class="govuk-footer__navigation"');
    expect(response.text).toContain('Help centre');
    expect(response.text).toContain('Knowledge base');
    expect(response.text).toContain('Trust and safety');
    expect(response.text).toContain('Terms of service');
    expect(response.text).toContain('Privacy policy');
    expect(response.text).toContain('Community guidelines');
    expect(response.text).toContain('Acceptable use');
    expect(response.text).toContain('Cookie policy');
    expect(response.text).toContain('Accessibility statement');
    expect(response.text).toContain('Report a problem with this page');
    expect(response.text).toContain('href="/cookies"');
    expect(response.text).toContain('Project NEXUS is free software licensed under AGPL-3.0-or-later.');
    expect(response.text).toContain('View the source code on GitHub');
    expect(response.text).toContain('https://github.com/jasperfordesq-ai/nexus-v1');
  });

  it('renders the Blade-style no-JS cookie banner before the skip link when consent is missing', async () => {
    const response = await request(app).get('/explore?locale=ga');

    expect(response.status).toBe(200);
    expect(response.text.indexOf('class="govuk-cookie-banner"')).toBeGreaterThan(-1);
    expect(response.text.indexOf('class="govuk-cookie-banner"')).toBeLessThan(response.text.indexOf('class="govuk-skip-link"'));
    expect(response.text).toContain('action="/cookie-consent"');
    expect(response.text).toContain('name="return" value="/explore?locale=ga"');
    expect(response.text).toContain('name="cookies" value="accept"');
    expect(response.text).toContain('name="cookies" value="reject"');
    expect(response.text).toContain('href="/cookies"');
    expect(response.text).toContain('Tell us whether you accept analytics cookies for Project NEXUS Accessible');
  });

  it('preserves non-locale query parameters in the Blade-style language switcher', async () => {
    const response = await request(app).get('/explore?section=events&page=2&locale=ga');

    expect(response.status).toBe(200);
    expect(response.text).toContain('form method="get" action="/explore"');
    expect(response.text).toContain('type="hidden" name="section" value="events"');
    expect(response.text).toContain('type="hidden" name="page" value="2"');
    expect(response.text).not.toContain('type="hidden" name="locale"');
    expect(response.text).toContain('option value="ga" selected');
  });

  it('renders local pages under the Laravel shared-domain tenant alpha route shape', async () => {
    const response = await request(app).get('/acme/alpha/explore?section=events&locale=ga');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Explore');
    expect(response.text).toContain('href="/acme/alpha/feed"');
    expect(response.text).toContain('href="/acme/alpha/contact"');
    expect(response.text).toContain('href="/acme/alpha/cookies"');
    expect(response.text).toContain('href="/acme/alpha/report-a-problem?return=%2Facme%2Falpha%2Fexplore%3Fsection%3Devents%26locale%3Dga"');
    expect(response.text).toContain('form method="get" action="/acme/alpha/explore"');
    expect(response.text).toContain('type="hidden" name="section" value="events"');
    expect(response.text).toContain('option value="ga" selected');
  });

  it('keeps signed-out report-problem redirects inside the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/report-a-problem?return=/acme/alpha/explore');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/acme/alpha/contact?problem_url=%2Facme%2Falpha%2Fexplore');
  });

  it('does not render the cookie banner after an accessible cookie-consent choice exists', async () => {
    const response = await request(app)
      .get('/')
      .set('Cookie', ['nexus_alpha_cookie_consent=accepted']);

    expect(response.status).toBe(200);
    expect(response.text).not.toContain('class="govuk-cookie-banner"');
  });

  it('stores an accessible cookie-consent choice with a safe local return redirect', async () => {
    const agent = request.agent(app);
    const getResponse = await agent.get('/');
    const csrfMatch = getResponse.text.match(/name="_csrf" value="([^"]+)"/);

    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/cookie-consent')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        cookies: 'accept',
        return: '/explore?locale=ga'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/explore?locale=ga');
    expect(response.headers['set-cookie'].join(';')).toContain('nexus_alpha_cookie_consent=accepted');
  });

  it('renders a Blade-style cookie settings page instead of the generic skeleton', async () => {
    const response = await request(app).get('/cookies');

    expect(staticPageRoutes.pages['/cookies']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Cookie settings');
    expect(response.text).toContain('Cookie settings for Project NEXUS Accessible');
    expect(response.text).toContain('action="/cookie-consent"');
    expect(response.text).toContain('name="cookies" value="save"');
    expect(response.text).toContain('name="analytics" type="radio" value="yes"');
    expect(response.text).toContain('name="analytics" type="radio" value="no"');
    expect(response.text).toContain('href="/legal/cookies"');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('saves cookie settings through the same local no-JS consent endpoint', async () => {
    const agent = request.agent(app);
    const getResponse = await agent.get('/cookies');
    const csrfMatch = getResponse.text.match(/name="_csrf" value="([^"]+)"/);

    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/cookie-consent')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        cookies: 'save',
        analytics: 'no'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/cookies?status=saved');
    expect(response.headers['set-cookie'].join(';')).toContain('nexus_alpha_cookie_consent=rejected');
  });

  it('keeps tenant alpha route prefix when saving cookie settings without a return URL', async () => {
    const agent = request.agent(app);
    const getResponse = await agent.get('/acme/alpha/cookies');
    const csrfMatch = getResponse.text.match(/name="_csrf" value="([^"]+)"/);

    expect(getResponse.status).toBe(200);
    expect(getResponse.text).toContain('action="/acme/alpha/cookie-consent"');
    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/acme/alpha/cookie-consent')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        cookies: 'save',
        analytics: 'yes'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/acme/alpha/cookies?status=saved');
    expect(response.headers['set-cookie'].join(';')).toContain('nexus_alpha_cookie_consent=accepted');
  });

  it('redirects signed-out report-problem requests to contact with a safe page URL', async () => {
    const response = await request(app).get('/report-a-problem?return=/explore');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/contact?problem_url=%2Fexplore');
  });

  it('renders the Blade-style contact form with report-problem context prefilled', async () => {
    const response = await request(app).get('/contact?problem_url=/explore');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Contact Project NEXUS Accessible');
    expect(response.text).toContain('action="/contact"');
    expect(response.text).toContain('id="name" name="name"');
    expect(response.text).toContain('id="email" name="email" type="email"');
    expect(response.text).toContain('id="subject" name="subject"');
    expect(response.text).toContain('value="technical" selected');
    expect(response.text).toContain('id="message" name="message"');
    expect(response.text).toContain('I want to report a problem with this page: /explore');
    expect(response.text).not.toContain('support@project-nexus.net');
  });

  it('keeps the tenant alpha route prefix on the contact form action and success redirect', async () => {
    const agent = request.agent(app);
    const getResponse = await agent.get('/acme/alpha/contact?problem_url=/acme/alpha/explore');
    const csrfMatch = getResponse.text.match(/name="_csrf" value="([^"]+)"/);

    expect(getResponse.status).toBe(200);
    expect(getResponse.text).toContain('action="/acme/alpha/contact"');
    expect(getResponse.text).toContain('href="/acme/alpha/login"');
    expect(getResponse.text).toContain('I want to report a problem with this page: /acme/alpha/explore');
    expect(csrfMatch).not.toBeNull();

    const postResponse = await agent
      .post('/acme/alpha/contact')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        name: 'Jasper',
        email: 'jasper@example.com',
        subject: 'technical',
        message: 'The tenant-prefixed contact form submits locally.'
      });

    expect(postResponse.status).toBe(302);
    expect(postResponse.headers.location).toBe('/acme/alpha/contact?status=contact-sent');
  });

  it('validates contact form fields with GOV.UK error summary', async () => {
    const agent = request.agent(app);
    const getResponse = await agent.get('/contact');
    const csrfMatch = getResponse.text.match(/name="_csrf" value="([^"]+)"/);

    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/contact')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        name: '',
        email: 'not-an-email',
        subject: 'technical',
        message: ''
      });

    expect(response.status).toBe(400);
    expect(response.text).toContain('class="govuk-error-summary"');
    expect(response.text).toContain('Enter your name.');
    expect(response.text).toContain('Enter an email address in the correct format.');
    expect(response.text).toContain('Enter a message.');
  });

  it('submits a local contact candidate and renders the success state', async () => {
    const agent = request.agent(app);
    const getResponse = await agent.get('/contact');
    const csrfMatch = getResponse.text.match(/name="_csrf" value="([^"]+)"/);

    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/contact')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        name: 'Jasper',
        email: 'jasper@example.com',
        subject: 'feedback',
        message: 'This is a useful accessible contact form.'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/contact?status=contact-sent');

    const confirmation = await agent.get('/contact?status=contact-sent');

    expect(confirmation.status).toBe(200);
    expect(confirmation.text).toContain('Message sent');
    expect(confirmation.text).toContain('We will review your message and respond if needed.');
  });

  it('renders the Blade-style report-problem form for signed-in users', async () => {
    const response = await request(app)
      .get('/report-a-problem?return=/explore')
      .set('Cookie', [signedCookie('token', 'test-token')]);

    expect(staticPageRoutes.pages['/report-a-problem']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Report a problem with this page');
    expect(response.text).toContain('Report a problem for Project NEXUS Accessible');
    expect(response.text).toContain('action="/report-a-problem"');
    expect(response.text).toContain('name="page_url" value="/explore"');
    expect(response.text).toContain('id="summary" name="summary"');
    expect(response.text).toContain('id="description" name="description"');
    expect(response.text).toContain('name="impact" type="radio" value="blocked"');
    expect(response.text).toContain('name="impact" type="radio" value="cosmetic"');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('validates report-problem form fields with GOV.UK error summary', async () => {
    const agent = request.agent(app);
    const getResponse = await agent
      .get('/report-a-problem?return=/explore')
      .set('Cookie', signedCookie('token', 'test-token'));
    const csrfMatch = getResponse.text.match(/name="_csrf" value="([^"]+)"/);

    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/report-a-problem')
      .set('Cookie', signedCookie('token', 'test-token'))
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        page_url: '/explore',
        summary: 'No',
        description: 'Too short',
        impact: ''
      });

    expect(response.status).toBe(400);
    expect(response.text).toContain('class="govuk-error-summary"');
    expect(response.text).toContain('Summary must be between 3 and 180 characters.');
    expect(response.text).toContain('Description must be between 10 and 5000 characters.');
    expect(response.text).toContain('Choose how this problem affected you.');
  }, 30000);

  it('submits a local report-problem candidate and shows a confirmation reference', async () => {
    const agent = request.agent(app);
    const getResponse = await agent
      .get('/report-a-problem?return=/explore')
      .set('Cookie', signedCookie('token', 'test-token'));
    const csrfMatch = getResponse.text.match(/name="_csrf" value="([^"]+)"/);

    expect(csrfMatch).not.toBeNull();

    const postResponse = await agent
      .post('/report-a-problem')
      .set('Cookie', signedCookie('token', 'test-token'))
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        page_url: '/explore',
        summary: 'Missing heading',
        description: 'The explore page heading is difficult to understand.',
        impact: 'minor'
      });

    expect(postResponse.status).toBe(302);
    expect(postResponse.headers.location).toMatch(/^\/report-a-problem\?return=%2Fexplore&status=sent&ref=NXR-/);

    const confirmation = await agent
      .get(postResponse.headers.location)
      .set('Cookie', signedCookie('token', 'test-token'));

    expect(confirmation.status).toBe(200);
    expect(confirmation.text).toContain('Problem report sent');
    expect(confirmation.text).toContain('NXR-');
  });

  it('renders the shared Explore skeleton from the Laravel accessible IA', async () => {
    const response = await request(app).get('/explore');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Explore');
    expect(response.text).toContain('class="nexus-alpha-card-list');
    expect(response.text).toContain('Exchanges');
    expect(response.text).toContain('AI assistant');
    expect(response.text).toContain('Polls');
    expect(response.text).toContain('Marketplace');
    expect(response.text).toContain('Federation');
    expect(response.text).toContain('Recent listings');
    expect(response.text).toContain('Upcoming events');
    expect(response.text).toContain('This page is a shared-accessible-frontend preparation skeleton');
  });

  it('serves preparation skeletons for Blade footer destinations that are not certified yet', async () => {
    const response = await request(app).get('/legal/community-guidelines');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Community guidelines');
    expect(response.text).toContain('shared accessible frontend preparation page');
    expect(response.text).toContain('does not certify ASP.NET route or workflow');
  });

  it('serves top-level Blade destination skeletons without claiming workflow parity', async () => {
    const skeletonPaths = [
      '/faq',
      '/verify-email',
      '/newsletter/unsubscribe',
      '/onboarding',
      '/group-exchanges',
      '/matches',
      '/achievements',
      '/leaderboard',
      '/nexus-score',
      '/activity',
      '/saved'
    ];

    expect(Object.keys(staticPageRoutes.pages)).toEqual(expect.arrayContaining(skeletonPaths));

    for (const routePath of skeletonPaths) {
      const response = await request(app).get(routePath);

      expect(response.status).toBe(200);
      expect(response.text).toContain('shared accessible frontend preparation page');
      expect(response.text).toContain('does not certify ASP.NET route or workflow');
    }
  }, 30000);

  it('keeps the rendered footer clear of official government identity claims', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).not.toContain('© Crown copyright');
    expect(response.text).not.toContain('Open Government Licence');
    expect(response.text).not.toContain('GOV.UK service');
  });

  it('documents official GOV.UK upstream repositories and shared-frontend status', () => {
    const docsPath = path.join(__dirname, '..', 'docs', 'ACCESSIBLE_SHARED_FRONTEND.md');
    const docs = fs.readFileSync(docsPath, 'utf8');

    expect(docs).toContain('alphagov/govuk-frontend');
    expect(docs).toContain('alphagov/govuk-design-system');
    expect(docs).toContain('future shared accessible frontend candidate');
    expect(docs).toContain('does not certify production readiness');
    expect(docs).toContain('LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md');
    expect(docs).toContain('LARAVEL_ACCESSIBLE_ROUTE_INVENTORY.md');
    expect(docs).toContain('BLADE_VIEW_INVENTORY.md');
    expect(docs).toContain('AUTH_FORM_CONTRACT_MATRIX.md');
    expect(docs).toContain('BLADE_COMPONENT_PORT_AUDIT.md');
    expect(docs).toContain('BACKEND_SWITCHING_CONTRACT.md');
    expect(docs).toContain('ACCESSIBLE_BACKEND_CONTRACT_MATRIX.md');
  });

  it('documents route matrix and backend-switching preparation without readiness claims', () => {
    const matrix = fs.readFileSync(path.join(__dirname, '..', 'docs', 'LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md'), 'utf8');
    const contract = fs.readFileSync(path.join(__dirname, '..', 'docs', 'BACKEND_SWITCHING_CONTRACT.md'), 'utf8');
    const routeInventory = fs.readFileSync(path.join(__dirname, '..', 'docs', 'LARAVEL_ACCESSIBLE_ROUTE_INVENTORY.md'), 'utf8');
    const viewInventory = fs.readFileSync(path.join(__dirname, '..', 'docs', 'BLADE_VIEW_INVENTORY.md'), 'utf8');
    const backendMatrix = fs.readFileSync(path.join(__dirname, '..', 'docs', 'ACCESSIBLE_BACKEND_CONTRACT_MATRIX.md'), 'utf8');
    const authFormMatrix = fs.readFileSync(path.join(__dirname, '..', 'docs', 'AUTH_FORM_CONTRACT_MATRIX.md'), 'utf8');
    const scorecard = fs.readFileSync(path.join(__dirname, '..', 'docs', 'ACCESSIBLE_PREPARATION_SCORECARD.md'), 'utf8');
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

    expect(matrix).toContain('Laravel `govuk-alpha*`');
    expect(matrix).toContain('| Volunteering | `/volunteering` | `/volunteering` | Preparation skeleton. |');
    expect(matrix).toContain('It does not certify route parity');
    expect(contract).toContain('this pass does not implement real backend adapters');
    expect(contract).toContain('ASP.NET must become compatible with that behavior');
    expect(contract).toContain('Laravel-First Backend Target');
    expect(contract).toContain('src/lib/backend-config.js');
    expect(contract).toContain('ASP.NET remains pending backend parity');
    expect(contract).toContain('Laravel Accessible Web Routes');
    expect(contract).toContain('buildLaravelAccessiblePath()');
    expect(contract).toContain('Do not treat Blade routes as');
    expect(routeInventory).toContain('| Laravel accessible route declarations | 608 |');
    expect(routeInventory).toContain('| ASP.NET static skeleton paths | 46 |');
    expect(routeInventory).toContain('Laravel shared-domain path');
    expect(routeInventory).toContain('Laravel custom-domain path');
    expect(routeInventory).toContain('| GET | /faq | /{tenantSlug}/alpha/faq | /faq |');
    expect(routeInventory).toContain('| GET | /cookies | /{tenantSlug}/alpha/cookies | /cookies | cookies | cookieSettings | cookies | candidate-route |');
    expect(routeInventory).toContain('| POST | /report-a-problem | /{tenantSlug}/alpha/report-a-problem | /report-a-problem | report-problem.store | storeReportProblem | report-a-problem | candidate-workflow |');
    expect(viewInventory).toContain('| Laravel Blade accessible views | 289 |');
    expect(backendMatrix).toContain('| Family | GET routes | POST routes | Mutating routes | Tenant | Auth | CSRF | Feature/module gates |');
    expect(authFormMatrix).toContain('Laravel Auth Form Contract Matrix');
    expect(authFormMatrix).toContain('| login.blade.php | govuk-alpha.login.store | email, password | email, password, tenant_slug | tenant_slug is local Express-only');
    expect(authFormMatrix).toContain('| register.blade.php | govuk-alpha.register.store |');
    expect(authFormMatrix).toContain('phone, location, password_confirmation, terms_accepted');
    expect(authFormMatrix).toContain('confirm_password is local Express-only');
    expect(scorecard).toContain('Preparation guardrail/tooling score: **1000 / 1000**');
    expect(scorecard).toMatch(/does not mean the\s+accessible frontend is production-ready/);
    expect(packageJson.scripts['audit:accessible-prep']).toBe('node scripts/generate-accessible-prep-audit.js');
  });
});
