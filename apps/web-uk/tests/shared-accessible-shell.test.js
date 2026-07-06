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
const request = require('supertest');

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
  forgotPassword: jest.fn().mockResolvedValue({}),
  resetPassword: jest.fn().mockResolvedValue({}),
  resendVerification: jest.fn().mockResolvedValue({}),
  verify2fa: jest.fn(),
  validateToken: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn().mockResolvedValue({}),
  saveOnboardingSafeguarding: jest.fn().mockResolvedValue({}),
  completeOnboarding: jest.fn().mockResolvedValue({ data: { message: 'complete' } }),
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
  donateCredits: jest.fn().mockResolvedValue({ data: { message: 'sent' } }),
  unsaveSavedItem: jest.fn().mockResolvedValue({}),
  sendAppreciation: jest.fn().mockResolvedValue({ data: { id: 55 } }),
  reactToAppreciation: jest.fn().mockResolvedValue({ data: { reaction_type: 'heart' } }),
  createSavedCollection: jest.fn().mockResolvedValue({ data: { id: 12 } }),
  updateSavedCollection: jest.fn().mockResolvedValue({ data: { id: 12 } }),
  deleteSavedCollection: jest.fn().mockResolvedValue({}),
  deleteSavedItem: jest.fn().mockResolvedValue({}),
  dismissMatch: jest.fn().mockResolvedValue({ data: { dismissed: true } }),
  performExchangeAction: jest.fn().mockResolvedValue({ data: { id: 88 } }),
  rateExchange: jest.fn().mockResolvedValue({ data: { ratings: [] } }),
  sendAiChat: jest.fn().mockResolvedValue({ data: { conversation_id: 123 } }),
  createMemberPremiumCheckout: jest.fn().mockResolvedValue({ data: { checkout_url: 'https://checkout.stripe.test/session' } }),
  createMemberPremiumPortal: jest.fn().mockResolvedValue({ data: { portal_url: 'https://billing.stripe.test/session' } }),
  cancelMemberPremium: jest.fn().mockResolvedValue({ data: { cancelled: true } }),
  createReview: jest.fn().mockResolvedValue({ data: { id: 91 } }),
  createComment: jest.fn().mockResolvedValue({ data: { id: 12 } }),
  toggleReaction: jest.fn().mockResolvedValue({ data: { action: 'added' } }),
  saveSavedSearch: jest.fn().mockResolvedValue({ data: { id: 12 } }),
  deleteSavedSearch: jest.fn().mockResolvedValue({ deleted: true }),
  runSavedSearch: jest.fn().mockResolvedValue({ data: { query_params: { q: 'gardening' } } }),
  getUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 0 }),
  getNotifications: jest.fn().mockResolvedValue({ data: [], unreadCount: 0, pagination: { page: 1, totalPages: 1 } }),
  getNotificationUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 0 }),
  markNotificationRead: jest.fn().mockResolvedValue({}),
  markAllNotificationsRead: jest.fn().mockResolvedValue({ data: { marked_read: 2 } }),
  markNotificationGroupRead: jest.fn().mockResolvedValue({ data: { marked_read: 2 } }),
  deleteAllNotifications: jest.fn().mockResolvedValue({ data: { deleted: 2 } }),
  deleteNotification: jest.fn().mockResolvedValue({}),
  getTransactions: jest.fn(),
  getVolunteerOrganisations: jest.fn().mockResolvedValue({ data: [] }),
  getVolunteeringOpportunities: jest.fn().mockResolvedValue({ data: [] }),
  getVolunteerOrganisation: jest.fn(),
  getMyVolunteerOrganisations: jest.fn(),
  createVolunteerOrganisation: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  getVolunteerOpportunity: jest.fn(),
  getOrganisationOpportunities: jest.fn(),
  getOrganisationReviews: jest.fn(),
  getOrganisationJobs: jest.fn(),
  submitContact: jest.fn().mockResolvedValue({}),
  submitSupportReport: jest.fn().mockResolvedValue({ data: { report: { reference: 'NXR-260706-ABC123' } } })
}));

process.env.COOKIE_SECRET = 'test-secret-at-least-32-characters';
process.env.SESSION_SECRET = 'test-session-secret-32-chars!!';
process.env.NODE_ENV = 'test';

describe('shared accessible frontend shell', () => {
  let app;

  beforeAll(() => {
    app = require('../src/server');
  });

  beforeEach(() => {
    const api = require('../src/lib/api');
    api.submitContact.mockReset().mockResolvedValue({});
    api.submitSupportReport.mockReset().mockResolvedValue({
      data: { report: { reference: 'NXR-260706-ABC123' } }
    });
    api.getBalance.mockReset().mockResolvedValue({ balance: 8 });
    api.getTransactions.mockReset().mockResolvedValue({ data: [] });
    api.getProfile.mockReset().mockResolvedValue({ id: 101 });
    api.updateProfile.mockReset().mockResolvedValue({});
    api.saveOnboardingSafeguarding.mockReset().mockResolvedValue({});
    api.completeOnboarding.mockReset().mockResolvedValue({ data: { message: 'complete' } });
    api.donateCredits.mockReset().mockResolvedValue({ data: { message: 'sent' } });
    api.unsaveSavedItem.mockReset().mockResolvedValue({});
    api.sendAppreciation.mockReset().mockResolvedValue({ data: { id: 55 } });
    api.reactToAppreciation.mockReset().mockResolvedValue({ data: { reaction_type: 'heart' } });
    api.createSavedCollection.mockReset().mockResolvedValue({ data: { id: 12 } });
    api.updateSavedCollection.mockReset().mockResolvedValue({ data: { id: 12 } });
    api.deleteSavedCollection.mockReset().mockResolvedValue({});
    api.deleteSavedItem.mockReset().mockResolvedValue({});
    api.dismissMatch.mockReset().mockResolvedValue({ data: { dismissed: true } });
    api.performExchangeAction.mockReset().mockResolvedValue({ data: { id: 88 } });
    api.rateExchange.mockReset().mockResolvedValue({ data: { ratings: [] } });
    api.sendAiChat.mockReset().mockResolvedValue({ data: { conversation_id: 123 } });
    api.createMemberPremiumCheckout.mockReset().mockResolvedValue({ data: { checkout_url: 'https://checkout.stripe.test/session' } });
    api.createMemberPremiumPortal.mockReset().mockResolvedValue({ data: { portal_url: 'https://billing.stripe.test/session' } });
    api.cancelMemberPremium.mockReset().mockResolvedValue({ data: { cancelled: true } });
    api.createReview.mockReset().mockResolvedValue({ data: { id: 91 } });
    api.createComment.mockReset().mockResolvedValue({ data: { id: 12 } });
    api.toggleReaction.mockReset().mockResolvedValue({ data: { action: 'added' } });
    api.saveSavedSearch.mockReset().mockResolvedValue({ data: { id: 12 } });
    api.deleteSavedSearch.mockReset().mockResolvedValue({ deleted: true });
    api.runSavedSearch.mockReset().mockResolvedValue({ data: { query_params: { q: 'gardening' } } });
    api.forgotPassword.mockReset().mockResolvedValue({});
    api.resetPassword.mockReset().mockResolvedValue({});
    api.resendVerification.mockReset().mockResolvedValue({});
    api.createVolunteerOrganisation.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.getNotifications.mockReset().mockResolvedValue({ data: [], unreadCount: 0, pagination: { page: 1, totalPages: 1 } });
    api.markNotificationRead.mockReset().mockResolvedValue({});
    api.markAllNotificationsRead.mockReset().mockResolvedValue({ data: { marked_read: 2 } });
    api.markNotificationGroupRead.mockReset().mockResolvedValue({ data: { marked_read: 2 } });
    api.deleteAllNotifications.mockReset().mockResolvedValue({ data: { deleted: 2 } });
    api.deleteNotification.mockReset().mockResolvedValue({});
    api.verify2fa.mockReset();
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

  it('serves a Laravel route preparation page for missing GET routes', async () => {
    const response = await request(app).get('/onboarding');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Onboarding');
    expect(response.text).toContain('Laravel Blade route');
    expect(response.text).toContain('does not certify ASP.NET route or workflow');
  });

  it('submits the Laravel onboarding profile step through the profile API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/onboarding/profile')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        bio: ' I can help with gardening '
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/onboarding/interests');
    expect(api.updateProfile).toHaveBeenCalledWith('test-token', {
      bio: 'I can help with gardening'
    });
  });

  it('stores onboarding category choices and completes through the Laravel v2 API', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const interests = await agent
      .post('/onboarding/interests')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        interests: ['2', 'bad', '3', '2']
      });

    expect(interests.status).toBe(302);
    expect(interests.headers.location).toBe('/onboarding/skills');

    const skills = await agent
      .post('/onboarding/skills')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        offers: ['5'],
        needs: ['6']
      });

    expect(skills.status).toBe(302);
    expect(skills.headers.location).toBe('/onboarding/safeguarding');

    const confirm = await agent
      .post('/onboarding/confirm')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(confirm.status).toBe(302);
    expect(confirm.headers.location).toBe('/dashboard?status=onboarding-complete');
    expect(api.completeOnboarding).toHaveBeenCalledWith('test-token', {
      interests: [2, 3],
      offers: [5],
      needs: [6]
    });
  });

  it('submits onboarding safeguarding choices through the Laravel v2 API', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/onboarding/safeguarding')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        'safeguarding[9]': 'yes',
        'safeguarding[10]': ''
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/onboarding/confirm');
    expect(api.saveOnboardingSafeguarding).toHaveBeenCalledWith('test-token', [
      { option_id: 9, value: 'yes' }
    ]);
  });

  it('keeps the Laravel onboarding avatar route as a safe failure until multipart proxying exists', async () => {
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/onboarding/avatar')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/onboarding/profile?status=avatar-failed');
  });

  it('renders the Laravel-style contact form with report-problem prefill', async () => {
    const response = await request(app).get('/contact?problem_url=/explore');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Contact us');
    expect(response.text).toContain('method="post" action="/contact"');
    expect(response.text).toContain('name="_csrf"');
    expect(response.text).toContain('id="name" name="name"');
    expect(response.text).toContain('id="email" name="email"');
    expect(response.text).toContain('id="subject" name="subject"');
    expect(response.text).toContain('value="technical" selected');
    expect(response.text).toContain('I am reporting a problem with /explore');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('submits the contact form to the Laravel contact API contract', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);
    const first = await agent.get('/contact');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/contact')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        name: 'Ada Lovelace',
        email: 'ada@example.org',
        subject: 'technical',
        message: 'The accessible page did not load.'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/contact?status=contact-sent');
    expect(api.submitContact).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@example.org',
      subject: 'technical',
      message: 'The accessible page did not load.',
      turnstile_token: ''
    });
  });

  it('redirects contact validation errors with the Laravel status key', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);
    const first = await agent.get('/contact');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/contact')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        name: '',
        email: 'not-an-email',
        message: ''
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/contact?status=contact-validation');
    expect(api.submitContact).not.toHaveBeenCalled();

    const follow = await agent.get('/contact?status=contact-validation');
    expect(follow.text).toContain('There is a problem');
    expect(follow.text).toContain('Enter your name');
    expect(follow.text).toContain('Enter a valid email address');
    expect(follow.text).toContain('Enter a message');
  });

  it('redirects signed-out report-problem users to the contact prefill path', async () => {
    const response = await request(app).get('/report-a-problem?return=/explore');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/contact?problem_url=%2Fexplore');
  });

  it('renders the signed-in Laravel-style report-problem form', async () => {
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/report-a-problem?return=/explore')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(response.status).toBe(200);
    expect(response.text).toContain('Report a problem with this page');
    expect(response.text).toContain('method="post" action="/report-a-problem"');
    expect(response.text).toContain('name="page_url" value="/explore"');
    expect(response.text).toContain('id="summary" name="summary"');
    expect(response.text).toContain('id="description" name="description"');
    expect(response.text).toContain('id="impact-blocked" name="impact" type="radio" value="blocked"');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('submits signed-in report-problem forms to the Laravel support report API contract', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/report-a-problem?return=/explore')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/report-a-problem')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        page_url: '/explore',
        summary: 'Broken page',
        description: 'The accessible route returned an unexpected blank area.',
        impact: 'major'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/report-a-problem?return=%2Fexplore&status=sent&ref=NXR-260706-ABC123');
    expect(api.submitSupportReport).toHaveBeenCalledWith('test-token', {
      summary: 'Broken page',
      description: 'The accessible route returned an unexpected blank area.',
      impact: 'major',
      source: 'accessible',
      page_url: '/explore',
      route: '/report-a-problem'
    });
  });

  it('validates signed-in report-problem forms before calling the Laravel API', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/report-a-problem?return=/explore')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/report-a-problem')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        page_url: '/explore',
        summary: 'No',
        description: 'Short',
        impact: 'unknown'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/report-a-problem?return=%2Fexplore&status=invalid');
    expect(api.submitSupportReport).not.toHaveBeenCalled();

    const follow = await agent
      .get('/report-a-problem?return=/explore&status=invalid')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    expect(follow.text).toContain('There is a problem');
    expect(follow.text).toContain('Enter a summary between 3 and 180 characters');
    expect(follow.text).toContain('Enter details between 10 and 5000 characters');
    expect(follow.text).toContain('Select how this affects you');
  });

  it('serves the Laravel forgot-password alias with a matching form action', async () => {
    const response = await request(app).get('/login/forgot-password');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Reset your password');
    expect(response.text).toContain('method="post" action="/login/forgot-password"');
    expect(response.text).toContain('name="_csrf"');
  });

  it('submits the Laravel forgot-password alias through the existing reset API helper', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);
    const first = await agent.get('/login/forgot-password');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/login/forgot-password')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        email: 'ada@example.org',
        tenant_slug: 'acme'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login/forgot-password?status=forgot-sent');
    expect(api.forgotPassword).toHaveBeenCalledWith('ada@example.org', 'acme');
  });

  it('serves the Laravel reset-password alias with a matching form action', async () => {
    const response = await request(app).get('/password/reset?token=reset-token');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Set a new password');
    expect(response.text).toContain('method="post" action="/password/reset"');
    expect(response.text).toContain('name="token" value="reset-token"');
    expect(response.text).toContain('name="password_confirmation"');
  });

  it('submits the Laravel reset-password alias with confirmation', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);
    const first = await agent.get('/password/reset?token=reset-token');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/password/reset')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        token: 'reset-token',
        password: 'correct horse battery staple',
        password_confirmation: 'correct horse battery staple'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.resetPassword).toHaveBeenCalledWith(
      'reset-token',
      'correct horse battery staple',
      'correct horse battery staple'
    );
  });

  it('serves the Laravel two-factor alias and preserves expired-session redirects', async () => {
    const agent = request.agent(app);
    const getResponse = await agent.get('/login/two-factor');

    expect(getResponse.status).toBe(200);
    expect(getResponse.text).toContain('name="code"');

    const csrfMatch = getResponse.text.match(/name="_csrf" value="([^"]+)"/);
    const postResponse = await agent
      .post('/login/two-factor')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        code: '123456'
      });

    expect(postResponse.status).toBe(302);
    expect(postResponse.headers.location).toBe('/login?status=two-factor-expired');
  });

  it('submits the Laravel resend-verification route through the email verification API helper', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);
    const first = await agent.get('/login');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/login/resend-verification')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        email: 'Ada@Example.ORG'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=verification-resent');
    expect(api.resendVerification).toHaveBeenCalledWith('ada@example.org');
  });

  it('renders the Laravel-style cookie banner until a cookie choice has been made', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('class="govuk-cookie-banner"');
    expect(response.text).toContain('Cookies on Project NEXUS Accessible');
    expect(response.text).toContain('We use some essential cookies to make this service work.');
    expect(response.text).toContain('We would also like to use analytics cookies');
    expect(response.text).toContain('method="post" action="/cookie-consent"');
    expect(response.text).toContain('name="return" value="/"');
    expect(response.text).toContain('name="cookies" value="accept"');
    expect(response.text).toContain('Accept analytics cookies');
    expect(response.text).toContain('name="cookies" value="reject"');
    expect(response.text).toContain('Reject analytics cookies');
    expect(response.text).toContain('href="/cookies"');
    expect(response.text).toContain('View cookies');

    const dismissed = await request(app)
      .get('/')
      .set('Cookie', ['nexus_alpha_cookie_consent=all']);

    expect(dismissed.status).toBe(200);
    expect(dismissed.text).not.toContain('class="govuk-cookie-banner"');
    expect(dismissed.text).not.toContain('Accept analytics cookies');
  });

  it('stores the Laravel-compatible cookie choice from the no-JS banner post', async () => {
    const agent = request.agent(app);
    const first = await agent.get('/');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/cookie-consent')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        cookies: 'reject',
        return: '/explore'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/explore');
    expect(response.headers['set-cookie'].join(';')).toContain('nexus_alpha_cookie_consent=essential');
  });

  it('renders the Blade-style cookie settings page instead of the static skeleton', async () => {
    const response = await request(app)
      .get('/cookies?status=saved')
      .set('Cookie', ['nexus_alpha_cookie_consent=all']);

    expect(response.status).toBe(200);
    expect(response.text).toContain('Cookies on Project NEXUS Accessible');
    expect(response.text).toContain('Your cookie settings were saved');
    expect(response.text).toContain('Cookies are small files saved on your device');
    expect(response.text).toContain('Essential cookies');
    expect(response.text).toContain('These keep the service secure and remember your language and display choices.');
    expect(response.text).toContain('Analytics cookies');
    expect(response.text).toContain('Do you want to accept analytics cookies?');
    expect(response.text).toContain('method="post" action="/cookie-consent"');
    expect(response.text).toContain('name="cookies" value="save"');
    expect(response.text).toContain('id="analytics-yes" name="analytics" type="radio" value="yes" checked');
    expect(response.text).toContain('id="analytics-no" name="analytics" type="radio" value="no"');
    expect(response.text).toContain('Save cookie settings');
    expect(response.text).toContain('href="/legal/cookies"');
    expect(response.text).toContain('Read our full cookies policy');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('redirects the account hub to sign in when unsigned, matching Laravel auth behaviour', async () => {
    const staticPageRoutes = require('../src/routes/static-pages');

    const response = await request(app).get('/account');

    expect(staticPageRoutes.pages['/account']).toBeUndefined();
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  it('renders the Blade-style account hub when signed in', async () => {
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/account')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(response.status).toBe(200);
    expect(response.text).toContain('My account');
    expect(response.text).toContain('Manage your wallet, messages, connections and personal settings in one place.');
    expect(response.text).toContain('class="nexus-alpha-card-list');
    expect(response.text).toContain('href="/wallet"');
    expect(response.text).toContain('View your time-credit balance and history, and send credits to other members.');
    expect(response.text).toContain('href="/messages"');
    expect(response.text).toContain('Read and send direct messages with members of this community.');
    expect(response.text).toContain('href="/connections"');
    expect(response.text).toContain('Accept or decline connection requests and manage your network.');
    expect(response.text).toContain('href="/notifications"');
    expect(response.text).toContain('href="/profile"');
    expect(response.text).toContain('href="/settings"');
    expect(response.text).toContain('method="post" action="/logout"');
    expect(response.text).toContain('Sign out');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Laravel-style wallet donate panel when signed in', async () => {
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/wallet')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);

    expect(response.status).toBe(200);
    expect(response.text).toContain('Wallet');
    expect(response.text).toContain('Donate time credits');
    expect(response.text).toContain('method="post" action="/wallet/donate"');
    expect(response.text).toContain('name="target" type="radio" value="community_fund" checked');
    expect(response.text).toContain('name="target" type="radio" value="user"');
    expect(response.text).toContain('Recipient member ID');
    expect(response.text).toContain('Your current balance is 8 credits.');
  });

  it('validates wallet donations before calling the Laravel v2 donate API', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/wallet')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/wallet/donate')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        target: 'community_fund',
        amount: '1.5'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/wallet?status=donate-failed&donate_error=decimals#donate');
    expect(api.donateCredits).not.toHaveBeenCalled();
  });

  it('submits wallet donations to the Laravel v2 donate API', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/wallet')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/wallet/donate')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        target: 'community_fund',
        amount: '2',
        message: ' Thank you '
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/wallet?status=donate-sent#transactions');
    expect(api.donateCredits).toHaveBeenCalledWith('test-token', expect.objectContaining({
      recipient_type: 'community_fund',
      amount: 2,
      message: 'Thank you'
    }));
  });

  it('submits the Laravel saved destroy route through the saved-items API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/account')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/saved/destroy')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        type: 'listing',
        id: '42'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/saved?status=bookmark-removed');
    expect(api.unsaveSavedItem).toHaveBeenCalledWith('test-token', 'listing', 42);
  });

  it('submits the Laravel saved collection create route through the collections API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/me/collections')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        name: ' Useful links ',
        description: ' Things to revisit ',
        is_public: '1'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/me/collections?status=collection-created');
    expect(api.createSavedCollection).toHaveBeenCalledWith('test-token', {
      name: 'Useful links',
      description: 'Things to revisit',
      is_public: true
    });
  });

  it('submits the Laravel saved collection update route through the collections API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/me/collections/12/update')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        name: 'Updated',
        description: ''
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/me/collections/12?status=collection-updated');
    expect(api.updateSavedCollection).toHaveBeenCalledWith('test-token', 12, {
      name: 'Updated',
      description: null,
      is_public: false
    });
  });

  it('submits the Laravel saved collection delete route through the collections API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/me/collections/12/delete')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/me/collections?status=collection-deleted');
    expect(api.deleteSavedCollection).toHaveBeenCalledWith('test-token', 12);
  });

  it('submits the Laravel saved collection item remove route through the saved-items API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/me/collections/12/items/99/remove')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/me/collections/12?status=item-removed');
    expect(api.deleteSavedItem).toHaveBeenCalledWith('test-token', 99);
  });

  it('submits the Laravel match dismiss route through the matching API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/matches/77/dismiss')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        reason: 'not_interested'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/matches?status=match-dismissed');
    expect(api.dismissMatch).toHaveBeenCalledWith('test-token', 77, 'not_interested');
  });

  it('submits the Laravel matches board dismiss route through the matching API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/matches/board/77/dismiss')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        reason: 'too_far',
        source: 'listing'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/matches/board?source=listing&status=match-dismissed#matches-top');
    expect(api.dismissMatch).toHaveBeenCalledWith('test-token', 77, 'too_far');
  });

  it('submits the Laravel exchange action route through the exchanges API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/exchanges/88')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        action: 'confirm',
        hours: '2.5'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/exchanges/88?status=exchange-updated');
    expect(api.performExchangeAction).toHaveBeenCalledWith('test-token', 88, 'confirm', { hours: 2.5 });
  });

  it('submits the Laravel exchange rating route through the exchange rating API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/exchanges/88/rate')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        rating: '5',
        comment: 'Great exchange'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/exchanges/88?status=rating-submitted');
    expect(api.rateExchange).toHaveBeenCalledWith('test-token', 88, {
      rating: 5,
      comment: 'Great exchange'
    });
  });

  it('submits the Laravel AI chat route through the chat API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/chat')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        message: ' Find me a gardener ',
        conversation_id: '44'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/chat?c=123&status=sent');
    expect(api.sendAiChat).toHaveBeenCalledWith('test-token', {
      message: 'Find me a gardener',
      conversation_id: 44
    });
  });

  it('redirects empty Laravel AI chat submissions with the empty status', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/chat')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        message: '   '
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/chat?status=empty');
    expect(api.sendAiChat).not.toHaveBeenCalled();
  });

  it('redirects signed-out Laravel AI chat submissions to the auth-required status', async () => {
    const agent = request.agent(app);
    const first = await agent.get('/contact');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/chat')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        message: 'Find me a gardener'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
  });

  it('submits the Laravel premium subscribe route through the checkout API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/premium/subscribe')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        tier_id: '7',
        interval: 'year'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://checkout.stripe.test/session');
    expect(api.createMemberPremiumCheckout).toHaveBeenCalledWith('test-token', {
      tier_id: 7,
      interval: 'yearly',
      return_url: '/premium/return?status=success'
    });
  });

  it('submits the Laravel premium portal route through the billing portal API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/premium/portal')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://billing.stripe.test/session');
    expect(api.createMemberPremiumPortal).toHaveBeenCalledWith('test-token', {
      return_url: '/premium/manage'
    });
  });

  it('submits the Laravel premium cancel route through the cancel API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/premium/cancel')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/premium/manage?status=cancel-scheduled');
    expect(api.cancelMemberPremium).toHaveBeenCalledWith('test-token');
  });

  it('redirects signed-out Laravel premium subscribe submissions to the auth-required status', async () => {
    const agent = request.agent(app);
    const first = await agent.get('/contact');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/premium/subscribe')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        tier_id: '7'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
  });

  it('submits the Laravel saved search route through the search API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/search/saved')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        name: ' Garden helpers ',
        q: ' gardening ',
        type: 'listings',
        sort: 'newest',
        category_id: '3',
        skills: ' Repair, teaching, repair ',
        date_from: '2026-07-01',
        date_to: 'not-a-date',
        location: ' Town '
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/search/advanced?q=gardening&type=listings&sort=newest&category_id=3&skills=repair%2Cteaching&date_from=2026-07-01&location=Town&status=search-saved');
    expect(api.saveSavedSearch).toHaveBeenCalledWith('test-token', {
      name: 'Garden helpers',
      query_params: {
        q: 'gardening',
        type: 'listings',
        sort: 'newest',
        category_id: '3',
        skills: 'repair,teaching',
        date_from: '2026-07-01',
        location: 'Town'
      },
      notify_on_new: false
    });
  });

  it('redirects invalid Laravel saved search submissions with the failed status', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/search/saved')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        name: '  ',
        q: 'gardening',
        type: 'groups'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/search/advanced?q=gardening&type=groups&status=search-save-failed');
    expect(api.saveSavedSearch).not.toHaveBeenCalled();
  });

  it('submits the Laravel saved search delete route through the search API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/search/saved/12/delete')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/search/advanced?status=search-deleted');
    expect(api.deleteSavedSearch).toHaveBeenCalledWith('test-token', 12);
  });

  it('submits the Laravel saved search run route through the search API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    api.runSavedSearch.mockResolvedValueOnce({
      data: {
        query_params: {
          q: 'gardening',
          type: 'users',
          sort: 'oldest',
          skills: 'repair,teaching'
        }
      }
    });

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/search/saved/12/run')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/search/advanced?q=gardening&type=users&sort=oldest&skills=repair%2Cteaching');
    expect(api.runSavedSearch).toHaveBeenCalledWith('test-token', 12);
  });

  it('redirects signed-out Laravel saved search submissions to the auth-required status', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);
    const first = await agent.get('/contact');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/search/saved')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        name: 'Garden helpers',
        q: 'gardening'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
    expect(api.saveSavedSearch).not.toHaveBeenCalled();
  });

  it('submits the Laravel reviews store route through the v2 reviews API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/reviews')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        receiver_id: '77',
        rating: '5',
        comment: ' Great exchange ',
        transaction_id: '22'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/reviews?status=review-submitted');
    expect(api.createReview).toHaveBeenCalledWith('test-token', {
      receiver_id: 77,
      rating: 5,
      comment: 'Great exchange',
      transaction_id: 22
    });
  });

  it('maps duplicate Laravel review submissions to the review duplicate status', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    api.createReview.mockRejectedValueOnce(new api.ApiError('already reviewed', 409));

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/reviews')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        receiver_id: '77',
        rating: '5'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/reviews?status=review-duplicate');
  });

  it('submits the Laravel review comment route through the comments API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/reviews/91/comments')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        body: ' Helpful context ',
        parent_id: '4'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/reviews/91/comments?status=reply-added');
    expect(api.createComment).toHaveBeenCalledWith('test-token', {
      target_type: 'review',
      target_id: 91,
      content: 'Helpful context',
      parent_id: 4
    });
  });

  it('redirects empty Laravel review comments with the invalid status', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/reviews/91/comments')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        body: '  '
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/reviews/91/comments?status=comment-invalid');
    expect(api.createComment).not.toHaveBeenCalled();
  });

  it('submits the Laravel review reaction route through the reactions API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/reviews/91/react')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        emoji: 'love'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/reviews/91/comments?status=reaction-added#review-reactions');
    expect(api.toggleReaction).toHaveBeenCalledWith('test-token', {
      target_type: 'review',
      target_id: 91,
      reaction_type: 'love'
    });
  });

  it('redirects signed-out Laravel review submissions to the auth-required status', async () => {
    const agent = request.agent(app);
    const first = await agent.get('/contact');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/reviews')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        receiver_id: '77',
        rating: '5'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
  });

  it('submits the Laravel appreciation send route through the appreciations API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/account')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/users/77/appreciations')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        message: ' Thank you for helping ',
        is_public: '1'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/users/77/appreciations?status=appreciation-sent');
    expect(api.sendAppreciation).toHaveBeenCalledWith('test-token', {
      receiver_id: 77,
      message: 'Thank you for helping',
      context_type: 'general',
      is_public: true
    });
  });

  it('submits the Laravel appreciation reaction route through the reaction API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/account')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/appreciations/55/react')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        owner_id: '77',
        reaction_type: 'heart'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/users/77/appreciations?status=reaction-updated#appreciation-55');
    expect(api.reactToAppreciation).toHaveBeenCalledWith('test-token', 55, 'heart');
  });

  it('submits the Laravel grouped notification read route through the v2 API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    api.getNotifications.mockResolvedValueOnce({
      data: [{ id: 7, type: 'system', title: 'System notice', is_read: false }],
      unreadCount: 1,
      pagination: { page: 1, totalPages: 1 }
    });

    const first = await agent
      .get('/notifications')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/notifications/group/read')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        group_key: 'post_like:/feed/posts/7'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/notifications?status=group-marked-read');
    expect(api.markNotificationGroupRead).toHaveBeenCalledWith('test-token', 'post_like:/feed/posts/7');
  });

  it('submits the Laravel delete-all notification route through the v2 API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    api.getNotifications.mockResolvedValueOnce({
      data: [{ id: 8, type: 'system', title: 'System notice', is_read: false }],
      unreadCount: 1,
      pagination: { page: 1, totalPages: 1 }
    });

    const first = await agent
      .get('/notifications')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/notifications/delete-all')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1]
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/notifications?status=all-notifications-deleted');
    expect(api.deleteAllNotifications).toHaveBeenCalledWith('test-token');
  });

  it('renders the Blade-style organisations directory and registration form as a local candidate', async () => {
    const staticPageRoutes = require('../src/routes/static-pages');
    const api = require('../src/lib/api');
    api.getVolunteerOrganisations.mockResolvedValueOnce({
      data: [
        {
          id: 42,
          name: 'Community Club',
          description: 'A volunteer organisation supporting local residents with practical help and events.'
        }
      ],
      meta: { per_page: 30, has_more: false }
    });

    const response = await request(app).get('/organisations?q=club');

    expect(staticPageRoutes.pages['/organisations']).toBeUndefined();
    expect(api.getVolunteerOrganisations).toHaveBeenCalledWith({ search: 'club', per_page: 30 });
    expect(response.status).toBe(200);
    expect(response.text).toContain('Organisations');
    expect(response.text).toContain('Community and partner organisations.');
    expect(response.text).toContain('href="/organisations/browse"');
    expect(response.text).toContain('Browse all organisations');
    expect(response.text).toContain('href="/organisations/register"');
    expect(response.text).toContain('Register an organisation');
    expect(response.text).toContain('href="/organisations/manage"');
    expect(response.text).toContain('Manage my organisations');
    expect(response.text).toContain('action="/organisations"');
    expect(response.text).toContain('Find an organisation');
    expect(response.text).toContain('value="club"');
    expect(response.text).toContain('href="/organisations/42"');
    expect(response.text).toContain('Community Club');
    expect(response.text).toContain('A volunteer organisation supporting local residents');
    expect(response.text).not.toContain('There are no organisations listed yet.');
    expect(response.text).toContain('New organisations are reviewed before they appear.');
    expect(response.text).toContain('Organisation registration terms');
    expect(response.text).toContain('I have read and agree to the organisation registration terms above.');
    expect(response.text).toContain('Submit for approval');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('keeps the organisations page usable when the Laravel organisations API is unavailable', async () => {
    const api = require('../src/lib/api');
    api.getVolunteerOrganisations.mockRejectedValueOnce(new api.ApiOfflineError());

    const response = await request(app).get('/organisations');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Organisations');
    expect(response.text).toContain('Organisation listings are temporarily unavailable.');
    expect(response.text).toContain('There are no organisations listed yet.');
  });

  it('renders the Blade-style volunteering landing page from Laravel opportunities', async () => {
    const staticPageRoutes = require('../src/routes/static-pages');
    const api = require('../src/lib/api');
    api.getVolunteeringOpportunities.mockResolvedValueOnce({
      data: [
        {
          id: 77,
          title: 'Community Kitchen Helper',
          description: 'Help prepare meals and welcome visitors at a weekly community kitchen.',
          is_remote: true,
          location: 'Derry',
          organization: { name: 'Community Club' },
          category: { name: 'Food support' }
        }
      ],
      meta: { cursor: 'next-cursor', per_page: 20, has_more: true }
    });

    const response = await request(app).get('/volunteering?q=kitchen&category_id=3&is_remote=1');

    expect(staticPageRoutes.pages['/volunteering']).toBeUndefined();
    expect(api.getVolunteeringOpportunities).toHaveBeenCalledWith({
      search: 'kitchen',
      category_id: '3',
      is_remote: true,
      per_page: 20
    });
    expect(response.status).toBe(200);
    expect(response.text).toContain('Project NEXUS Accessible');
    expect(response.text).toContain('Volunteering');
    expect(response.text).toContain('Find volunteering opportunities, track applications and log volunteering hours.');
    expect(response.text).toContain('href="/organisations"');
    expect(response.text).toContain('Browse organisations');
    expect(response.text).toContain('How volunteering works');
    expect(response.text).toContain('Find an opportunity that suits you.');
    expect(response.text).toContain('Sign in to apply for opportunities and track your volunteering.');
    expect(response.text).toContain('action="/volunteering"');
    expect(response.text).toContain('Search opportunities');
    expect(response.text).toContain('value="kitchen"');
    expect(response.text).toContain('name="is_remote"');
    expect(response.text).toContain('checked');
    expect(response.text).toContain('1 opportunity shown');
    expect(response.text).toContain('href="/volunteering/opportunities/77"');
    expect(response.text).toContain('Community Kitchen Helper');
    expect(response.text).toContain('Remote');
    expect(response.text).toContain('Community Club');
    expect(response.text).toContain('Derry');
    expect(response.text).toContain('Food support');
    expect(response.text).toContain('Help prepare meals and welcome visitors');
    expect(response.text).toContain('href="/organisations/opportunities/77/apply"');
    expect(response.text).toContain('Apply to volunteer');
    expect(response.text).toContain('href="/volunteering?q=kitchen&amp;category_id=3&amp;is_remote=1&amp;cursor=next-cursor"');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('keeps the volunteering page usable when the Laravel opportunities API is unavailable', async () => {
    const api = require('../src/lib/api');
    api.getVolunteeringOpportunities.mockRejectedValueOnce(new api.ApiOfflineError());

    const response = await request(app).get('/volunteering');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Volunteering');
    expect(response.text).toContain('Volunteering opportunities could not be loaded. Try again.');
    expect(response.text).toContain('No volunteering opportunities match your filters.');
  });

  it('renders the Blade-style paginated organisations browse page from Laravel data', async () => {
    const api = require('../src/lib/api');
    api.getVolunteerOrganisations.mockResolvedValueOnce({
      data: [
        {
          id: 42,
          name: 'Community Club',
          description: 'A volunteer organisation supporting local residents with practical help and events.',
          website: 'https://example.test',
          public_contract: {
            stats: {
              opportunity_count: 2,
              volunteer_count: 5,
              total_hours: 17.5,
              average_rating: 4.5
            }
          }
        }
      ],
      meta: { cursor: 'next-cursor', per_page: 20, has_more: true }
    });

    const response = await request(app).get('/organisations/browse?q=club&cursor=abc');

    expect(api.getVolunteerOrganisations).toHaveBeenCalledWith({ search: 'club', per_page: 20, cursor: 'abc' });
    expect(response.status).toBe(200);
    expect(response.text).toContain('Organisations in Project NEXUS Accessible');
    expect(response.text).toContain('Browse organisations');
    expect(response.text).toContain('Find volunteer organisations in your community and the opportunities they offer.');
    expect(response.text).toContain('href="/organisations/register"');
    expect(response.text).toContain('Register an organisation');
    expect(response.text).toContain('action="/organisations/browse"');
    expect(response.text).toContain('Search organisations');
    expect(response.text).toContain('value="club"');
    expect(response.text).toContain('1 organisation');
    expect(response.text).toContain('href="/organisations/42"');
    expect(response.text).toContain('Community Club');
    expect(response.text).toContain('2 opportunities');
    expect(response.text).toContain('5 volunteers');
    expect(response.text).toContain('17.5 hours logged');
    expect(response.text).toContain('Has a website');
    expect(response.text).toContain('href="/organisations/browse?q=club&amp;cursor=next-cursor"');
    expect(response.text).toContain('Load more organisations');
  });

  it('renders the Blade-style organisation register form as a non-persistent preparation page', async () => {
    const response = await request(app).get('/organisations/register?status=org-email-invalid');

    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/organisations/browse"');
    expect(response.text).toContain('Back to organisations');
    expect(response.text).toContain('Organisations in Project NEXUS Accessible');
    expect(response.text).toContain('Register a volunteer organisation');
    expect(response.text).toContain('List your organisation so volunteers can find your opportunities.');
    expect(response.text).toContain('There is a problem');
    expect(response.text).toContain('href="#email"');
    expect(response.text).toContain('Enter a valid contact email address');
    expect(response.text).toContain('method="post" action="/organisations/register"');
    expect(response.text).toContain('name="_csrf"');
    expect(response.text).toContain('Organisation name');
    expect(response.text).toContain('Use the full, recognised name of your organisation.');
    expect(response.text).toContain('Contact email address');
    expect(response.text).toContain('Volunteers and administrators will use this to contact you.');
    expect(response.text).toContain('Before you register');
    expect(response.text).toContain('I confirm the above and agree to the community guidelines.');
    expect(response.text).toContain('Register organisation');
    expect(response.text).toContain('Cancel');
    expect(response.text).toContain('Your organisation will be reviewed by an administrator before it is listed.');
  });

  it('redirects signed-out organisation registration POSTs to the Laravel auth-required status', async () => {
    const agent = request.agent(app);
    const first = await agent.get('/organisations/register');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/organisations/register')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        name: 'Community Helpers',
        description: 'We coordinate local volunteering projects.',
        email: 'hello@example.org',
        agreed_terms: '1'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
  });

  it('validates the dedicated organisation register POST with Laravel field status keys', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/organisations/register')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/organisations/register')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        name: 'Community Helpers',
        description: 'Too short',
        email: 'hello@example.org',
        agreed_terms: '1'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/organisations/register?status=org-description-invalid');
    expect(api.createVolunteerOrganisation).not.toHaveBeenCalled();
  });

  it('submits the dedicated organisation register POST to Laravel volunteering API', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/organisations/register')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/organisations/register')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        name: ' Community Helpers ',
        description: ' We coordinate local volunteering projects. ',
        email: ' Hello@Example.ORG ',
        website: 'https://example.org',
        agreed_terms: '1'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/organisations?status=org-submitted');
    expect(api.createVolunteerOrganisation).toHaveBeenCalledWith('test-token', {
      name: 'Community Helpers',
      description: 'We coordinate local volunteering projects.',
      contact_email: 'Hello@Example.ORG',
      website: 'https://example.org'
    });
  });

  it('submits the embedded organisations POST with Laravel coarse validation redirects', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/organisations')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const invalid = await agent
      .post('/organisations')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        name: 'Community Helpers',
        description: 'We coordinate local volunteering projects.',
        contact_email: 'not-an-email',
        agreed_terms: '1'
      });

    expect(invalid.status).toBe(302);
    expect(invalid.headers.location).toBe('/organisations?status=org-invalid');
    expect(api.createVolunteerOrganisation).not.toHaveBeenCalled();
  });

  it('renders the Blade-style manage organisations page as a local preparation page', async () => {
    const api = require('../src/lib/api');

    const response = await request(app).get('/organisations/manage');

    expect(api.getMyVolunteerOrganisations).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/organisations/browse"');
    expect(response.text).toContain('Back to organisations');
    expect(response.text).toContain('Organisations in Project NEXUS Accessible');
    expect(response.text).toContain('Manage my organisations');
    expect(response.text).toContain('Organisations you own or help administer.');
    expect(response.text).toContain('You do not manage any organisations');
    expect(response.text).toContain('When you own or administer an organisation, it will appear here.');
    expect(response.text).toContain('href="/organisations/register"');
    expect(response.text).toContain('Register an organisation');
    expect(response.text).toContain('Sign in to load your Laravel-backed organisations.');
  });

  it('renders manageable and pending organisation rows from the Laravel my-organisations contract', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getMyVolunteerOrganisations.mockResolvedValueOnce({
      items: [
        {
          id: 42,
          name: 'Community Club',
          status: 'approved',
          member_role: 'owner'
        },
        {
          id: 99,
          name: 'New Mutual Aid Group',
          status: 'pending',
          member_role: 'owner'
        }
      ]
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/organisations/manage')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getMyVolunteerOrganisations).toHaveBeenCalledWith('test-token', { per_page: 50 });
    expect(response.status).toBe(200);
    expect(response.text).toContain('Community Club');
    expect(response.text).toContain('Your role');
    expect(response.text).toContain('Owner');
    expect(response.text).toContain('href="/volunteering/organisations/42/manage"');
    expect(response.text).toContain('Open dashboard');
    expect(response.text).toContain('href="/organisations/42"');
    expect(response.text).toContain('View organisation');
    expect(response.text).toContain('Awaiting approval');
    expect(response.text).toContain('New Mutual Aid Group');
    expect(response.text).toContain('This organisation is awaiting administrator approval.');
  });

  it('renders the Blade-style organisation detail page from the Laravel public organisation contract', async () => {
    const api = require('../src/lib/api');
    api.getVolunteerOrganisation.mockResolvedValueOnce({
      data: {
        id: 42,
        name: 'Community Club',
        description: 'A volunteer organisation supporting local residents with practical help and events.',
        contact_email: 'hello@example.test',
        website: 'https://example.test',
        public_contract: {
          id: 42,
          name: 'Community Club',
          description: 'A volunteer organisation supporting local residents with practical help and events.',
          contact_email: 'hello@example.test',
          website: 'https://example.test',
          stats: {
            opportunity_count: 2,
            volunteer_count: 5,
            total_hours: 17.5,
            review_count: 1,
            average_rating: 4.5
          }
        }
      }
    });
    api.getOrganisationOpportunities.mockResolvedValueOnce({
      data: [
        {
          id: 77,
          title: 'Community Kitchen Helper',
          description: 'Help prepare meals and welcome visitors at a weekly community kitchen.',
          is_remote: true
        }
      ],
      meta: { per_page: 10, has_more: false }
    });
    api.getOrganisationReviews.mockResolvedValueOnce({
      data: {
        reviews: [
          {
            id: 12,
            rating: 5,
            comment: 'Helpful and welcoming.',
            author: { name: 'Aisha Khan' }
          }
        ]
      }
    });

    const response = await request(app).get('/organisations/42');

    expect(api.getVolunteerOrganisation).toHaveBeenCalledWith('42');
    expect(api.getOrganisationOpportunities).toHaveBeenCalledWith('42', { per_page: 10 });
    expect(api.getOrganisationReviews).toHaveBeenCalledWith('42');
    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/organisations"');
    expect(response.text).toContain('Community Club');
    expect(response.text).toContain('A volunteer organisation supporting local residents');
    expect(response.text).toContain('href="mailto:hello@example.test"');
    expect(response.text).toContain('href="https://example.test"');
    expect(response.text).toContain('href="/organisations/42/jobs"');
    expect(response.text).toContain('View job openings');
    expect(response.text).toContain('About this organisation');
    expect(response.text).toContain('Open opportunities');
    expect(response.text).toContain('2');
    expect(response.text).toContain('Volunteers');
    expect(response.text).toContain('5');
    expect(response.text).toContain('Hours contributed');
    expect(response.text).toContain('17.5');
    expect(response.text).toContain('Volunteer reviews');
    expect(response.text).toContain('Open volunteering opportunities posted by Community Club.');
    expect(response.text).toContain('href="/volunteering/opportunities/77"');
    expect(response.text).toContain('Community Kitchen Helper');
    expect(response.text).toContain('Remote');
    expect(response.text).toContain('View opportunity');
    expect(response.text).toContain('href="/organisations/opportunities/77/apply"');
    expect(response.text).toContain('Apply to volunteer');
    expect(response.text).toContain('Aisha Khan');
    expect(response.text).toContain('5 out of 5');
    expect(response.text).toContain('Helpful and welcoming.');
    expect(response.text).not.toContain('There are no current volunteering opportunities at this organisation.');
    expect(response.text).not.toContain('This organisation has no reviews yet.');
  });

  it('renders the Blade-style organisation jobs page from the Laravel jobs contract', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getVolunteerOrganisation.mockResolvedValueOnce({
      data: {
        id: 42,
        name: 'Community Club',
        description: 'A volunteer organisation supporting local residents.',
        public_contract: {
          id: 42,
          name: 'Community Club',
          description: 'A volunteer organisation supporting local residents.'
        }
      }
    });
    api.getOrganisationJobs.mockResolvedValueOnce({
      items: [
        {
          id: 501,
          title: 'Volunteer Coordinator',
          type: 'volunteer',
          is_remote: true,
          deadline: '2026-08-01'
        },
        {
          id: 502,
          title: 'Paid Outreach Lead',
          type: 'paid',
          location: 'Cork'
        }
      ],
      meta: { limit: 20 }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/organisations/42/jobs')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getVolunteerOrganisation).toHaveBeenCalledWith('42');
    expect(api.getOrganisationJobs).toHaveBeenCalledWith('42', 'test-token', { limit: 20 });
    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/organisations/42"');
    expect(response.text).toContain('Community Club');
    expect(response.text).toContain('Organisations in Project NEXUS Accessible');
    expect(response.text).toContain('Job openings at Community Club');
    expect(response.text).toContain('Open roles posted by this organisation.');
    expect(response.text).toContain('2 openings');
    expect(response.text).toContain('href="/jobs/501"');
    expect(response.text).toContain('Volunteer Coordinator');
    expect(response.text).toContain('Volunteer');
    expect(response.text).toContain('Remote');
    expect(response.text).toContain('Closes');
    expect(response.text).toContain('Paid Outreach Lead');
    expect(response.text).toContain('Paid');
    expect(response.text).toContain('Cork');
    expect(response.text).toContain('View role');
  });

  it('renders the organisation jobs page as a local preparation page when unsigned', async () => {
    const api = require('../src/lib/api');
    api.getOrganisationJobs.mockClear();
    api.getVolunteerOrganisation.mockResolvedValueOnce({
      data: {
        id: 42,
        name: 'Community Club',
        public_contract: {
          id: 42,
          name: 'Community Club'
        }
      }
    });

    const response = await request(app).get('/organisations/42/jobs');

    expect(api.getVolunteerOrganisation).toHaveBeenCalledWith('42');
    expect(api.getOrganisationJobs).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.text).toContain('Job openings at Community Club');
    expect(response.text).toContain('This organisation has no open job openings at the moment.');
    expect(response.text).toContain('Sign in to load Laravel-backed job openings.');
  });

  it('renders the Blade-style volunteering opportunity detail page from the Laravel volunteering contract', async () => {
    const api = require('../src/lib/api');
    api.getVolunteerOpportunity.mockResolvedValueOnce({
      data: {
        id: 77,
        title: 'Community Kitchen Helper',
        description: 'Help prepare meals and welcome visitors at a weekly community kitchen.',
        organization_id: 42,
        organization: {
          id: 42,
          name: 'Community Club',
          logo_url: '/storage/community-club.png'
        },
        category: { name: 'Food support' },
        location: 'Derry',
        is_remote: true,
        skills_needed: 'Food preparation, welcome desk',
        start_date: '2026-08-01',
        end_date: '2026-09-01',
        shifts: [
          {
            id: 501,
            start_time: '2026-08-03T09:00:00Z',
            end_time: '2026-08-03T12:00:00Z',
            capacity: 10,
            spots_available: 3
          }
        ],
        has_applied: false
      }
    });

    const response = await request(app).get('/volunteering/opportunities/77');

    expect(api.getVolunteerOpportunity).toHaveBeenCalledWith('77', '');
    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/volunteering"');
    expect(response.text).toContain('Back to volunteering');
    expect(response.text).toContain('Volunteering opportunity');
    expect(response.text).toContain('Community Kitchen Helper');
    expect(response.text).toContain('Remote');
    expect(response.text).toContain('Help prepare meals and welcome visitors');
    expect(response.text).toContain('Community Club');
    expect(response.text).toContain('href="/organisations/42"');
    expect(response.text).toContain('About this opportunity');
    expect(response.text).toContain('Organisation');
    expect(response.text).toContain('Location');
    expect(response.text).toContain('Derry');
    expect(response.text).toContain('Category');
    expect(response.text).toContain('Food support');
    expect(response.text).toContain('Skills needed');
    expect(response.text).toContain('Food preparation, welcome desk');
    expect(response.text).toContain('Available shifts');
    expect(response.text).toContain('10 places');
    expect(response.text).toContain('3 places left');
    expect(response.text).toContain('Sign in to apply for opportunities and track your volunteering.');
    expect(response.text).toContain('href="/organisations/opportunities/77/apply"');
    expect(response.text).toContain('Apply for this opportunity');
    expect(response.text).not.toContain('method="post" action="/volunteering/opportunities/77/apply"');
  });

  it('returns the shared 404 page when a Laravel volunteering opportunity is missing', async () => {
    const api = require('../src/lib/api');
    api.getVolunteerOpportunity.mockRejectedValueOnce(new api.ApiError('Not found', 404));

    const response = await request(app).get('/volunteering/opportunities/999');

    expect(api.getVolunteerOpportunity).toHaveBeenCalledWith('999', '');
    expect(response.status).toBe(404);
    expect(response.text).toContain('Page not found');
  });

  it('renders the Blade-style organisation opportunity apply page from the Laravel volunteering contract', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getVolunteerOpportunity.mockResolvedValueOnce({
      data: {
        id: 77,
        title: 'Community Kitchen Helper',
        organization_id: 42,
        org_name: 'Community Club',
        has_applied: false
      }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/organisations/opportunities/77/apply')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getVolunteerOpportunity).toHaveBeenCalledWith('77', 'test-token');
    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/organisations/42"');
    expect(response.text).toContain('Community Club');
    expect(response.text).toContain('Organisations in Project NEXUS Accessible');
    expect(response.text).toContain('Apply for this opportunity');
    expect(response.text).toContain('Opportunity');
    expect(response.text).toContain('href="/volunteering/opportunities/77"');
    expect(response.text).toContain('Community Kitchen Helper');
    expect(response.text).toContain('Organisation');
    expect(response.text).toContain('method="post" action="/volunteering/opportunities/77/apply"');
    expect(response.text).toContain('name="_csrf"');
    expect(response.text).toContain('Message to the organiser (optional)');
    expect(response.text).toContain('Tell the organiser why you would like to help. You can leave this blank.');
    expect(response.text).toContain('The organiser will be notified of your application and will review it.');
    expect(response.text).toContain('Send application');
    expect(response.text).toContain('Cancel');
  });

  it('renders the organisation opportunity apply page as a local preparation page when unsigned', async () => {
    const api = require('../src/lib/api');
    api.getVolunteerOpportunity.mockResolvedValueOnce({
      data: {
        id: 77,
        title: 'Community Kitchen Helper',
        organization_id: 42,
        org_name: 'Community Club',
        has_applied: false
      }
    });

    const response = await request(app).get('/organisations/opportunities/77/apply');

    expect(api.getVolunteerOpportunity).toHaveBeenCalledWith('77', '');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Apply for this opportunity');
    expect(response.text).toContain('Community Kitchen Helper');
    expect(response.text).toContain('Sign in to send a Laravel-backed volunteer application.');
    expect(response.text).not.toContain('method="post" action="/volunteering/opportunities/77/apply"');
  });

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
    expect(docs).toContain('BLADE_COMPONENT_PORT_AUDIT.md');
    expect(docs).toContain('BACKEND_SWITCHING_CONTRACT.md');
  });

  it('documents route matrix and backend-switching preparation without readiness claims', () => {
    const matrix = fs.readFileSync(path.join(__dirname, '..', 'docs', 'LARAVEL_ACCESSIBLE_ROUTE_MATRIX.md'), 'utf8');
    const contract = fs.readFileSync(path.join(__dirname, '..', 'docs', 'BACKEND_SWITCHING_CONTRACT.md'), 'utf8');

    expect(matrix).toContain('Laravel `govuk-alpha*`');
    expect(matrix).toContain('| Organisations | `/organisations`, `/organisations/browse`, `/organisations/register`, `/organisations/manage`, `/organisations/{id}`, `/organisations/{id}/jobs`, `/organisations/opportunities/{id}/apply` |');
    expect(matrix).toContain('`/organisations` POST and `/organisations/register` POST validate required fields/terms');
    expect(matrix).toContain('tenant/feature/runtime gates not certified');
    expect(matrix).toContain('It does not certify route parity');
    expect(contract).toContain('Its default backend contract is now Laravel-first');
    expect(contract).toContain('| `ACCESSIBLE_BACKEND_TARGET` | `laravel` | Laravel is the default backend contract target. |');
    expect(contract).toContain('ASP.NET must become');
  });
});
