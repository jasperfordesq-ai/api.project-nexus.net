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

  it('renders a Blade-style account hub candidate under the tenant alpha route prefix', async () => {
    const response = await request(app)
      .get('/acme/alpha/account')
      .set('Cookie', signedCookie('token', 'test-token'));

    expect(staticPageRoutes.pages['/account']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('My account');
    expect(response.text).toContain('Manage your personal tools, messages, saved items, profile, and settings for Project NEXUS Accessible.');
    expect(response.text).toContain('class="nexus-alpha-card-list govuk-!-margin-top-6"');
    expect(response.text).toContain('href="/acme/alpha/wallet"');
    expect(response.text).toContain('href="/acme/alpha/messages"');
    expect(response.text).toContain('href="/acme/alpha/connections"');
    expect(response.text).toContain('href="/acme/alpha/notifications"');
    expect(response.text).toContain('href="/acme/alpha/reviews"');
    expect(response.text).toContain('href="/acme/alpha/activity"');
    expect(response.text).toContain('href="/acme/alpha/saved"');
    expect(response.text).toContain('href="/acme/alpha/jobs"');
    expect(response.text).toContain('href="/acme/alpha/matches"');
    expect(response.text).toContain('href="/acme/alpha/group-exchanges"');
    expect(response.text).toContain('href="/acme/alpha/achievements"');
    expect(response.text).toContain('href="/acme/alpha/leaderboard"');
    expect(response.text).toContain('href="/acme/alpha/nexus-score"');
    expect(response.text).toContain('href="/acme/alpha/profile"');
    expect(response.text).toContain('href="/acme/alpha/profile/settings"');
    expect(response.text).toContain('action="/acme/alpha/logout"');
    expect(response.text).toContain('backend workflow parity is not certified yet');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style FAQ accordion under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/faq');

    expect(staticPageRoutes.pages['/faq']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Frequently asked questions');
    expect(response.text).toContain('Answers to common questions about timebanking.');
    expect(response.text).toContain('class="govuk-accordion"');
    expect(response.text).toContain('id="faq-accordion"');
    expect(response.text).toContain('What is a time credit?');
    expect(response.text).toContain('Is everyone&#39;s time worth the same?');
    expect(response.text).toContain('How do I start?');
    expect(response.text).toContain('How do I send credits to someone?');
    expect(response.text).toContain('Is my information private?');
    expect(response.text).toContain('One hour always equals one time credit');
    expect(response.text).toContain('form method="get" action="/acme/alpha/faq"');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style accessibility statement under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/accessibility');

    expect(staticPageRoutes.pages['/accessibility']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/acme/alpha/legal"');
    expect(response.text).toContain('Accessibility statement');
    expect(response.text).toContain('This statement applies to the accessible version of Project NEXUS Accessible.');
    expect(response.text).toContain('Our commitment');
    expect(response.text).toContain('Compliance status');
    expect(response.text).toContain('class="govuk-summary-list"');
    expect(response.text).toContain('Target standard');
    expect(response.text).toContain('WCAG 2.2 Level AA');
    expect(response.text).toContain('Keyboard navigation');
    expect(response.text).toContain('Visual accessibility');
    expect(response.text).toContain('Screen reader support');
    expect(response.text).toContain('Zoom and responsive layout');
    expect(response.text).toContain('Reporting accessibility problems');
    expect(response.text).toContain('href="/acme/alpha/contact"');
    expect(response.text).toContain('How we tested this service');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style trust and safety page under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/trust-and-safety');

    expect(staticPageRoutes.pages['/trust-and-safety']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Trust and safety');
    expect(response.text).toContain('Project NEXUS Accessible connects neighbours so they can share skills using time credits.');
    expect(response.text).toContain('class="govuk-warning-text"');
    expect(response.text).toContain('Report a safeguarding concern');
    expect(response.text).toContain('We respond to safeguarding reports within one working day');
    expect(response.text).toContain('How exchanges work');
    expect(response.text).toContain('What we do');
    expect(response.text).toContain('What we do not do');
    expect(response.text).toContain('Precautions you should take');
    expect(response.text).toContain('Background checks and vetting');
    expect(response.text).toContain('Insurance');
    expect(response.text).toContain('Dispute resolution');
    expect(response.text).toContain('Your responsibilities');
    expect(response.text).toContain('Your rights');
    expect(response.text).toContain('href="/acme/alpha/contact"');
    expect(response.text).toContain('href="/acme/alpha/legal/community-guidelines"');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style help centre search and empty state under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/help?q=wallet');

    expect(staticPageRoutes.pages['/help']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Help centre');
    expect(response.text).toContain('Find answers to common questions about Project NEXUS Accessible.');
    expect(response.text).toContain('form method="get" action="/acme/alpha/help"');
    expect(response.text).toContain('Search help topics');
    expect(response.text).toContain('Type a word or phrase to filter the questions below.');
    expect(response.text).toContain('id="q" name="q" type="search" value="wallet"');
    expect(response.text).toContain('No help topics match your search. Try a different word, or contact us.');
    expect(response.text).toContain('Still need help?');
    expect(response.text).toContain('href="/acme/alpha/contact"');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style knowledge base search and empty state under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/kb?q=wallet');

    expect(staticPageRoutes.pages['/kb']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Knowledge base');
    expect(response.text).toContain('Guides and articles to help you get the most out of Project NEXUS Accessible.');
    expect(response.text).toContain('form method="get" action="/acme/alpha/kb"');
    expect(response.text).toContain('Search the knowledge base');
    expect(response.text).toContain('Search by title or content.');
    expect(response.text).toContain('id="q" name="q" type="search" value="wallet"');
    expect(response.text).toContain('Articles');
    expect(response.text).toContain('No articles match your search.');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style blog search and empty state under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/blog?q=timebanking');

    expect(staticPageRoutes.pages['/blog']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Blog');
    expect(response.text).toContain('News, stories and updates from Project NEXUS Accessible.');
    expect(response.text).toContain('form method="get" action="/acme/alpha/blog"');
    expect(response.text).toContain('Search the blog');
    expect(response.text).toContain('Search by title or content.');
    expect(response.text).toContain('id="q" name="q" type="search" value="timebanking"');
    expect(response.text).toContain('Posts');
    expect(response.text).toContain('No posts match your search.');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style volunteering search and empty state under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/volunteering?q=community&is_remote=1');

    expect(staticPageRoutes.pages['/volunteering']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Volunteering');
    expect(response.text).toContain('Find volunteering opportunities, track applications and log volunteering hours.');
    expect(response.text).toContain('href="/acme/alpha/organisations"');
    expect(response.text).toContain('Browse organisations');
    expect(response.text).toContain('How volunteering works');
    expect(response.text).toContain('Find an opportunity that suits you.');
    expect(response.text).toContain('Apply, and tell the organiser about yourself.');
    expect(response.text).toContain('Your volunteering hours');
    expect(response.text).toContain('Approved hours');
    expect(response.text).toContain('Your volunteering tools');
    expect(response.text).toContain('href="/acme/alpha/volunteering/hours"');
    expect(response.text).toContain('Volunteering sections');
    expect(response.text).toContain('Search and filter opportunities');
    expect(response.text).toContain('form method="get" action="/acme/alpha/volunteering"');
    expect(response.text).toContain('id="q" name="q" type="search" value="community"');
    expect(response.text).toContain('id="is_remote" name="is_remote" type="checkbox" value="1" checked');
    expect(response.text).toContain('Opportunities');
    expect(response.text).toContain('No opportunities shown');
    expect(response.text).toContain('No volunteering opportunities match your filters.');
    expect(response.text).toContain('Try widening your search');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style skills directory search and empty state under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/skills?skill=gardening');

    expect(staticPageRoutes.pages['/skills']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Skills directory');
    expect(response.text).toContain('Browse the skills members are offering in this community.');
    expect(response.text).toContain('form method="get" action="/acme/alpha/skills"');
    expect(response.text).toContain('Find members by skill');
    expect(response.text).toContain('Enter a skill, for example gardening or accountancy.');
    expect(response.text).toContain('id="skill" name="skill" type="search" value="gardening"');
    expect(response.text).toContain('Find members');
    expect(response.text).toContain('Members offering gardening');
    expect(response.text).toContain('No members found offering that skill.');
    expect(response.text).toContain('Browse by category');
    expect(response.text).toContain('No skills have been added yet.');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style exchanges tab filter and empty state under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/exchanges?tab=needs_confirmation');

    expect(staticPageRoutes.pages['/exchanges']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Exchanges');
    expect(response.text).toContain('Review exchange requests, track accepted exchanges and confirm completed hours.');
    expect(response.text).toContain('Exchange workflow is not enabled');
    expect(response.text).toContain('This community has not enabled the structured exchange workflow yet.');
    expect(response.text).toContain('aria-label="Filter exchanges"');
    expect(response.text).toContain('href="/acme/alpha/exchanges?tab=all"');
    expect(response.text).toContain('href="/acme/alpha/exchanges?tab=active"');
    expect(response.text).toContain('href="/acme/alpha/exchanges?tab=needs_confirmation"');
    expect(response.text).toContain('aria-current="true"');
    expect(response.text).toContain('Needs confirmation');
    expect(response.text).toContain('Exchange requests');
    expect(response.text).toContain('No exchanges shown');
    expect(response.text).toContain('There are no exchanges to show.');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style group exchanges filter and empty state under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/group-exchanges?state=active&status=cancelled');

    expect(staticPageRoutes.pages['/group-exchanges']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Group exchanges');
    expect(response.text).toContain('Exchanges of time between several members at once');
    expect(response.text).toContain('href="/acme/alpha/group-exchanges/new"');
    expect(response.text).toContain('Start a group exchange');
    expect(response.text).toContain('The group exchange has been cancelled.');
    expect(response.text).toContain('aria-label="Filter by status"');
    expect(response.text).toContain('href="/acme/alpha/group-exchanges"');
    expect(response.text).toContain('href="/acme/alpha/group-exchanges?state=draft"');
    expect(response.text).toContain('href="/acme/alpha/group-exchanges?state=pending"');
    expect(response.text).toContain('<strong>Active</strong>');
    expect(response.text).toContain('href="/acme/alpha/group-exchanges?state=completed"');
    expect(response.text).toContain('href="/acme/alpha/group-exchanges?state=cancelled"');
    expect(response.text).toContain('You have no group exchanges yet.');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style polls filter, create form, and empty state under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/polls?mine=1&category=transport&status=poll-created');

    expect(staticPageRoutes.pages['/polls']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Polls');
    expect(response.text).toContain('Have your say on questions put to the community.');
    expect(response.text).toContain('Your poll has been created.');
    expect(response.text).toContain('You can vote once on each open poll. To keep things fair, the results stay hidden until a poll closes.');
    expect(response.text).toContain('form method="get" action="/acme/alpha/polls"');
    expect(response.text).toContain('id="mine" name="mine" type="checkbox" value="1" checked');
    expect(response.text).toContain('Create a poll');
    expect(response.text).toContain('form method="post" action="/acme/alpha/polls"');
    expect(response.text).toContain('id="poll-question" name="question" type="text"');
    expect(response.text).toContain('Poll options');
    expect(response.text).toContain('id="poll-option-1" name="options[]" type="text"');
    expect(response.text).toContain('id="poll-option-2" name="options[]" type="text"');
    expect(response.text).toContain('id="poll-type-single" name="poll_type" type="radio" value="standard" checked');
    expect(response.text).toContain('id="poll-type-multiple" name="poll_type" type="radio" value="multiple"');
    expect(response.text).toContain('id="poll-anonymous" name="is_anonymous" type="checkbox" value="1"');
    expect(response.text).toContain('There are no polls at the moment.');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style achievements summary and empty states under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/achievements?status=daily-reward-claimed');

    expect(staticPageRoutes.pages['/achievements']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Achievements');
    expect(response.text).toContain('Your level, experience and the badges you have earned in this community.');
    expect(response.text).toContain('Level');
    expect(response.text).toContain('Experience points');
    expect(response.text).toContain('Badges earned');
    expect(response.text).toContain('0% of the way to the next level');
    expect(response.text).toContain('Daily reward');
    expect(response.text).toContain('Daily reward claimed! You earned 5 XP.');
    expect(response.text).toContain('Current streak: 0 day(s)');
    expect(response.text).toContain('Claim today to earn 5 XP');
    expect(response.text).toContain('form method="post" action="/acme/alpha/achievements/daily-reward"');
    expect(response.text).toContain('Active challenges');
    expect(response.text).toContain('There are no active challenges right now.');
    expect(response.text).toContain('Your badges');
    expect(response.text).toContain('You have not earned any badges yet. Take part in the community to start earning them.');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style leaderboard filters, community impact, and empty state under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/leaderboard?type=xp&period=week');

    expect(staticPageRoutes.pages['/leaderboard']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Leaderboard');
    expect(response.text).toContain('See how members are contributing to the community.');
    expect(response.text).toContain('Community impact');
    expect(response.text).toContain('Aggregate activity across this timebank community.');
    expect(response.text).toContain('Total members');
    expect(response.text).toContain('Exchanges completed');
    expect(response.text).toContain('Hours exchanged');
    expect(response.text).toContain('Active listings');
    expect(response.text).toContain('Connections made');
    expect(response.text).toContain('Badges awarded');
    expect(response.text).toContain('form method="get" action="/acme/alpha/leaderboard"');
    expect(response.text).toContain('Filter leaderboard');
    expect(response.text).toContain('id="type" name="type"');
    expect(response.text).toContain('<option value="xp" selected>Experience points</option>');
    expect(response.text).toContain('id="period" name="period"');
    expect(response.text).toContain('<option value="week" selected>This week</option>');
    expect(response.text).toContain('There is nothing to show here yet.');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style legal hub under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/legal');

    expect(staticPageRoutes.pages['/legal']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Legal');
    expect(response.text).toContain('The policies and terms that apply when you use Project NEXUS Accessible.');
    expect(response.text).toContain('class="nexus-alpha-card-list" aria-label="Legal documents"');
    expect(response.text).toContain('href="/acme/alpha/legal/terms"');
    expect(response.text).toContain('Terms of service');
    expect(response.text).toContain('href="/acme/alpha/legal/privacy"');
    expect(response.text).toContain('Privacy policy');
    expect(response.text).toContain('href="/acme/alpha/legal/cookies"');
    expect(response.text).toContain('Cookie policy');
    expect(response.text).toContain('href="/acme/alpha/legal/community-guidelines"');
    expect(response.text).toContain('Community guidelines');
    expect(response.text).toContain('href="/acme/alpha/legal/acceptable-use"');
    expect(response.text).toContain('Acceptable use policy');
    expect(response.text).toContain('href="/acme/alpha/accessibility"');
    expect(response.text).toContain('Accessibility statement');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style fallback legal document under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/legal/community-guidelines');

    expect(staticPageRoutes.pages['/legal/community-guidelines']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/acme/alpha/legal"');
    expect(response.text).toContain('Back to legal');
    expect(response.text).toContain('Community guidelines');
    expect(response.text).toContain('A tailored version of this document has not been published for Project NEXUS Accessible yet. The general policy below applies.');
    expect(response.text).toContain('These guidelines keep Project NEXUS Accessible a safe and welcoming place.');
    expect(response.text).toContain('Respectful communication');
    expect(response.text).toContain('Safety and wellbeing');
    expect(response.text).toContain('Authentic profiles');
    expect(response.text).toContain('Fair exchange');
    expect(response.text).toContain('Reporting and consequences');
    expect(response.text).toContain('href="/acme/alpha/contact"');
    expect(response.text).toContain('contact us');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style features page under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/features');

    expect(staticPageRoutes.pages['/features']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Features');
    expect(response.text).toContain('What you can do in this community.');
    expect(response.text).toContain('Find members who can help with what you need, and offer your own skills in return.');
    expect(response.text).toContain('Earn and spend time credits');
    expect(response.text).toContain('Discover and host community events.');
    expect(response.text).toContain('Find volunteering opportunities and log your hours.');
    expect(response.text).toContain('Join groups of members with shared interests.');
    expect(response.text).toContain('Earn badges and see how you are contributing.');
    expect(response.text).toContain('href="/acme/alpha/guide"');
    expect(response.text).toContain('How timebanking works');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Blade-style timebanking guide under the tenant alpha route prefix', async () => {
    const response = await request(app).get('/acme/alpha/guide');

    expect(staticPageRoutes.pages['/guide']).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.text).toContain('How timebanking works');
    expect(response.text).toContain('Timebanking is a simple way for a community to share skills and help each other.');
    expect(response.text).toContain('Everyone\'s time is equal');
    expect(response.text).toContain('One hour always equals one time credit');
    expect(response.text).toContain('The three steps');
    expect(response.text).toContain('Give your time');
    expect(response.text).toContain('Earn time credits');
    expect(response.text).toContain('Spend your credits');
    expect(response.text).toContain('Getting started');
    expect(response.text).toContain('href="/acme/alpha/register"');
    expect(response.text).toContain('href="/acme/alpha/listings"');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
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

  it('serves preparation skeletons for Blade destinations that are not certified yet', async () => {
    const response = await request(app).get('/chat');

    expect(response.status).toBe(200);
    expect(response.text).toContain('AI assistant');
    expect(response.text).toContain('shared accessible frontend preparation page');
    expect(response.text).toContain('does not certify ASP.NET route or workflow');
  });

  it('serves top-level Blade destination skeletons without claiming workflow parity', async () => {
    const skeletonPaths = [
      '/verify-email',
      '/newsletter/unsubscribe',
      '/onboarding',
      '/matches',
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
    expect(matrix).toContain('| Volunteering | `/volunteering` | `/volunteering` | Local Blade-style index candidate; live opportunities');
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
    expect(routeInventory).toContain('| ASP.NET static skeleton paths | 24 |');
    expect(routeInventory).toContain('Laravel shared-domain path');
    expect(routeInventory).toContain('Laravel custom-domain path');
    expect(routeInventory).toContain('| GET | /faq | /{tenantSlug}/alpha/faq | /faq |');
    expect(routeInventory).toContain('| GET | /cookies | /{tenantSlug}/alpha/cookies | /cookies | cookies | cookieSettings | cookies | candidate-route |');
    expect(routeInventory).toContain('| GET | /kb | /{tenantSlug}/alpha/kb | /kb | kb.index | kb | kb | candidate-route |');
    expect(routeInventory).toContain('| GET | /kb/{id} | /{tenantSlug}/alpha/kb/{id} | /kb/{id} | kb.show | kbArticle | kb | missing |');
    expect(routeInventory).toContain('| GET | /blog | /{tenantSlug}/alpha/blog | /blog | blog.index | blog | blog | candidate-route |');
    expect(routeInventory).toContain('| GET | /blog/{slug} | /{tenantSlug}/alpha/blog/{slug} | /blog/{slug} | blog.show | blogPost | blog | missing |');
    expect(routeInventory).toContain('| GET | /volunteering | /{tenantSlug}/alpha/volunteering | /volunteering | volunteering.index | volunteering | volunteering | candidate-route |');
    expect(routeInventory).toContain('| GET | /volunteering/hours | /{tenantSlug}/alpha/volunteering/hours | /volunteering/hours | volunteering.hours | volunteeringHours | volunteering | missing |');
    expect(routeInventory).toContain('| GET | /skills | /{tenantSlug}/alpha/skills | /skills | skills.index | skills | skills | candidate-route |');
    expect(routeInventory).toContain('| GET | /exchanges | /{tenantSlug}/alpha/exchanges | /exchanges | exchanges.index | exchanges | exchanges | candidate-route |');
    expect(routeInventory).toContain('| GET | /group-exchanges | /{tenantSlug}/alpha/group-exchanges | /group-exchanges | group-exchanges.index | groupExchanges | group-exchanges | candidate-route |');
    expect(routeInventory).toContain('| GET | /polls | /{tenantSlug}/alpha/polls | /polls | polls.index | polls | polls | candidate-route |');
    expect(routeInventory).toContain('| GET | /achievements | /{tenantSlug}/alpha/achievements | /achievements | achievements | achievements | achievements | candidate-route |');
    expect(routeInventory).toContain('| POST | /achievements/daily-reward | /{tenantSlug}/alpha/achievements/daily-reward | /achievements/daily-reward | achievements.daily-reward | dailyReward | achievements | missing |');
    expect(routeInventory).toContain('| GET | /leaderboard | /{tenantSlug}/alpha/leaderboard | /leaderboard | leaderboard | leaderboard | leaderboard | candidate-route |');
    expect(routeInventory).toContain('| GET | /leaderboard/competitive | /{tenantSlug}/alpha/leaderboard/competitive | /leaderboard/competitive | gamification.competitive | gamificationCompetitive | leaderboard | missing |');
    expect(routeInventory).toContain('| GET | /legal | /{tenantSlug}/alpha/legal | /legal | legal.hub | legalHub | legal | candidate-route |');
    expect(routeInventory).toContain('| GET | /legal/community-guidelines | /{tenantSlug}/alpha/legal/community-guidelines | /legal/community-guidelines | legal.community-guidelines | legalDocument | legal | candidate-route |');
    expect(routeInventory).toContain('| POST | /report-a-problem | /{tenantSlug}/alpha/report-a-problem | /report-a-problem | report-problem.store | storeReportProblem | report-a-problem | candidate-workflow |');
    expect(viewInventory).toContain('| Laravel Blade accessible views | 289 |');
    expect(viewInventory).toContain('| kb-index.blade.php | kb | candidate-exact-view |');
    expect(viewInventory).toContain('| kb-article.blade.php | kb | missing-nunjucks-view |');
    expect(viewInventory).toContain('| blog-index.blade.php | blog | candidate-exact-view |');
    expect(viewInventory).toContain('| blog-post.blade.php | blog | missing-nunjucks-view |');
    expect(viewInventory).toContain('| volunteering.blade.php | volunteering | candidate-exact-view |');
    expect(viewInventory).toContain('| volunteering-hours.blade.php | volunteering | missing-nunjucks-view |');
    expect(viewInventory).toContain('| skills.blade.php | skills | candidate-exact-view |');
    expect(viewInventory).toContain('| exchanges.blade.php | exchanges | candidate-exact-view |');
    expect(viewInventory).toContain('| group-exchanges.blade.php | group | candidate-exact-view |');
    expect(viewInventory).toContain('| polls.blade.php | polls | candidate-exact-view |');
    expect(viewInventory).toContain('| achievements.blade.php | achievements | candidate-exact-view |');
    expect(viewInventory).toContain('| leaderboard.blade.php | leaderboard | candidate-exact-view |');
    expect(viewInventory).toContain('| legal-hub.blade.php | legal | candidate-exact-view |');
    expect(viewInventory).toContain('| legal-document.blade.php | legal | candidate-exact-view |');
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
