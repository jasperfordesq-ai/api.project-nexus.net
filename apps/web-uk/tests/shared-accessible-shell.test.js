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
  validateToken: jest.fn(),
  getProfile: jest.fn(),
  getMembers: jest.fn(),
  getUser: jest.fn(),
  getConnections: jest.fn().mockResolvedValue({ data: [] }),
  getConnectionStatus: jest.fn(),
  sendConnectionRequest: jest.fn(),
  getGamificationProfileByUserId: jest.fn(),
  getUserReviews: jest.fn(),
  createUserReview: jest.fn(),
  getListings: jest.fn(),
  getListing: jest.fn(),
  getPublicListing: jest.fn(),
  getListingReviews: jest.fn(),
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
  getTransactions: jest.fn(),
  getFeedPosts: jest.fn(),
  getMyEvents: jest.fn(),
  getEvents: jest.fn(),
  getEvent: jest.fn(),
  getEventRsvps: jest.fn(),
  getExchangeConfig: jest.fn(),
  checkExchangeForListing: jest.fn(),
  getExchanges: jest.fn(),
  getExchange: jest.fn(),
  getExchangeRatings: jest.fn(),
  createExchangeRequest: jest.fn(),
  acceptExchange: jest.fn(),
  declineExchange: jest.fn(),
  startExchange: jest.fn(),
  completeExchange: jest.fn(),
  confirmExchange: jest.fn(),
  cancelExchange: jest.fn(),
  rateExchange: jest.fn(),
  getGamificationProfile: jest.fn(),
  getAllBadges: jest.fn(),
  getVolunteerOrganisations: jest.fn().mockResolvedValue({ data: [] }),
  getVolunteeringOpportunities: jest.fn().mockResolvedValue({ data: [] }),
  getVolunteerOrganisation: jest.fn(),
  getMyVolunteerOrganisations: jest.fn(),
  getVolunteerOpportunity: jest.fn(),
  getOrganisationOpportunities: jest.fn(),
  getOrganisationReviews: jest.fn(),
  getOrganisationJobs: jest.fn()
}));

process.env.COOKIE_SECRET = 'test-secret-at-least-32-characters';
process.env.SESSION_SECRET = 'test-session-secret-32-chars!!';
process.env.NODE_ENV = 'test';

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

  it('renders the Laravel Blade-style member dashboard when signed in', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getProfile.mockResolvedValueOnce({
      first_name: 'E2E',
      hours_given: 4.5,
      hours_received: 2,
      listings_count: 3,
      onboarding_completed: true
    });
    api.getBalance.mockResolvedValueOnce({ balance: 12.5 });
    api.getFeedPosts.mockResolvedValueOnce({
      items: [
        {
          id: 10,
          type: 'post',
          title: 'Community update',
          content: 'A short update for members of the community.',
          author: { name: 'Aisha Khan' }
        }
      ]
    });
    api.getListings.mockResolvedValueOnce({
      items: [
        {
          id: 22,
          type: 'offer',
          title: 'Gardening help',
          description: 'Offering help with a community garden.'
        }
      ]
    });
    api.getMyEvents.mockResolvedValueOnce({
      items: [
        {
          id: 7,
          title: 'Community lunch',
          start_time: '2026-08-01T12:00:00Z',
          location: 'Town hall'
        }
      ]
    });
    api.getGamificationProfile.mockResolvedValueOnce({
      profile: {
        level: 2,
        level_name: 'Helper',
        xp: 340,
        level_progress: { progress_percentage: 45 },
        badges_count: 1
      }
    });
    api.getAllBadges.mockResolvedValueOnce({
      badges: [
        { icon: '*', name: 'First exchange' }
      ]
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/dashboard')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getProfile).toHaveBeenCalledWith('test-token');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Project NEXUS Accessible');
    expect(response.text).toContain('Dashboard');
    expect(response.text).toContain('Welcome back, E2E.');
    expect(response.text).toContain('Create a listing');
    expect(response.text).toContain('Your time bank');
    expect(response.text).toContain('class="nexus-alpha-stat-grid"');
    expect(response.text).toContain('Time-credit balance');
    expect(response.text).toContain('12.5 hours');
    expect(response.text).toContain('Hours given');
    expect(response.text).toContain('Hours received');
    expect(response.text).toContain('Active listings');
    expect(response.text).toContain('Your progress');
    expect(response.text).toContain('Level 2');
    expect(response.text).toContain('45% of the way to the next level');
    expect(response.text).toContain('Badges (1)');
    expect(response.text).toContain('First exchange');
    expect(response.text).toContain('Upcoming events');
    expect(response.text).toContain('Community lunch');
    expect(response.text).toContain('Quick links');
    expect(response.text).toContain('View your profile');
    expect(response.text).toContain('Edit your profile');
    expect(response.text).toContain('View all feed items');
    expect(response.text).toContain('Recent feed');
    expect(response.text).toContain('Community update');
    expect(response.text).toContain('Recent listings');
    expect(response.text).toContain('Gardening help');
    expect(response.text).not.toContain('Wallet balance');
    expect(response.text).not.toContain('Your recent listings');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Laravel Blade-style feed page when feed items cannot be loaded', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getFeedPosts.mockClear();
    api.getFeedPosts.mockRejectedValueOnce(new api.ApiOfflineError());
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/feed?type=listings&mode=recent&subtype=offer&per_page=5')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getFeedPosts).toHaveBeenCalledWith('test-token', {
      limit: 5,
      type: 'listings',
      mode: 'recent',
      subtype: 'offer',
      cursor: null
    });
    expect(response.status).toBe(200);
    expect(response.text).toContain('Project NEXUS Accessible');
    expect(response.text).toContain('Feed');
    expect(response.text).toContain('Community updates, conversations and activity.');
    expect(response.text).toContain('Write a post');
    expect(response.text).toContain('Share a short update with your community.');
    expect(response.text).toContain('Filter the feed');
    expect(response.text).toContain('Feed type');
    expect(response.text).toContain('value="listings" selected');
    expect(response.text).toContain('Feed order');
    expect(response.text).toContain('value="recent" selected');
    expect(response.text).toContain('Listing subtype');
    expect(response.text).toContain('value="offer" selected');
    expect(response.text).toContain('Feed items could not be loaded. Try again.');
    expect(response.text).not.toContain('Sorry, the service is unavailable');
    expect(response.text).not.toContain('Create a post');
    expect(response.text).not.toContain('Filter by group');
  });

  it('renders the Laravel-backed event detail page from the v2 event envelope', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getEvent.mockClear();
    api.getEventRsvps.mockClear();
    api.getEvent.mockResolvedValueOnce({
      data: {
        id: 6,
        user_id: 110,
        group_id: 479,
        title: 'Community Meetup 3',
        description: 'Third monthly gathering',
        location: 'Skibbereen Town Hall',
        start_time: '2026-08-01T14:00:00.000000Z',
        start_date: '2026-08-01T14:00:00+00:00',
        end_time: '2026-08-01T16:00:00.000000Z',
        max_attendees: null,
        status: 'active',
        user_rsvp: null,
        rsvp_counts: { going: 1, interested: 0, not_going: 0 }
      }
    });
    api.getEventRsvps.mockResolvedValueOnce({
      data: [
        { id: 26554, first_name: 'E2E', last_name: 'UserA', status: 'going' }
      ]
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/events/6')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getEvent).toHaveBeenCalledWith('test-token', '6');
    expect(api.getEventRsvps).toHaveBeenCalledWith('test-token', '6', 'all');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Project NEXUS Accessible');
    expect(response.text).toContain('Community Meetup 3');
    expect(response.text).toContain('Third monthly gathering');
    expect(response.text).toContain('Skibbereen Town Hall');
    expect(response.text).toContain('Upcoming');
    expect(response.text).not.toContain('Page not found');
  });

  it('renders the Laravel Blade-style listings page even when profile lookup is unavailable', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getListings.mockClear();
    api.getProfile.mockClear();
    api.getListings.mockResolvedValueOnce({
      data: [
        {
          id: 90992,
          type: 'offer',
          title: 'E2E Fixture Listing - Gardening Help',
          description: 'Deterministic E2E fixture listing owned by E2E User A.',
          author_name: 'E2E User A',
          category_name: 'Gardening',
          hours_estimate: 2,
          location: 'Skibbereen'
        }
      ],
      meta: { total_items: 1, has_more: false }
    });
    api.getProfile.mockRejectedValueOnce(new api.ApiError('Not found', 404));
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/listings?q=garden&type=offer&sort=newest')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getListings).toHaveBeenCalledWith('test-token', {
      search: 'garden',
      type: 'offer',
      category_id: '',
      hours: 'any',
      service: 'any',
      posted: 'any',
      sort: 'newest',
      near: 'any',
      cursor: '',
      per_page: 20
    });
    expect(response.status).toBe(200);
    expect(response.text).toContain('Listings');
    expect(response.text).toContain('Find offers and requests from your community.');
    expect(response.text).toContain('Filter listings');
    expect(response.text).toContain('Results');
    expect(response.text).toContain('1 listing shown');
    expect(response.text).toContain('E2E Fixture Listing - Gardening Help');
    expect(response.text).toContain('Skibbereen');
    expect(response.text).not.toContain('Page not found');
  });

  it('renders the Laravel Blade-style listing detail page from the v2 detail envelope', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getListing.mockClear();
    api.getListingReviews.mockClear();
    api.getProfile.mockClear();
    api.getListing.mockResolvedValueOnce({
      data: {
        id: 90992,
        user_id: 26554,
        type: 'offer',
        status: 'active',
        title: 'E2E Fixture Listing - Gardening Help',
        description: 'Deterministic E2E fixture listing owned by E2E User A.',
        author_name: 'E2E User A',
        author_tagline: 'Community helper',
        category_name: 'Gardening',
        hours_estimate: 2,
        location: 'Skibbereen',
        created_at: '2026-07-06T18:36:08.000000Z',
        comments_count: 3,
        likes_count: 4
      }
    });
    api.getListingReviews.mockRejectedValueOnce(new api.ApiError('Not found', 404));
    api.getProfile.mockRejectedValueOnce(new api.ApiError('Not found', 404));
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/listings/90992')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getListing).toHaveBeenCalledWith('test-token', '90992');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Back to listings');
    expect(response.text).toContain('Listing details');
    expect(response.text).toContain('E2E Fixture Listing - Gardening Help');
    expect(response.text).toContain('Deterministic E2E fixture listing owned by E2E User A.');
    expect(response.text).toContain('E2E User A');
    expect(response.text).toContain('Gardening');
    expect(response.text).toContain('Skibbereen');
    expect(response.text).toContain('Share link');
    expect(response.text).not.toContain('Page not found');
  });

  it('renders the Laravel Blade-style members directory when signed in', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getMembers.mockClear();
    api.getMembers.mockResolvedValueOnce({
      data: [
        {
          id: 26554,
          name: 'E2E User A',
          avatar: '',
          tagline: 'Community helper',
          location: 'Skibbereen',
          total_hours_given: 4,
          total_hours_received: 2,
          rating: 4.8,
          identity_verified: true,
          connection_state: 'none'
        }
      ],
      meta: { total_items: 1, offset: 0, per_page: 20, has_more: false }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/members?q=e2e&sort=joined&order=DESC')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getMembers).toHaveBeenCalledWith('test-token', {
      q: 'e2e',
      sort: 'joined',
      order: 'DESC',
      limit: 20,
      offset: 0
    });
    expect(response.status).toBe(200);
    expect(response.text).toContain('Project NEXUS Accessible');
    expect(response.text).toContain('Community members');
    expect(response.text).toContain('Find and connect with members of your community.');
    expect(response.text).toContain('Filter members');
    expect(response.text).toContain('Results');
    expect(response.text).toContain('1 member found');
    expect(response.text).toContain('E2E User A');
    expect(response.text).toContain('Community helper');
    expect(response.text).toContain('Skibbereen');
    expect(response.text).toContain('View profile');
    expect(response.text).not.toContain('Page not found');
  });

  it('keeps the members directory usable when member data cannot be loaded', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getMembers.mockClear();
    api.getMembers.mockRejectedValueOnce(new api.ApiError('Not found', 404));
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/members')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(response.status).toBe(200);
    expect(response.text).toContain('Community members');
    expect(response.text).toContain('Members could not be loaded. Try again.');
    expect(response.text).not.toContain('Page not found');
  });

  it('renders the member profile from the Laravel v2 profile envelope', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getUser.mockClear();
    api.getConnections.mockClear();
    api.getConnectionStatus.mockClear();
    api.getGamificationProfileByUserId.mockClear();
    api.getUserReviews.mockClear();
    api.getProfile.mockClear();
    api.getUser.mockResolvedValueOnce({
      data: {
        id: 2,
        name: 'Aisha Khan',
        first_name: 'Aisha',
        last_name: 'Khan',
        email: 'aisha@example.test',
        created_at: '2026-07-01T10:00:00Z'
      }
    });
    api.getConnections.mockResolvedValueOnce({ data: [] });
    api.getConnectionStatus.mockResolvedValueOnce({ data: { status: 'none', connection_id: null } });
    api.getGamificationProfileByUserId.mockResolvedValueOnce({ profile: { level: 3, totalXp: 420 } });
    api.getUserReviews.mockResolvedValueOnce({ data: [], summary: null });
    api.getProfile.mockResolvedValueOnce({ id: 26554 });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/members/2')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getUser).toHaveBeenCalledWith('test-token', '2');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Aisha Khan');
    expect(response.text).toContain('aisha@example.test');
    expect(response.text).toContain('Level 3');
    expect(response.text).toContain('Send connection request');
    expect(response.text).not.toContain('Sorry, there is a problem with the service');
  });

  it('renders pending sent connection status from the Laravel status endpoint', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getUser.mockClear();
    api.getConnections.mockClear();
    api.getConnectionStatus.mockClear();
    api.getGamificationProfileByUserId.mockClear();
    api.getUserReviews.mockClear();
    api.getProfile.mockClear();
    api.getUser.mockResolvedValueOnce({
      data: {
        id: 2,
        name: 'Aisha Khan',
        first_name: 'Aisha',
        last_name: 'Khan',
        email: 'aisha@example.test'
      }
    });
    api.getConnections.mockResolvedValueOnce({ data: [] });
    api.getConnectionStatus.mockResolvedValueOnce({
      data: { status: 'pending_sent', connection_id: 73, direction: 'sent' }
    });
    api.getGamificationProfileByUserId.mockResolvedValueOnce({ profile: null });
    api.getUserReviews.mockResolvedValueOnce({ data: [], summary: null });
    api.getProfile.mockResolvedValueOnce({ id: 26554 });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/members/2')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getConnectionStatus).toHaveBeenCalledWith('test-token', '2');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Request sent');
    expect(response.text).toContain('Cancel request');
    expect(response.text).not.toContain('Send connection request');
  });

  it('posts member connection requests through the Laravel-backed helper', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getUser.mockClear();
    api.getConnections.mockClear();
    api.getConnectionStatus.mockClear();
    api.getGamificationProfileByUserId.mockClear();
    api.getUserReviews.mockClear();
    api.getProfile.mockClear();
    api.sendConnectionRequest.mockClear();
    api.getUser.mockResolvedValueOnce({
      data: {
        id: 2,
        name: 'Aisha Khan',
        first_name: 'Aisha',
        last_name: 'Khan',
        email: 'aisha@example.test'
      }
    });
    api.getConnections.mockResolvedValueOnce({ data: [] });
    api.getConnectionStatus.mockResolvedValueOnce({ data: { status: 'none', connection_id: null } });
    api.getGamificationProfileByUserId.mockResolvedValueOnce({ profile: null });
    api.getUserReviews.mockResolvedValueOnce({ data: [], summary: null });
    api.getProfile.mockResolvedValueOnce({ id: 26554 });
    api.sendConnectionRequest.mockResolvedValueOnce({
      data: { id: 77, status: 'pending' },
      message: 'Connection request sent'
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const profile = await agent
      .get('/members/2')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);
    const csrfMatch = profile.text.match(/name="_csrf" value="([^"]+)"/);

    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/members/2/connect')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(api.sendConnectionRequest).toHaveBeenCalledWith('test-token', '2');
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/members/2');
  });

  it('posts member reviews through the Laravel-backed helper', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getUser.mockClear();
    api.getConnections.mockClear();
    api.getConnectionStatus.mockClear();
    api.getGamificationProfileByUserId.mockClear();
    api.getUserReviews.mockClear();
    api.getProfile.mockClear();
    api.createUserReview.mockClear();
    api.getUser.mockResolvedValueOnce({
      data: {
        id: 267,
        name: 'Austin',
        first_name: 'Austin',
        email: 'austin@example.test'
      }
    });
    api.getConnections.mockResolvedValueOnce({ data: [] });
    api.getConnectionStatus.mockResolvedValueOnce({
      data: { status: 'pending_sent', connection_id: 73, direction: 'sent' }
    });
    api.getGamificationProfileByUserId.mockResolvedValueOnce({ profile: null });
    api.getUserReviews.mockResolvedValueOnce({ data: [], summary: null });
    api.getProfile.mockResolvedValueOnce({ id: 26554 });
    api.createUserReview.mockResolvedValueOnce({
      data: { id: 91, receiver_id: 267, rating: 4 }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const profile = await agent
      .get('/members/267')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);
    const csrfMatch = profile.text.match(/name="_csrf" value="([^"]+)"/);

    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/reviews/user/267')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        rating: '4',
        comment: 'Helpful exchange',
        return_url: '/members/267'
      });

    expect(api.createUserReview).toHaveBeenCalledWith('test-token', '267', {
      rating: 4,
      comment: 'Helpful exchange'
    });
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/members/267');
  });

  it('renders the Laravel Blade-style exchanges list when signed in', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getExchangeConfig.mockClear();
    api.getExchanges.mockClear();
    api.getExchangeConfig.mockResolvedValueOnce({
      data: { exchange_workflow_enabled: true, direct_messaging_enabled: true }
    });
    api.getExchanges.mockResolvedValueOnce({
      data: [
        {
          id: 42,
          listing_id: 90992,
          status: 'pending_provider',
          proposed_hours: 2,
          created_at: '2026-07-08T10:00:00Z',
          listing: { id: 90992, title: 'E2E Fixture Listing - Gardening Help' },
          requester: { id: 26554, name: 'E2E User A' },
          provider: { id: 267, name: 'Austin' }
        }
      ],
      meta: { has_more: false }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/exchanges?tab=active')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getExchangeConfig).toHaveBeenCalledWith('test-token');
    expect(api.getExchanges).toHaveBeenCalledWith('test-token', {
      status: 'active',
      per_page: 20,
      cursor: ''
    });
    expect(response.status).toBe(200);
    expect(response.text).toContain('Exchanges');
    expect(response.text).toContain('Review exchange requests and track time-credit work.');
    expect(response.text).toContain('All');
    expect(response.text).toContain('Active');
    expect(response.text).toContain('Needs confirmation');
    expect(response.text).toContain('Completed');
    expect(response.text).toContain('E2E Fixture Listing - Gardening Help');
    expect(response.text).toContain('Pending provider');
    expect(response.text).toContain('View exchange');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
    expect(response.text).not.toContain('contract parity before use');
  });

  it('renders the Laravel Blade-style exchange request form for a listing', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getListing.mockClear();
    api.getPublicListing.mockClear();
    api.checkExchangeForListing.mockClear();
    api.getListing.mockResolvedValueOnce({
      data: {
        id: 90992,
        type: 'offer',
        title: 'E2E Fixture Listing - Gardening Help',
        category_name: 'Gardening',
        location: 'Skibbereen',
        hours_estimate: 2,
        author_name: 'E2E User A'
      }
    });
    api.checkExchangeForListing.mockResolvedValueOnce({ data: null });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/exchanges/request/90992')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getListing).toHaveBeenCalledWith('test-token', '90992');
    expect(api.checkExchangeForListing).toHaveBeenCalledWith('test-token', '90992');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Back to listings');
    expect(response.text).toContain('Request exchange');
    expect(response.text).toContain('E2E Fixture Listing - Gardening Help');
    expect(response.text).toContain('Proposed hours');
    expect(response.text).toContain('Preparation time');
    expect(response.text).toContain('Message');
    expect(response.text).toContain('action="/exchanges/request/90992"');
    expect(response.text).not.toContain('Page not found');
  });

  it('renders the Laravel Blade-style exchange detail page from the v2 envelope', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getExchange.mockClear();
    api.getExchangeRatings.mockClear();
    api.getProfile.mockClear();
    api.getExchange.mockResolvedValueOnce({
      data: {
        id: 42,
        listing_id: 90992,
        requester_id: 26554,
        provider_id: 267,
        status: 'pending_provider',
        proposed_hours: 2,
        risk_level: 'low',
        created_at: '2026-07-08T10:00:00Z',
        message: 'I can help with this.',
        listing: { id: 90992, title: 'E2E Fixture Listing - Gardening Help' },
        requester: { id: 26554, name: 'E2E User A' },
        provider: { id: 267, name: 'Austin' },
        status_history: [
          {
            new_status: 'pending_provider',
            actor_name: 'E2E User A',
            notes: 'Request created',
            created_at: '2026-07-08T10:00:00Z'
          }
        ]
      }
    });
    api.getExchangeRatings.mockResolvedValueOnce({ data: { ratings: [], has_rated: false } });
    api.getProfile.mockResolvedValueOnce({ id: 267 });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/exchanges/42')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getExchange).toHaveBeenCalledWith('test-token', '42');
    expect(api.getExchangeRatings).toHaveBeenCalledWith('test-token', '42');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Exchange details');
    expect(response.text).toContain('E2E Fixture Listing - Gardening Help');
    expect(response.text).toContain('You are the provider for this exchange.');
    expect(response.text).toContain('Pending provider');
    expect(response.text).toContain('Summary');
    expect(response.text).toContain('Accept');
    expect(response.text).toContain('Decline');
    expect(response.text).toContain('Timeline');
    expect(response.text).not.toContain('Page not found');
  });

  it('falls back to tenant-aware public listing detail when the authenticated lookup is unavailable', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getListing.mockClear();
    api.getPublicListing.mockClear();
    api.getListingReviews.mockClear();
    api.getProfile.mockClear();
    api.getListing.mockRejectedValueOnce(new api.ApiOfflineError());
    api.getPublicListing.mockResolvedValueOnce({
      data: {
        id: 90992,
        user_id: 26554,
        type: 'offer',
        status: 'active',
        title: 'E2E Fixture Listing - Gardening Help',
        description: 'Deterministic E2E fixture listing owned by E2E User A.',
        author_name: 'E2E User A',
        category_name: 'Gardening',
        hours_estimate: 2,
        location: 'Skibbereen'
      }
    });
    api.getListingReviews.mockRejectedValueOnce(new api.ApiError('Not found', 404));
    api.getProfile.mockRejectedValueOnce(new api.ApiError('Not found', 404));
    const signedToken = `s:${cookieSignature.sign('stale-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/listings/90992')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getListing).toHaveBeenCalledWith('stale-token', '90992');
    expect(api.getPublicListing).toHaveBeenCalledWith('90992', 'hour-timebank');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Listing details');
    expect(response.text).toContain('E2E Fixture Listing - Gardening Help');
    expect(response.text).not.toContain('Sorry, the service is unavailable');
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
    expect(matrix).toContain('| Organisations | `/organisations`, `/organisations/browse`, `/organisations/register`, `/organisations/manage`, `/organisations/{id}`, `/organisations/{id}/jobs`, `/organisations/opportunities/{id}/apply` | `/organisations`, `/organisations/browse`, `/organisations/register`, `/organisations/manage`, `/organisations/:id`, `/organisations/:id/jobs`, `/organisations/opportunities/:id/apply` | Partial Laravel-backed candidate: directory/search and browse render `/api/v2/volunteering/organisations`; register and manage GET render Blade-style forms/pages; manage calls `/api/v2/volunteering/my-organisations` when signed in; detail renders `/api/v2/volunteering/organisations/{id}?include=public_contract`, `/api/v2/volunteering/opportunities?organization_id={id}`, and `/api/v2/volunteering/reviews/organization/{id}`; jobs reads `/api/v2/jobs?organization_id={id}&status=open` when signed in; apply GET reads `/api/v2/volunteering/opportunities/{id}`; auth/tenant gates not certified. |');
    expect(matrix).toContain('It does not certify route parity');
    expect(contract).toContain('Its default backend contract is now Laravel-first');
    expect(contract).toContain('| `ACCESSIBLE_BACKEND_TARGET` | `laravel` | Laravel is the default backend contract target. |');
    expect(contract).toContain('ASP.NET must become');
  });
});
