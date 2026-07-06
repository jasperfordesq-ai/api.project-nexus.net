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
  createFeedPostV2: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  updateFeedPostV2: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  deleteFeedPostV2: jest.fn().mockResolvedValue({ data: { deleted: true } }),
  hideFeedItem: jest.fn().mockResolvedValue({ data: { hidden: true } }),
  markFeedItemNotInterested: jest.fn().mockResolvedValue({ data: { success: true } }),
  muteFeedUser: jest.fn().mockResolvedValue({ data: { muted: true } }),
  reportFeedItem: jest.fn().mockResolvedValue({ data: { reported: true } }),
  shareFeedItem: jest.fn().mockResolvedValue({ data: { shared: true } }),
  saveSavedItem: jest.fn().mockResolvedValue({ data: { id: 72 } }),
  checkSavedItem: jest.fn().mockResolvedValue({ data: { saved: false } }),
  voteFeedPoll: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  getBlogPosts: jest.fn().mockResolvedValue({ data: [] }),
  getBlogPost: jest.fn().mockResolvedValue({ data: { id: 42, slug: 'community-news', title: 'Community news' } }),
  getGoals: jest.fn(),
  getGoal: jest.fn(),
  callGoalApi: jest.fn().mockResolvedValue({ data: { id: 42, action: 'liked' } }),
  getJobs: jest.fn(),
  getJob: jest.fn(),
  applyForJob: jest.fn(),
  getPolls: jest.fn().mockResolvedValue({ data: [] }),
  getPoll: jest.fn().mockResolvedValue({ data: { id: 42, question: 'Which project?' } }),
  createPoll: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  deletePoll: jest.fn().mockResolvedValue({}),
  votePoll: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  rankPoll: jest.fn().mockResolvedValue({ data: { ranked_results: [] } }),
  getBalance: jest.fn(),
  donateCredits: jest.fn().mockResolvedValue({ data: { message: 'sent' } }),
  unsaveSavedItem: jest.fn().mockResolvedValue({}),
  sendAppreciation: jest.fn().mockResolvedValue({ data: { id: 55 } }),
  reactToAppreciation: jest.fn().mockResolvedValue({ data: { reaction_type: 'heart' } }),
  getResources: jest.fn().mockResolvedValue({ data: [{ id: 10, sort_order: 0 }, { id: 20, sort_order: 1 }] }),
  deleteResource: jest.fn().mockResolvedValue({ data: { deleted: true } }),
  reorderResources: jest.fn().mockResolvedValue({ data: { message: 'reordered' } }),
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
  updateComment: jest.fn().mockResolvedValue({ data: { id: 12, content: 'Updated' } }),
  deleteComment: jest.fn().mockResolvedValue({ data: { deleted: true } }),
  toggleReaction: jest.fn().mockResolvedValue({ data: { action: 'added' } }),
  toggleFeedLike: jest.fn().mockResolvedValue({ data: { action: 'liked' } }),
  saveSavedSearch: jest.fn().mockResolvedValue({ data: { id: 12 } }),
  deleteSavedSearch: jest.fn().mockResolvedValue({ deleted: true }),
  runSavedSearch: jest.fn().mockResolvedValue({ data: { query_params: { q: 'gardening' } } }),
  claimDailyReward: jest.fn().mockResolvedValue({ data: { claimed: true } }),
  claimGamificationChallenge: jest.fn().mockResolvedValue({ data: { claimed: true } }),
  purchaseGamificationShopItem: jest.fn().mockResolvedValue({ data: { success: true } }),
  updateGamificationShowcase: jest.fn().mockResolvedValue({ data: { message: 'updated' } }),
  getMemberConnectionStatus: jest.fn().mockResolvedValue({ data: { status: 'none' } }),
  sendMemberConnectionRequest: jest.fn().mockResolvedValue({ data: { id: 22 } }),
  acceptMemberConnection: jest.fn().mockResolvedValue({ data: { status: 'connected' } }),
  declineMemberConnection: jest.fn().mockResolvedValue({}),
  removeMemberConnection: jest.fn().mockResolvedValue({}),
  blockMember: jest.fn().mockResolvedValue({ data: { success: true } }),
  unblockMember: jest.fn().mockResolvedValue({ data: { success: true } }),
  endorseMemberSkill: jest.fn().mockResolvedValue({ data: { endorsement_id: 33 } }),
  removeMemberEndorsement: jest.fn().mockResolvedValue({ data: { message: 'removed' } }),
  transferWalletCredits: jest.fn().mockResolvedValue({ data: { transaction_id: 99 } }),
  getUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 0 }),
  getNotifications: jest.fn().mockResolvedValue({ data: [], unreadCount: 0, pagination: { page: 1, totalPages: 1 } }),
  getNotificationUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 0 }),
  markNotificationRead: jest.fn().mockResolvedValue({}),
  markAllNotificationsRead: jest.fn().mockResolvedValue({ data: { marked_read: 2 } }),
  markNotificationGroupRead: jest.fn().mockResolvedValue({ data: { marked_read: 2 } }),
  deleteAllNotifications: jest.fn().mockResolvedValue({ data: { deleted: 2 } }),
  deleteNotification: jest.fn().mockResolvedValue({}),
  getTransactions: jest.fn(),
  callMessageApi: jest.fn().mockResolvedValue({ data: { id: 12, action: 'added' } }),
  callConversationApi: jest.fn().mockResolvedValue({ data: { id: 33 } }),
  callPodcastApi: jest.fn().mockResolvedValue({ data: { id: 42, subscribed: true, moderation_status: 'approved' } }),
  callFederationApi: jest.fn().mockResolvedValue({ data: { id: 42, success: true } }),
  getVolunteerOrganisations: jest.fn().mockResolvedValue({ data: [] }),
  getVolunteeringOpportunities: jest.fn().mockResolvedValue({ data: [] }),
  getVolunteerOrganisation: jest.fn(),
  getMyVolunteerOrganisations: jest.fn(),
  createVolunteerOrganisation: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  callVolunteeringApi: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  callMarketplaceApi: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  callIdeationApi: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  callGroupExchangeApi: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  callEventApi: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  callUserSettingsApi: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  callProfileApi: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  callWebAuthnApi: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  callListingApi: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  createExchangeRequest: jest.fn().mockResolvedValue({ data: { id: 88 } }),
  callUgcTranslateApi: jest.fn().mockResolvedValue({ data: { translated_text: 'Dia duit' } }),
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
    api.getResources.mockReset().mockResolvedValue({ data: [{ id: 10, sort_order: 0 }, { id: 20, sort_order: 1 }] });
    api.deleteResource.mockReset().mockResolvedValue({ data: { deleted: true } });
    api.reorderResources.mockReset().mockResolvedValue({ data: { message: 'reordered' } });
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
    api.updateComment.mockReset().mockResolvedValue({ data: { id: 12, content: 'Updated' } });
    api.deleteComment.mockReset().mockResolvedValue({ data: { deleted: true } });
    api.toggleReaction.mockReset().mockResolvedValue({ data: { action: 'added' } });
    api.getBlogPosts.mockReset().mockResolvedValue({ data: [] });
    api.getBlogPost.mockReset().mockResolvedValue({ data: { id: 42, slug: 'community-news', title: 'Community news' } });
    api.getPolls.mockReset().mockResolvedValue({ data: [] });
    api.getPoll.mockReset().mockResolvedValue({ data: { id: 42, question: 'Which project?' } });
    api.createPoll.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.deletePoll.mockReset().mockResolvedValue({});
    api.votePoll.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.rankPoll.mockReset().mockResolvedValue({ data: { ranked_results: [] } });
    api.toggleFeedLike.mockReset().mockResolvedValue({ data: { action: 'liked' } });
    api.saveSavedSearch.mockReset().mockResolvedValue({ data: { id: 12 } });
    api.deleteSavedSearch.mockReset().mockResolvedValue({ deleted: true });
    api.runSavedSearch.mockReset().mockResolvedValue({ data: { query_params: { q: 'gardening' } } });
    api.claimDailyReward.mockReset().mockResolvedValue({ data: { claimed: true } });
    api.claimGamificationChallenge.mockReset().mockResolvedValue({ data: { claimed: true } });
    api.purchaseGamificationShopItem.mockReset().mockResolvedValue({ data: { success: true } });
    api.updateGamificationShowcase.mockReset().mockResolvedValue({ data: { message: 'updated' } });
    api.getMemberConnectionStatus.mockReset().mockResolvedValue({ data: { status: 'none' } });
    api.sendMemberConnectionRequest.mockReset().mockResolvedValue({ data: { id: 22 } });
    api.acceptMemberConnection.mockReset().mockResolvedValue({ data: { status: 'connected' } });
    api.declineMemberConnection.mockReset().mockResolvedValue({});
    api.removeMemberConnection.mockReset().mockResolvedValue({});
    api.blockMember.mockReset().mockResolvedValue({ data: { success: true } });
    api.unblockMember.mockReset().mockResolvedValue({ data: { success: true } });
    api.endorseMemberSkill.mockReset().mockResolvedValue({ data: { endorsement_id: 33 } });
    api.removeMemberEndorsement.mockReset().mockResolvedValue({ data: { message: 'removed' } });
    api.transferWalletCredits.mockReset().mockResolvedValue({ data: { transaction_id: 99 } });
    api.forgotPassword.mockReset().mockResolvedValue({});
    api.resetPassword.mockReset().mockResolvedValue({});
    api.resendVerification.mockReset().mockResolvedValue({});
    api.createVolunteerOrganisation.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.callVolunteeringApi.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.callMarketplaceApi.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.callIdeationApi.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.callGroupExchangeApi.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.callEventApi.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.callUserSettingsApi.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.callProfileApi.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.callWebAuthnApi.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.callListingApi.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.createExchangeRequest.mockReset().mockResolvedValue({ data: { id: 88 } });
    api.callUgcTranslateApi.mockReset().mockResolvedValue({ data: { translated_text: 'Dia duit' } });
    api.getNotifications.mockReset().mockResolvedValue({ data: [], unreadCount: 0, pagination: { page: 1, totalPages: 1 } });
    api.markNotificationRead.mockReset().mockResolvedValue({});
    api.markAllNotificationsRead.mockReset().mockResolvedValue({ data: { marked_read: 2 } });
    api.markNotificationGroupRead.mockReset().mockResolvedValue({ data: { marked_read: 2 } });
    api.deleteAllNotifications.mockReset().mockResolvedValue({ data: { deleted: 2 } });
    api.deleteNotification.mockReset().mockResolvedValue({});
    api.callMessageApi.mockReset().mockResolvedValue({ data: { id: 12, action: 'added' } });
    api.callConversationApi.mockReset().mockResolvedValue({ data: { id: 33 } });
    api.callPodcastApi.mockReset().mockResolvedValue({ data: { id: 42, subscribed: true, moderation_status: 'approved' } });
    api.callFederationApi.mockReset().mockResolvedValue({ data: { id: 42, success: true } });
    api.verify2fa.mockReset();
    api.createFeedPostV2.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.updateFeedPostV2.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.deleteFeedPostV2.mockReset().mockResolvedValue({ data: { deleted: true } });
    api.hideFeedItem.mockReset().mockResolvedValue({ data: { hidden: true } });
    api.markFeedItemNotInterested.mockReset().mockResolvedValue({ data: { success: true } });
    api.muteFeedUser.mockReset().mockResolvedValue({ data: { muted: true } });
    api.reportFeedItem.mockReset().mockResolvedValue({ data: { reported: true } });
    api.shareFeedItem.mockReset().mockResolvedValue({ data: { shared: true } });
    api.saveSavedItem.mockReset().mockResolvedValue({ data: { id: 72 } });
    api.checkSavedItem.mockReset().mockResolvedValue({ data: { saved: false } });
    api.voteFeedPoll.mockReset().mockResolvedValue({ data: { id: 42 } });
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

  it('submits the Laravel achievement daily reward route through the gamification API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/achievements/daily-reward')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/achievements?status=daily-reward-claimed');
    expect(api.claimDailyReward).toHaveBeenCalledWith('test-token');
  });

  it('maps Laravel achievement daily reward conflicts to the failed status', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    api.claimDailyReward.mockRejectedValueOnce(new api.ApiError('already claimed', 409));

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/achievements/daily-reward')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/achievements?status=daily-reward-failed');
  });

  it('submits the Laravel challenge claim route through the gamification API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/achievements/challenges/7/claim')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/achievements?status=challenge-claimed');
    expect(api.claimGamificationChallenge).toHaveBeenCalledWith('test-token', 7);
  });

  it('submits the Laravel achievement shop purchase route through the gamification API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/achievements/shop/purchase')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        item_id: '42'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/achievements/shop?status=purchased');
    expect(api.purchaseGamificationShopItem).toHaveBeenCalledWith('test-token', 42);
  });

  it('redirects invalid Laravel achievement shop purchases with the failed status', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/achievements/shop/purchase')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        item_id: 'nope'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/achievements/shop?status=purchase-failed');
    expect(api.purchaseGamificationShopItem).not.toHaveBeenCalled();
  });

  it('submits the Laravel achievement showcase route through the gamification API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/achievements/showcase')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        'badge_keys[]': ['helper', 'mentor']
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/achievements/showcase?status=showcase-updated');
    expect(api.updateGamificationShowcase).toHaveBeenCalledWith('test-token', ['helper', 'mentor']);
  });

  it('redirects oversized Laravel achievement showcase submissions without calling the API', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/achievements/showcase')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        'badge_keys[]': ['one', 'two', 'three', 'four', 'five', 'six']
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/achievements/showcase?status=showcase-too-many');
    expect(api.updateGamificationShowcase).not.toHaveBeenCalled();
  });

  it('redirects signed-out Laravel achievement submissions to the auth-required status', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);
    const first = await agent.get('/contact');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/achievements/daily-reward')
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
    expect(api.claimDailyReward).not.toHaveBeenCalled();
  });

  it('submits the Laravel member connection request route through the connections API helpers', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/members/77/connection')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        action: 'connect'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/members/77?status=connection-sent');
    expect(api.getMemberConnectionStatus).toHaveBeenCalledWith('test-token', 77);
    expect(api.sendMemberConnectionRequest).toHaveBeenCalledWith('test-token', 77);
  });

  it('submits the Laravel member connection accept route through the connections API helpers', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    api.getMemberConnectionStatus.mockResolvedValueOnce({
      data: { status: 'pending_received', connection_id: 44 }
    });

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/members/77/connection')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        action: 'accept'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/members/77?status=connection-accepted');
    expect(api.acceptMemberConnection).toHaveBeenCalledWith('test-token', 44);
  });

  it('submits the Laravel member endorsement route through the endorsement API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/members/77/endorse')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        action: 'endorse',
        skill_name: ' Gardening '
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/members/77?status=endorsement-added');
    expect(api.endorseMemberSkill).toHaveBeenCalledWith('test-token', 77, {
      skill_name: 'Gardening'
    });
  });

  it('submits the Laravel member block route through the block API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/members/77/block')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        reason: ' Spam '
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/members/77?status=member-blocked');
    expect(api.blockMember).toHaveBeenCalledWith('test-token', 77, 'Spam');
  });

  it('submits the Laravel member unblock route through the block API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/members/77/unblock')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        from: 'list'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/profile/blocked?status=member-unblocked');
    expect(api.unblockMember).toHaveBeenCalledWith('test-token', 77);
  });

  it('submits the Laravel member profile review route through the v2 reviews API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/members/77/review')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        rating: '5',
        comment: ' Great mentor '
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/members/77?status=review-submitted');
    expect(api.createReview).toHaveBeenCalledWith('test-token', {
      receiver_id: 77,
      rating: 5,
      comment: 'Great mentor'
    });
  });

  it('submits the Laravel member profile transfer route through the wallet API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/members/77/transfer')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        amount: '5',
        note: ' Thank you ',
        idempotency_key: 'member-transfer-1'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/members/77?status=transfer-sent');
    expect(api.transferWalletCredits).toHaveBeenCalledWith('test-token', {
      recipient: 77,
      amount: 5,
      description: 'Thank you',
      idempotency_key: 'member-transfer-1'
    });
  });

  it('redirects signed-out Laravel member action submissions to the auth-required status', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);
    const first = await agent.get('/contact');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/members/77/connection')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        action: 'connect'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
    expect(api.getMemberConnectionStatus).not.toHaveBeenCalled();
  });

  it('keeps the Laravel resource upload route as a safe failure until multipart proxying exists', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/resources/upload')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        title: 'Community handbook'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/resources/upload?status=resource-upload-failed');
    expect(api.deleteResource).not.toHaveBeenCalled();
  });

  it('submits the Laravel resource delete route through the resources API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/resources/42/delete')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/resources/library?status=resource-deleted');
    expect(api.deleteResource).toHaveBeenCalledWith('test-token', 42);
  });

  it('submits the Laravel resource reorder route through the reorder API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    api.getResources.mockResolvedValueOnce({
      data: [
        { id: 10, sort_order: 0 },
        { id: 20, sort_order: 1 }
      ]
    });

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/resources/reorder')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        resource_id: '20',
        direction: 'up',
        q: ' handbook ',
        category_id: '3',
        reorder: '1'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/resources/library?q=handbook&category_id=3&reorder=1');
    expect(api.getResources).toHaveBeenCalledWith('test-token', { per_page: 50 });
    expect(api.reorderResources).toHaveBeenCalledWith('test-token', {
      items: [
        { id: 20, sort_order: 0 },
        { id: 10, sort_order: 1 }
      ]
    });
  });

  it('submits the Laravel resource comment route through the comments API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/resources/42/comments/add')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        body: ' Useful guide ',
        parent_id: '7'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/resources/42/comments?status=reply-added#comments');
    expect(api.createComment).toHaveBeenCalledWith('test-token', {
      target_type: 'resource',
      target_id: 42,
      content: 'Useful guide',
      parent_id: 7
    });
  });

  it('submits the Laravel resource reaction route through the reactions API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/resources/42/react')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        emoji: 'celebrate'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/resources/42/comments?status=reaction-added#resource-reactions');
    expect(api.toggleReaction).toHaveBeenCalledWith('test-token', {
      target_type: 'resource',
      target_id: 42,
      reaction_type: 'celebrate'
    });
  });

  it('submits the Laravel resource comment delete route through the comments API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/resources/42/comments/12/delete')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/resources/42/comments?status=comment-deleted#comments');
    expect(api.deleteComment).toHaveBeenCalledWith('test-token', 12);
  });

  it('redirects signed-out Laravel resource action submissions to the auth-required status', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);
    const first = await agent.get('/contact');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/resources/42/comments/add')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        body: 'Useful guide'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
    expect(api.createComment).not.toHaveBeenCalled();
  });

  it('submits the Laravel blog comment route through the blog and comments API helpers', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/blog/community-news/comments')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        body: ' Great update '
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/blog/community-news?status=comment-added#comments');
    expect(api.getBlogPost).toHaveBeenCalledWith('test-token', 'community-news');
    expect(api.createComment).toHaveBeenCalledWith('test-token', {
      target_type: 'blog',
      target_id: 42,
      content: 'Great update',
      parent_id: null
    });
  });

  it('submits the Laravel blog comment-thread add route through the comments API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/blog/community-news/comments/add')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        body: ' I agree ',
        parent_id: '7'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/blog/community-news/comments?status=reply-added#comments');
    expect(api.createComment).toHaveBeenCalledWith('test-token', {
      target_type: 'blog',
      target_id: 42,
      content: 'I agree',
      parent_id: 7
    });
  });

  it('submits the Laravel blog like route through the reactions API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/blog/community-news/like')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/blog/community-news?status=liked#reactions');
    expect(api.toggleReaction).toHaveBeenCalledWith('test-token', {
      target_type: 'blog',
      target_id: 42,
      reaction_type: 'like'
    });
  });

  it('submits the Laravel blog post reaction route through the reactions API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/blog/community-news/react')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        emoji: 'love'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/blog/community-news/comments?status=reaction-added#post-reactions');
    expect(api.toggleReaction).toHaveBeenCalledWith('test-token', {
      target_type: 'blog',
      target_id: 42,
      reaction_type: 'love'
    });
  });

  it('submits the Laravel blog comment update route through the comments API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/blog/comments/12/update')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        slug: 'community-news',
        content: ' Updated comment '
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/blog/community-news/comments?status=comment-updated#comments');
    expect(api.updateComment).toHaveBeenCalledWith('test-token', 12, {
      content: 'Updated comment'
    });
  });

  it('submits the Laravel blog comment delete route through the comments API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/blog/comments/12/delete')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        slug: 'community-news'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/blog/community-news/comments?status=comment-deleted#comments');
    expect(api.deleteComment).toHaveBeenCalledWith('test-token', 12);
  });

  it('submits the Laravel blog comment reaction route through the reactions API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/blog/comments/12/react')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        slug: 'community-news',
        emoji: 'wow'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/blog/community-news/comments?status=reaction-added#comment-12');
    expect(api.toggleReaction).toHaveBeenCalledWith('test-token', {
      target_type: 'comment',
      target_id: 12,
      reaction_type: 'wow'
    });
  });

  it('redirects signed-out Laravel blog action submissions to the auth-required status', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);
    const first = await agent.get('/contact');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/blog/community-news/comments')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        body: 'Great update'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
    expect(api.getBlogPost).not.toHaveBeenCalled();
    expect(api.createComment).not.toHaveBeenCalled();
  });

  it('submits the Laravel feed post store route through the v2 feed API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/feed/posts')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        content: ' Community update '
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/feed?status=post-created');
    expect(api.createFeedPostV2).toHaveBeenCalledWith('test-token', {
      content: 'Community update',
      visibility: 'public'
    });
  });

  it('submits Laravel feed typed like and comment aliases through v2 social helpers', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const likeResponse = await agent
      .post('/feed/items/listing/77/like')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(likeResponse.status).toBe(302);
    expect(likeResponse.headers.location).toBe('/feed?status=like-added#feed-item-listing-77');
    expect(api.toggleFeedLike).toHaveBeenCalledWith('test-token', {
      target_type: 'listing',
      target_id: 77
    });

    const commentResponse = await agent
      .post('/feed/items/event/88/comments')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        content: ' See you there ',
        parent_id: '4'
      });

    expect(commentResponse.status).toBe(302);
    expect(commentResponse.headers.location).toBe('/feed?status=comment-created#feed-item-event-88');
    expect(api.createComment).toHaveBeenCalledWith('test-token', {
      target_type: 'event',
      target_id: 88,
      content: 'See you there',
      parent_id: 4
    });
  });

  it('submits Laravel feed post update, delete, hide, report, share, and save aliases', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const updateResponse = await agent
      .post('/feed/posts/42/update')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], content: ' Updated post ' });
    expect(updateResponse.headers.location).toBe('/feed?status=post-updated');
    expect(api.updateFeedPostV2).toHaveBeenCalledWith('test-token', 42, { content: 'Updated post' });

    const deleteResponse = await agent
      .post('/feed/posts/42/delete')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });
    expect(deleteResponse.headers.location).toBe('/feed?status=post-deleted');
    expect(api.deleteFeedPostV2).toHaveBeenCalledWith('test-token', 42);

    const hideResponse = await agent
      .post('/feed/posts/42/hide')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], type: 'poll' });
    expect(hideResponse.headers.location).toBe('/feed?status=content-hidden');
    expect(api.hideFeedItem).toHaveBeenCalledWith('test-token', 42, { type: 'poll' });

    const reportResponse = await agent
      .post('/feed/posts/42/report')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], type: 'post', reason: ' Spam ' });
    expect(reportResponse.headers.location).toBe('/feed?status=content-reported');
    expect(api.reportFeedItem).toHaveBeenCalledWith('test-token', 'post', 42, { reason: 'Spam' });

    const shareResponse = await agent
      .post('/feed/posts/42/share')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], comment: ' Worth reading ' });
    expect(shareResponse.headers.location).toBe('/feed?status=share-added#feed-item-post-42');
    expect(api.shareFeedItem).toHaveBeenCalledWith('test-token', {
      type: 'post',
      id: 42,
      comment: 'Worth reading'
    });

    const saveResponse = await agent
      .post('/feed/posts/42/save')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });
    expect(saveResponse.headers.location).toBe('/feed?status=save-added#feed-item-post-42');
    expect(api.checkSavedItem).toHaveBeenCalledWith('test-token', 'post', 42);
    expect(api.saveSavedItem).toHaveBeenCalledWith('test-token', {
      item_type: 'post',
      item_id: 42
    });
  });

  it('submits Laravel feed typed not-interested, reaction, poll vote, and mute aliases', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const notInterestedResponse = await agent
      .post('/feed/items/resource/42/not-interested')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });
    expect(notInterestedResponse.headers.location).toBe('/feed?status=not-interested#feed-item-resource-42');
    expect(api.markFeedItemNotInterested).toHaveBeenCalledWith('test-token', 42, { type: 'resource' });

    const reactionResponse = await agent
      .post('/feed/items/blog/42/react')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], emoji: 'celebrate' });
    expect(reactionResponse.headers.location).toBe('/feed?status=reaction-added#feed-item-blog-42');
    expect(api.toggleReaction).toHaveBeenCalledWith('test-token', {
      target_type: 'blog',
      target_id: 42,
      reaction_type: 'celebrate'
    });

    const pollResponse = await agent
      .post('/feed/polls/42/vote')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], option_id: '9' });
    expect(pollResponse.headers.location).toBe('/feed?status=poll-voted#feed-item-poll-42');
    expect(api.voteFeedPoll).toHaveBeenCalledWith('test-token', 42, { option_id: 9 });

    const muteResponse = await agent
      .post('/feed/users/77/mute')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });
    expect(muteResponse.headers.location).toBe('/feed?status=author-muted');
    expect(api.muteFeedUser).toHaveBeenCalledWith('test-token', 77);
  });

  it('submits Laravel feed comment update, delete, and reaction aliases', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const updateResponse = await agent
      .post('/feed/comments/12/update')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], content: ' Updated comment ' });
    expect(updateResponse.headers.location).toBe('/feed?status=comment-updated');
    expect(api.updateComment).toHaveBeenCalledWith('test-token', 12, { content: 'Updated comment' });

    const deleteResponse = await agent
      .post('/feed/comments/12/delete')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });
    expect(deleteResponse.headers.location).toBe('/feed?status=comment-deleted');
    expect(api.deleteComment).toHaveBeenCalledWith('test-token', 12);

    const reactResponse = await agent
      .post('/feed/comments/12/react')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], emoji: 'love' });
    expect(reactResponse.headers.location).toBe('/feed?status=reaction-added#feed-item-comment-12');
    expect(api.toggleReaction).toHaveBeenCalledWith('test-token', {
      target_type: 'comment',
      target_id: 12,
      reaction_type: 'love'
    });
  });

  it('redirects signed-out Laravel feed aliases using feed status redirects', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);
    const first = await agent.get('/contact');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const createResponse = await agent
      .post('/feed/posts')
      .type('form')
      .send({ _csrf: csrfMatch[1], content: 'Signed out post' });
    expect(createResponse.status).toBe(302);
    expect(createResponse.headers.location).toBe('/feed');

    const actionResponse = await agent
      .post('/feed/posts/42/share')
      .type('form')
      .send({ _csrf: csrfMatch[1] });
    expect(actionResponse.status).toBe(302);
    expect(actionResponse.headers.location).toBe('/feed?status=auth-required#feed-item-post-42');
    expect(api.createFeedPostV2).not.toHaveBeenCalled();
    expect(api.shareFeedItem).not.toHaveBeenCalled();
  });

  it('submits the Laravel poll store route through the v2 polls API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/polls')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        question: ' Which project next? ',
        description: ' Community choice ',
        options: ['Garden', 'Cafe'],
        poll_type: 'multiple',
        expires_at: '2026-08-01',
        is_anonymous: 'on'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/polls?status=poll-created');
    expect(api.createPoll).toHaveBeenCalledWith('test-token', {
      question: 'Which project next?',
      poll_type: 'multiple',
      options: ['Garden', 'Cafe'],
      description: 'Community choice',
      expires_at: '2026-08-01',
      is_anonymous: true
    });
  });

  it('submits the Laravel poll vote route through the v2 vote API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/polls/42/vote')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        option_id: '7'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/polls?status=voted#poll-42');
    expect(api.votePoll).toHaveBeenCalledWith('test-token', 42, { option_id: 7 });
  });

  it('submits the Laravel parity poll create route with ranked poll metadata', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/polls/parity/create')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        question: ' Rank the ideas ',
        description: ' Choose an order ',
        options: ['Library', 'Market'],
        poll_type: 'ranked',
        category: 'local',
        expires_at: '2026-08-15'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/polls/parity/create?status=poll-created');
    expect(api.createPoll).toHaveBeenCalledWith('test-token', {
      question: 'Rank the ideas',
      poll_type: 'ranked',
      options: ['Library', 'Market'],
      description: 'Choose an order',
      expires_at: '2026-08-15',
      category: 'local'
    });
  });

  it('submits the Laravel ranked poll route through the v2 rank API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/polls/42/rank')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        'rank[8]': '2',
        'rank[9]': '1'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/polls/42/rank?status=ranked');
    expect(api.rankPoll).toHaveBeenCalledWith('test-token', 42, {
      rankings: [
        { option_id: 9, rank: 1 },
        { option_id: 8, rank: 2 }
      ]
    });
  });

  it('submits the Laravel parity poll delete route through the v2 polls API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/polls/42/delete')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/polls/parity/manage?status=poll-deleted');
    expect(api.deletePoll).toHaveBeenCalledWith('test-token', 42);
  });

  it('submits the Laravel poll comment route through the comments API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/polls/42/comment')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        content: ' Helpful choice ',
        parent_id: '5'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/polls/42?status=poll-comment-created#poll-comments');
    expect(api.createComment).toHaveBeenCalledWith('test-token', {
      target_type: 'poll',
      target_id: 42,
      content: 'Helpful choice',
      parent_id: 5
    });
  });

  it('submits the Laravel poll like route through the v2 feed like API helper', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/polls/42/like')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/polls/42?status=poll-liked#poll-social');
    expect(api.toggleFeedLike).toHaveBeenCalledWith('test-token', {
      target_type: 'poll',
      target_id: 42
    });
  });

  it('redirects signed-out Laravel poll action submissions to the auth-required status', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);
    const first = await agent.get('/contact');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/polls/42/vote')
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        option_id: '7'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
    expect(api.votePoll).not.toHaveBeenCalled();
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

  it('submits Laravel ideation challenge action aliases', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const createResponse = await post('/ideation/new', {
      title: ' Better parks ',
      description: ' Gather ideas for local parks ',
      category_id: '3',
      status: 'open',
      tags: 'parks, youth'
    });
    expect(createResponse.headers.location).toBe('/ideation/42?status=challenge-created');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/ideation-challenges', {
      title: 'Better parks',
      description: 'Gather ideas for local parks',
      category_id: 3,
      status: 'open',
      tags: ['parks', 'youth']
    });

    const updateResponse = await post('/ideation/7/edit', {
      title: ' Updated parks ',
      description: ' Updated description ',
      status: 'draft'
    });
    expect(updateResponse.headers.location).toBe('/ideation/7/manage?status=challenge-saved');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/ideation-challenges/7', {
      title: 'Updated parks',
      description: 'Updated description',
      status: 'draft'
    });

    const statusResponse = await post('/ideation/7/status', { status: 'voting' });
    expect(statusResponse.headers.location).toBe('/ideation/7/manage?status=status-updated');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/ideation-challenges/7/status', {
      status: 'voting'
    });

    const favoriteResponse = await post('/ideation/7/favorite');
    expect(favoriteResponse.headers.location).toBe('/ideation/7?status=favorite-updated');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/ideation-challenges/7/favorite');

    const duplicateResponse = await post('/ideation/7/duplicate');
    expect(duplicateResponse.headers.location).toBe('/ideation/42?status=challenge-duplicated');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/ideation-challenges/7/duplicate');

    const linkCampaignResponse = await post('/ideation/7/link-campaign', {
      campaign_id: '5',
      sort_order: '2'
    });
    expect(linkCampaignResponse.headers.location).toBe('/ideation/7/manage?status=campaign-linked');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/ideation-campaigns/5/challenges', {
      challenge_id: 7,
      sort_order: 2
    });

    const outcomeResponse = await post('/ideation/7/outcome', {
      outcome_title: ' Funded project ',
      outcome_summary: ' The idea moved into delivery. ',
      impact_metric: '42 households'
    });
    expect(outcomeResponse.headers.location).toBe('/ideation/7/outcome?status=outcome-saved');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/ideation-challenges/7/outcome', {
      title: 'Funded project',
      summary: 'The idea moved into delivery.',
      impact_metric: '42 households'
    });

    const deleteResponse = await post('/ideation/7/delete');
    expect(deleteResponse.headers.location).toBe('/ideation?status=challenge-deleted');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/ideation-challenges/7');
  });

  it('submits Laravel ideation idea action aliases', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const submitResponse = await post('/ideation/7/ideas', {
      idea_title: ' More benches ',
      idea_content: ' Add more benches near the park entrance. '
    });
    expect(submitResponse.headers.location).toBe('/ideation/7?status=idea-submitted#ideas');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/ideation-challenges/7/ideas', {
      title: 'More benches',
      description: 'Add more benches near the park entrance.'
    });

    const draftResponse = await post('/ideation/7/drafts/12', {
      idea_title: ' Draft title ',
      idea_content: ' Draft content ',
      action: 'publish'
    });
    expect(draftResponse.headers.location).toBe('/ideation/7/drafts?status=draft-saved');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/ideation-ideas/12/draft', {
      title: 'Draft title',
      description: 'Draft content',
      action: 'publish'
    });

    const commentResponse = await post('/ideation/7/ideas/12/comments', {
      comment_body: ' Strong local support. '
    });
    expect(commentResponse.headers.location).toBe('/ideation/7/ideas/12?status=comment-added#comments');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/ideation-ideas/12/comments', {
      body: 'Strong local support.'
    });

    const deleteCommentResponse = await post('/ideation/7/ideas/12/comments/33/delete');
    expect(deleteCommentResponse.headers.location).toBe('/ideation/7/ideas/12?status=comment-deleted#comments');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/ideation-comments/33');

    const toggleVoteResponse = await post('/ideation/7/ideas/12/toggle-vote');
    expect(toggleVoteResponse.headers.location).toBe('/ideation/7/ideas/12?status=idea-voted');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/ideation-ideas/12/vote');

    const voteResponse = await post('/ideation/7/ideas/12/vote');
    expect(voteResponse.headers.location).toBe('/ideation/7?status=idea-voted#ideas');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/ideation-ideas/12/vote');

    const statusResponse = await post('/ideation/7/ideas/12/status', { idea_status: 'shortlisted' });
    expect(statusResponse.headers.location).toBe('/ideation/7/ideas/12?status=idea-status-updated');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/ideation-ideas/12/status', {
      status: 'shortlisted'
    });

    const mediaResponse = await post('/ideation/7/ideas/12/media', {
      media_type: 'link',
      url: ' https://example.org/proposal ',
      caption: ' Proposal '
    });
    expect(mediaResponse.headers.location).toBe('/ideation/7/ideas/12?status=media-added');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/ideation-ideas/12/media', {
      media_type: 'link',
      url: 'https://example.org/proposal',
      caption: 'Proposal'
    });

    const convertResponse = await post('/ideation/7/ideas/12/convert', {
      group_name: ' Parks delivery team ',
      description: ' Coordinate delivery. '
    });
    expect(convertResponse.headers.location).toBe('/ideation/7/ideas/12?status=converted-to-group');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/ideation-ideas/12/convert-to-group', {
      group_name: 'Parks delivery team',
      description: 'Coordinate delivery.'
    });

    const deleteIdeaResponse = await post('/ideation/7/ideas/12/delete');
    expect(deleteIdeaResponse.headers.location).toBe('/ideation/7?status=idea-deleted#ideas');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/ideation-ideas/12');
  });

  it('submits Laravel ideation campaign aliases and redirects signed-out visitors', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const createResponse = await post('/ideation/campaigns', {
      title: ' Park renewal ',
      description: ' Gather related park challenges ',
      status: 'active'
    });
    expect(createResponse.headers.location).toBe('/ideation/campaigns?status=campaign-created');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/ideation-campaigns', {
      title: 'Park renewal',
      description: 'Gather related park challenges',
      status: 'active'
    });

    const updateResponse = await post('/ideation/campaigns/5', {
      title: ' Updated campaign ',
      description: ' Updated summary ',
      status: 'paused'
    });
    expect(updateResponse.headers.location).toBe('/ideation/campaigns/5?status=campaign-saved');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/ideation-campaigns/5', {
      title: 'Updated campaign',
      description: 'Updated summary',
      status: 'paused'
    });

    const unlinkResponse = await post('/ideation/campaigns/5/challenges/7/unlink');
    expect(unlinkResponse.headers.location).toBe('/ideation/campaigns/5?status=challenge-unlinked');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/ideation-campaigns/5/challenges/7');

    const deleteResponse = await post('/ideation/campaigns/5/delete');
    expect(deleteResponse.headers.location).toBe('/ideation/campaigns?status=campaign-deleted');
    expect(api.callIdeationApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/ideation-campaigns/5');

    api.callIdeationApi.mockClear();
    const unsigned = request.agent(app);
    const unsignedFirst = await unsigned.get('/contact');
    const unsignedCsrf = unsignedFirst.text.match(/name="_csrf" value="([^"]+)"/);
    const unsignedResponse = await unsigned
      .post('/ideation/7/ideas')
      .type('form')
      .send({ _csrf: unsignedCsrf[1], idea_title: 'Bench' });
    expect(unsignedResponse.status).toBe(302);
    expect(unsignedResponse.headers.location).toBe('/login?status=auth-required');
    expect(api.callIdeationApi).not.toHaveBeenCalled();
  });

  it('submits Laravel group exchange action aliases and redirects signed-out visitors', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const createResponse = await post('/group-exchanges/new', {
      title: ' Community garden build ',
      description: ' Build raised beds on Saturday. ',
      total_hours: '12.5',
      split_type: 'custom'
    });
    expect(createResponse.headers.location).toBe('/group-exchanges/42?status=created');
    expect(api.callGroupExchangeApi).toHaveBeenLastCalledWith('test-token', 'POST', '', {
      title: 'Community garden build',
      description: 'Build raised beds on Saturday.',
      total_hours: 12.5,
      split_type: 'custom',
      status: 'draft'
    });

    const addResponse = await post('/group-exchanges/7/participants', {
      participant_id: '55',
      role: 'receiver',
      hours: '3.5'
    });
    expect(addResponse.headers.location).toBe('/group-exchanges/7?status=participant-added#group-exchange-top');
    expect(api.callGroupExchangeApi).toHaveBeenLastCalledWith('test-token', 'POST', '/7/participants', {
      user_id: 55,
      role: 'receiver',
      hours: 3.5,
      weight: 1
    });

    const removeResponse = await post('/group-exchanges/7/participants/55/remove');
    expect(removeResponse.headers.location).toBe('/group-exchanges/7?status=participant-removed#group-exchange-top');
    expect(api.callGroupExchangeApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/7/participants/55');

    const confirmResponse = await post('/group-exchanges/7/confirm');
    expect(confirmResponse.headers.location).toBe('/group-exchanges/7?status=confirmed#group-exchange-top');
    expect(api.callGroupExchangeApi).toHaveBeenLastCalledWith('test-token', 'POST', '/7/confirm');

    const completeResponse = await post('/group-exchanges/7/complete');
    expect(completeResponse.headers.location).toBe('/group-exchanges/7?status=completed#group-exchange-top');
    expect(api.callGroupExchangeApi).toHaveBeenLastCalledWith('test-token', 'POST', '/7/complete');

    const cancelResponse = await post('/group-exchanges/7/cancel');
    expect(cancelResponse.headers.location).toBe('/group-exchanges/7?status=cancelled#group-exchange-top');
    expect(api.callGroupExchangeApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/7');

    api.callGroupExchangeApi.mockClear();
    const unsigned = request.agent(app);
    const unsignedFirst = await unsigned.get('/contact');
    const unsignedCsrf = unsignedFirst.text.match(/name="_csrf" value="([^"]+)"/);
    const unsignedResponse = await unsigned
      .post('/group-exchanges/7/confirm')
      .type('form')
      .send({ _csrf: unsignedCsrf[1] });
    expect(unsignedResponse.status).toBe(302);
    expect(unsignedResponse.headers.location).toBe('/login?status=auth-required');
    expect(api.callGroupExchangeApi).not.toHaveBeenCalled();
  });

  it('submits Laravel event action aliases and redirects signed-out visitors', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const waitlistResponse = await post('/events/7/waitlist');
    expect(waitlistResponse.headers.location).toBe('/events/7?status=waitlist-joined');
    expect(api.callEventApi).toHaveBeenLastCalledWith('test-token', 'POST', '/7/waitlist');

    const leaveResponse = await post('/events/7/waitlist/leave');
    expect(leaveResponse.headers.location).toBe('/events/7?status=waitlist-left');
    expect(api.callEventApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/7/waitlist');

    const checkinResponse = await post('/events/7/attendees/55/check-in');
    expect(checkinResponse.headers.location).toBe('/events/7?status=checkin-success');
    expect(api.callEventApi).toHaveBeenLastCalledWith('test-token', 'POST', '/7/attendees/55/check-in');

    const voteResponse = await post('/events/7/polls/12/vote', { option_id: '3' });
    expect(voteResponse.headers.location).toBe('/events/7?status=poll-voted#poll-12');
    expect(api.votePoll).toHaveBeenLastCalledWith('test-token', 12, { option_id: 3 });

    const pollsResponse = await post('/events/7/polls', { poll_ids: ['1', '2', '2'] });
    expect(pollsResponse.headers.location).toBe('/events/7/polls?status=polls-updated');
    expect(api.callEventApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/7', {
      poll_ids: [1, 2]
    });

    const recurringResponse = await post('/events/7/recurring-edit', {
      scope: 'all',
      title: ' Updated event ',
      description: ' Updated description ',
      start_time: '2026-08-01T10:00',
      max_attendees: '20',
      is_online: 'on',
      online_link: ' https://example.org/meet ',
      allow_remote_attendance: 'on'
    });
    expect(recurringResponse.headers.location).toBe('/events/7?status=event-updated');
    expect(api.callEventApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/7/recurring', {
      title: 'Updated event',
      description: 'Updated description',
      start_time: '2026-08-01T10:00',
      end_time: null,
      location: null,
      category_id: null,
      max_attendees: 20,
      is_online: true,
      online_link: 'https://example.org/meet',
      allow_remote_attendance: true,
      video_url: null,
      scope: 'all'
    });

    const translateResponse = await post('/events/7/translate', {
      source_text: ' Hello neighbours ',
      source_locale: 'en',
      target_locale: 'ga'
    });
    expect(translateResponse.headers.location).toBe('/events/7/translate?status=translate-done');
    expect(api.callUgcTranslateApi).toHaveBeenLastCalledWith('test-token', {
      content_type: 'event',
      content_id: 7,
      source_text: 'Hello neighbours',
      source_locale: 'en',
      target_locale: 'ga'
    });

    api.callEventApi.mockClear();
    const unsigned = request.agent(app);
    const unsignedFirst = await unsigned.get('/contact');
    const unsignedCsrf = unsignedFirst.text.match(/name="_csrf" value="([^"]+)"/);
    const unsignedResponse = await unsigned
      .post('/events/7/waitlist')
      .type('form')
      .send({ _csrf: unsignedCsrf[1] });
    expect(unsignedResponse.status).toBe(302);
    expect(unsignedResponse.headers.location).toBe('/login?status=auth-required');
    expect(api.callEventApi).not.toHaveBeenCalled();
  });

  it('submits Laravel listing action aliases and redirects signed-out visitors', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const saveResponse = await post('/listings/42/save');
    expect(saveResponse.headers.location).toBe('/listings/42?status=listing-saved');
    expect(api.callListingApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/save');

    const unsaveResponse = await post('/listings/42/unsave');
    expect(unsaveResponse.headers.location).toBe('/listings/42?status=listing-unsaved');
    expect(api.callListingApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/42/save');

    const renewResponse = await post('/listings/42/renew');
    expect(renewResponse.headers.location).toBe('/listings/42?status=listing-renewed');
    expect(api.callListingApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/renew');

    const likeResponse = await post('/listings/42/like');
    expect(likeResponse.headers.location).toBe('/listings/42?status=liked#like');
    expect(api.toggleFeedLike).toHaveBeenLastCalledWith('test-token', {
      target_type: 'listing',
      target_id: 42
    });

    const commentResponse = await post('/listings/42/comments', {
      body: ' Looks useful ',
      parent_id: '5'
    });
    expect(commentResponse.headers.location).toBe('/listings/42/comments?status=reply-added#add-comment');
    expect(api.createComment).toHaveBeenLastCalledWith('test-token', {
      target_type: 'listing',
      target_id: 42,
      content: 'Looks useful',
      parent_id: 5
    });

    const exchangeResponse = await post('/listings/42/exchange-request', {
      proposed_hours: '2.5',
      prep_time: '0.5',
      message: ' Could you help next week? '
    });
    expect(exchangeResponse.headers.location).toBe('/exchanges/88?status=exchange-created');
    expect(api.createExchangeRequest).toHaveBeenLastCalledWith('test-token', {
      listing_id: 42,
      proposed_hours: 2.5,
      prep_time: 0.5,
      message: 'Could you help next week?'
    });

    const reportResponse = await post('/listings/42/report', {
      reason: 'spam',
      details: ' Duplicate spam '
    });
    expect(reportResponse.headers.location).toBe('/listings/42?status=listing-reported');
    expect(api.callListingApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/report', {
      reason: 'spam',
      details: 'Duplicate spam'
    });

    const generateResponse = await post('/listings/generate-description', {
      listing_id: '42',
      title: ' Garden help ',
      type: 'request',
      category: 'Gardening',
      description: ' I need help clearing weeds. '
    });
    expect(generateResponse.headers.location).toBe('/listings/42/edit?status=ai-generated#description');
    expect(api.callListingApi).toHaveBeenLastCalledWith('test-token', 'POST', '/generate-description', {
      title: 'Garden help',
      type: 'request',
      category: 'Gardening',
      notes: 'I need help clearing weeds.'
    });

    api.callListingApi.mockClear();
    const unsigned = request.agent(app);
    const unsignedFirst = await unsigned.get('/contact');
    const unsignedCsrf = unsignedFirst.text.match(/name="_csrf" value="([^"]+)"/);
    const unsignedResponse = await unsigned
      .post('/listings/42/save')
      .type('form')
      .send({ _csrf: unsignedCsrf[1] });
    expect(unsignedResponse.status).toBe(302);
    expect(unsignedResponse.headers.location).toBe('/login?status=auth-required');
    expect(api.callListingApi).not.toHaveBeenCalled();
  });

  it('submits Laravel settings action aliases and redirects signed-out visitors', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const appearanceResponse = await post('/settings/appearance', {
      theme: 'dark'
    });
    expect(appearanceResponse.headers.location).toBe('/settings/appearance?status=appearance-saved');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/theme', {
      theme: 'dark'
    });

    const availabilityResponse = await post('/settings/availability', {
      'slots[1][0][start]': '09:00',
      'slots[1][0][end]': '11:00',
      'slots[5][0][start]': '14:00',
      'slots[5][0][end]': '16:00'
    });
    expect(availabilityResponse.headers.location).toBe('/settings/availability?status=availability-saved');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/availability', {
      schedule: [
        { day_of_week: 1, start_time: '09:00', end_time: '11:00' },
        { day_of_week: 5, start_time: '14:00', end_time: '16:00' }
      ]
    });

    const dataRightsResponse = await post('/settings/data-rights', {
      request_type: 'portability',
      notes: ' Send me portable account data '
    });
    expect(dataRightsResponse.headers.location).toBe('/settings/data-rights?status=gdpr-requested#your-requests');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'POST', '/gdpr-request', {
      type: 'portability',
      notes: 'Send me portable account data'
    });

    const requestResponse = await post('/settings/linked-accounts/request', {
      email: ' child@example.org ',
      relationship_type: 'guardian',
      perm_can_view_activity: 'on',
      perm_can_manage_listings: 'on'
    });
    expect(requestResponse.headers.location).toBe('/settings/linked-accounts?status=link-requested#children');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'POST', '/sub-accounts', {
      email: 'child@example.org',
      relationship_type: 'guardian',
      permissions: {
        can_view_activity: true,
        can_manage_listings: true,
        can_transact: false,
        can_view_messages: false
      }
    });

    const approveResponse = await post('/settings/linked-accounts/approve', {
      relationship_id: '77'
    });
    expect(approveResponse.headers.location).toBe('/settings/linked-accounts?status=link-approved#parents');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/sub-accounts/77/approve');

    const permissionsResponse = await post('/settings/linked-accounts/permissions', {
      relationship_id: '77',
      perm_can_view_activity: 'on',
      perm_can_transact: 'on',
      perm_can_view_messages: 'on'
    });
    expect(permissionsResponse.headers.location).toBe('/settings/linked-accounts?status=link-permissions-saved#children');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/sub-accounts/77/permissions', {
      permissions: {
        can_view_activity: true,
        can_manage_listings: false,
        can_transact: true,
        can_view_messages: true
      }
    });

    const revokeResponse = await post('/settings/linked-accounts/revoke', {
      relationship_id: '77'
    });
    expect(revokeResponse.headers.location).toBe('/settings/linked-accounts?status=link-revoked#children');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/sub-accounts/77');

    api.callUserSettingsApi.mockClear();
    const insuranceResponse = await post('/settings/insurance', {
      insurance_type: 'public_liability',
      provider_name: 'Example Mutual'
    });
    expect(insuranceResponse.headers.location).toBe('/settings/insurance?status=insurance-file-required#upload');
    expect(api.callUserSettingsApi).not.toHaveBeenCalled();

    const unsigned = request.agent(app);
    const unsignedFirst = await unsigned.get('/contact');
    const unsignedCsrf = unsignedFirst.text.match(/name="_csrf" value="([^"]+)"/);
    const unsignedResponse = await unsigned
      .post('/settings/appearance')
      .type('form')
      .send({ _csrf: unsignedCsrf[1], theme: 'dark' });
    expect(unsignedResponse.status).toBe(302);
    expect(unsignedResponse.headers.location).toBe('/login?status=auth-required');
    expect(api.callUserSettingsApi).not.toHaveBeenCalled();
  });

  it('submits Laravel message action aliases and redirects signed-out visitors', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const archiveResponse = await post('/messages/77/archive');
    expect(archiveResponse.headers.location).toBe('/messages?status=conversation-archived');
    expect(api.callMessageApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/conversations/77', {
      scope: 'self'
    });

    const restoreResponse = await post('/messages/77/restore');
    expect(restoreResponse.headers.location).toBe('/messages?archived=1&status=conversation-restored');
    expect(api.callMessageApi).toHaveBeenLastCalledWith('test-token', 'POST', '/conversations/77/restore');

    const editResponse = await post('/messages/77/m/12/edit', {
      body: ' Updated hello '
    });
    expect(editResponse.headers.location).toBe('/messages/77?status=message-edited');
    expect(api.callMessageApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/12', {
      body: 'Updated hello'
    });

    const deleteResponse = await post('/messages/77/m/12/delete', {
      scope: 'self'
    });
    expect(deleteResponse.headers.location).toBe('/messages/77?status=message-deleted');
    expect(api.callMessageApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/12', {
      scope: 'self'
    });

    const translateResponse = await post('/messages/77/m/12/translate', {
      target_language: 'ga'
    });
    expect(translateResponse.headers.location).toBe('/messages/77?status=translate-done#m-12');
    expect(api.callMessageApi).toHaveBeenLastCalledWith('test-token', 'POST', '/12/translate', {
      target_language: 'ga'
    });

    api.callMessageApi.mockClear();
    const voiceResponse = await post('/messages/77/voice');
    expect(voiceResponse.headers.location).toBe('/messages/77?status=voice-required');
    expect(api.callMessageApi).not.toHaveBeenCalled();

    const groupCreateResponse = await post('/messages/groups', {
      name: ' Local helpers ',
      member_ids: ['44', '55']
    });
    expect(groupCreateResponse.headers.location).toBe('/messages/groups/33?status=group-created');
    expect(api.callConversationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/groups', {
      name: 'Local helpers',
      member_ids: [44, 55]
    });

    const groupMessageResponse = await post('/messages/groups/33', {
      body: ' Hello group '
    });
    expect(groupMessageResponse.headers.location).toBe('/messages/groups/33?status=group-message-sent');
    expect(api.callConversationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/33/messages', {
      body: 'Hello group'
    });

    const addMemberResponse = await post('/messages/groups/33/members', {
      user_id: '66'
    });
    expect(addMemberResponse.headers.location).toBe('/messages/groups/33?status=group-member-added');
    expect(api.callConversationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/33/participants', {
      user_id: 66
    });

    const removeMemberResponse = await post('/messages/groups/33/members/66/remove');
    expect(removeMemberResponse.headers.location).toBe('/messages/groups/33?status=group-member-removed');
    expect(api.callConversationApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/33/participants/66');

    const reactResponse = await post('/messages/groups/33/m/12/react', {
      emoji: '\u2764\ufe0f'
    });
    expect(reactResponse.headers.location).toBe('/messages/groups/33?status=reaction-added#m-12');
    expect(api.callMessageApi).toHaveBeenLastCalledWith('test-token', 'POST', '/12/reactions', {
      emoji: '\u2764\ufe0f'
    });

    api.callMessageApi.mockClear();
    api.callConversationApi.mockClear();
    const unsigned = request.agent(app);
    const unsignedFirst = await unsigned.get('/contact');
    const unsignedCsrf = unsignedFirst.text.match(/name="_csrf" value="([^"]+)"/);
    const unsignedResponse = await unsigned
      .post('/messages/77/archive')
      .type('form')
      .send({ _csrf: unsignedCsrf[1] });
    expect(unsignedResponse.status).toBe(302);
    expect(unsignedResponse.headers.location).toBe('/login?status=auth-required');
    expect(api.callMessageApi).not.toHaveBeenCalled();
    expect(api.callConversationApi).not.toHaveBeenCalled();
  });

  it('submits Laravel podcast action aliases and redirects signed-out visitors', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const subscribeResponse = await post('/podcasts/7/subscribe', {
      notify_new_episodes: 'on'
    });
    expect(subscribeResponse.headers.location).toBe('/podcasts/7?status=subscribed');
    expect(api.callPodcastApi).toHaveBeenLastCalledWith('test-token', 'POST', '/7/subscribe', {
      notify_new_episodes: true
    });

    const createResponse = await post('/podcasts/studio/new', {
      title: ' Community stories ',
      summary: ' Local audio ',
      description: ' Interviews and updates ',
      category: 'community',
      visibility: 'members'
    });
    expect(createResponse.headers.location).toBe('/podcasts/studio/42?status=show-created');
    expect(api.callPodcastApi).toHaveBeenLastCalledWith('test-token', 'POST', '', {
      title: 'Community stories',
      summary: 'Local audio',
      description: 'Interviews and updates',
      category: 'community',
      visibility: 'members'
    });

    const updateResponse = await post('/podcasts/studio/42/update', {
      title: ' Updated stories ',
      summary: ' New summary ',
      description: ' New description ',
      category: 'local',
      visibility: 'public'
    });
    expect(updateResponse.headers.location).toBe('/podcasts/studio/42?status=show-saved');
    expect(api.callPodcastApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/42', {
      title: 'Updated stories',
      summary: 'New summary',
      description: 'New description',
      category: 'local',
      visibility: 'public'
    });

    const publishResponse = await post('/podcasts/studio/42/publish');
    expect(publishResponse.headers.location).toBe('/podcasts/studio/42?status=show-published');
    expect(api.callPodcastApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/publish');

    const episodeResponse = await post('/podcasts/studio/42/episodes', {
      episode_title: ' First update ',
      episode_summary: ' Short summary ',
      episode_description: ' Longer notes ',
      episode_number: '3',
      audio_url: ' https://media.example/audio.mp3 '
    });
    expect(episodeResponse.headers.location).toBe('/podcasts/studio/42?status=episode-added');
    expect(api.callPodcastApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/episodes', {
      title: 'First update',
      summary: 'Short summary',
      description: 'Longer notes',
      audio_url: 'https://media.example/audio.mp3',
      episode_number: 3
    });

    const publishEpisodeResponse = await post('/podcasts/studio/42/episodes/99/publish');
    expect(publishEpisodeResponse.headers.location).toBe('/podcasts/studio/42?status=episode-published');
    expect(api.callPodcastApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/episodes/99/publish');

    const deleteEpisodeResponse = await post('/podcasts/studio/42/episodes/99/delete');
    expect(deleteEpisodeResponse.headers.location).toBe('/podcasts/studio/42?status=episode-deleted');
    expect(api.callPodcastApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/42/episodes/99');

    const deleteResponse = await post('/podcasts/studio/42/delete');
    expect(deleteResponse.headers.location).toBe('/podcasts/studio?status=show-deleted');
    expect(api.callPodcastApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/42');

    api.callPodcastApi.mockClear();
    const unsigned = request.agent(app);
    const unsignedFirst = await unsigned.get('/contact');
    const unsignedCsrf = unsignedFirst.text.match(/name="_csrf" value="([^"]+)"/);
    const unsignedResponse = await unsigned
      .post('/podcasts/7/subscribe')
      .type('form')
      .send({ _csrf: unsignedCsrf[1] });
    expect(unsignedResponse.status).toBe(302);
    expect(unsignedResponse.headers.location).toBe('/login?status=auth-required');
    expect(api.callPodcastApi).not.toHaveBeenCalled();
  });

  it('submits Laravel federation action aliases and redirects signed-out visitors', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const connectResponse = await post('/federation/connections', {
      receiver_id: '77',
      receiver_tenant_id: '12',
      message: ' Hello from our community '
    });
    expect(connectResponse.headers.location).toBe('/federation/members/77?tenant_id=12&status=connect-sent');
    expect(api.callFederationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/connections', {
      receiver_id: 77,
      receiver_tenant_id: 12,
      message: 'Hello from our community'
    });

    const acceptResponse = await post('/federation/connections/91/accept');
    expect(acceptResponse.headers.location).toBe('/federation/connections?tab=received&status=connection-accepted');
    expect(api.callFederationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/connections/91/accept');

    const rejectResponse = await post('/federation/connections/91/reject');
    expect(rejectResponse.headers.location).toBe('/federation/connections?tab=received&status=connection-rejected');
    expect(api.callFederationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/connections/91/reject');

    const removeResponse = await post('/federation/connections/91/remove');
    expect(removeResponse.headers.location).toBe('/federation/connections?tab=accepted&status=connection-removed');
    expect(api.callFederationApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/connections/91');

    const messageResponse = await post('/federation/messages', {
      receiver_id: '77',
      receiver_tenant_id: '12',
      subject: ' Neighbourhood support ',
      body: ' Could you help with the repair cafe? ',
      reference_message_id: '33'
    });
    expect(messageResponse.headers.location).toBe('/federation/members/77?tenant_id=12&status=message-sent');
    expect(api.callFederationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/messages', {
      receiver_id: 77,
      receiver_tenant_id: 12,
      subject: 'Neighbourhood support',
      body: 'Could you help with the repair cafe?',
      reference_message_id: 33
    });

    const translateResponse = await post('/federation/messages/translate/33', {
      partner_id: '77',
      partner_tenant_id: '12',
      target_language: 'ga'
    });
    expect(translateResponse.headers.location).toBe('/federation/messages/conversation/77?tenant_id=12&status=translate-done#message-33');
    expect(api.callFederationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/messages/33/translate', {
      target_language: 'ga'
    });

    const transferResponse = await post('/federation/members/77/transfer', {
      receiver_tenant_id: '12',
      amount: '3',
      description: ' Thanks for the workshop '
    });
    expect(transferResponse.headers.location).toBe('/federation/members/77?tenant_id=12&status=transfer-sent');
    expect(api.callFederationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/transactions', {
      receiver_id: 77,
      receiver_tenant_id: 12,
      amount: 3,
      description: 'Thanks for the workshop'
    });

    const onboardingResponse = await post('/federation/onboarding', {
      step: 'confirm',
      profile_visible_federated: 'on',
      appear_in_federated_search: 'on',
      show_skills_federated: 'on',
      show_reviews_federated: 'on',
      messaging_enabled_federated: 'on',
      transactions_enabled_federated: 'on',
      email_notifications: 'on',
      service_reach: 'travel_ok',
      travel_radius_km: '30'
    });
    expect(onboardingResponse.headers.location).toBe('/federation?status=opted-in');
    expect(api.callFederationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/setup', {
      federation_optin: true,
      profile_visible_federated: true,
      appear_in_federated_search: true,
      show_skills_federated: true,
      show_location_federated: false,
      show_reviews_federated: true,
      messaging_enabled_federated: true,
      transactions_enabled_federated: true,
      email_notifications: true,
      service_reach: 'travel_ok',
      travel_radius_km: 30
    });

    const optInResponse = await post('/federation/opt-in', {
      preferences_submitted: '1',
      profile_visible_federated: 'on',
      appear_in_federated_search: 'on',
      show_skills_federated: 'on',
      messaging_enabled_federated: 'on',
      transactions_enabled_federated: 'on',
      email_notifications: 'on',
      service_reach: 'remote_ok',
      travel_radius_km: '15'
    });
    expect(optInResponse.headers.location).toBe('/federation?status=opted-in');
    expect(api.callFederationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/setup', {
      federation_optin: true,
      profile_visible_federated: true,
      appear_in_federated_search: true,
      show_skills_federated: true,
      show_location_federated: false,
      show_reviews_federated: false,
      messaging_enabled_federated: true,
      transactions_enabled_federated: true,
      email_notifications: true,
      service_reach: 'remote_ok',
      travel_radius_km: 15
    });

    const optOutResponse = await post('/federation/opt-out');
    expect(optOutResponse.headers.location).toBe('/federation?status=opted-out');
    expect(api.callFederationApi).toHaveBeenLastCalledWith('test-token', 'POST', '/opt-out');

    const settingsResponse = await post('/federation/settings', {
      profile_visible_federated: 'on',
      appear_in_federated_search: 'on',
      show_skills_federated: 'on',
      show_location_federated: 'on',
      show_reviews_federated: 'on',
      messaging_enabled_federated: 'on',
      transactions_enabled_federated: 'on',
      email_notifications: 'on',
      service_reach: 'travel_ok',
      travel_radius_km: '45'
    });
    expect(settingsResponse.headers.location).toBe('/federation/settings?status=settings-saved');
    expect(api.callFederationApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/settings', {
      federation_optin: true,
      profile_visible_federated: true,
      appear_in_federated_search: true,
      show_skills_federated: true,
      show_location_federated: true,
      show_reviews_federated: true,
      messaging_enabled_federated: true,
      transactions_enabled_federated: true,
      email_notifications: true,
      service_reach: 'travel_ok',
      travel_radius_km: 45
    });

    api.callFederationApi.mockClear();
    const emptyMessageResponse = await post('/federation/messages', {
      receiver_id: '77',
      receiver_tenant_id: '12',
      body: ' '
    });
    expect(emptyMessageResponse.headers.location).toBe('/federation/members/77?tenant_id=12&status=message-empty');
    expect(api.callFederationApi).not.toHaveBeenCalled();

    const unsigned = request.agent(app);
    const unsignedFirst = await unsigned.get('/contact');
    const unsignedCsrf = unsignedFirst.text.match(/name="_csrf" value="([^"]+)"/);
    const unsignedResponse = await unsigned
      .post('/federation/connections')
      .type('form')
      .send({ _csrf: unsignedCsrf[1], receiver_id: '77', receiver_tenant_id: '12' });
    expect(unsignedResponse.status).toBe(302);
    expect(unsignedResponse.headers.location).toBe('/login?status=auth-required');
    expect(api.callFederationApi).not.toHaveBeenCalled();
  });

  it('submits Laravel profile action aliases and redirects signed-out visitors', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const settingsResponse = await post('/profile/settings', {
      first_name: ' Ada ',
      last_name: ' Lovelace ',
      phone: ' 07123456789 ',
      profile_type: 'organisation',
      organization_name: ' Analytical Engine Club ',
      tagline: ' Community computing ',
      bio: ' Helps neighbours with maths ',
      location: ' London ',
      privacy_profile: 'members',
      privacy_search: 'on',
      newsletter_opt_in: 'on'
    });
    expect(settingsResponse.headers.location).toBe('/profile?status=profile-updated');
    expect(api.callUserSettingsApi).toHaveBeenNthCalledWith(1, 'test-token', 'PUT', '', {
      first_name: 'Ada',
      last_name: 'Lovelace',
      phone: '07123456789',
      profile_type: 'organisation',
      organization_name: 'Analytical Engine Club',
      tagline: 'Community computing',
      bio: 'Helps neighbours with maths',
      location: 'London',
      newsletter_opt_in: true
    });
    expect(api.callUserSettingsApi).toHaveBeenNthCalledWith(2, 'test-token', 'PUT', '/preferences', {
      privacy: {
        privacy_profile: 'members',
        privacy_search: true,
        privacy_contact: false
      }
    });

    const emailResponse = await post('/profile/email', {
      email: ' new@example.org ',
      current_password: 'current-password'
    });
    expect(emailResponse.headers.location).toBe('/profile/settings?status=email-changed');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'PUT', '', {
      email: 'new@example.org',
      current_password: 'current-password'
    });

    const passwordResponse = await post('/profile/password', {
      current_password: 'current-password',
      new_password: 'correct horse battery staple',
      new_password_confirmation: 'correct horse battery staple'
    });
    expect(passwordResponse.headers.location).toBe('/profile/settings?status=password-changed');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'POST', '/password', {
      current_password: 'current-password',
      new_password: 'correct horse battery staple'
    });

    const languageResponse = await post('/profile/language', {
      language: 'ga'
    });
    expect(languageResponse.headers.location).toBe('/profile/settings?status=language-changed');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/language', {
      language: 'ga'
    });

    const notificationsResponse = await post('/profile/notifications', {
      email_messages: 'on',
      email_connections: 'on',
      email_reviews: 'on',
      email_digest: 'on',
      push_enabled: 'on',
      federation_notifications_enabled: 'on',
      digest_frequency: 'daily'
    });
    expect(notificationsResponse.headers.location).toBe('/profile/settings?status=notifications-saved#notifications');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/notifications', {
      email_messages: true,
      email_connections: true,
      caring_smart_nudges: false,
      email_listings: false,
      email_transactions: false,
      email_reviews: true,
      email_gamification_digest: false,
      email_gamification_milestones: false,
      email_digest: true,
      email_org_payments: false,
      email_org_transfers: false,
      email_org_membership: false,
      email_org_admin: false,
      push_enabled: true,
      push_campaigns_opted_in: false,
      federation_notifications_enabled: true,
      digest_frequency: 'daily'
    });

    const renamePasskeyResponse = await post('/profile/passkeys/rename', {
      credential_id: 'cred-1',
      device_name: ' Work laptop '
    });
    expect(renamePasskeyResponse.headers.location).toBe('/profile/settings?status=passkey-renamed#passkeys');
    expect(api.callWebAuthnApi).toHaveBeenLastCalledWith('test-token', 'POST', '/rename', {
      credential_id: 'cred-1',
      device_name: 'Work laptop'
    });

    const removePasskeyResponse = await post('/profile/passkeys/remove', {
      credential_id: 'cred-1'
    });
    expect(removePasskeyResponse.headers.location).toBe('/profile/settings?status=passkey-removed#passkeys');
    expect(api.callWebAuthnApi).toHaveBeenLastCalledWith('test-token', 'POST', '/remove', {
      credential_id: 'cred-1'
    });

    const personalisationResponse = await post('/profile/personalisation', {
      prefers_chronological: 'on',
      auto_translate_ugc: 'on',
      auto_translate_target_locale: 'ga'
    });
    expect(personalisationResponse.headers.location).toBe('/profile/settings?status=personalisation-saved#personalisation');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/preferences', {
      feed: {
        prefers_chronological: true
      },
      translation: {
        auto_translate_ugc: true,
        auto_translate_target_locale: 'ga'
      }
    });

    const matchResponse = await post('/profile/match-preferences', {
      notification_frequency: 'daily',
      notify_hot_matches: 'on'
    });
    expect(matchResponse.headers.location).toBe('/profile/settings?status=match-prefs-saved#match-preferences');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/match-preferences', {
      notification_frequency: 'daily',
      notify_hot_matches: true,
      notify_mutual_matches: false
    });

    const addSkillResponse = await post('/profile/skills/add', {
      skill_name: ' Gardening ',
      is_offering: 'on',
      is_requesting: 'on'
    });
    expect(addSkillResponse.headers.location).toBe('/profile/settings?status=skill-added#skills');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'POST', '/skills', {
      skill_name: 'Gardening',
      is_offering: true,
      is_requesting: true
    });

    const removeSkillResponse = await post('/profile/skills/remove', {
      user_skill_id: '88'
    });
    expect(removeSkillResponse.headers.location).toBe('/profile/settings?status=skill-removed#skills');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/skills/88');

    const safeguardingResponse = await post('/profile/safeguarding/revoke', {
      option_id: '9'
    });
    expect(safeguardingResponse.headers.location).toBe('/profile/settings?status=safeguarding-revoked#safeguarding');
    expect(api.callProfileApi).toHaveBeenLastCalledWith('test-token', 'POST', '/safeguarding/revoke', {
      option_id: 9
    });

    const dataExportResponse = await post('/profile/data-export');
    expect(dataExportResponse.headers.location).toBe('/profile/settings?status=data-export-requested');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'POST', '/gdpr-request', {
      type: 'portability',
      notes: 'Accessible frontend data export request'
    });

    const deleteResponse = await post('/profile/delete-account', {
      password: 'current-password',
      confirm: 'on',
      reason: ' No longer needed '
    });
    expect(deleteResponse.headers.location).toBe('/login?status=account-deletion-requested');
    expect(api.callUserSettingsApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '', {
      password: 'current-password',
      reason: 'No longer needed'
    });

    const verify2faResponse = await post('/profile/two-factor/verify', {
      code: '123456'
    });
    expect(verify2faResponse.headers.location).toBe('/profile/two-factor?status=2fa-enabled');
    expect(api.callProfileApi).toHaveBeenLastCalledWith('test-token', 'POST', '/auth/2fa/verify', {
      code: '123456'
    });

    const disable2faResponse = await post('/profile/two-factor/disable', {
      password: 'current-password'
    });
    expect(disable2faResponse.headers.location).toBe('/profile/two-factor?status=2fa-disabled');
    expect(api.callProfileApi).toHaveBeenLastCalledWith('test-token', 'POST', '/auth/2fa/disable', {
      password: 'current-password'
    });

    api.callUserSettingsApi.mockClear();
    api.callProfileApi.mockClear();
    api.callWebAuthnApi.mockClear();
    const unsigned = request.agent(app);
    const unsignedFirst = await unsigned.get('/contact');
    const unsignedCsrf = unsignedFirst.text.match(/name="_csrf" value="([^"]+)"/);
    const unsignedResponse = await unsigned
      .post('/profile/language')
      .type('form')
      .send({ _csrf: unsignedCsrf[1], language: 'ga' });
    expect(unsignedResponse.status).toBe(302);
    expect(unsignedResponse.headers.location).toBe('/login?status=auth-required');
    expect(api.callUserSettingsApi).not.toHaveBeenCalled();
    expect(api.callProfileApi).not.toHaveBeenCalled();
    expect(api.callWebAuthnApi).not.toHaveBeenCalled();
  });

  it('submits Laravel goal action aliases and redirects signed-out visitors', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    api.callGoalApi.mockReset().mockResolvedValue({ data: { id: 42, action: 'liked' } });
    api.toggleFeedLike.mockReset().mockResolvedValue({ data: { action: 'liked' } });
    api.createComment.mockReset().mockResolvedValue({ data: { id: 12 } });
    api.deleteComment.mockReset().mockResolvedValue({ data: { deleted: true } });

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const createResponse = await post('/goals', {
      title: ' Walk daily ',
      description: ' Build the school run habit ',
      target_value: '30',
      deadline: '2026-12-31',
      is_public: 'on'
    });
    expect(createResponse.status).toBe(302);
    expect(createResponse.headers.location).toBe('/goals?status=goal-created');
    expect(api.callGoalApi).toHaveBeenLastCalledWith('test-token', 'POST', '', {
      title: 'Walk daily',
      description: 'Build the school run habit',
      target_value: 30,
      deadline: '2026-12-31',
      is_public: true
    });

    const templateResponse = await post('/goals/templates/7', {
      title: ' Custom template goal ',
      deadline: '2026-11-30',
      is_public: 'on'
    });
    expect(templateResponse.headers.location).toBe('/goals/42?status=goal-created');
    expect(api.callGoalApi).toHaveBeenLastCalledWith('test-token', 'POST', '/from-template/7', {
      title: 'Custom template goal',
      deadline: '2026-11-30',
      is_public: true
    });

    const editResponse = await post('/goals/42/edit', {
      title: ' Walk most days ',
      description: ' Keep the rhythm ',
      target_value: '40',
      deadline: '2027-01-31',
      checkin_frequency: 'weekly'
    });
    expect(editResponse.headers.location).toBe('/goals/42?status=goal-edited');
    expect(api.callGoalApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/42', {
      title: 'Walk most days',
      description: 'Keep the rhythm',
      target_value: 40,
      deadline: '2027-01-31',
      is_public: false,
      checkin_frequency: 'weekly'
    });

    const deleteResponse = await post('/goals/42/delete');
    expect(deleteResponse.headers.location).toBe('/goals?status=goal-deleted');
    expect(api.callGoalApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/42');

    const buddyResponse = await post('/goals/42/buddy');
    expect(buddyResponse.headers.location).toBe('/goals/42?status=buddy-joined');
    expect(api.callGoalApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/buddy');

    const buddyNudgeResponse = await post('/goals/42/buddy-nudge');
    expect(buddyNudgeResponse.headers.location).toBe('/goals/buddying?status=buddy-nudge-sent');
    expect(api.callGoalApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/buddy/nudge', {
      type: 'nudge'
    });

    const progressResponse = await post('/goals/42/progress', {
      increment: '2.5'
    });
    expect(progressResponse.headers.location).toBe('/goals/42?status=goal-updated');
    expect(api.callGoalApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/progress', {
      increment: 2.5
    });

    const completeResponse = await post('/goals/42/complete');
    expect(completeResponse.headers.location).toBe('/goals/42?status=goal-completed');
    expect(api.callGoalApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/complete');

    const checkinResponse = await post('/goals/42/checkin', {
      progress_percent: '75',
      mood: 'good',
      note: ' Felt steady today '
    });
    expect(checkinResponse.headers.location).toBe('/goals/42/checkin?status=checkin-recorded');
    expect(api.callGoalApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/checkins', {
      progress_percent: 75,
      progress_value: 75,
      mood: 'good',
      note: 'Felt steady today'
    });

    const reminderResponse = await post('/goals/42/reminder', {
      frequency: 'weekly',
      enabled: 'on'
    });
    expect(reminderResponse.headers.location).toBe('/goals/42/reminder?status=reminder-saved');
    expect(api.callGoalApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/42/reminder', {
      frequency: 'weekly',
      enabled: true
    });

    const reminderDeleteResponse = await post('/goals/42/reminder/delete');
    expect(reminderDeleteResponse.headers.location).toBe('/goals/42/reminder?status=reminder-removed');
    expect(api.callGoalApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/42/reminder');

    const buddyActionResponse = await post('/goals/42/buddy-actions', {
      type: 'offer_help',
      message: ' I can check in on Friday '
    });
    expect(buddyActionResponse.headers.location).toBe('/goals/42/buddy-actions?status=buddy-action-sent');
    expect(api.callGoalApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/buddy/nudge', {
      type: 'offer_help',
      message: 'I can check in on Friday'
    });

    const likeResponse = await post('/goals/42/like');
    expect(likeResponse.headers.location).toBe('/goals/42/social?status=liked');
    expect(api.toggleFeedLike).toHaveBeenLastCalledWith('test-token', {
      target_type: 'goal',
      target_id: 42
    });

    const commentResponse = await post('/goals/42/comments', {
      body: ' Nice work '
    });
    expect(commentResponse.headers.location).toBe('/goals/42/social?status=comment-added#comments');
    expect(api.createComment).toHaveBeenLastCalledWith('test-token', {
      target_type: 'goal',
      target_id: 42,
      content: 'Nice work'
    });

    const commentDeleteResponse = await post('/goals/42/comments/12/delete');
    expect(commentDeleteResponse.headers.location).toBe('/goals/42/social?status=comment-deleted#comments');
    expect(api.deleteComment).toHaveBeenLastCalledWith('test-token', 12);

    api.callGoalApi.mockClear();
    api.toggleFeedLike.mockClear();
    api.createComment.mockClear();
    api.deleteComment.mockClear();
    const unsigned = request.agent(app);
    const unsignedFirst = await unsigned.get('/contact');
    const unsignedCsrf = unsignedFirst.text.match(/name="_csrf" value="([^"]+)"/);
    const unsignedResponse = await unsigned
      .post('/goals/42/progress')
      .type('form')
      .send({ _csrf: unsignedCsrf[1], increment: '1' });
    expect(unsignedResponse.status).toBe(302);
    expect(unsignedResponse.headers.location).toBe('/login?status=auth-required');
    expect(api.callGoalApi).not.toHaveBeenCalled();
    expect(api.toggleFeedLike).not.toHaveBeenCalled();
    expect(api.createComment).not.toHaveBeenCalled();
    expect(api.deleteComment).not.toHaveBeenCalled();
  });

  it('submits Laravel marketplace listing and buyer action aliases', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const createResponse = await post('/marketplace/create', {
      title: ' Community bike ',
      description: ' A road-ready bicycle ',
      tagline: ' Freshly serviced ',
      price_type: 'fixed',
      price: '15.50',
      price_currency: ' gbp ',
      condition: 'good',
      delivery_method: 'both',
      category_id: '9',
      location: ' Belfast ',
      quantity: '2'
    });
    expect(createResponse.headers.location).toBe('/marketplace/42?status=listing-created');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'POST', '/listings', {
      title: 'Community bike',
      description: 'A road-ready bicycle',
      price_type: 'fixed',
      status: 'active',
      tagline: 'Freshly serviced',
      price: 15.5,
      price_currency: 'GBP',
      condition: 'good',
      delivery_method: 'both',
      category_id: 9,
      location: 'Belfast',
      quantity: 2
    });

    const updateResponse = await post('/marketplace/42/update', {
      title: ' Updated bike ',
      description: ' Updated description ',
      price_type: 'free',
      delivery_method: 'pickup'
    });
    expect(updateResponse.headers.location).toBe('/marketplace/42?status=listing-saved');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/listings/42', {
      title: 'Updated bike',
      description: 'Updated description',
      price_type: 'free',
      status: 'active',
      price: null,
      time_credit_price: null,
      delivery_method: 'pickup'
    });

    const deleteResponse = await post('/marketplace/42/delete');
    expect(deleteResponse.headers.location).toBe('/marketplace/mine?status=deleted');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/listings/42');

    const renewResponse = await post('/marketplace/42/renew', { duration_days: '45' });
    expect(renewResponse.headers.location).toBe('/marketplace/mine?status=renewed');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'POST', '/listings/42/renew', {
      duration_days: 45
    });

    const saveResponse = await post('/marketplace/42/save');
    expect(saveResponse.headers.location).toBe('/marketplace/42?status=saved');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'POST', '/listings/42/save');

    const unsaveResponse = await post('/marketplace/42/unsave', { redirect_to: 'saved' });
    expect(unsaveResponse.headers.location).toBe('/marketplace/saved?status=unsaved');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/listings/42/save');

    const buyResponse = await post('/marketplace/42/buy', {
      quantity: '2',
      delivery_notes: ' Leave at the front desk ',
      shipping_method: 'pickup',
      coupon_code: ' NEXUS10 '
    });
    expect(buyResponse.headers.location).toBe('/marketplace/orders?status=ordered');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'POST', '/orders', {
      listing_id: 42,
      quantity: 2,
      shipping_method: 'pickup',
      delivery_notes: 'Leave at the front desk',
      coupon_code: 'NEXUS10'
    });

    const offerResponse = await post('/marketplace/42/offer', {
      amount: '12.25',
      message: ' Would collect today '
    });
    expect(offerResponse.headers.location).toBe('/marketplace/offers?status=offer-sent');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'POST', '/listings/42/offers', {
      amount: 12.25,
      message: 'Would collect today'
    });

    const reportResponse = await post('/marketplace/42/report', {
      reason: 'unsafe',
      description: ' The item appears unsafe for community use. '
    });
    expect(reportResponse.headers.location).toBe('/marketplace/42?status=reported');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'POST', '/listings/42/report', {
      reason: 'unsafe',
      description: 'The item appears unsafe for community use.'
    });
  });

  it('submits Laravel marketplace offer and order action aliases', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const acceptResponse = await post('/marketplace/offers/12/accept');
    expect(acceptResponse.headers.location).toBe('/marketplace/offers?tab=received&status=accepted');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/offers/12/accept');

    const declineResponse = await post('/marketplace/offers/12/decline');
    expect(declineResponse.headers.location).toBe('/marketplace/offers?tab=received&status=declined');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/offers/12/decline');

    const withdrawResponse = await post('/marketplace/offers/12/withdraw');
    expect(withdrawResponse.headers.location).toBe('/marketplace/offers?tab=sent&status=withdrawn');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/offers/12');

    const shipResponse = await post('/marketplace/orders/42/ship', {
      tracking_number: ' TRACK123 ',
      shipping_method: 'courier'
    });
    expect(shipResponse.headers.location).toBe('/marketplace/sales?status=shipped');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/orders/42/ship', {
      tracking_number: 'TRACK123',
      shipping_method: 'courier'
    });

    const confirmResponse = await post('/marketplace/orders/42/confirm');
    expect(confirmResponse.headers.location).toBe('/marketplace/orders?status=confirmed');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/orders/42/confirm-delivery');

    const cancelResponse = await post('/marketplace/orders/42/cancel', {
      reason: ' Buyer changed plans ',
      redirect_to: 'sales'
    });
    expect(cancelResponse.headers.location).toBe('/marketplace/sales?status=cancelled');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/orders/42/cancel', {
      reason: 'Buyer changed plans'
    });

    const payResponse = await post('/marketplace/orders/42/pay');
    expect(payResponse.headers.location).toBe('/marketplace/orders?status=payment-started');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'POST', '/payments/create-intent', {
      order_id: 42
    });

    const rateResponse = await post('/marketplace/orders/42/rate', {
      rating: '5',
      comment: ' Great handover ',
      redirect_to: 'sales'
    });
    expect(rateResponse.headers.location).toBe('/marketplace/sales?status=rated');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'POST', '/orders/42/rate', {
      rating: 5,
      comment: 'Great handover',
      is_anonymous: false
    });
  });

  it('submits Laravel marketplace seller onboarding, pickup slot, and coupon aliases', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const onboardingResponse = await post('/marketplace/onboarding', {
      seller_type: 'business',
      business_name: ' Community Supplies ',
      display_name: ' Community Store ',
      bio: ' Circular economy seller '
    });
    expect(onboardingResponse.headers.location).toBe('/marketplace/onboarding?status=onboarding-complete');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'POST', '/seller/profile', {
      seller_type: 'business',
      business_name: 'Community Supplies',
      display_name: 'Community Store',
      bio: 'Circular economy seller'
    });

    const slotCreateResponse = await post('/marketplace/slots', {
      slot_start: '2026-08-01T10:00',
      slot_end: '2026-08-01T12:00',
      capacity: '8',
      is_recurring: 'on',
      is_active: 'on'
    });
    expect(slotCreateResponse.headers.location).toBe('/marketplace/slots?status=slot-created');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'POST', '/seller/pickup-slots', {
      slot_start: '2026-08-01T10:00',
      slot_end: '2026-08-01T12:00',
      capacity: 8,
      is_recurring: true,
      is_active: true
    });

    const slotUpdateResponse = await post('/marketplace/slots/7/update', {
      slot_start: '2026-08-02T10:00',
      slot_end: '2026-08-02T12:00',
      capacity: '5'
    });
    expect(slotUpdateResponse.headers.location).toBe('/marketplace/slots/7/edit?status=slot-saved');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/seller/pickup-slots/7', {
      slot_start: '2026-08-02T10:00',
      slot_end: '2026-08-02T12:00',
      capacity: 5,
      is_recurring: false,
      is_active: true
    });

    const slotDeleteResponse = await post('/marketplace/slots/7/delete');
    expect(slotDeleteResponse.headers.location).toBe('/marketplace/slots?status=slot-deleted');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/seller/pickup-slots/7');

    const scanResponse = await post('/marketplace/slots/scan', { qr_code: ' PICKUP-123 ' });
    expect(scanResponse.headers.location).toBe('/marketplace/slots?status=pickup-confirmed');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'POST', '/seller/pickup-scan', {
      qr_code: 'PICKUP-123'
    });

    const couponCreateResponse = await post('/marketplace/coupons/new', {
      title: ' Summer offer ',
      description: ' For local members ',
      discount_type: 'percent',
      discount_value: '10',
      status: 'active',
      code: ' SUMMER10 ',
      min_order_cents: '500',
      max_uses: '20',
      valid_until: '2026-09-01'
    });
    expect(couponCreateResponse.headers.location).toBe('/marketplace/coupons?status=coupon-created');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'POST', '/seller/coupons', {
      title: 'Summer offer',
      description: 'For local members',
      discount_type: 'percent',
      discount_value: 10,
      status: 'active',
      applies_to: 'all_listings',
      code: 'SUMMER10',
      min_order_cents: 500,
      max_uses: 20,
      valid_until: '2026-09-01'
    });

    const couponUpdateResponse = await post('/marketplace/coupons/5/update', {
      title: ' Updated offer ',
      discount_type: 'fixed',
      discount_value: '3',
      status: 'paused'
    });
    expect(couponUpdateResponse.headers.location).toBe('/marketplace/coupons/5/edit?status=coupon-saved');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/seller/coupons/5', {
      title: 'Updated offer',
      description: '',
      discount_type: 'fixed',
      discount_value: 3,
      status: 'paused',
      applies_to: 'all_listings'
    });

    const couponDeleteResponse = await post('/marketplace/coupons/5/delete');
    expect(couponDeleteResponse.headers.location).toBe('/marketplace/coupons?status=coupon-deleted');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/seller/coupons/5');
  });

  it('redirects signed-out Laravel marketplace POST aliases to login status without calling Laravel APIs', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);
    const first = await agent.get('/contact');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/marketplace/42/buy')
      .type('form')
      .send({ _csrf: csrfMatch[1], quantity: '1' });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
    expect(api.callMarketplaceApi).not.toHaveBeenCalled();
  });

  it('submits core Laravel volunteering member action aliases', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const applyResponse = await agent
      .post('/volunteering/opportunities/77/apply')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], message: ' Happy to help ', shift_id: '501' });
    expect(applyResponse.headers.location).toBe('/volunteering/opportunities/77?status=apply-created');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'POST', '/opportunities/77/apply', {
      message: 'Happy to help',
      shift_id: 501
    });

    const signupResponse = await agent
      .post('/volunteering/opportunities/77/shifts/501/signup')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });
    expect(signupResponse.headers.location).toBe('/volunteering/opportunities/77?status=shift-signed-up');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'POST', '/shifts/501/signup');

    const cancelResponse = await agent
      .post('/volunteering/opportunities/77/shifts/501/cancel')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });
    expect(cancelResponse.headers.location).toBe('/volunteering/opportunities/77?status=shift-cancelled');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/shifts/501/signup');

    const withdrawResponse = await agent
      .post('/volunteering/applications/91/withdraw')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });
    expect(withdrawResponse.headers.location).toBe('/volunteering?tab=applications&status=application-withdrawn');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/applications/91');

    const hoursResponse = await agent
      .post('/volunteering/hours')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        organization_id: '42',
        opportunity_id: '77',
        date: '2026-08-03',
        hours: '2.5',
        description: ' Helped on reception '
      });
    expect(hoursResponse.headers.location).toBe('/volunteering/hours?status=hours-created');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'POST', '/hours', {
      organization_id: 42,
      opportunity_id: 77,
      date: '2026-08-03',
      hours: 2.5,
      description: 'Helped on reception'
    });

    const accessibilityResponse = await agent
      .post('/volunteering/accessibility')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        need_types: ['mobility', 'sensory'],
        description: ' Step-free access ',
        accommodations_required: ' Ramp ',
        emergency_contact_name: ' Alex ',
        emergency_contact_phone: ' 12345 '
      });
    expect(accessibilityResponse.headers.location).toBe('/volunteering/accessibility?status=accessibility-saved');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/accessibility-needs', {
      need_types: ['mobility', 'sensory'],
      description: 'Step-free access',
      accommodations_required: 'Ramp',
      emergency_contact_name: 'Alex',
      emergency_contact_phone: '12345'
    });

    const certificateResponse = await agent
      .post('/volunteering/certificates/generate')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });
    expect(certificateResponse.headers.location).toBe('/volunteering/certificates?status=certificate-generated');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'POST', '/certificates');
  });

  it('submits Laravel volunteering depth aliases for wellbeing, donations, groups, expenses, and safeguarding', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const waitlistResponse = await agent
      .post('/volunteering/waitlist/501/leave')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });
    expect(waitlistResponse.headers.location).toBe('/volunteering/waitlist?status=waitlist-left');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/shifts/501/waitlist');

    const swapResponse = await agent
      .post('/volunteering/swaps')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        from_shift_id: '501',
        to_shift_id: '502',
        to_user_id: '77',
        message: ' Could swap? '
      });
    expect(swapResponse.headers.location).toBe('/volunteering/swaps?status=swap-requested');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'POST', '/swaps', {
      from_shift_id: 501,
      to_shift_id: 502,
      to_user_id: 77,
      message: 'Could swap?'
    });

    const swapRespondResponse = await agent
      .post('/volunteering/swaps/12/respond')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], action: 'accept' });
    expect(swapRespondResponse.headers.location).toBe('/volunteering/swaps?status=swap-accepted');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/swaps/12', { action: 'accept' });

    const swapCancelResponse = await agent
      .post('/volunteering/swaps/12/cancel')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });
    expect(swapCancelResponse.headers.location).toBe('/volunteering/swaps?status=swap-cancelled');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/swaps/12');

    const emergencyResponse = await agent
      .post('/volunteering/emergency-alerts/9/respond')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], response: 'declined' });
    expect(emergencyResponse.headers.location).toBe('/volunteering/emergency-alerts?status=alert-declined');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/emergency-alerts/9', { response: 'declined' });

    const deleteCredentialResponse = await agent
      .post('/volunteering/credentials/44/delete')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });
    expect(deleteCredentialResponse.headers.location).toBe('/volunteering/credentials?status=credential-deleted');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/credentials/44');

    const wellbeingResponse = await agent
      .post('/volunteering/wellbeing/checkin')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], mood: '4', note: ' Feeling steady ' });
    expect(wellbeingResponse.headers.location).toBe('/volunteering/wellbeing?status=checkin-saved');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'POST', '/wellbeing/checkin', {
      mood: 4,
      note: 'Feeling steady'
    });

    const donationResponse = await agent
      .post('/volunteering/donations')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        amount: '25',
        payment_method: 'paypal',
        giving_day_id: '7',
        message: ' For supplies ',
        is_anonymous: 'on'
      });
    expect(donationResponse.headers.location).toBe('/volunteering/donations?status=donate-recorded#donate');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'POST', '/donations', {
      amount: 25,
      currency: 'EUR',
      payment_method: 'paypal',
      giving_day_id: 7,
      message: 'For supplies',
      is_anonymous: true
    });

    const groupAddResponse = await agent
      .post('/volunteering/group-signups/30/members')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], user_id: '55' });
    expect(groupAddResponse.headers.location).toBe('/volunteering/group-signups?status=member-added');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'POST', '/group-reservations/30/members', { user_id: 55 });

    const groupRemoveResponse = await agent
      .post('/volunteering/group-signups/30/members/55/remove')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });
    expect(groupRemoveResponse.headers.location).toBe('/volunteering/group-signups?status=member-removed');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/group-reservations/30/members/55');

    const groupCancelResponse = await agent
      .post('/volunteering/group-signups/30/cancel')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1] });
    expect(groupCancelResponse.headers.location).toBe('/volunteering/group-signups?status=reservation-cancelled');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/group-reservations/30');

    const expenseResponse = await agent
      .post('/volunteering/expenses')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        organization_id: '42',
        expense_type: 'travel',
        amount: '12.5',
        description: ' Bus fare ',
        currency: ' GBP '
      });
    expect(expenseResponse.headers.location).toBe('/volunteering/expenses?status=expense-submitted');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'POST', '/expenses', {
      organization_id: 42,
      expense_type: 'travel',
      amount: 12.5,
      description: 'Bus fare',
      currency: 'GBP'
    });

    const trainingResponse = await agent
      .post('/volunteering/training')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        training_type: 'first_aid',
        training_name: ' Basic first aid ',
        provider: ' Red Cross ',
        completed_at: '2026-06-01',
        expires_at: '2027-06-01'
      });
    expect(trainingResponse.headers.location).toBe('/volunteering/training?status=training-added&tab=training');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'POST', '/training', {
      training_type: 'first_aid',
      training_name: 'Basic first aid',
      provider: 'Red Cross',
      completed_at: '2026-06-01',
      expires_at: '2027-06-01'
    });

    const incidentResponse = await agent
      .post('/volunteering/incidents')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        title: ' Wet floor ',
        description: 'A wet floor caused a near miss by the entrance.',
        severity: 'medium',
        category: 'site'
      });
    expect(incidentResponse.headers.location).toBe('/volunteering/incidents?status=incident-reported&tab=incidents');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'POST', '/incidents', {
      title: 'Wet floor',
      description: 'A wet floor caused a near miss by the entrance.',
      severity: 'medium',
      category: 'site',
      incident_type: 'other'
    });
  });

  it('submits Laravel volunteering organisation management aliases', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const applicationResponse = await agent
      .post('/volunteering/organisations/42/applications/91')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], action: 'decline', org_note: ' Not this time ' });
    expect(applicationResponse.headers.location).toBe('/volunteering/organisations/42/manage?status=application-declined');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/applications/91', {
      action: 'decline',
      org_note: 'Not this time'
    });

    const hoursVerifyResponse = await agent
      .post('/volunteering/organisations/42/hours/19')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], action: 'approve' });
    expect(hoursVerifyResponse.headers.location).toBe('/volunteering/organisations/42/manage?status=hours-approved');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/hours/19/verify', { action: 'approve' });

    const settingsResponse = await agent
      .post('/volunteering/organisations/42/settings')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        name: ' Community Club ',
        description: ' Local help ',
        contact_email: ' hello@example.org ',
        website: ' https://example.org '
      });
    expect(settingsResponse.headers.location).toBe('/volunteering/organisations/42/settings?status=settings-saved');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/organisations/42', {
      name: 'Community Club',
      description: 'Local help',
      contact_email: 'hello@example.org',
      website: 'https://example.org'
    });

    const depositResponse = await agent
      .post('/volunteering/organisations/42/wallet/deposit')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], amount: '5', note: ' Float ' });
    expect(depositResponse.headers.location).toBe('/volunteering/organisations/42/wallet?status=deposit-made');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'POST', '/organisations/42/wallet/deposit', {
      amount: 5,
      note: 'Float'
    });

    const autoPayResponse = await agent
      .post('/volunteering/organisations/42/wallet/auto-pay')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], enabled: '1' });
    expect(autoPayResponse.headers.location).toBe('/volunteering/organisations/42/wallet?status=autopay-enabled');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/organisations/42/wallet/auto-pay', {
      enabled: true
    });

    api.callVolunteeringApi.mockResolvedValueOnce({ data: { id: 88 } });
    const createOpportunityResponse = await agent
      .post('/volunteering/opportunities/create')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({
        _csrf: csrfMatch[1],
        organization_id: '42',
        title: ' Kitchen helper ',
        description: ' Help prep food ',
        location: 'Derry',
        is_remote: '1',
        skills_needed: 'Cooking',
        start_date: '2026-08-01',
        end_date: '2026-09-01',
        category_id: '3',
        federated_visibility: '1'
      });
    expect(createOpportunityResponse.headers.location).toBe('/volunteering/opportunities/88?status=opp-created');
    expect(api.callVolunteeringApi).toHaveBeenLastCalledWith('test-token', 'POST', '/opportunities', {
      organization_id: 42,
      title: 'Kitchen helper',
      description: 'Help prep food',
      location: 'Derry',
      is_remote: true,
      skills_needed: 'Cooking',
      start_date: '2026-08-01',
      end_date: '2026-09-01',
      category_id: 3,
      federated_visibility: 'network'
    });
  });

  it('fails the Laravel volunteering credential upload route safely until multipart proxying exists', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/volunteering/credentials')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], credential_type: 'garda_vetting' });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/volunteering/credentials?status=credential-upload-failed');
    expect(api.callVolunteeringApi).not.toHaveBeenCalled();
  });

  it('redirects signed-out Laravel volunteering POST aliases to login status without calling Laravel APIs', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);
    const first = await agent.get('/contact');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/volunteering/hours')
      .type('form')
      .send({ _csrf: csrfMatch[1], organization_id: '42', hours: '2' });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
    expect(api.callVolunteeringApi).not.toHaveBeenCalled();
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
