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
  verifyEmail: jest.fn().mockResolvedValue({ data: { verified: true } }),
  callNewsletterApi: jest.fn().mockResolvedValue({ data: { success: true } }),
  getFeedPosts: jest.fn().mockResolvedValue({ data: [], pagination: { page: 1, total_pages: 1 } }),
  getMyGroups: jest.fn().mockResolvedValue({ data: [] }),
  updateProfile: jest.fn().mockResolvedValue({}),
  uploadProfileAvatar: jest.fn().mockResolvedValue({ data: { avatar_url: '/avatars/member.jpg' } }),
  getOnboardingStatus: jest.fn().mockResolvedValue({ data: { onboarding_completed: false } }),
  getOnboardingConfig: jest.fn().mockResolvedValue({ data: { config: {}, steps: [] } }),
  getOnboardingCategories: jest.fn().mockResolvedValue({ data: [] }),
  getOnboardingSafeguardingOptions: jest.fn().mockResolvedValue({ data: [] }),
  saveOnboardingSafeguarding: jest.fn().mockResolvedValue({}),
  completeOnboarding: jest.fn().mockResolvedValue({ data: { message: 'complete' } }),
  getUser: jest.fn(),
  searchUsers: jest.fn().mockResolvedValue({ data: { items: [] } }),
  getListings: jest.fn(),
  getConversations: jest.fn().mockResolvedValue({ data: [] }),
  getConversation: jest.fn().mockResolvedValue({ id: 77, messages: [] }),
  markConversationRead: jest.fn().mockResolvedValue({}),
  replyToConversation: jest.fn().mockResolvedValue({ data: { id: 12 } }),
  sendMessage: jest.fn().mockResolvedValue({ data: { id: 12 } }),
  startConversation: jest.fn().mockResolvedValue({ data: { id: 12 } }),
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
  getComments: jest.fn().mockResolvedValue({ data: { comments: [], count: 0 } }),
  getReactionSummary: jest.fn().mockResolvedValue({ data: { counts: {}, total: 0, user_reaction: null } }),
  getReactors: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, has_more: false, page: 1 } }),
  getClubs: jest.fn().mockResolvedValue({ data: [] }),
  getGoals: jest.fn().mockResolvedValue({ data: [] }),
  getGoal: jest.fn(),
  callGoalApi: jest.fn().mockResolvedValue({ data: { id: 42, action: 'liked' } }),
  callCourseApi: jest.fn().mockResolvedValue({ data: { id: 42, moderation_status: 'approved' } }),
  getMyCourses: jest.fn().mockResolvedValue({ data: [] }),
  callGroupApi: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  uploadGroupImage: jest.fn().mockResolvedValue({ data: { image_url: '/uploads/groups/cover.png' } }),
  uploadGroupFile: jest.fn().mockResolvedValue({ data: { id: 99 } }),
  callJobApi: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  uploadJobApplication: jest.fn().mockResolvedValue({ data: { id: 91 } }),
  callAdminJobApi: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  callJobDownload: jest.fn(),
  getEventCategories: jest.fn().mockResolvedValue({ data: [] }),
  uploadEventImage: jest.fn().mockResolvedValue({ data: { cover_image: '/uploads/events/garden.webp' } }),
  getJobs: jest.fn(),
  getJob: jest.fn(),
  applyForJob: jest.fn(),
  uploadMarketplaceListingImages: jest.fn().mockResolvedValue({ data: [{ id: 9 }] }),
  getPolls: jest.fn().mockResolvedValue({ data: [] }),
  getPoll: jest.fn().mockResolvedValue({ data: { id: 42, question: 'Which project?' } }),
  getPollCategories: jest.fn().mockResolvedValue({ data: [] }),
  getPollRankedResults: jest.fn().mockResolvedValue({ data: { poll: { id: 42, question: 'Which project?', options: [] }, ranked_results: { total_voters: 0, results: [] }, my_rankings: null } }),
  getPollExport: jest.fn().mockResolvedValue({ status: 200, body: Buffer.from(''), headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="poll-42-export.csv"' } }),
  createPoll: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  deletePoll: jest.fn().mockResolvedValue({}),
  votePoll: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  rankPoll: jest.fn().mockResolvedValue({ data: { ranked_results: [] } }),
  getKnowledgeBaseArticles: jest.fn().mockResolvedValue({ data: [], meta: { has_more: false, per_page: 12 } }),
  getKnowledgeBaseArticle: jest.fn(),
  getHelpFaqs: jest.fn().mockResolvedValue({ data: [] }),
  getLegalDocument: jest.fn().mockResolvedValue({ data: null }),
  getBalance: jest.fn(),
  donateCredits: jest.fn().mockResolvedValue({ data: { message: 'sent' } }),
  unsaveSavedItem: jest.fn().mockResolvedValue({}),
  getUserPublicCollections: jest.fn().mockResolvedValue({ data: [] }),
  getUserAppreciations: jest.fn().mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 20 } }),
  sendAppreciation: jest.fn().mockResolvedValue({ data: { id: 55 } }),
  reactToAppreciation: jest.fn().mockResolvedValue({ data: { reaction_type: 'heart' } }),
  getResources: jest.fn().mockResolvedValue({ data: [{ id: 10, sort_order: 0 }, { id: 20, sort_order: 1 }] }),
  getResourceCategories: jest.fn().mockResolvedValue({ data: [] }),
  getResourceCategoryTree: jest.fn().mockResolvedValue({ data: [] }),
  uploadResource: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  uploadVolunteerCredential: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  uploadInsuranceCertificate: jest.fn().mockResolvedValue({ data: { id: 42 } }),
  downloadResource: jest.fn(),
  deleteResource: jest.fn().mockResolvedValue({ data: { deleted: true } }),
  reorderResources: jest.fn().mockResolvedValue({ data: { message: 'reordered' } }),
  getSavedCollections: jest.fn().mockResolvedValue({ data: [] }),
  getSavedCollectionItems: jest.fn().mockResolvedValue({ data: { items: [], collection: null } }),
  createSavedCollection: jest.fn().mockResolvedValue({ data: { id: 12 } }),
  updateSavedCollection: jest.fn().mockResolvedValue({ data: { id: 12 } }),
  deleteSavedCollection: jest.fn().mockResolvedValue({}),
  deleteSavedItem: jest.fn().mockResolvedValue({}),
  dismissMatch: jest.fn().mockResolvedValue({ data: { dismissed: true } }),
  getExchangeConfig: jest.fn().mockResolvedValue({ data: { workflow_enabled: true } }),
  getExchanges: jest.fn().mockResolvedValue({ data: [] }),
  getExchange: jest.fn().mockResolvedValue({ data: { id: 88 } }),
  getExchangeRatings: jest.fn().mockResolvedValue({ data: { ratings: [], has_rated: false } }),
  performExchangeAction: jest.fn().mockResolvedValue({ data: { id: 88 } }),
  rateExchange: jest.fn().mockResolvedValue({ data: { ratings: [] } }),
  getSkillCategories: jest.fn().mockResolvedValue({ data: [] }),
  getSkillCategory: jest.fn().mockResolvedValue({ data: { id: 7, name: 'Practical help', skills: [] } }),
  getSkillMembers: jest.fn().mockResolvedValue({ data: [] }),
  sendAiChat: jest.fn().mockResolvedValue({ data: { conversation_id: 123 } }),
  getAiConversations: jest.fn().mockResolvedValue({ data: [] }),
  getAiConversation: jest.fn().mockResolvedValue({ data: { id: 77, messages: [] } }),
  getExplore: jest.fn().mockResolvedValue({ data: {} }),
  getMemberPremiumTiers: jest.fn().mockResolvedValue({ data: { tiers: [] } }),
  getMemberPremiumMe: jest.fn().mockResolvedValue({ data: { subscription: null, entitled_tier: null, unlocked_features: [] } }),
  createMemberPremiumCheckout: jest.fn().mockResolvedValue({ data: { checkout_url: 'https://checkout.stripe.test/session' } }),
  createMemberPremiumPortal: jest.fn().mockResolvedValue({ data: { portal_url: 'https://billing.stripe.test/session' } }),
  cancelMemberPremium: jest.fn().mockResolvedValue({ data: { cancelled: true } }),
  callCouponApi: jest.fn().mockResolvedValue({ data: { items: [] } }),
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
  uploadVoiceMessage: jest.fn().mockResolvedValue({ data: { id: 12, is_voice: true } }),
  uploadMessageAttachments: jest.fn().mockResolvedValue({ data: { id: 12 } }),
  callConversationApi: jest.fn().mockResolvedValue({ data: { id: 33 } }),
  callPodcastApi: jest.fn().mockResolvedValue({ data: { id: 42, subscribed: true, moderation_status: 'approved' } }),
  uploadPodcastEpisode: jest.fn().mockResolvedValue({ data: { id: 99 } }),
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
  getEvents: jest.fn().mockResolvedValue({ data: [], pagination: { page: 1, totalPages: 1 } }),
  getEvent: jest.fn().mockResolvedValue({ event: { id: 42, title: 'Community garden day', starts_at: '2026-08-01T10:00:00' } }),
  getEventRsvps: jest.fn().mockResolvedValue({ data: [] }),
  createEvent: jest.fn().mockResolvedValue({ id: 42 }),
  updateEvent: jest.fn().mockResolvedValue({ id: 42 }),
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

  function signedCookieHeader() {
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    return `token=${encodeURIComponent(signedToken)}`;
  }

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
    api.getFeedPosts.mockReset().mockResolvedValue({ data: [], pagination: { page: 1, total_pages: 1 } });
    api.getMyGroups.mockReset().mockResolvedValue({ data: [] });
    api.updateProfile.mockReset().mockResolvedValue({});
    api.uploadProfileAvatar.mockReset().mockResolvedValue({ data: { avatar_url: '/avatars/member.jpg' } });
    api.getConversations.mockReset().mockResolvedValue({ data: [] });
    api.getConversation.mockReset().mockResolvedValue({ id: 77, messages: [] });
    api.markConversationRead.mockReset().mockResolvedValue({});
    api.replyToConversation.mockReset().mockResolvedValue({ data: { id: 12 } });
    api.sendMessage.mockReset().mockResolvedValue({ data: { id: 12 } });
    api.startConversation.mockReset().mockResolvedValue({ data: { id: 12 } });
    api.saveOnboardingSafeguarding.mockReset().mockResolvedValue({});
    api.completeOnboarding.mockReset().mockResolvedValue({ data: { message: 'complete' } });
    api.getUser.mockReset().mockResolvedValue({ data: { id: 77, name: 'Example member' } });
    api.searchUsers.mockReset().mockResolvedValue({ data: { items: [] } });
    api.donateCredits.mockReset().mockResolvedValue({ data: { message: 'sent' } });
    api.unsaveSavedItem.mockReset().mockResolvedValue({});
    api.getUserPublicCollections.mockReset().mockResolvedValue({ data: [] });
    api.getUserAppreciations.mockReset().mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 20 } });
    api.sendAppreciation.mockReset().mockResolvedValue({ data: { id: 55 } });
    api.reactToAppreciation.mockReset().mockResolvedValue({ data: { reaction_type: 'heart' } });
    api.getResources.mockReset().mockResolvedValue({ data: [{ id: 10, sort_order: 0 }, { id: 20, sort_order: 1 }] });
    api.getResourceCategories.mockReset().mockResolvedValue({ data: [] });
    api.getResourceCategoryTree.mockReset().mockResolvedValue({ data: [] });
    api.uploadResource.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.uploadVolunteerCredential.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.uploadInsuranceCertificate.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.downloadResource.mockReset();
    api.deleteResource.mockReset().mockResolvedValue({ data: { deleted: true } });
    api.reorderResources.mockReset().mockResolvedValue({ data: { message: 'reordered' } });
    api.getSavedCollections.mockReset().mockResolvedValue({ data: [] });
    api.getSavedCollectionItems.mockReset().mockResolvedValue({ data: { items: [], collection: null } });
    api.createSavedCollection.mockReset().mockResolvedValue({ data: { id: 12 } });
    api.updateSavedCollection.mockReset().mockResolvedValue({ data: { id: 12 } });
    api.deleteSavedCollection.mockReset().mockResolvedValue({});
    api.deleteSavedItem.mockReset().mockResolvedValue({});
    api.dismissMatch.mockReset().mockResolvedValue({ data: { dismissed: true } });
    api.getExchangeConfig.mockReset().mockResolvedValue({ data: { workflow_enabled: true } });
    api.getExchanges.mockReset().mockResolvedValue({ data: [] });
    api.getExchange.mockReset().mockResolvedValue({ data: { id: 88 } });
    api.getExchangeRatings.mockReset().mockResolvedValue({ data: { ratings: [], has_rated: false } });
    api.performExchangeAction.mockReset().mockResolvedValue({ data: { id: 88 } });
    api.rateExchange.mockReset().mockResolvedValue({ data: { ratings: [] } });
    api.getSkillCategories.mockReset().mockResolvedValue({ data: [] });
    api.getSkillCategory.mockReset().mockResolvedValue({ data: { id: 7, name: 'Practical help', skills: [] } });
    api.getSkillMembers.mockReset().mockResolvedValue({ data: [] });
    api.sendAiChat.mockReset().mockResolvedValue({ data: { conversation_id: 123 } });
    api.getAiConversations.mockReset().mockResolvedValue({ data: [] });
    api.getAiConversation.mockReset().mockResolvedValue({ data: { id: 77, messages: [] } });
    api.getExplore.mockReset().mockResolvedValue({ data: {} });
    api.getMemberPremiumTiers.mockReset().mockResolvedValue({ data: { tiers: [] } });
    api.getMemberPremiumMe.mockReset().mockResolvedValue({ data: { subscription: null, entitled_tier: null, unlocked_features: [] } });
    api.createMemberPremiumCheckout.mockReset().mockResolvedValue({ data: { checkout_url: 'https://checkout.stripe.test/session' } });
    api.createMemberPremiumPortal.mockReset().mockResolvedValue({ data: { portal_url: 'https://billing.stripe.test/session' } });
    api.cancelMemberPremium.mockReset().mockResolvedValue({ data: { cancelled: true } });
    api.callCouponApi.mockReset().mockResolvedValue({ data: { items: [] } });
    api.createReview.mockReset().mockResolvedValue({ data: { id: 91 } });
    api.createComment.mockReset().mockResolvedValue({ data: { id: 12 } });
    api.updateComment.mockReset().mockResolvedValue({ data: { id: 12, content: 'Updated' } });
    api.deleteComment.mockReset().mockResolvedValue({ data: { deleted: true } });
    api.toggleReaction.mockReset().mockResolvedValue({ data: { action: 'added' } });
    api.getBlogPosts.mockReset().mockResolvedValue({ data: [] });
    api.getBlogPost.mockReset().mockResolvedValue({ data: { id: 42, slug: 'community-news', title: 'Community news' } });
    api.getComments.mockReset().mockResolvedValue({ data: { comments: [], count: 0 } });
    api.getReactionSummary.mockReset().mockResolvedValue({ data: { counts: {}, total: 0, user_reaction: null } });
    api.getReactors.mockReset().mockResolvedValue({ data: [], meta: { total: 0, has_more: false, page: 1 } });
    api.getClubs.mockReset().mockResolvedValue({ data: [] });
    api.getGoals.mockReset().mockResolvedValue({ data: [] });
    api.getPolls.mockReset().mockResolvedValue({ data: [] });
    api.getPoll.mockReset().mockResolvedValue({ data: { id: 42, question: 'Which project?' } });
    api.getPollCategories.mockReset().mockResolvedValue({ data: [] });
    api.getPollRankedResults.mockReset().mockResolvedValue({ data: { poll: { id: 42, question: 'Which project?', options: [] }, ranked_results: { total_voters: 0, results: [] }, my_rankings: null } });
    api.getPollExport.mockReset().mockResolvedValue({ status: 200, body: Buffer.from(''), headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="poll-42-export.csv"' } });
    api.createPoll.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.deletePoll.mockReset().mockResolvedValue({});
    api.votePoll.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.rankPoll.mockReset().mockResolvedValue({ data: { ranked_results: [] } });
    api.getKnowledgeBaseArticles.mockReset().mockResolvedValue({ data: [], meta: { has_more: false, per_page: 12 } });
    api.getKnowledgeBaseArticle.mockReset();
    api.getHelpFaqs.mockReset().mockResolvedValue({ data: [] });
    api.getLegalDocument.mockReset().mockResolvedValue({ data: null });
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
    api.uploadMarketplaceListingImages.mockReset().mockResolvedValue({ data: [{ id: 9 }] });
    api.callIdeationApi.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.callCourseApi.mockReset().mockResolvedValue({ data: { id: 42, moderation_status: 'approved' } });
    api.getMyCourses.mockReset().mockResolvedValue({ data: [] });
    api.callGroupApi.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.uploadGroupImage.mockReset().mockResolvedValue({ data: { image_url: '/uploads/groups/cover.png' } });
    api.uploadGroupFile.mockReset().mockResolvedValue({ data: { id: 99 } });
    api.callJobApi.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.callAdminJobApi.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.callJobDownload.mockReset();
    api.getJobs.mockReset().mockResolvedValue({
      items: [],
      meta: { total: 0, has_more: false, offset: 0, per_page: 12 }
    });
    api.getJob.mockReset().mockResolvedValue({ data: null });
    api.getOnboardingStatus.mockReset().mockResolvedValue({ data: { onboarding_completed: false } });
    api.getOnboardingConfig.mockReset().mockResolvedValue({ data: { config: {}, steps: [] } });
    api.getOnboardingCategories.mockReset().mockResolvedValue({ data: [] });
    api.getOnboardingSafeguardingOptions.mockReset().mockResolvedValue({ data: [] });
    api.callGroupExchangeApi.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.callEventApi.mockReset().mockResolvedValue({ data: { id: 42 } });
    api.getEventCategories.mockReset().mockResolvedValue({ data: [] });
    api.uploadEventImage.mockReset().mockResolvedValue({ data: { cover_image: '/uploads/events/garden.webp' } });
    api.getEvents.mockReset().mockResolvedValue({ data: [], pagination: { page: 1, totalPages: 1 } });
    api.getEvent.mockReset().mockResolvedValue({ event: { id: 42, title: 'Community garden day', starts_at: '2026-08-01T10:00:00' } });
    api.getEventRsvps.mockReset().mockResolvedValue({ data: [] });
    api.createEvent.mockReset().mockResolvedValue({ id: 42 });
    api.updateEvent.mockReset().mockResolvedValue({ id: 42 });
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
    api.uploadVoiceMessage.mockReset().mockResolvedValue({ data: { id: 12, is_voice: true } });
    api.uploadMessageAttachments.mockReset().mockResolvedValue({ data: { id: 12 } });
    api.callConversationApi.mockReset().mockResolvedValue({ data: { id: 33 } });
    api.callPodcastApi.mockReset().mockResolvedValue({ data: { id: 42, subscribed: true, moderation_status: 'approved' } });
    api.uploadPodcastEpisode.mockReset().mockResolvedValue({ data: { id: 99 } });
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

  it('renders the Laravel-backed Explore hub with live discovery sections', async () => {
    const api = require('../src/lib/api');
    api.getExplore.mockResolvedValue({
      data: {
        popular_listings: [
          { id: 501, title: 'Borrow a repair kit', type: 'offer' },
          { id: 502, title: 'Need a folding table', type: 'request' }
        ],
        upcoming_events: [
          { id: 77, title: 'Community supper', start_date: '2026-08-15T18:00:00Z' }
        ]
      }
    });

    const unsigned = await request(app).get('/explore');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/explore')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.getExplore).toHaveBeenCalledWith('test-token');
    expect(response.text).toContain('Explore');
    expect(response.text).toContain('class="nexus-alpha-card-list');
    expect(response.text).toContain('Exchanges');
    expect(response.text).toContain('AI assistant');
    expect(response.text).toContain('Polls');
    expect(response.text).toContain('Marketplace');
    expect(response.text).toContain('Federation');
    expect(response.text).toContain('Recent listings');
    expect(response.text).toContain('Borrow a repair kit');
    expect(response.text).toContain('Need a folding table');
    expect(response.text).toContain('href="/listings/501"');
    expect(response.text).toContain('Upcoming events');
    expect(response.text).toContain('Community supper');
    expect(response.text).toContain('15 Aug 2026');
    expect(response.text).toContain('href="/events/77"');
    expect(response.text).not.toContain('This page is a shared-accessible-frontend preparation skeleton');
  });

  it('renders the Laravel-backed public knowledge base index and search pages', async () => {
    const api = require('../src/lib/api');
    const staticPageRoutes = require('../src/routes/static-pages');
    api.getKnowledgeBaseArticles
      .mockResolvedValueOnce({
        data: [
          {
            id: 42,
            title: 'Using the repair library',
            content_preview: 'Find shared tools and book them safely.',
            category_name: 'Getting started',
            views_count: 3
          }
        ],
        meta: { has_more: true, cursor: 'next-cursor', per_page: 12 }
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 77,
            title: 'Repair cafe checklist',
            content_preview: 'Bring notes, photos and spare parts.',
            category_name: 'Events',
            views_count: 0
          }
        ],
        meta: { has_more: false, per_page: 20 }
      });

    const index = await request(app).get('/kb?cursor=abc');
    const search = await request(app).get('/kb?q=repair');

    expect(staticPageRoutes.pages['/kb']).toBeUndefined();
    expect(index.status).toBe(200);
    expect(index.text).toContain('Knowledge base');
    expect(index.text).toContain('Guides and articles to help you get the most out of Project NEXUS Accessible.');
    expect(index.text).toContain('Search the knowledge base');
    expect(index.text).toContain('Using the repair library');
    expect(index.text).toContain('Find shared tools and book them safely.');
    expect(index.text).toContain('Getting started');
    expect(index.text).toContain('3 views');
    expect(index.text).toContain('href="/kb/42"');
    expect(index.text).toContain('href="/kb?cursor=next-cursor"');
    expect(index.text).not.toContain('Knowledge base articles will be wired');
    expect(index.text).not.toContain('shared accessible frontend preparation page');

    expect(search.status).toBe(200);
    expect(search.text).toContain('value="repair"');
    expect(search.text).toContain('Repair cafe checklist');
    expect(search.text).toContain('No views');
    expect(search.text).not.toContain('href="/kb?cursor=');
    expect(api.getKnowledgeBaseArticles).toHaveBeenNthCalledWith(1, { per_page: 12, cursor: 'abc' });
    expect(api.getKnowledgeBaseArticles).toHaveBeenNthCalledWith(2, { q: 'repair', limit: 20 });
  });

  it('renders the Laravel-backed public knowledge base article page', async () => {
    const api = require('../src/lib/api');
    api.getKnowledgeBaseArticle.mockResolvedValue({
      data: {
        id: 42,
        title: 'Using the repair library',
        content: '<p>Keep your tools labelled.</p>',
        updated_at: '2026-07-06T12:30:00Z',
        author: { id: 5, name: 'Morgan Lee' },
        children: [
          { id: 43, title: 'Returning borrowed tools' }
        ]
      }
    });

    const response = await request(app).get('/kb/42');

    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/kb"');
    expect(response.text).toContain('Back to the knowledge base');
    expect(response.text).toContain('Using the repair library');
    expect(response.text).toContain('Written by Morgan Lee');
    expect(response.text).toContain('Last updated: 2026-07-06');
    expect(response.text).toContain('<p>Keep your tools labelled.</p>');
    expect(response.text).toContain('Related articles');
    expect(response.text).toContain('href="/kb/43"');
    expect(response.text).toContain('Returning borrowed tools');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
    expect(api.getKnowledgeBaseArticle).toHaveBeenCalledWith(42);
  });

  it('renders the Laravel-backed help centre and trust safety support pages', async () => {
    const api = require('../src/lib/api');
    const staticPageRoutes = require('../src/routes/static-pages');
    api.getHelpFaqs.mockResolvedValue({
      data: [
        {
          category: 'Account help',
          faqs: [
            {
              id: 12,
              question: 'How do I reset my password?',
              answer: '<p>Use the reset link on the sign in page.</p>'
            }
          ]
        }
      ]
    });

    const help = await request(app).get('/help?q=password');
    const trust = await request(app).get('/trust-and-safety');

    expect(staticPageRoutes.pages['/help']).toBeUndefined();
    expect(staticPageRoutes.pages['/trust-and-safety']).toBeUndefined();
    expect(help.status).toBe(200);
    expect(help.text).toContain('Help centre');
    expect(help.text).toContain('Find answers to common questions about Project NEXUS Accessible.');
    expect(help.text).toContain('value="password"');
    expect(help.text).toContain('Account help');
    expect(help.text).toContain('class="govuk-accordion"');
    expect(help.text).toContain('How do I reset my password?');
    expect(help.text).toContain('<p>Use the reset link on the sign in page.</p>');
    expect(help.text).toContain('Still need help?');
    expect(help.text).toContain('href="/contact"');
    expect(help.text).not.toContain('Help centre content will follow');
    expect(api.getHelpFaqs).toHaveBeenCalledWith({ q: 'password' });

    expect(trust.status).toBe(200);
    expect(trust.text).toContain('Trust and safety');
    expect(trust.text).toContain('Report a safeguarding concern');
    expect(trust.text).toContain('How exchanges work');
    expect(trust.text).toContain('What we do not do');
    expect(trust.text).toContain('Background checks and vetting');
    expect(trust.text).toContain('href="/legal/community-guidelines"');
    expect(trust.text).not.toContain('Trust and safety content will follow');
  });

  it('renders Laravel-style legal and accessibility pages', async () => {
    const api = require('../src/lib/api');
    const staticPageRoutes = require('../src/routes/static-pages');
    api.getLegalDocument
      .mockResolvedValueOnce({
        data: {
          id: 12,
          type: 'terms',
          title: 'Community Terms',
          content: '<p>Use time credits fairly.</p>',
          version_number: '2.1',
          effective_date: '2026-07-01T00:00:00Z'
        }
      })
      .mockResolvedValueOnce({ data: null });

    const hub = await request(app).get('/legal');
    const accessibility = await request(app).get('/accessibility');
    const terms = await request(app).get('/legal/terms');
    const privacy = await request(app).get('/legal/privacy');

    expect(staticPageRoutes.pages['/legal']).toBeUndefined();
    expect(staticPageRoutes.pages['/accessibility']).toBeUndefined();
    expect(staticPageRoutes.pages['/legal/terms']).toBeUndefined();
    expect(hub.status).toBe(200);
    expect(hub.text).toContain('The policies and terms that apply when you use Project NEXUS Accessible.');
    expect(hub.text).toContain('class="nexus-alpha-card-list"');
    expect(hub.text).toContain('href="/legal/terms"');
    expect(hub.text).toContain('Terms of service');
    expect(hub.text).toContain('Accessibility statement');
    expect(hub.text).not.toContain('The legal hub will follow');

    expect(accessibility.status).toBe(200);
    expect(accessibility.text).toContain('Back to legal');
    expect(accessibility.text).toContain('WCAG 2.2 Level AA');
    expect(accessibility.text).toContain('Keyboard navigation');
    expect(accessibility.text).toContain('Report an accessibility problem');
    expect(accessibility.text).not.toContain('must match the production Laravel');

    expect(terms.status).toBe(200);
    expect(terms.text).toContain('Community Terms');
    expect(terms.text).toContain('Last updated: 2026-07-01');
    expect(terms.text).toContain('Version 2.1');
    expect(terms.text).toContain('<p>Use time credits fairly.</p>');
    expect(api.getLegalDocument).toHaveBeenNthCalledWith(1, 'terms');

    expect(privacy.status).toBe(200);
    expect(privacy.text).toContain('Privacy policy');
    expect(privacy.text).toContain('A tailored version of this document has not been published for Project NEXUS Accessible yet.');
    expect(privacy.text).toContain('What we collect: the details you give us');
    expect(privacy.text).toContain('href="/contact"');
    expect(api.getLegalDocument).toHaveBeenNthCalledWith(2, 'privacy');
  });

  it('renders the Laravel-style guide and features pages', async () => {
    const staticPageRoutes = require('../src/routes/static-pages');

    const guide = await request(app).get('/guide');
    const features = await request(app).get('/features');

    expect(staticPageRoutes.pages['/guide']).toBeUndefined();
    expect(staticPageRoutes.pages['/features']).toBeUndefined();
    expect(guide.status).toBe(200);
    expect(guide.text).toContain('How timebanking works');
    expect(guide.text).toContain("Everyone's time is equal");
    expect(guide.text).toContain('The three steps');
    expect(guide.text).toContain('Give your time');
    expect(guide.text).toContain('Earn time credits');
    expect(guide.text).toContain('Spend your credits');
    expect(guide.text).toContain('href="/register"');
    expect(guide.text).toContain('href="/listings"');
    expect(guide.text).not.toContain('Guide content will be ported');

    expect(features.status).toBe(200);
    expect(features.text).toContain('What you can do in this community.');
    expect(features.text).toContain('Find members who can help with what you need');
    expect(features.text).toContain('Earn and spend time credits');
    expect(features.text).toContain('Discover and host community events');
    expect(features.text).toContain('href="/guide"');
    expect(features.text).not.toContain('Feature guidance will be ported');
  });

  it('renders the Laravel-style FAQ page', async () => {
    const response = await request(app).get('/faq');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Frequently asked questions');
    expect(response.text).toContain('Answers to common questions about timebanking.');
    expect(response.text).toContain('class="govuk-accordion"');
    expect(response.text).toContain('id="faq-accordion"');
    expect(response.text).toContain('What is a time credit?');
    expect(response.text).toContain('Is everyone&#39;s time worth the same?');
    expect(response.text).toContain('How do I send credits to someone?');
    expect(response.text).toContain('You control what other members can see in your privacy settings');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Laravel-style about page', async () => {
    const response = await request(app).get('/about');

    expect(response.status).toBe(200);
    expect(response.text).toContain('About Project NEXUS Accessible');
    expect(response.text).toContain('modern time banking platform where every hour of service is valued equally');
    expect(response.text).toContain('How it works');
    expect(response.text).toContain('Create your profile');
    expect(response.text).toContain('Find what you need');
    expect(response.text).toContain('Our values');
    expect(response.text).toContain('Trust and safety');
    expect(response.text).toContain('Powered by Project NEXUS');
    expect(response.text).toContain('Laravel Edition source code');
    expect(response.text).toContain('href="/register"');
    expect(response.text).toContain('href="/contact"');
    expect(response.text).not.toContain('A timebanking platform for community exchange.');
  });

  it('renders the Laravel-style newsletter unsubscribe states', async () => {
    const api = require('../src/lib/api');
    api.callNewsletterApi.mockResolvedValueOnce({ data: { success: true } });
    api.callNewsletterApi.mockRejectedValueOnce(new api.ApiError('Invalid token', 422, {}));

    const missing = await request(app).get('/newsletter/unsubscribe');
    const success = await request(app).get('/newsletter/unsubscribe?token=valid-token');
    const invalid = await request(app).get('/newsletter/unsubscribe?token=expired-token');

    expect(missing.status).toBe(200);
    expect(missing.text).toContain('Unsubscribe from emails');
    expect(missing.text).toContain('No unsubscribe link was provided. Use the link in the email you received.');
    expect(missing.text).toContain('Return to the home page');

    expect(success.status).toBe(200);
    expect(success.text).toContain('govuk-panel--confirmation');
    expect(success.text).toContain('You have been unsubscribed');
    expect(success.text).toContain('You will no longer receive newsletter emails from this community.');
    expect(success.text).toContain('You may still receive essential account and security emails.');
    expect(api.callNewsletterApi).toHaveBeenNthCalledWith(1, 'GET', '?token=valid-token');

    expect(invalid.status).toBe(200);
    expect(invalid.text).toContain('This unsubscribe link is invalid or has expired.');
    expect(api.callNewsletterApi).toHaveBeenNthCalledWith(2, 'GET', '?token=expired-token');
    expect(invalid.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Laravel-style email verification states', async () => {
    const api = require('../src/lib/api');
    api.verifyEmail.mockResolvedValueOnce({ data: { verified: true } });
    api.verifyEmail.mockResolvedValueOnce({ data: { verified: false } });

    const missing = await request(app).get('/verify-email');
    const success = await request(app).get('/verify-email?token=valid-token');
    const invalid = await request(app).get('/verify-email?token=expired-token');

    expect(missing.status).toBe(200);
    expect(missing.text).toContain('Verify your email address');
    expect(missing.text).toContain('No verification link was provided. Use the link in your verification email.');
    expect(missing.text).toContain('You can request a new verification email from the sign-in page.');
    expect(missing.text).toContain('Back to sign in');

    expect(success.status).toBe(200);
    expect(success.text).toContain('govuk-panel--confirmation');
    expect(success.text).toContain('Email address verified');
    expect(success.text).toContain('Thank you. Your email address has been confirmed.');
    expect(success.text).toContain('Continue to sign in');
    expect(api.verifyEmail).toHaveBeenNthCalledWith(1, 'valid-token');

    expect(invalid.status).toBe(200);
    expect(invalid.text).toContain('This verification link is invalid or has expired.');
    expect(api.verifyEmail).toHaveBeenNthCalledWith(2, 'expired-token');
    expect(invalid.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Laravel-style delete-account confirmation page', async () => {
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const unsigned = await request(app).get('/profile/delete-account');
    const signed = await request(app)
      .get('/profile/delete-account?status=delete-confirm-required')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    expect(signed.status).toBe(200);
    expect(signed.text).toContain('Back to profile');
    expect(signed.text).toContain('Delete your account');
    expect(signed.text).toContain('This will permanently remove your account and personal data');
    expect(signed.text).toContain('What happens when you delete your account');
    expect(signed.text).toContain('Your profile, messages and personal details will be deleted or anonymised.');
    expect(signed.text).toContain('Confirm your password to continue');
    expect(signed.text).toContain('Tell us why you are leaving (optional)');
    expect(signed.text).toContain('I understand that my account and data will be permanently deleted');
    expect(signed.text).toContain('Confirm that you understand your account will be deleted.');
    expect(signed.text).toContain('Delete my account');
    expect(signed.text).toContain('Cancel and keep my account');
    expect(signed.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Laravel-style profile settings page', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    api.getProfile.mockResolvedValue({
      id: 77,
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.org',
      phone: '+44 20 0000 0000',
      profile_type: 'individual',
      organization_name: '',
      tagline: 'Community computing',
      bio: 'Helps neighbours with maths',
      location: 'London',
      avatar_url: '/avatars/ada.jpg',
      privacy_profile: 'members',
      privacy_search: true,
      privacy_contact: true,
      newsletter_opt_in: true,
      preferred_language: 'ga',
      prefers_chronological_feed: true,
      auto_translate_ugc: true,
      auto_translate_target_locale: 'ga'
    });
    api.callUserSettingsApi.mockImplementation(async (token, method, pathValue) => {
      if (method === 'GET' && pathValue === '') {
        return {
          data: {
            email: 'ada@example.org',
            preferred_language: 'ga',
            newsletter_opt_in: true,
            privacy_contact: true,
            prefers_chronological_feed: true,
            auto_translate_ugc: true,
            auto_translate_target_locale: 'ga'
          }
        };
      }
      if (method === 'GET' && pathValue === '/notifications') {
        return {
          data: {
            email_messages: true,
            email_connections: true,
            email_digest: true,
            digest_frequency: 'daily'
          }
        };
      }
      if (method === 'GET' && pathValue === '/match-preferences') {
        return {
          data: {
            notification_frequency: 'weekly',
            notify_hot_matches: true,
            notify_mutual_matches: false
          }
        };
      }
      if (method === 'GET' && pathValue === '/skills') {
        return {
          data: [
            {
              id: 88,
              skill_name: 'Analytical engines',
              is_offering: true,
              is_requesting: false,
              endorsement_count: 2
            }
          ]
        };
      }
      return { data: { id: 42 } };
    });
    api.callProfileApi.mockImplementation(async (token, method, pathValue) => {
      if (method === 'GET' && pathValue === '/sessions') {
        return {
          data: [
            {
              device_type: 'desktop',
              ip_address: '127.0.0.1',
              last_active: '2026-03-27T10:00:00Z'
            }
          ]
        };
      }
      if (method === 'GET' && pathValue === '/safeguarding/preferences') {
        return {
          data: [
            {
              option_id: 9,
              label: 'Broker approval',
              description: 'A broker reviews new exchanges.',
              requires_broker_approval: true
            }
          ]
        };
      }
      return { data: { id: 42 } };
    });
    api.callWebAuthnApi.mockResolvedValue({
      data: [
        {
          credential_id: 'cred-1',
          device_name: 'Work laptop',
          authenticator_type: 'platform',
          created_at: '2026-02-01T00:00:00Z',
          last_used_at: '2026-03-01T00:00:00Z'
        }
      ]
    });

    const unsigned = await request(app).get('/profile/settings');
    const signed = await request(app)
      .get('/profile/settings?status=data-export-requested')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    expect(signed.status).toBe(200);
    expect(signed.text).toContain('Back to profile');
    expect(signed.text).toContain('Success');
    expect(signed.text).toContain('Your data export request has been received. We will email you when it is ready.');
    expect(signed.text).toContain('Edit your profile');
    expect(signed.text).toContain('Update the details people see in the accessible member directory.');
    expect(signed.text).toContain('Linked accounts');
    expect(signed.text).toContain('Appearance');
    expect(signed.text).toContain('Your data rights');
    expect(signed.text).toContain('Insurance certificates');
    expect(signed.text).toContain('Your availability');
    expect(signed.text).toContain('Profile photo');
    expect(signed.text).toContain('Upload a new photo');
    expect(signed.text).toContain('Personal details');
    expect(signed.text).toContain('First name');
    expect(signed.text).toContain('Ada');
    expect(signed.text).toContain('Public profile');
    expect(signed.text).toContain('Short introduction');
    expect(signed.text).toContain('Community computing');
    expect(signed.text).toContain('Privacy');
    expect(signed.text).toContain('Who can see your full profile');
    expect(signed.text).toContain('Members only');
    expect(signed.text).toContain('Email preferences');
    expect(signed.text).toContain('Send me occasional newsletters and updates');
    expect(signed.text).toContain('Your skills');
    expect(signed.text).toContain('Analytical engines');
    expect(signed.text).toContain('I can offer this');
    expect(signed.text).toContain('Security');
    expect(signed.text).toContain('Two-step verification');
    expect(signed.text).toContain('Passkeys');
    expect(signed.text).toContain('Work laptop');
    expect(signed.text).toContain('Where you are signed in');
    expect(signed.text).toContain('Desktop');
    expect(signed.text).toContain('Language');
    expect(signed.text).toContain('Irish');
    expect(signed.text).toContain('Email and notifications');
    expect(signed.text).toContain('Activity digest emails');
    expect(signed.text).toContain('Match notifications');
    expect(signed.text).toContain('Every week');
    expect(signed.text).toContain('Personalisation and translation');
    expect(signed.text).toContain('Safeguarding');
    expect(signed.text).toContain('Broker approval');
    expect(signed.text).toContain('Exchanges need broker approval');
    expect(signed.text).toContain('Your data and privacy');
    expect(signed.text).toContain('Get a copy of your data');
    expect(signed.text).toContain('Request your data');
    expect(signed.text).toContain('Delete your account');
    expect(signed.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Laravel-style two-factor setup page', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    api.callProfileApi.mockResolvedValueOnce({
      data: {
        enabled: false,
        setup: {
          qr_data_uri: 'data:image/svg+xml;base64,PHN2Zy8+',
          secret: 'ABCD EFGH IJKL'
        }
      }
    });

    const unsigned = await request(app).get('/profile/two-factor');
    const setup = await request(app)
      .get('/profile/two-factor?status=2fa-code-invalid')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    expect(setup.status).toBe(200);
    expect(api.callProfileApi).toHaveBeenCalledWith('test-token', 'GET', '/auth/2fa/setup');
    expect(setup.text).toContain('Back to settings');
    expect(setup.text).toContain('There is a problem');
    expect(setup.text).toContain('That code was not correct or has expired. Try the current code from your app.');
    expect(setup.text).toContain('Authenticator app (two-step verification)');
    expect(setup.text).toContain('Add a second step to your sign-in using an authenticator app on your phone.');
    expect(setup.text).toContain('Install an authenticator app such as Google Authenticator');
    expect(setup.text).toContain('QR code for setting up two-step verification');
    expect(setup.text).toContain('If you cannot scan the code, enter this setup key in your app instead:');
    expect(setup.text).toContain('ABCD EFGH IJKL');
    expect(setup.text).toContain('Enter the 6-digit code');
    expect(setup.text).toContain('Turn on two-step verification');
    expect(setup.text).not.toContain('shared accessible frontend preparation page');

    api.callProfileApi.mockResolvedValueOnce({
      data: {
        enabled: true,
        backup_codes_remaining: 3
      }
    });

    const enabled = await request(app)
      .get('/profile/two-factor?status=2fa-disabled')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);

    expect(enabled.status).toBe(200);
    expect(enabled.text).toContain('Success');
    expect(enabled.text).toContain('Two-step verification has been turned off.');
    expect(enabled.text).toContain('Two-step verification is turned on for your account.');
    expect(enabled.text).toContain('You have 3 backup codes left.');
    expect(enabled.text).toContain('Turn off two-step verification');
    expect(enabled.text).toContain('Enter your password to turn off two-step verification.');
    expect(enabled.text).toContain('Your password');
  });

  it('renders the Laravel-style blocked members page', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    api.callProfileApi.mockResolvedValueOnce({
      data: [
        {
          user_id: 88,
          name: 'Grace Hopper',
          avatar_url: '/avatars/grace.jpg',
          reason: 'Blocked after repeated unwanted messages'
        }
      ]
    });

    const unsigned = await request(app).get('/profile/blocked');
    const signed = await request(app)
      .get('/profile/blocked?status=member-unblocked')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    expect(signed.status).toBe(200);
    expect(api.callProfileApi).toHaveBeenCalledWith('test-token', 'GET', '/users/blocked');
    expect(signed.text).toContain('Back to settings');
    expect(signed.text).toContain('Success');
    expect(signed.text).toContain('The member has been unblocked.');
    expect(signed.text).toContain('Blocked members');
    expect(signed.text).toContain('Members you block cannot see your profile or contact you');
    expect(signed.text).toContain('Grace Hopper');
    expect(signed.text).toContain('Blocked after repeated unwanted messages');
    expect(signed.text).toContain('/members/88/unblock');
    expect(signed.text).toContain('name="from" value="list"');
    expect(signed.text).toContain('Unblock');
    expect(signed.text).not.toContain('shared accessible frontend preparation page');

    api.callProfileApi.mockResolvedValueOnce({ data: [] });
    const empty = await request(app)
      .get('/profile/blocked')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);

    expect(empty.status).toBe(200);
    expect(empty.text).toContain('You have not blocked anyone.');
  });

  it('renders the Laravel-style data-rights settings page', async () => {
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const unsigned = await request(app).get('/settings/data-rights');
    const signed = await request(app)
      .get('/settings/data-rights?status=gdpr-requested')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    expect(signed.status).toBe(200);
    expect(signed.text).toContain('Back to settings');
    expect(signed.text).toContain('Success');
    expect(signed.text).toContain('Your request has been submitted. We will be in touch.');
    expect(signed.text).toContain('Account settings');
    expect(signed.text).toContain('Your data rights');
    expect(signed.text).toContain('Under data protection law you have rights over the personal data we hold about you.');
    expect(signed.text).toContain('Make a request');
    expect(signed.text).toContain('What would you like to request?');
    expect(signed.text).toContain('Transfer my data to another service');
    expect(signed.text).toContain('Correct my data');
    expect(signed.text).toContain('Restrict how my data is used');
    expect(signed.text).toContain('Object to how my data is used');
    expect(signed.text).toContain('Tell us more (optional)');
    expect(signed.text).toContain('Submit request');
    expect(signed.text).toContain('Requests you have made');
    expect(signed.text).toContain('You have not made any data rights requests yet.');
    expect(signed.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Laravel-style appearance settings page', async () => {
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const unsigned = await request(app).get('/settings/appearance');
    const signed = await request(app)
      .get('/settings/appearance?status=appearance-saved')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    expect(signed.status).toBe(200);
    expect(signed.text).toContain('Back to settings');
    expect(signed.text).toContain('Success');
    expect(signed.text).toContain('Your appearance settings have been saved.');
    expect(signed.text).toContain('Account settings');
    expect(signed.text).toContain('Appearance');
    expect(signed.text).toContain('Choose how this service looks for you.');
    expect(signed.text).toContain('Theme');
    expect(signed.text).toContain('Light');
    expect(signed.text).toContain('Dark text on a light background.');
    expect(signed.text).toContain('Dark');
    expect(signed.text).toContain('Light text on a dark background.');
    expect(signed.text).toContain('Match my device');
    expect(signed.text).toContain('Follow the light or dark setting on your device.');
    expect(signed.text).toContain('Save appearance');
    expect(signed.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Laravel-style availability settings page', async () => {
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const unsigned = await request(app).get('/settings/availability');
    const signed = await request(app)
      .get('/settings/availability?status=availability-saved')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    expect(signed.status).toBe(200);
    expect(signed.text).toContain('Back to account settings');
    expect(signed.text).toContain('Success');
    expect(signed.text).toContain('Your availability has been saved.');
    expect(signed.text).toContain('Account settings');
    expect(signed.text).toContain('Your availability');
    expect(signed.text).toContain('Set your weekly availability so others can find times that work for both of you.');
    expect(signed.text).toContain('Add one or more time slots for each day.');
    expect(signed.text).toContain('Monday');
    expect(signed.text).toContain('Tuesday');
    expect(signed.text).toContain('Wednesday');
    expect(signed.text).toContain('Thursday');
    expect(signed.text).toContain('Friday');
    expect(signed.text).toContain('Saturday');
    expect(signed.text).toContain('Sunday');
    expect(signed.text).toContain('Start time');
    expect(signed.text).toContain('End time');
    expect(signed.text).toContain('Save availability');
    expect(signed.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Laravel-style linked-accounts settings page', async () => {
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const unsigned = await request(app).get('/settings/linked-accounts');
    const signed = await request(app)
      .get('/settings/linked-accounts?status=link-requested')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    expect(signed.status).toBe(200);
    expect(signed.text).toContain('Back to settings');
    expect(signed.text).toContain('Success');
    expect(signed.text).toContain('Your link request has been sent.');
    expect(signed.text).toContain('Account settings');
    expect(signed.text).toContain('Linked accounts');
    expect(signed.text).toContain('Link a family member, dependant or someone you care for to your account');
    expect(signed.text).toContain('Accounts that manage you');
    expect(signed.text).toContain('No one has asked to manage your account.');
    expect(signed.text).toContain('Accounts you manage');
    expect(signed.text).toContain('You do not manage any linked accounts yet.');
    expect(signed.text).toContain('Link a new account');
    expect(signed.text).toContain('You can manage up to 20 linked accounts.');
    expect(signed.text).toContain('Email address');
    expect(signed.text).toContain('Relationship');
    expect(signed.text).toContain('Family member');
    expect(signed.text).toContain('Guardian');
    expect(signed.text).toContain('Carer');
    expect(signed.text).toContain('Organisation');
    expect(signed.text).toContain('What this account can do');
    expect(signed.text).toContain('View their activity');
    expect(signed.text).toContain('Manage their listings');
    expect(signed.text).toContain('Send and receive time credits');
    expect(signed.text).toContain('View their messages');
    expect(signed.text).toContain('Send link request');
    expect(signed.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Laravel-style insurance settings page', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    api.callUserSettingsApi.mockImplementation(async (token, method, pathValue) => {
      if (method === 'GET' && pathValue === '/insurance') {
        return {
          data: [
            {
              insurance_type: 'public_liability',
              provider_name: 'Acme Cover Ltd',
              expiry_date: '2027-03-27',
              status: 'verified'
            }
          ]
        };
      }
      return { data: { id: 42 } };
    });

    const unsigned = await request(app).get('/settings/insurance');
    const signed = await request(app)
      .get('/settings/insurance?status=insurance-uploaded')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    expect(signed.status).toBe(200);
    expect(signed.text).toContain('Back to settings');
    expect(signed.text).toContain('Success');
    expect(signed.text).toContain('Your certificate has been uploaded and is awaiting review.');
    expect(signed.text).toContain('Account settings');
    expect(signed.text).toContain('Insurance certificates');
    expect(signed.text).toContain('Upload proof of insurance so the team can verify your cover.');
    expect(signed.text).toContain('Your certificates');
    expect(signed.text).toContain('Public liability');
    expect(signed.text).toContain('Verified');
    expect(signed.text).toContain('Provider');
    expect(signed.text).toContain('Acme Cover Ltd');
    expect(signed.text).toContain('Expires');
    expect(signed.text).toContain('27 March 2027');
    expect(signed.text).toContain('Upload a certificate');
    expect(signed.text).toContain('Type of insurance');
    expect(signed.text).toContain('Professional indemnity');
    expect(signed.text).toContain('Insurance provider (optional)');
    expect(signed.text).toContain('Policy number (optional)');
    expect(signed.text).toContain('Expiry date (optional)');
    expect(signed.text).toContain('Certificate file');
    expect(signed.text).toContain('Upload certificate');
    expect(signed.text).not.toContain('shared accessible frontend preparation page');
  });

  it('does not keep static placeholders for Laravel-backed marketplace and podcast pages', () => {
    const staticPageRoutes = require('../src/routes/static-pages');

    expect(staticPageRoutes.pages['/marketplace']).toBeUndefined();
    expect(staticPageRoutes.pages['/podcasts']).toBeUndefined();
  });

  it('renders the Laravel-backed Federation hub with stats, partners, and activity', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockImplementation(async (token, method, pathValue) => {
      if (pathValue === '/status') {
        return {
          data: {
            enabled: true,
            tenant_federation_enabled: true,
            federation_optin: true,
            partnerships_count: 2,
            messages_count: 5,
            transactions_count: 1
          }
        };
      }
      if (pathValue === '/partners') {
        return {
          data: [
            {
              id: 12,
              name: 'North Timebank',
              tagline: 'Neighbouring community exchange',
              location: 'Derry',
              member_count: 40,
              listing_count: 8,
              federation_level_name: 'Social',
              partnership_since: '2026-02-01T00:00:00Z'
            }
          ],
          meta: { total: 1 }
        };
      }
      if (pathValue === '/activity') {
        return {
          data: [
            {
              title: 'New federation message',
              description: 'A partner community sent an update',
              actor: { tenant_name: 'North Timebank' },
              created_at: '2026-07-01T10:00:00Z'
            }
          ]
        };
      }
      return { data: {} };
    });

    const unsigned = await request(app).get('/federation');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation?status=opted-in')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/status');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/partners');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/activity');
    expect(response.text).toContain('Federation');
    expect(response.text).toContain('You are connected to the federation network.');
    expect(response.text).toContain('2');
    expect(response.text).toContain('5');
    expect(response.text).toContain('1');
    expect(response.text).toContain('Opted in');
    expect(response.text).toContain('North Timebank');
    expect(response.text).toContain('Neighbouring community exchange');
    expect(response.text).toContain('href="/federation/partners/12"');
    expect(response.text).toContain('New federation message');
    expect(response.text).toContain('A partner community sent an update');
    expect(response.text).toContain('Browse partner communities');
    expect(response.text).toContain('Federation settings');
    expect(response.text).not.toContain('Federation pages will follow the Laravel accessible frontend contract.');
  });

  it('renders the Laravel-backed Federation partners list', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockImplementation(async (token, method, pathValue) => {
      if (pathValue === '/partners') {
        return {
          data: [
            {
              id: 12,
              name: 'North Timebank',
              tagline: 'Neighbouring community exchange',
              location: 'Derry',
              member_count: 40,
              listing_count: 8,
              federation_level_name: 'Social',
              partnership_since: '2026-02-01T00:00:00Z',
              permissions: ['profiles', 'messaging']
            },
            {
              id: 'ext-7',
              name: 'External Commons',
              tagline: 'External federation partner',
              member_count: 9,
              listing_count: 3,
              is_external: true,
              permissions: ['listings']
            }
          ]
        };
      }

      return { data: {} };
    });

    const unsigned = await request(app).get('/federation/partners');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/partners')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/partners');
    expect(response.text).toContain('href="/federation"');
    expect(response.text).toContain('Federation partners');
    expect(response.text).toContain('North Timebank');
    expect(response.text).toContain('Neighbouring community exchange');
    expect(response.text).toContain('Derry');
    expect(response.text).toContain('40');
    expect(response.text).toContain('8');
    expect(response.text).toContain('Social');
    expect(response.text).toContain('profiles');
    expect(response.text).toContain('messaging');
    expect(response.text).toContain('href="/federation/partners/12"');
    expect(response.text).toContain('External Commons');
    expect(response.text).toContain('External');
    expect(response.text).toContain('href="/federation/partners/ext-7"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed Federation partner detail', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockImplementation(async (token, method, pathValue) => {
      if (pathValue === '/partners/12') {
        return {
          data: {
            id: 12,
            name: 'North Timebank',
            tagline: 'Neighbouring community exchange\nOpen to skill sharing.',
            location: 'Derry',
            country: 'GB',
            member_count: 40,
            listing_count: 8,
            federation_level_name: 'Social',
            partnership_since: '2026-02-01T00:00:00Z',
            permissions: ['profiles', 'listings', 'events']
          }
        };
      }

      return { data: {} };
    });

    const unsigned = await request(app).get('/federation/partners/12');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/partners/12')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/partners/12');
    expect(response.text).toContain('href="/federation/partners"');
    expect(response.text).toContain('North Timebank');
    expect(response.text).toContain('Social');
    expect(response.text).toContain('Neighbouring community exchange');
    expect(response.text).toContain('Open to skill sharing.');
    expect(response.text).toContain('Location');
    expect(response.text).toContain('Derry');
    expect(response.text).toContain('Country');
    expect(response.text).toContain('GB');
    expect(response.text).toContain('Members');
    expect(response.text).toContain('40');
    expect(response.text).toContain('Listings');
    expect(response.text).toContain('8');
    expect(response.text).toContain('Permissions');
    expect(response.text).toContain('profiles');
    expect(response.text).toContain('listings');
    expect(response.text).toContain('events');
    expect(response.text).toContain('href="/federation/members?partner_id=12"');
    expect(response.text).toContain('href="/federation/listings?partner_id=12"');
    expect(response.text).toContain('href="/federation/events?partner_id=12"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed Federation members list', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockImplementation(async (token, method, pathValue) => {
      if (pathValue === '/partners') {
        return {
          data: [
            { id: 12, name: 'North Timebank', is_external: false },
            { id: 'ext-7', name: 'External Commons', is_external: true }
          ]
        };
      }
      if (pathValue === '/members?q=repair&skills=sewing&partner_id=12&service_reach=remote_ok&cursor=abc') {
        return {
          data: [
            {
              id: 77,
              name: 'Avery Stone',
              bio: 'Can repair household textiles and small appliances',
              location: 'Derry',
              service_reach: 'remote_ok',
              skills: ['sewing', 'repairs'],
              tenant_id: 12,
              tenant_name: 'North Timebank',
              messaging_enabled: true
            }
          ],
          meta: {
            total_items: 1,
            cursor: 'next-cursor',
            has_more: true
          }
        };
      }

      return { data: [] };
    });

    const unsigned = await request(app).get('/federation/members');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/members?q=repair&skills=sewing&partner_id=12&service_reach=remote_ok&cursor=abc')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/partners');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/members?q=repair&skills=sewing&partner_id=12&service_reach=remote_ok&cursor=abc');
    expect(response.text).toContain('href="/federation"');
    expect(response.text).toContain('Federation members');
    expect(response.text).toContain('value="repair"');
    expect(response.text).toContain('value="sewing"');
    expect(response.text).toContain('value="12" selected');
    expect(response.text).toContain('North Timebank');
    expect(response.text).not.toContain('value="ext-7"');
    expect(response.text).toContain('value="remote_ok" selected');
    expect(response.text).toContain('Avery Stone');
    expect(response.text).toContain('Can repair household textiles and small appliances');
    expect(response.text).toContain('Community: North Timebank');
    expect(response.text).toContain('Location: Derry');
    expect(response.text).toContain('Reach: Remote help possible');
    expect(response.text).toContain('sewing');
    expect(response.text).toContain('repairs');
    expect(response.text).toContain('href="/federation/members/77?tenant_id=12"');
    expect(response.text).toContain('cursor=next-cursor');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed Federation member detail', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockImplementation(async (token, method, pathValue) => {
      if (pathValue === '/members/77?tenant_id=12') {
        return {
          data: {
            id: 77,
            name: 'Avery Stone',
            avatar: '/uploads/avery.jpg',
            bio: 'Can repair household textiles and small appliances.',
            location: 'Derry',
            service_reach: 'travel_ok',
            skills: ['sewing', 'repairs'],
            tenant_id: 12,
            tenant_name: 'North Timebank',
            messaging_enabled: true,
            transactions_enabled: true,
            reputation_score: 4.7,
            reputation_count: 3,
            connection_status: { status: 'none', connection_id: null }
          }
        };
      }
      if (pathValue === '/settings') {
        return {
          data: {
            enabled: true,
            settings: {
              federation_optin: true,
              messaging_enabled_federated: true,
              transactions_enabled_federated: true
            }
          }
        };
      }
      if (pathValue === '/members/77/reviews?tenant_id=12') {
        return {
          data: [
            {
              id: 501,
              rating: 5,
              comment: 'Avery was careful and generous with time.',
              created_at: '2026-06-15T09:00:00Z',
              reviewer: { name: 'Mira Cole' },
              partner: { name: 'North Timebank' },
              verified: true
            }
          ]
        };
      }

      return { data: {} };
    });

    const unsigned = await request(app).get('/federation/members/77?tenant_id=12');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/members/77?tenant_id=12&status=message-sent')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/members/77?tenant_id=12');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/settings');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/members/77/reviews?tenant_id=12');
    expect(response.text).toContain('href="/federation/members"');
    expect(response.text).toContain('Federation member');
    expect(response.text).toContain('Message sent');
    expect(response.text).toContain('Avery Stone');
    expect(response.text).toContain('src="/uploads/avery.jpg"');
    expect(response.text).toContain('Reputation: 4.7');
    expect(response.text).toContain('3 reviews');
    expect(response.text).toContain('Community: North Timebank');
    expect(response.text).toContain('Can repair household textiles and small appliances.');
    expect(response.text).toContain('Location');
    expect(response.text).toContain('Derry');
    expect(response.text).toContain('Reach');
    expect(response.text).toContain('Can travel');
    expect(response.text).toContain('sewing');
    expect(response.text).toContain('repairs');
    expect(response.text).toContain('action="/federation/connections"');
    expect(response.text).toContain('name="receiver_id" value="77"');
    expect(response.text).toContain('name="receiver_tenant_id" value="12"');
    expect(response.text).toContain('action="/federation/messages"');
    expect(response.text).toContain('href="/federation/members/77/transfer?tenant_id=12"');
    expect(response.text).toContain('Mira Cole');
    expect(response.text).toContain('Rating: 5');
    expect(response.text).toContain('Avery was careful and generous with time.');
    expect(response.text).toContain('From North Timebank');
    expect(response.text).toContain('Verified');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed Federation transfer confirmation page', async () => {
    const api = require('../src/lib/api');
    api.getBalance.mockResolvedValue({ balance: 6 });
    api.callFederationApi.mockImplementation(async (token, method, pathValue) => {
      if (pathValue === '/members/77?tenant_id=12') {
        return {
          data: {
            id: 77,
            name: 'Avery Stone',
            tenant_id: 12,
            tenant_name: 'North Timebank',
            transactions_enabled: true
          }
        };
      }
      if (pathValue === '/settings') {
        return {
          data: {
            enabled: true,
            settings: {
              federation_optin: true,
              transactions_enabled_federated: true
            }
          }
        };
      }

      return { data: {} };
    });

    const unsigned = await request(app).get('/federation/members/77/transfer?tenant_id=12');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/members/77/transfer?tenant_id=12&status=transfer-description-required')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/members/77?tenant_id=12');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/settings');
    expect(api.getBalance).toHaveBeenCalledWith('test-token');
    expect(response.text).toContain('href="/federation/members/77?tenant_id=12"');
    expect(response.text).toContain('Federation transfer');
    expect(response.text).toContain('Transfer time credits');
    expect(response.text).toContain('Send time credits to a member in a partner community.');
    expect(response.text).toContain('Enter a transfer description');
    expect(response.text).toContain('Recipient');
    expect(response.text).toContain('Avery Stone');
    expect(response.text).toContain('Community');
    expect(response.text).toContain('North Timebank');
    expect(response.text).toContain('Balance');
    expect(response.text).toContain('6 hours available');
    expect(response.text).toContain('This transfer moves time credits to a member in another community.');
    expect(response.text).toContain('action="/federation/members/77/transfer"');
    expect(response.text).toContain('name="receiver_tenant_id" value="12"');
    expect(response.text).toContain('id="amount" name="amount"');
    expect(response.text).toContain('id="description" name="description"');
    expect(response.text).toContain('Send transfer');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed Federation settings page', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockImplementation(async (token, method, pathValue) => {
      if (pathValue === '/settings') {
        return {
          data: {
            enabled: true,
            settings: {
              federation_optin: true,
              profile_visible_federated: true,
              appear_in_federated_search: true,
              show_skills_federated: true,
              show_location_federated: false,
              show_reviews_federated: true,
              email_notifications: true,
              messaging_enabled_federated: true,
              transactions_enabled_federated: false,
              service_reach: 'travel_ok',
              travel_radius_km: 35
            }
          }
        };
      }

      return { data: {} };
    });

    const unsigned = await request(app).get('/federation/settings');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/settings?status=settings-saved')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/settings');
    expect(response.text).toContain('href="/federation"');
    expect(response.text).toContain('Federation settings');
    expect(response.text).toContain('Control what partner communities can see and do with your federation profile.');
    expect(response.text).toContain('Federation settings saved');
    expect(response.text).toContain('Federation active');
    expect(response.text).toContain('action="/federation/settings"');
    expect(response.text).toContain('id="profile_visible_federated" name="profile_visible_federated"');
    expect(response.text).toContain('id="appear_in_federated_search" name="appear_in_federated_search"');
    expect(response.text).toContain('id="show_skills_federated" name="show_skills_federated"');
    expect(response.text).toContain('id="show_location_federated" name="show_location_federated"');
    expect(response.text).toContain('id="show_reviews_federated" name="show_reviews_federated"');
    expect(response.text).toContain('id="email_notifications" name="email_notifications"');
    expect(response.text).toContain('id="messaging_enabled_federated" name="messaging_enabled_federated"');
    expect(response.text).toContain('id="transactions_enabled_federated" name="transactions_enabled_federated"');
    expect(response.text).toContain('<option value="travel_ok" selected>');
    expect(response.text).toContain('id="travel_radius_km" name="travel_radius_km" type="number"');
    expect(response.text).toContain('value="35"');
    expect(response.text).toContain('href="/federation/opt-out"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed Federation opt-in page', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockImplementation(async (token, method, pathValue) => {
      if (pathValue === '/settings') {
        return {
          data: {
            enabled: true,
            settings: {
              federation_optin: false
            }
          }
        };
      }
      if (pathValue === '/partners') {
        return {
          data: [
            {
              id: 12,
              name: 'North Timebank',
              location: 'Derry',
              member_count: 14
            },
            {
              id: 15,
              name: 'West Timebank',
              location: 'Galway',
              member_count: 9
            }
          ]
        };
      }

      return { data: {} };
    });

    const unsigned = await request(app).get('/federation/opt-in');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/opt-in?status=optin-failed')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/settings');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/partners');
    expect(response.text).toContain('href="/federation"');
    expect(response.text).toContain('Opt in to federation');
    expect(response.text).toContain('Opting in lets you take part in the wider community network.');
    expect(response.text).toContain('We could not opt you in. Please try again.');
    expect(response.text).toContain('What you can do');
    expect(response.text).toContain('Discover');
    expect(response.text).toContain('Connect');
    expect(response.text).toContain('Exchange');
    expect(response.text).toContain('action="/federation/opt-in"');
    expect(response.text).toContain('name="preferences_submitted" value="1"');
    expect(response.text).toContain('id="profile_visible_federated" name="profile_visible_federated"');
    expect(response.text).toContain('id="show_location_federated" name="show_location_federated"');
    expect(response.text).toContain('id="messaging_enabled_federated" name="messaging_enabled_federated"');
    expect(response.text).toContain('id="transactions_enabled_federated" name="transactions_enabled_federated"');
    expect(response.text).toContain('<option value="local_only" selected>');
    expect(response.text).toContain('id="travel_radius_km" name="travel_radius_km" type="number"');
    expect(response.text).toContain('Communities you could connect with');
    expect(response.text).toContain('North Timebank');
    expect(response.text).toContain('Location: Derry');
    expect(response.text).toContain('Members: 14');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('redirects opted-in members from the Federation opt-in page to settings', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockResolvedValue({
      data: {
        enabled: true,
        settings: {
          federation_optin: true
        }
      }
    });

    const response = await request(app)
      .get('/federation/opt-in')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/federation/settings');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/settings');
  });

  it('renders the Laravel-backed Federation opt-out page', async () => {
    const unsigned = await request(app).get('/federation/opt-out');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/opt-out')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/federation/settings"');
    expect(response.text).toContain('Opt out of federation');
    expect(response.text).toContain('You are about to opt out of federation');
    expect(response.text).toContain('Your profile will be removed from partner communities and federated searches.');
    expect(response.text).toContain('action="/federation/opt-out"');
    expect(response.text).toContain('govuk-button--warning');
    expect(response.text).toContain('Cancel');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed Federation onboarding wizard', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockImplementation(async (token, method, pathValue) => {
      if (pathValue === '/settings') {
        return {
          data: {
            enabled: true,
            settings: {
              federation_optin: false,
              profile_visible_federated: true,
              appear_in_federated_search: true,
              show_skills_federated: true,
              show_location_federated: false,
              show_reviews_federated: true,
              messaging_enabled_federated: true,
              transactions_enabled_federated: true,
              email_notifications: true,
              service_reach: 'travel_ok',
              travel_radius_km: 40
            }
          }
        };
      }
      if (pathValue === '/partners') {
        return {
          data: [
            {
              id: 12,
              name: 'North Timebank',
              location: 'Derry',
              member_count: 14,
              is_external: false
            },
            {
              id: 'ext-4',
              name: 'External Circle',
              location: 'Remote',
              member_count: 4,
              is_external: true
            }
          ]
        };
      }

      return { data: [] };
    });

    const unsigned = await request(app).get('/federation/onboarding');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/onboarding?step=confirm&status=optin-failed')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/settings');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/partners');
    expect(response.text).toContain('href="/federation"');
    expect(response.text).toContain('Welcome to the community network');
    expect(response.text).toContain('A few quick choices to connect with neighbouring communities.');
    expect(response.text).toContain('We could not enable federation. Please try again.');
    expect(response.text).toContain('Step 4 of 4');
    expect(response.text).toContain('Review your settings');
    expect(response.text).toContain('Profile visibility');
    expect(response.text).toContain('Profile visible');
    expect(response.text).toContain('Location shared');
    expect(response.text).toContain('Off');
    expect(response.text).toContain('Communication');
    expect(response.text).toContain('Time exchanges');
    expect(response.text).toContain('Happy to travel up to 40 km');
    expect(response.text).toContain('Partner communities');
    expect(response.text).toContain('North Timebank');
    expect(response.text).toContain('Location: Derry');
    expect(response.text).toContain('Members: 14');
    expect(response.text).not.toContain('External Circle');
    expect(response.text).toContain('Enabling federation shares the profile details you selected above with partner communities.');
    expect(response.text).toContain('action="/federation/onboarding"');
    expect(response.text).toContain('name="step" value="confirm"');
    expect(response.text).toContain('Enable federation');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed Federation groups page', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockImplementation(async (token, method, pathValue) => {
      if (pathValue === '/partners') {
        return {
          data: [
            {
              id: 12,
              name: 'North Timebank',
              is_external: false
            },
            {
              id: 'ext-4',
              name: 'External Circle',
              is_external: true
            }
          ]
        };
      }
      if (pathValue === '/groups?q=repair&partner_id=12&cursor=abc') {
        return {
          data: [
            {
              id: 81,
              name: 'Repair cafe network',
              description: 'A group for tool repairs and community fixing sessions.',
              privacy: 'private',
              member_count: 18,
              timebank: {
                id: 12,
                name: 'North Timebank'
              }
            }
          ],
          meta: {
            cursor: 'next-page'
          }
        };
      }

      return { data: [] };
    });

    const unsigned = await request(app).get('/federation/groups');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/groups?q=repair&partner_id=12&cursor=abc')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/partners');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/groups?q=repair&partner_id=12&cursor=abc');
    expect(response.text).toContain('href="/federation"');
    expect(response.text).toContain('Groups from partner communities');
    expect(response.text).toContain('Browse groups from communities in the network that have opened their groups to federation.');
    expect(response.text).toContain('Search groups');
    expect(response.text).toContain('value="repair"');
    expect(response.text).toContain('<option value="12" selected>');
    expect(response.text).toContain('North Timebank');
    expect(response.text).not.toContain('External Circle');
    expect(response.text).toContain('Repair cafe network');
    expect(response.text).toContain('A group for tool repairs and community fixing sessions.');
    expect(response.text).toContain('Private');
    expect(response.text).toContain('Community');
    expect(response.text).toContain('Members');
    expect(response.text).toContain('18');
    expect(response.text).toContain('href="/federation/groups?q=repair&amp;partner_id=12&amp;cursor=next-page"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed Federation listings page', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockImplementation(async (token, method, pathValue) => {
      if (pathValue === '/partners') {
        return {
          data: [
            {
              id: 12,
              name: 'North Timebank',
              is_external: false
            },
            {
              id: 'ext-4',
              name: 'External Circle',
              is_external: true
            }
          ]
        };
      }
      if (pathValue === '/listings?q=repair&type=offer&partner_id=12&cursor=abc') {
        return {
          data: [
            {
              id: 93,
              title: 'Bike repair help',
              description: 'Can help diagnose punctures and brake problems.',
              type: 'offer',
              category_name: 'Repairs',
              image_url: '/uploads/listings/bike.jpg',
              estimated_hours: 2.5,
              location: 'North Hall',
              author: {
                id: 77,
                name: 'Avery Stone',
                avatar: null
              },
              timebank: {
                id: 12,
                name: 'North Timebank'
              },
              created_at: '2026-07-01T10:00:00Z'
            }
          ],
          meta: {
            cursor: 'next-page'
          }
        };
      }

      return { data: [] };
    });

    const unsigned = await request(app).get('/federation/listings');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/listings?q=repair&type=offer&partner_id=12&cursor=abc')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/partners');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/listings?q=repair&type=offer&partner_id=12&cursor=abc');
    expect(response.text).toContain('href="/federation"');
    expect(response.text).toContain('Federated listings');
    expect(response.text).toContain('Offers and requests shared by members across the community network.');
    expect(response.text).toContain('Filter listings');
    expect(response.text).toContain('Search federated listings');
    expect(response.text).toContain('Search by title or description.');
    expect(response.text).toContain('value="repair"');
    expect(response.text).toContain('<option value="offer" selected>');
    expect(response.text).toContain('<option value="12" selected>');
    expect(response.text).toContain('North Timebank');
    expect(response.text).not.toContain('External Circle');
    expect(response.text).toContain('Bike repair help');
    expect(response.text).toContain('Offer');
    expect(response.text).toContain('Category: Repairs');
    expect(response.text).toContain('2.5 hours');
    expect(response.text).toContain('Location: North Hall');
    expect(response.text).toContain('Posted by Avery Stone');
    expect(response.text).toContain('Posted');
    expect(response.text).toContain('href="/federation/listings/12/93"');
    expect(response.text).toContain('href="/federation/listings?q=repair&amp;type=offer&amp;partner_id=12&amp;cursor=next-page"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed Federation listing detail page', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockImplementation(async (token, method, pathValue) => {
      if (pathValue === '/listings?partner_id=12&per_page=100') {
        return {
          data: [
            {
              id: 93,
              title: 'Bike repair help',
              description: 'Can help diagnose punctures.\nI can also adjust brakes and show you how to patch an inner tube.',
              type: 'offer',
              category_name: 'Repairs',
              image_url: '/uploads/listings/bike.jpg',
              estimated_hours: 2.5,
              location: 'North Hall',
              author: {
                id: 77,
                name: 'Avery Stone',
                avatar: null
              },
              timebank: {
                id: 12,
                name: 'North Timebank'
              },
              created_at: '2026-07-01T10:00:00Z'
            }
          ]
        };
      }
      if (pathValue === '/members/77?tenant_id=12') {
        return {
          data: {
            id: 77,
            name: 'Avery Stone',
            tenant_id: 12,
            tenant_name: 'North Timebank',
            messaging_enabled: true
          }
        };
      }
      if (pathValue === '/settings') {
        return {
          data: {
            enabled: true,
            settings: {
              federation_optin: true,
              messaging_enabled_federated: true
            }
          }
        };
      }

      return { data: [] };
    });

    const unsigned = await request(app).get('/federation/listings/12/93');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/listings/12/93')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/listings?partner_id=12&per_page=100');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/members/77?tenant_id=12');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/settings');
    expect(response.text).toContain('href="/federation/listings"');
    expect(response.text).toContain('Bike repair help');
    expect(response.text).toContain('Offer');
    expect(response.text).toContain('Repairs');
    expect(response.text).toContain('Community: North Timebank');
    expect(response.text).toContain('src="/uploads/listings/bike.jpg"');
    expect(response.text).toContain('2.5 hours');
    expect(response.text).toContain('North Hall');
    expect(response.text).toContain('Avery Stone');
    expect(response.text).toContain('1 Jul 2026');
    expect(response.text).toContain('Can help diagnose punctures.');
    expect(response.text).toContain('I can also adjust brakes and show you how to patch an inner tube.');
    expect(response.text).toContain('href="/federation/members/77?tenant_id=12"');
    expect(response.text).toContain('Contact author');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed Federation events page', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockImplementation(async (token, method, pathValue) => {
      if (pathValue === '/partners') {
        return {
          data: [
            {
              id: 12,
              name: 'North Timebank',
              is_external: false
            },
            {
              id: 'ext-4',
              name: 'External Circle',
              is_external: true
            }
          ]
        };
      }
      if (pathValue === '/events?q=repair&partner_id=12&upcoming=false&cursor=abc') {
        return {
          data: [
            {
              id: 71,
              title: 'Tool repair meetup',
              description: 'Bring a small item and learn repair skills with neighbours.',
              start_date: '2026-08-15T10:30:00Z',
              location: 'North Hall',
              is_online: false,
              attendees_count: 12,
              max_attendees: 20,
              organizer: {
                id: 77,
                name: 'Avery Stone',
                avatar: null
              },
              timebank: {
                id: 12,
                name: 'North Timebank'
              },
              cover_image: '/uploads/events/tool.jpg'
            }
          ],
          meta: {
            cursor: 'next-page'
          }
        };
      }

      return { data: [] };
    });

    const unsigned = await request(app).get('/federation/events');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/events?q=repair&partner_id=12&upcoming=false&cursor=abc')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/partners');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/events?q=repair&partner_id=12&upcoming=false&cursor=abc');
    expect(response.text).toContain('href="/federation"');
    expect(response.text).toContain('Federated events');
    expect(response.text).toContain('Events shared by communities across the network.');
    expect(response.text).toContain('Filter events');
    expect(response.text).toContain('Search federated events');
    expect(response.text).toContain('Search by title or description.');
    expect(response.text).toContain('value="repair"');
    expect(response.text).toContain('<option value="12" selected>');
    expect(response.text).toContain('North Timebank');
    expect(response.text).not.toContain('External Circle');
    expect(response.text).toContain('name="upcoming" value="false"');
    expect(response.text).toContain('Upcoming events only');
    expect(response.text).toContain('Tool repair meetup');
    expect(response.text).toContain('Bring a small item and learn repair skills with neighbours.');
    expect(response.text).toContain('Organiser: Avery Stone');
    expect(response.text).toContain('Location');
    expect(response.text).toContain('North Hall');
    expect(response.text).toContain('Going');
    expect(response.text).toContain('12 going');
    expect(response.text).toContain('href="/federation/events?q=repair&amp;partner_id=12&amp;upcoming=false&amp;cursor=next-page"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed Federation connections page', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockImplementation(async (token, method, pathValue) => {
      if (pathValue === '/connections?status=pending_received&limit=100&offset=0') {
        return {
          data: [
            {
              id: 91,
              user_id: 77,
              name: 'Avery Stone',
              tenant_id: 12,
              tenant_name: 'North Timebank',
              status: 'pending',
              direction: 'incoming',
              message: 'Could we connect before the workshop?',
              created_at: '2026-07-01T10:00:00Z'
            }
          ]
        };
      }

      return { data: [] };
    });

    const unsigned = await request(app).get('/federation/connections');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/connections?tab=received&status=connection-accepted')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/connections?status=pending_received&limit=100&offset=0');
    expect(response.text).toContain('href="/federation"');
    expect(response.text).toContain('Federated connections');
    expect(response.text).toContain('People you are connected with across the community network.');
    expect(response.text).toContain('Connection request accepted.');
    expect(response.text).toContain('Connection status filter');
    expect(response.text).toContain('Connections');
    expect(response.text).toContain('Requests received');
    expect(response.text).toContain('Requests sent');
    expect(response.text).toContain('href="/federation/connections?tab=accepted"');
    expect(response.text).toContain('href="/federation/connections?tab=received"');
    expect(response.text).toContain('href="/federation/connections?tab=sent"');
    expect(response.text).toContain('Avery Stone');
    expect(response.text).toContain('Community: North Timebank');
    expect(response.text).toContain('Requested');
    expect(response.text).toContain('Could we connect before the workshop?');
    expect(response.text).toContain('href="/federation/members/77?tenant_id=12"');
    expect(response.text).toContain('action="/federation/connections/91/accept"');
    expect(response.text).toContain('action="/federation/connections/91/reject"');
    expect(response.text).toContain('Accept');
    expect(response.text).toContain('Decline');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed Federation messages page', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockImplementation(async (token, method, pathValue) => {
      if (pathValue === '/settings') {
        return {
          data: {
            enabled: true,
            settings: {
              federation_optin: true,
              messaging_enabled_federated: true
            }
          }
        };
      }
      if (pathValue === '/messages') {
        return {
          data: [
            {
              id: 33,
              subject: 'Workshop plans',
              body: 'Can we confirm tools for Saturday?',
              direction: 'inbound',
              status: 'delivered',
              read_at: null,
              created_at: '2026-07-02T12:00:00Z',
              sender: {
                id: 77,
                name: 'Avery Stone',
                tenant_id: 12,
                tenant_name: 'North Timebank'
              },
              receiver: {
                id: 5,
                name: 'Jasper Ford',
                tenant_id: 1,
                tenant_name: 'Local Timebank'
              }
            },
            {
              id: 32,
              subject: 'Re: Workshop plans',
              body: 'Yes, I can bring the repair kit.',
              direction: 'outbound',
              status: 'read',
              read_at: '2026-07-01T15:00:00Z',
              created_at: '2026-07-01T14:00:00Z',
              sender: {
                id: 5,
                name: 'Jasper Ford',
                tenant_id: 1,
                tenant_name: 'Local Timebank'
              },
              receiver: {
                id: 77,
                name: 'Avery Stone',
                tenant_id: 12,
                tenant_name: 'North Timebank'
              }
            }
          ]
        };
      }

      return { data: [] };
    });

    const unsigned = await request(app).get('/federation/messages');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/messages?q=avery&status=message-sent')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/settings');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/messages');
    expect(response.text).toContain('href="/federation"');
    expect(response.text).toContain('Federated messages');
    expect(response.text).toContain('Messages exchanged with members across the community network.');
    expect(response.text).toContain('Your message has been sent.');
    expect(response.text).toContain('Search conversations');
    expect(response.text).toContain('value="avery"');
    expect(response.text).toContain('Browse federated members');
    expect(response.text).toContain('Conversations');
    expect(response.text).toContain('Avery Stone');
    expect(response.text).toContain('North Timebank');
    expect(response.text).toContain('1 unread');
    expect(response.text).toContain('Can we confirm tools for Saturday?');
    expect(response.text).toContain('href="/federation/messages/conversation/77?tenant_id=12"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed Federation conversation page', async () => {
    const api = require('../src/lib/api');
    api.callFederationApi.mockImplementation(async (token, method, pathValue, data) => {
      if (pathValue === '/settings') {
        return {
          data: {
            enabled: true,
            settings: {
              federation_optin: true,
              messaging_enabled_federated: true
            }
          }
        };
      }
      if (pathValue === '/messages') {
        return {
          data: [
            {
              id: 32,
              subject: 'Workshop plans',
              body: 'Yes, I can bring the repair kit.',
              direction: 'outbound',
              status: 'read',
              read_at: '2026-07-01T15:00:00Z',
              created_at: '2026-07-01T14:00:00Z',
              sender: { id: 5, name: 'Jasper Ford', tenant_id: 1, tenant_name: 'Local Timebank' },
              receiver: { id: 77, name: 'Avery Stone', tenant_id: 12, tenant_name: 'North Timebank' }
            },
            {
              id: 33,
              subject: 'Workshop plans',
              body: 'Can we confirm tools for Saturday?',
              direction: 'inbound',
              status: 'delivered',
              read_at: null,
              created_at: '2026-07-02T12:00:00Z',
              sender: { id: 77, name: 'Avery Stone', tenant_id: 12, tenant_name: 'North Timebank' },
              receiver: { id: 5, name: 'Jasper Ford', tenant_id: 1, tenant_name: 'Local Timebank' }
            },
            {
              id: 40,
              subject: 'Different partner',
              body: 'This should not appear.',
              direction: 'inbound',
              status: 'delivered',
              created_at: '2026-07-03T12:00:00Z',
              sender: { id: 88, name: 'Mira Cole', tenant_id: 13, tenant_name: 'East Timebank' },
              receiver: { id: 5, name: 'Jasper Ford', tenant_id: 1, tenant_name: 'Local Timebank' }
            }
          ]
        };
      }
      if (pathValue === '/messages/mark-read-batch' && method === 'POST' && data.ids[0] === 33) {
        return { data: { updated: 1 } };
      }

      return { data: [] };
    });

    const unsigned = await request(app).get('/federation/messages/conversation/77?tenant_id=12');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/federation/messages/conversation/77?tenant_id=12&status=message-sent')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/settings');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'GET', '/messages');
    expect(api.callFederationApi).toHaveBeenCalledWith('test-token', 'POST', '/messages/mark-read-batch', { ids: [33] });
    expect(response.text).toContain('href="/federation/messages"');
    expect(response.text).toContain('Conversation with Avery Stone');
    expect(response.text).toContain('Avery Stone');
    expect(response.text).toContain('Community: North Timebank');
    expect(response.text).toContain('Your message has been sent.');
    expect(response.text).toContain('Sent');
    expect(response.text).toContain('Received');
    expect(response.text).toContain('Workshop plans');
    expect(response.text).toContain('Yes, I can bring the repair kit.');
    expect(response.text).toContain('Can we confirm tools for Saturday?');
    expect(response.text).not.toContain('This should not appear.');
    expect(response.text).toContain('Read');
    expect(response.text).toContain('action="/federation/messages/translate/33"');
    expect(response.text).toContain('name="partner_id" value="77"');
    expect(response.text).toContain('name="partner_tenant_id" value="12"');
    expect(response.text).toContain('action="/federation/messages"');
    expect(response.text).toContain('name="receiver_id" value="77"');
    expect(response.text).toContain('name="receiver_tenant_id" value="12"');
    expect(response.text).toContain('name="context" value="conversation"');
    expect(response.text).toContain('name="reference_message_id" value="33"');
    expect(response.text).toContain('Your reply');
    expect(response.text).toContain('Send reply');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-style community guidelines fallback document', async () => {
    const response = await request(app).get('/legal/community-guidelines');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Community guidelines');
    expect(response.text).toContain('A tailored version of this document has not been published for Project NEXUS Accessible yet.');
    expect(response.text).toContain('Respectful communication');
    expect(response.text).toContain('Fair exchange');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Laravel-backed member onboarding wizard', async () => {
    const api = require('../src/lib/api');

    api.getOnboardingStatus.mockResolvedValue({
      data: {
        onboarding_completed: false,
        has_avatar: true,
        has_bio: true,
        interests: [2]
      }
    });
    api.getOnboardingConfig.mockResolvedValue({
      data: {
        config: {
          bio_required: true,
          bio_min_length: 20,
          avatar_required: true
        },
        steps: [
          { slug: 'welcome', label: 'Welcome', required: true },
          { slug: 'profile', label: 'Profile', required: true },
          { slug: 'interests', label: 'Interests', required: true },
          { slug: 'skills', label: 'Skills', required: true },
          { slug: 'safeguarding', label: 'Safeguarding', required: false },
          { slug: 'confirm', label: 'Confirm', required: true }
        ]
      }
    });
    api.getProfile.mockResolvedValue({
      id: 42,
      name: 'Test Member',
      avatar_url: '/avatars/member.jpg',
      bio: 'I can help with gardening and repairs.'
    });
    api.getOnboardingCategories.mockResolvedValue({
      data: [
        { id: 2, name: 'Gardening' },
        { id: 3, name: 'Repairs' }
      ]
    });
    api.getOnboardingSafeguardingOptions.mockResolvedValue({
      data: [
        {
          id: 9,
          option_key: 'disability',
          option_type: 'checkbox',
          label: 'I have access needs',
          description: 'Tell coordinators if you need extra support.',
          help_url: 'https://example.test/help',
          is_required: false,
          select_options: []
        },
        {
          id: 10,
          option_key: 'contact_preference',
          option_type: 'select',
          label: 'Preferred contact',
          description: 'Choose how coordinators should contact you.',
          select_options: { phone: 'Phone', email: 'Email' }
        },
        {
          id: 11,
          option_key: 'none_apply',
          option_type: 'checkbox',
          label: 'None of these apply to me'
        }
      ]
    });

    const unsigned = await request(app).get('/onboarding');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const entry = await request(app)
      .get('/onboarding')
      .set('Cookie', signedCookieHeader());

    expect(entry.status).toBe(302);
    expect(entry.headers.location).toBe('/onboarding/welcome');

    const profile = await request(app)
      .get('/onboarding/profile?status=bio-too-short')
      .set('Cookie', signedCookieHeader());

    expect(profile.status).toBe(200);
    expect(api.getOnboardingStatus).toHaveBeenCalledWith('test-token');
    expect(api.getOnboardingConfig).toHaveBeenCalledWith('test-token');
    expect(api.getProfile).toHaveBeenCalledWith('test-token');
    expect(profile.text).toContain('Set up your profile');
    expect(profile.text).toContain('Step 2 of 6');
    expect(profile.text).toContain('Your profile');
    expect(profile.text).toContain('Profile photo');
    expect(profile.text).toContain('/avatars/member.jpg');
    expect(profile.text).toContain('A sentence or two about yourself.');
    expect(profile.text).toContain('Please add a short bio before continuing.');
    expect(profile.text).toContain('method="post" action="/onboarding/avatar"');
    expect(profile.text).toContain('enctype="multipart/form-data"');
    expect(profile.text).toContain('method="post" action="/onboarding/profile"');
    expect(profile.text).not.toContain('Laravel Blade route');

    const interests = await request(app)
      .get('/onboarding/interests')
      .set('Cookie', signedCookieHeader());

    expect(interests.status).toBe(200);
    expect(api.getOnboardingCategories).toHaveBeenCalledWith('test-token');
    expect(interests.text).toContain('Your interests');
    expect(interests.text).toContain('id="interest-2" name="interests[]"');
    expect(interests.text).toContain('Gardening');

    const safeguarding = await request(app)
      .get('/onboarding/safeguarding')
      .set('Cookie', signedCookieHeader());

    expect(safeguarding.status).toBe(200);
    expect(api.getOnboardingSafeguardingOptions).toHaveBeenCalledWith('test-token');
    expect(safeguarding.text).toContain('Safeguarding');
    expect(safeguarding.text).toContain('I have access needs');
    expect(safeguarding.text).toContain('Preferred contact');
    expect(safeguarding.text).toContain('<option value="phone">Phone</option>');
    expect(safeguarding.text).toContain('None of these apply to me');
    expect(safeguarding.text).toContain('Skip for now');

    const complete = await request(app)
      .get('/onboarding/confirm')
      .set('Cookie', signedCookieHeader());

    expect(complete.status).toBe(200);
    expect(complete.text).toContain('Check your answers');
    expect(complete.text).toContain('Profile photo');
    expect(complete.text).toContain('Added');
    expect(complete.text).toContain('I can help with gardening and repairs.');
    expect(complete.text).toContain('Finish and go to my dashboard');
    expect(complete.text).not.toContain('Laravel Blade route');
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

  it('submits the Laravel onboarding avatar route with multipart file data', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/onboarding/avatar')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .field('_csrf', csrfMatch[1])
      .attach('avatar', Buffer.from('fake png bytes', 'utf8'), {
        filename: 'profile.png',
        contentType: 'image/png'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/onboarding/profile?status=avatar-saved');
    expect(api.uploadProfileAvatar).toHaveBeenCalledWith('test-token', expect.objectContaining({
      file: expect.objectContaining({
        filename: 'profile.png',
        contentType: 'image/png',
        buffer: Buffer.from('fake png bytes', 'utf8')
      })
    }));
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

  it('redirects signed-out visitors away from Laravel saved collection GET pages before calling Laravel', async () => {
    const api = require('../src/lib/api');

    const index = await request(app).get('/me/collections');
    const detail = await request(app).get('/me/collections/12');

    expect(index.status).toBe(302);
    expect(index.headers.location).toBe('/login?status=auth-required');
    expect(detail.status).toBe(302);
    expect(detail.headers.location).toBe('/login?status=auth-required');
    expect(api.getSavedCollections).not.toHaveBeenCalled();
    expect(api.getSavedCollectionItems).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed saved collection list and detail pages', async () => {
    const api = require('../src/lib/api');
    api.getSavedCollections.mockResolvedValue({
      data: [
        {
          id: 12,
          user_id: 101,
          name: 'Skills to learn',
          description: 'Courses and resources for later.',
          color: '#0b7285',
          items_count: 2,
          is_public: true
        },
        {
          id: 13,
          user_id: 101,
          name: 'Private planning',
          description: '',
          color: 'not-a-colour',
          items_count: 0,
          is_public: false
        }
      ]
    });
    api.getSavedCollectionItems.mockResolvedValue({
      data: {
        collection: {
          id: 12,
          user_id: 101,
          name: 'Skills to learn',
          description: 'Courses and resources for later.',
          color: '#0b7285',
          items_count: 2,
          is_public: true
        },
        items: [
          {
            id: 99,
            item_type: 'listing',
            item_id: 42,
            note: 'Ask about weekend availability.',
            saved_at: '2026-07-05T10:30:00Z',
            preview: { title: 'Garden tools offer' }
          },
          {
            id: 100,
            item_type: 'resource',
            item_id: 7,
            note: '',
            saved_at: '',
            preview_title: 'Safeguarding handbook'
          }
        ]
      },
      meta: { current_page: 1, last_page: 2, total: 2, per_page: 1 }
    });

    const index = await request(app)
      .get('/me/collections?status=collection-created')
      .set('Cookie', signedCookieHeader());
    const detail = await request(app)
      .get('/me/collections/12?page=1&status=item-removed')
      .set('Cookie', signedCookieHeader());

    expect(index.status).toBe(200);
    expect(index.text).toContain('My collections');
    expect(index.text).toContain('Your saved collections at');
    expect(index.text).toContain('Group the listings, posts, events and other items you have saved into collections.');
    expect(index.text).toContain('Collection created.');
    expect(index.text).toContain('Skills to learn');
    expect(index.text).toContain('Courses and resources for later.');
    expect(index.text).toContain('2 items');
    expect(index.text).toContain('Public');
    expect(index.text).toContain('Private planning');
    expect(index.text).toContain('Private');
    expect(index.text).toContain('method="post" action="/me/collections"');
    expect(index.text).toContain('name="is_public"');
    expect(index.text).not.toContain('shared accessible frontend preparation page');

    expect(detail.status).toBe(200);
    expect(detail.text).toContain('href="/me/collections"');
    expect(detail.text).toContain('Skills to learn');
    expect(detail.text).toContain('Item removed from the collection.');
    expect(detail.text).toContain('Garden tools offer');
    expect(detail.text).toContain('Listing');
    expect(detail.text).toContain('Ask about weekend availability.');
    expect(detail.text).toContain('Safeguarding handbook');
    expect(detail.text).toContain('Resource');
    expect(detail.text).toContain('method="post" action="/me/collections/12/items/99/remove"');
    expect(detail.text).toContain('method="post" action="/me/collections/12/update"');
    expect(detail.text).toContain('method="post" action="/me/collections/12/delete"');
    expect(detail.text).toContain('href="/me/collections/12?page=2"');
    expect(detail.text).not.toContain('shared accessible frontend preparation page');

    expect(api.getSavedCollections).toHaveBeenCalledWith('test-token');
    expect(api.getSavedCollectionItems).toHaveBeenCalledWith('test-token', 12, { page: 1, per_page: 20 });
  });

  it('redirects signed-out saved social public pages before calling Laravel', async () => {
    const api = require('../src/lib/api');

    const collections = await request(app).get('/users/77/collections');
    const appreciations = await request(app).get('/users/77/appreciations');

    expect(collections.status).toBe(302);
    expect(collections.headers.location).toBe('/login?status=auth-required');
    expect(appreciations.status).toBe(302);
    expect(appreciations.headers.location).toBe('/login?status=auth-required');
    expect(api.getUser).not.toHaveBeenCalled();
    expect(api.getUserPublicCollections).not.toHaveBeenCalled();
    expect(api.getUserAppreciations).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed saved social public pages', async () => {
    const api = require('../src/lib/api');
    api.getProfile.mockResolvedValue({ data: { id: 101, name: 'Avery Stone' } });
    api.getUser.mockResolvedValue({ data: { id: 77, name: 'Morgan Lee' } });
    api.getUserPublicCollections.mockResolvedValue({
      data: [
        {
          id: 12,
          name: 'Community repair ideas',
          description: 'Saved resources to share.',
          color: '#0b7285',
          items_count: 3,
          is_public: true
        }
      ]
    });
    api.getUserAppreciations.mockResolvedValue({
      data: [
        {
          id: 55,
          sender_id: 101,
          receiver_id: 77,
          message: 'Thanks for running the tool library.',
          is_public: true,
          reactions_count: 2,
          created_at: '2026-07-05T10:30:00Z',
          sender: { id: 101, name: 'Avery Stone' },
          my_reaction: 'heart'
        }
      ],
      meta: { current_page: 1, last_page: 2, total: 2, per_page: 1 }
    });

    const collections = await request(app)
      .get('/users/77/collections')
      .set('Cookie', signedCookieHeader());
    const appreciations = await request(app)
      .get('/users/77/appreciations?status=appreciation-sent&page=1')
      .set('Cookie', signedCookieHeader());

    expect(collections.status).toBe(200);
    expect(collections.text).toContain('Public collections of Morgan Lee');
    expect(collections.text).toContain('Collections this member has chosen to share publicly.');
    expect(collections.text).toContain('Community repair ideas');
    expect(collections.text).toContain('Saved resources to share.');
    expect(collections.text).toContain('3 items');
    expect(collections.text).toContain('href="/members/77"');
    expect(collections.text).not.toContain('shared accessible frontend preparation page');

    expect(appreciations.status).toBe(200);
    expect(appreciations.text).toContain('Appreciation for Morgan Lee');
    expect(appreciations.text).toContain('Your thank-you has been sent.');
    expect(appreciations.text).toContain('method="post" action="/users/77/appreciations"');
    expect(appreciations.text).toContain('Thanks for running the tool library.');
    expect(appreciations.text).toContain('Avery Stone');
    expect(appreciations.text).toContain('method="post" action="/appreciations/55/react"');
    expect(appreciations.text).toContain('name="owner_id" value="77"');
    expect(appreciations.text).toContain('Heart');
    expect(appreciations.text).toContain('Clap');
    expect(appreciations.text).toContain('Star');
    expect(appreciations.text).toContain('2 reactions');
    expect(appreciations.text).toContain('href="/users/77/appreciations?page=2"');
    expect(appreciations.text).not.toContain('shared accessible frontend preparation page');

    expect(api.getUser).toHaveBeenCalledWith('test-token', 77);
    expect(api.getUserPublicCollections).toHaveBeenCalledWith('test-token', 77);
    expect(api.getUserAppreciations).toHaveBeenCalledWith('test-token', 77, { page: 1, per_page: 20 });
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

  it('renders the Laravel-backed exchanges list page with tabs and exchange cards', async () => {
    const api = require('../src/lib/api');
    api.getExchanges.mockResolvedValueOnce({
      data: [
        {
          id: 88,
          listing: { id: 42, title: 'Repair a bicycle' },
          requester: { id: 101, name: 'Avery Morgan' },
          provider: { id: 202, name: 'Sam Taylor' },
          requester_id: 101,
          provider_id: 202,
          status: 'pending_confirmation',
          proposed_hours: 2.5,
          created_at: '2026-07-05T10:00:00Z'
        }
      ],
      meta: { has_more: true, cursor: 'next-cursor' }
    });

    const response = await request(app)
      .get('/exchanges?tab=needs_confirmation&cursor=abc')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(response.text).toContain('Exchanges');
    expect(response.text).toContain('All');
    expect(response.text).toContain('Needs confirmation');
    expect(response.text).toContain('Repair a bicycle');
    expect(response.text).toContain('Sam Taylor');
    expect(response.text).toContain('2.5 hours');
    expect(response.text).toContain('/exchanges/88');
    expect(response.text).toContain('cursor=next-cursor');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
    expect(api.getExchangeConfig).toHaveBeenCalledWith('test-token');
    expect(api.getExchanges).toHaveBeenCalledWith('test-token', {
      per_page: 20,
      status: 'needs_confirmation',
      cursor: 'abc'
    });
  });

  it('renders the Laravel-backed exchange detail page with role actions, timeline, and rating form', async () => {
    const api = require('../src/lib/api');
    api.getProfile.mockResolvedValueOnce({ id: 202 });
    api.getExchange.mockResolvedValueOnce({
      data: {
        id: 88,
        listing: { id: 42, title: 'Repair a bicycle' },
        requester: { id: 101, name: 'Avery Morgan' },
        provider: { id: 202, name: 'Sam Taylor' },
        requester_id: 101,
        provider_id: 202,
        status: 'completed',
        proposed_hours: 2,
        final_hours: 2.25,
        risk_level: 'low',
        message: 'The chain is slipping when changing gear.',
        requester_confirmed_at: '2026-07-05T12:00:00Z',
        provider_confirmed_at: '2026-07-05T12:10:00Z',
        status_history: [
          { new_status: 'completed', actor_name: 'Sam Taylor', notes: 'Finished and checked.', created_at: '2026-07-05T12:10:00Z' }
        ],
        created_at: '2026-07-05T10:00:00Z'
      }
    });
    api.getExchangeRatings.mockResolvedValueOnce({
      data: {
        has_rated: false,
        ratings: [
          { id: 1, rating: 5, comment: 'Great exchange', rater_first_name: 'Avery', rater_last_name: 'Morgan' }
        ]
      }
    });

    const response = await request(app)
      .get('/exchanges/88?status=rating-submitted')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(response.text).toContain('Repair a bicycle');
    expect(response.text).toContain('Message member');
    expect(response.text).toContain('The chain is slipping when changing gear.');
    expect(response.text).toContain('Final hours');
    expect(response.text).toContain('2.25 hours');
    expect(response.text).toContain('Rating');
    expect(response.text).toContain('Great exchange');
    expect(response.text).toContain('Finished and checked.');
    expect(response.text).toContain('method="post" action="/exchanges/88/rate"');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
    expect(api.getProfile).toHaveBeenCalledWith('test-token');
    expect(api.getExchange).toHaveBeenCalledWith('test-token', 88);
    expect(api.getExchangeRatings).toHaveBeenCalledWith('test-token', 88);
  });

  it('redirects signed-out visitors away from the Laravel skills directory before calling Laravel', async () => {
    const api = require('../src/lib/api');

    const response = await request(app).get('/skills');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
    expect(api.getSkillCategories).not.toHaveBeenCalled();
    expect(api.getSkillCategory).not.toHaveBeenCalled();
    expect(api.getSkillMembers).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed skills directory with category drill-in and member search', async () => {
    const api = require('../src/lib/api');
    const staticPageRoutes = require('../src/routes/static-pages');
    api.getSkillCategories.mockResolvedValueOnce({
      data: [
        { id: 7, name: 'Practical help', children: [{ id: 8, name: 'Home repairs' }] }
      ]
    });
    api.getSkillCategory.mockResolvedValueOnce({
      data: {
        id: 7,
        name: 'Practical help',
        skills: [
          { skill_name: 'Gardening', user_count: 4, offering_count: 3, requesting_count: 1 },
          { name: 'Bicycle repair', user_count: 2, offering_count: 1, requesting_count: 1 }
        ]
      }
    });
    api.getSkillMembers.mockResolvedValueOnce({
      data: [
        { id: 101, name: 'Avery Morgan', proficiency_level: 'advanced', is_offering: true, is_requesting: false },
        { user_id: 202, first_name: 'Sam', last_name: 'Taylor', proficiency: 'beginner', is_offering: false, is_requesting: true }
      ]
    });

    const response = await request(app)
      .get('/skills?category=7&skill=gardening')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(staticPageRoutes.pages['/skills']).toBeUndefined();
    expect(response.text).toContain('Skills');
    expect(response.text).toContain('Browse by category');
    expect(response.text).toContain('Practical help');
    expect(response.text).toContain('Home repairs');
    expect(response.text).toContain('Gardening');
    expect(response.text).toContain('Bicycle repair');
    expect(response.text).toContain('Avery Morgan');
    expect(response.text).toContain('Sam Taylor');
    expect(response.text).toContain('Advanced');
    expect(response.text).toContain('Beginner');
    expect(response.text).toContain('Offers');
    expect(response.text).toContain('Wants');
    expect(response.text).toContain('name="skill"');
    expect(response.text).toContain('value="gardening"');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
    expect(api.getSkillCategories).toHaveBeenCalledWith('test-token');
    expect(api.getSkillCategory).toHaveBeenCalledWith('test-token', 7);
    expect(api.getSkillMembers).toHaveBeenCalledWith('test-token', 'gardening', { limit: 40 });
  });

  it('redirects signed-out visitors away from the Laravel goals index before calling Laravel', async () => {
    const api = require('../src/lib/api');

    const response = await request(app).get('/goals');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
    expect(api.getGoals).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed goals index with progress cards and create form', async () => {
    const api = require('../src/lib/api');
    const staticPageRoutes = require('../src/routes/static-pages');
    api.getGoals.mockResolvedValueOnce({
      data: [
        {
          id: 42,
          title: 'Learn bicycle repair',
          description: 'Complete the local bike maintenance course.',
          current_value: 3,
          target_value: 6,
          status: 'active',
          is_public: true,
          streak_count: 4,
          deadline: '2026-08-01'
        },
        {
          id: 43,
          title: 'Start a reading circle',
          current_value: 5,
          target_value: 5,
          status: 'completed',
          is_public: false
        }
      ],
      meta: { has_more: true, cursor: 'next-cursor' }
    });

    const response = await request(app)
      .get('/goals?status=goal-created')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(staticPageRoutes.pages['/goals']).toBeUndefined();
    expect(response.text).toContain('Goals');
    expect(response.text).toContain('Goal created');
    expect(response.text).toContain('/goals/templates');
    expect(response.text).toContain('/goals/buddying');
    expect(response.text).toContain('/goals/discover');
    expect(response.text).toContain('Learn bicycle repair');
    expect(response.text).toContain('Complete the local bike maintenance course.');
    expect(response.text).toContain('Active');
    expect(response.text).toContain('Public');
    expect(response.text).toContain('4 day streak');
    expect(response.text).toContain('3 of 6');
    expect(response.text).toContain('50%');
    expect(response.text).toContain('Start a reading circle');
    expect(response.text).toContain('Completed');
    expect(response.text).toContain('Private');
    expect(response.text).toContain('method="post" action="/goals"');
    expect(response.text).toContain('name="title"');
    expect(response.text).toContain('name="target_value"');
    expect(response.text).toContain('name="is_public"');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
    expect(response.text).not.toContain('Community Goals');
    expect(api.getGoals).toHaveBeenCalledWith('test-token', { per_page: 30 });
  });

  it('redirects signed-out visitors away from the Laravel coupons pages before calling Laravel', async () => {
    const api = require('../src/lib/api');

    const index = await request(app).get('/coupons');
    const detail = await request(app).get('/coupons/42');

    expect(index.status).toBe(302);
    expect(index.headers.location).toBe('/login?status=auth-required');
    expect(detail.status).toBe(302);
    expect(detail.headers.location).toBe('/login?status=auth-required');
    expect(api.callCouponApi).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed public coupon index and detail pages', async () => {
    const api = require('../src/lib/api');
    const staticPageRoutes = require('../src/routes/static-pages');
    api.callCouponApi
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 42,
              code: 'NEXUS10',
              title: 'Community market discount',
              description: 'Save money with a local seller.',
              discount_type: 'percent',
              discount_value: 10,
              valid_until: '2026-09-30',
              merchant_name: 'Harbour Co-op'
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          id: 42,
          code: 'NEXUS10',
          title: 'Community market discount',
          description: 'Save money with a local seller.',
          discount_type: 'percent',
          discount_value: 10,
          valid_until: '2026-09-30',
          merchant: { name: 'Harbour Co-op' }
        }
      });

    const index = await request(app)
      .get('/coupons')
      .set('Cookie', signedCookieHeader());
    const detail = await request(app)
      .get('/coupons/42')
      .set('Cookie', signedCookieHeader());

    expect(index.status).toBe(200);
    expect(staticPageRoutes.pages['/coupons']).toBeUndefined();
    expect(index.text).toContain('Coupons');
    expect(index.text).toContain('Community market discount');
    expect(index.text).toContain('Save money with a local seller.');
    expect(index.text).toContain('10% off');
    expect(index.text).toContain('Code: <strong>NEXUS10</strong>');
    expect(index.text).toContain('href="/coupons/42"');
    expect(index.text).not.toContain('Coupon pages will follow the Laravel accessible frontend contract.');
    expect(detail.status).toBe(200);
    expect(detail.text).toContain('Back to coupons');
    expect(detail.text).toContain('Community market discount');
    expect(detail.text).toContain('Coupon code');
    expect(detail.text).toContain('NEXUS10');
    expect(detail.text).toContain('How to use this coupon');
    expect(detail.text).toContain('Harbour Co-op');
    expect(detail.text).toContain('30 September 2026');
    expect(api.callCouponApi).toHaveBeenNthCalledWith(1, 'test-token', 'GET', '');
    expect(api.callCouponApi).toHaveBeenNthCalledWith(2, 'test-token', 'GET', '/42');
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

  it('renders the Laravel AI chat GET page with conversations and the selected thread', async () => {
    const api = require('../src/lib/api');
    api.getAiConversations.mockResolvedValueOnce({
      data: [
        { id: 123, title: 'Gardening help', updated_at: '2026-07-05T09:30:00Z' },
        { id: 99, title: 'Transport question', updated_at: '2026-07-04T12:00:00Z' }
      ]
    });
    api.getAiConversation.mockResolvedValueOnce({
      data: {
        id: 123,
        title: 'Gardening help',
        messages: [
          { id: 1, role: 'user', content: 'Can anyone help with seedlings?' },
          { id: 2, role: 'assistant', content: 'Try the gardening listings and upcoming events.' }
        ]
      }
    });

    const response = await request(app)
      .get('/chat?c=123&status=sent')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(response.text).toContain('AI assistant');
    expect(response.text).toContain('Conversations');
    expect(response.text).toContain('Gardening help');
    expect(response.text).toContain('Transport question');
    expect(response.text).toContain('Can anyone help with seedlings?');
    expect(response.text).toContain('Try the gardening listings and upcoming events.');
    expect(response.text).toContain('name="conversation_id" value="123"');
    expect(response.text).toContain('name="message"');
    expect(response.text).toContain('maxlength="4000"');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
    expect(api.getAiConversations).toHaveBeenCalledWith('test-token', { limit: 20 });
    expect(api.getAiConversation).toHaveBeenCalledWith('test-token', 123);
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

  it('renders Laravel-backed premium pricing, management, and return GET pages', async () => {
    const api = require('../src/lib/api');
    api.getMemberPremiumTiers.mockResolvedValue({
      data: {
        tiers: [
          {
            id: 7,
            name: 'Community Champion',
            description: 'Support local projects every month.',
            monthly_price_cents: 500,
            yearly_price_cents: 5000,
            features: ['Supporter badge', 'Early event access']
          }
        ]
      }
    });
    api.getMemberPremiumMe.mockResolvedValue({
      data: {
        subscription: {
          tier_name: 'Community Champion',
          status: 'active',
          billing_interval: 'yearly',
          current_period_end: '2026-09-01T00:00:00Z',
          features: ['Supporter badge']
        },
        entitled_tier: {
          tier_name: 'Community Champion',
          features: ['Supporter badge']
        },
        unlocked_features: ['Supporter badge']
      }
    });

    const unsigned = await request(app).get('/premium');
    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');
    expect(api.getMemberPremiumTiers).not.toHaveBeenCalled();

    const pricing = await request(app)
      .get('/premium?status=subscribe-failed')
      .set('Cookie', signedCookieHeader());
    expect(pricing.status).toBe(200);
    expect(api.getMemberPremiumTiers).toHaveBeenCalledWith('test-token');
    expect(api.getMemberPremiumMe).toHaveBeenCalledWith('test-token');
    expect(pricing.text).toContain('Support this community');
    expect(pricing.text).toContain('Community Champion');
    expect(pricing.text).toContain('Support local projects every month.');
    expect(pricing.text).toContain('5.00 per month');
    expect(pricing.text).toContain('50.00 per year');
    expect(pricing.text).toContain('Supporter badge');
    expect(pricing.text).toContain('Sorry, we could not start checkout. Please try again.');
    expect(pricing.text).toContain('method="post" action="/premium/subscribe"');
    expect(pricing.text).not.toContain('shared accessible frontend preparation page');

    const manage = await request(app)
      .get('/premium/manage?status=cancel-scheduled')
      .set('Cookie', signedCookieHeader());
    expect(manage.status).toBe(200);
    expect(manage.text).toContain('Manage your support');
    expect(manage.text).toContain('Community Champion');
    expect(manage.text).toContain('Active');
    expect(manage.text).toContain('Yearly');
    expect(manage.text).toContain('Your cancellation has been scheduled.');
    expect(manage.text).toContain('method="post" action="/premium/portal"');
    expect(manage.text).toContain('method="post" action="/premium/cancel"');

    const returned = await request(app)
      .get('/premium/return?status=success')
      .set('Cookie', signedCookieHeader());
    expect(returned.status).toBe(200);
    expect(returned.text).toContain('Your support is set up');
    expect(returned.text).toContain('Community Champion');
    expect(returned.text).toContain('href="/premium/manage"');
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

  it('submits the Laravel resource upload route with multipart file data', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const csrfCookies = (first.headers['set-cookie'] || []).map((cookie) => cookie.split(';')[0]);

    const response = await agent
      .post('/resources/upload')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`, ...csrfCookies].join('; '))
      .field('_csrf', csrfMatch[1])
      .field('title', 'Community handbook')
      .field('description', 'A practical guide for neighbours')
      .field('category_id', '7')
      .attach('file', Buffer.from('plain text guide', 'utf8'), {
        filename: 'community-handbook.txt',
        contentType: 'text/plain'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/resources/library?status=resource-uploaded');
    expect(api.uploadResource).toHaveBeenCalledWith('test-token', expect.objectContaining({
      title: 'Community handbook',
      description: 'A practical guide for neighbours',
      category_id: '7',
      file: expect.objectContaining({
        filename: 'community-handbook.txt',
        contentType: 'text/plain',
        buffer: Buffer.from('plain text guide', 'utf8')
      })
    }));
  });

  it('renders the Laravel-backed simple resources directory for signed-in members', async () => {
    const staticPageRoutes = require('../src/routes/static-pages');
    const api = require('../src/lib/api');

    api.getResources.mockResolvedValue({
      data: [
        {
          id: 42,
          title: 'Community handbook',
          description: 'A practical guide for getting help and sharing support in the community.',
          file_type: 'pdf',
          file_path: 'uploads/resources/community-handbook.pdf'
        }
      ],
      meta: { has_more: false }
    });

    const unsigned = await request(app).get('/resources');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/resources?q=handbook')
      .set('Cookie', signedCookieHeader());

    expect(staticPageRoutes.pages['/resources']).toBeUndefined();
    expect(api.getResources).toHaveBeenCalledWith('test-token', {
      search: 'handbook',
      per_page: 30
    });
    expect(response.status).toBe(200);
    expect(response.text).toContain('Resources');
    expect(response.text).toContain('Guides and reference materials shared with the community.');
    expect(response.text).toContain('Open the full resource library');
    expect(response.text).toContain('Find a resource');
    expect(response.text).toContain('value="handbook"');
    expect(response.text).toContain('Community handbook');
    expect(response.text).toContain('PDF');
    expect(response.text).toContain('A practical guide for getting help and sharing support');
    expect(response.text).toContain('href="/uploads/resources/community-handbook.pdf"');
    expect(response.text).toContain('Download');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
    expect(response.text).not.toContain('Resource library pages will follow the Laravel accessible frontend contract.');
  });

  it('renders the Laravel-backed full resource library for signed-in members', async () => {
    const api = require('../src/lib/api');

    api.getResources.mockResolvedValue({
      data: [
        {
          id: 42,
          title: 'Community handbook',
          description: 'A practical guide for getting help and sharing support in the community.',
          file_path: 'community-handbook.pdf',
          file_type: 'application/pdf',
          file_size: 1536,
          downloads: 3,
          category: { id: 7, name: 'Guides', color: 'green' },
          category_name: 'Guides',
          category_color: 'green',
          uploader: { id: 101, name: 'Avery Stone' },
          uploader_name: 'Avery Stone',
          created_at: '2026-07-01T12:00:00Z'
        }
      ],
      meta: { has_more: true, next_cursor: 'next-page' }
    });
    api.getResourceCategories.mockResolvedValue({
      data: [{ id: 7, name: 'Guides', color: 'green', resource_count: 1 }]
    });
    api.getResourceCategoryTree.mockResolvedValue({
      data: [{ id: 7, name: 'Guides', resource_count: 1, children: [] }]
    });

    const unsigned = await request(app).get('/resources/library');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/resources/library?q=handbook&category_id=7&cursor=abc&status=resource-uploaded')
      .set('Cookie', signedCookieHeader());

    expect(api.getResources).toHaveBeenCalledWith('test-token', {
      search: 'handbook',
      category_id: 7,
      cursor: 'abc',
      per_page: 20
    });
    expect(api.getResourceCategories).toHaveBeenCalledWith('test-token');
    expect(api.getResourceCategoryTree).toHaveBeenCalledWith('test-token');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Resource library');
    expect(response.text).toContain('Browse and download files, guides and templates shared by the community.');
    expect(response.text).toContain('Your resource was uploaded.');
    expect(response.text).toContain('Upload a resource');
    expect(response.text).toContain('Switch to the simple list');
    expect(response.text).toContain('Categories');
    expect(response.text).toContain('All categories');
    expect(response.text).toContain('Guides');
    expect(response.text).toContain('Search resources');
    expect(response.text).toContain('value="handbook"');
    expect(response.text).toContain('1 resource');
    expect(response.text).toContain('Community handbook');
    expect(response.text).toContain('PDF');
    expect(response.text).toContain('Avery Stone');
    expect(response.text).toContain('1.5 KB');
    expect(response.text).toContain('Downloads');
    expect(response.text).toContain('href="/resources/42/download"');
    expect(response.text).toContain('href="/resources/42/comments"');
    expect(response.text).toContain('Load more resources');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders Laravel admin resource reorder controls only in admin reorder mode', async () => {
    const api = require('../src/lib/api');

    api.getProfile.mockResolvedValue({ data: { id: 101, role: 'admin' } });
    api.getResources.mockResolvedValue({
      data: [
        {
          id: 42,
          title: 'Community handbook',
          file_path: 'community-handbook.pdf',
          file_type: 'application/pdf',
          sort_order: 0,
          uploader_id: 101
        },
        {
          id: 43,
          title: 'Welcome checklist',
          file_path: 'welcome-checklist.pdf',
          file_type: 'application/pdf',
          sort_order: 1,
          uploader_id: 202
        }
      ],
      meta: { has_more: false }
    });
    api.getResourceCategories.mockResolvedValue({
      data: [{ id: 7, name: 'Guides', color: 'green', resource_count: 2 }]
    });
    api.getResourceCategoryTree.mockResolvedValue({ data: [] });

    const adminList = await request(app)
      .get('/resources/library?q=handbook&category_id=7')
      .set('Cookie', signedCookieHeader());

    expect(adminList.status).toBe(200);
    expect(api.getProfile).toHaveBeenCalledWith('test-token');
    expect(adminList.text).toContain('href="/resources/library?q=handbook&amp;category_id=7&amp;reorder=1"');
    expect(adminList.text).toContain('Reorder resources');
    expect(adminList.text).not.toContain('Move Community handbook down');

    const reorder = await request(app)
      .get('/resources/library?q=handbook&category_id=7&reorder=1')
      .set('Cookie', signedCookieHeader());

    expect(reorder.status).toBe(200);
    expect(reorder.text).toContain('href="/resources/library?q=handbook&amp;category_id=7"');
    expect(reorder.text).toContain('Done reordering');
    expect(reorder.text).toContain('method="post" action="/resources/reorder"');
    expect(reorder.text).toContain('name="resource_id" value="42"');
    expect(reorder.text).toContain('name="direction" value="down"');
    expect(reorder.text).toContain('Move Community handbook down');
    expect(reorder.text).toContain('name="resource_id" value="43"');
    expect(reorder.text).toContain('name="direction" value="up"');
    expect(reorder.text).toContain('Move Welcome checklist up');
  });

  it('renders the Laravel-backed resource upload form for signed-in members', async () => {
    const api = require('../src/lib/api');

    api.getResourceCategories.mockResolvedValue({
      data: [
        { id: 7, name: 'Guides', color: 'green' },
        { id: 8, name: 'Templates', color: 'blue' }
      ]
    });

    const unsigned = await request(app).get('/resources/upload');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/resources/upload?status=resource-upload-failed')
      .set('Cookie', signedCookieHeader());

    expect(api.getResourceCategories).toHaveBeenCalledWith('test-token');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Back to resource library');
    expect(response.text).toContain('Upload a resource');
    expect(response.text).toContain('Share files, guides and templates with your community.');
    expect(response.text).toContain('We could not upload the resource. Please try again.');
    expect(response.text).toContain('method="post" action="/resources/upload" enctype="multipart/form-data"');
    expect(response.text).toContain('name="title"');
    expect(response.text).toContain('name="description"');
    expect(response.text).toContain('name="category_id"');
    expect(response.text).toContain('Guides');
    expect(response.text).toContain('Templates');
    expect(response.text).toContain('name="file" type="file"');
    expect(response.text).toContain('10MB');
    expect(response.text).toContain('PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, JPG, PNG, GIF, WEBP');
    expect(response.text).toContain('Upload resource');
    expect(response.text).toContain('Cancel');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Laravel-backed resource comments page for signed-in members', async () => {
    const api = require('../src/lib/api');

    api.getProfile.mockResolvedValue({ data: { id: 101, name: 'Avery Stone' } });
    api.searchUsers.mockResolvedValue({
      data: {
        items: [
          { id: 77, name: 'Morgan Lee' }
        ]
      }
    });
    api.getResources.mockResolvedValue({
      data: [
        {
          id: 42,
          title: 'Community handbook',
          description: 'A practical guide for getting help and sharing support in the community.',
          file_path: 'community-handbook.pdf'
        }
      ],
      meta: { has_more: false }
    });
    api.getComments.mockResolvedValue({
      data: {
        comments: [
          {
            id: 12,
            content: 'This helped our welcome desk.',
            user_id: 101,
            author_name: 'Avery Stone',
            created_at: '2026-07-01T12:00:00Z',
            replies: [
              {
                id: 13,
                content: 'We printed a copy for volunteers.',
                user_id: 202,
                author_name: 'Morgan Lee',
                created_at: '2026-07-02T12:00:00Z'
              }
            ]
          }
        ],
        count: 2
      }
    });
    api.getReactionSummary.mockResolvedValue({
      data: {
        counts: { like: 2, love: 1 },
        total: 3,
        user_reaction: 'love'
      }
    });

    const unsigned = await request(app).get('/resources/42/comments');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/resources/42/comments?status=reply-added')
      .set('Cookie', signedCookieHeader());

    expect(api.getResources).toHaveBeenCalledWith('test-token', { per_page: 50 });
    expect(api.getComments).toHaveBeenCalledWith('test-token', { target_type: 'resource', target_id: 42 });
    expect(api.getReactionSummary).toHaveBeenCalledWith('test-token', 'resource', 42);
    expect(response.status).toBe(200);
    expect(response.text).toContain('Back to resource library');
    expect(response.text).toContain('Discussion');
    expect(response.text).toContain('Community handbook');
    expect(response.text).toContain('Your reply was posted.');
    expect(response.text).toContain('Reactions');
    expect(response.text).toContain('3 reactions');
    expect(response.text).toContain('Like (2)');
    expect(response.text).toContain('Love (1)');
    expect(response.text).toContain('aria-pressed="true"');
    expect(response.text).toContain('Comments');
    expect(response.text).toContain('(2)');
    expect(response.text).toContain('This helped our welcome desk.');
    expect(response.text).toContain('We printed a copy for volunteers.');
    expect(response.text).toContain('action="/resources/42/comments/12/delete"');
    expect(response.text).toContain('action="/resources/42/comments/add"');
    expect(response.text).toContain('Post comment');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('renders the Laravel-backed resource delete confirmation page for owners', async () => {
    const api = require('../src/lib/api');

    api.getResources.mockResolvedValue({
      data: [
        {
          id: 42,
          title: 'Community handbook',
          user_id: 101,
          can_delete: true
        }
      ]
    });

    const unsigned = await request(app).get('/resources/42/delete');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/resources/42/delete')
      .set('Cookie', signedCookieHeader());

    expect(api.getResources).toHaveBeenCalledWith('test-token', { per_page: 50 });
    expect(response.status).toBe(200);
    expect(response.text).toContain('Back to resource library');
    expect(response.text).toContain('Delete resource');
    expect(response.text).toContain('This action cannot be undone.');
    expect(response.text).toContain('Are you sure you want to delete Community handbook?');
    expect(response.text).toContain('method="post" action="/resources/42/delete"');
    expect(response.text).toContain('Delete resource');
    expect(response.text).toContain('Cancel');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
  });

  it('streams the Laravel-backed resource download for signed-in members', async () => {
    const api = require('../src/lib/api');
    const body = Buffer.from('community handbook pdf', 'utf8');

    api.downloadResource.mockResolvedValueOnce({
      status: 200,
      body,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="Community_handbook.pdf"',
        'content-length': String(body.length),
        'cache-control': 'no-cache, must-revalidate'
      }
    });

    const unsigned = await request(app).get('/resources/42/download');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');
    expect(api.downloadResource).not.toHaveBeenCalled();

    const response = await request(app)
      .get('/resources/42/download')
      .set('Cookie', signedCookieHeader());

    expect(api.downloadResource).toHaveBeenCalledWith('test-token', 42);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toBe('attachment; filename="Community_handbook.pdf"');
    expect(response.headers['content-length']).toBe(String(body.length));
    expect(response.headers['cache-control']).toBe('no-cache, must-revalidate');
    expect(response.body.equals(body)).toBe(true);
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

  it('renders Laravel-backed blog index, detail, comments and likers pages', async () => {
    const api = require('../src/lib/api');

    const blogPost = {
      id: 42,
      slug: 'community-news',
      title: 'Community garden opens',
      excerpt: 'A new garden is now open for everyone.',
      content: '<p>The community garden opened this week.</p>',
      featured_image: '/images/garden.jpg',
      category: { id: 3, name: 'Community' },
      author: { id: 77, name: 'Ada Lovelace' },
      published_at: '2026-07-01T12:00:00Z',
      reading_time: 4
    };

    api.getBlogPosts.mockResolvedValue({
      data: {
        items: [blogPost],
        categories: [{ id: 3, name: 'Community' }],
        has_more: true,
        cursor: 'next-cursor'
      }
    });
    api.getBlogPost.mockResolvedValue({ data: blogPost });
    api.getComments.mockResolvedValue({
      data: {
        comments: [
          {
            id: 12,
            content: 'This is brilliant news.',
            user: { id: 88, name: 'Grace Hopper' },
            created_at: '2026-07-02T10:00:00Z',
            replies: [
              {
                id: 13,
                content: 'I can help on Saturday.',
                user: { id: 89, name: 'Alan Turing' },
                created_at: '2026-07-02T11:00:00Z',
                replies: []
              }
            ]
          }
        ],
        count: 2
      }
    });
    api.getReactionSummary.mockResolvedValue({
      data: {
        counts: { like: 2, love: 1 },
        total: 3,
        user_reaction: 'love'
      }
    });
    api.getReactors.mockResolvedValue({
      data: [
        { id: 88, name: 'Grace Hopper' },
        { id: 89, name: 'Alan Turing' }
      ],
      meta: { total: 2, has_more: false, page: 1 }
    });

    const index = await request(app).get('/blog?q=garden&category=3&cursor=abc');

    expect(index.status).toBe(200);
    expect(api.getBlogPosts).toHaveBeenCalledWith('', {
      search: 'garden',
      category_id: 3,
      cursor: 'abc',
      per_page: 12
    });
    expect(index.text).toContain('Blog');
    expect(index.text).toContain('News, stories and updates from');
    expect(index.text).toContain('Search the blog');
    expect(index.text).toContain('value="garden"');
    expect(index.text).toContain('Community garden opens');
    expect(index.text).toContain('Featured');
    expect(index.text).toContain('/images/garden.jpg');
    expect(index.text).toContain('Ada Lovelace');
    expect(index.text).toContain('4 min read');
    expect(index.text).toContain('cursor=next-cursor');
    expect(index.text).not.toContain('Laravel Blade route');

    const detail = await request(app).get('/blog/community-news?status=comment-added');

    expect(detail.status).toBe(200);
    expect(api.getBlogPost).toHaveBeenCalledWith('', 'community-news');
    expect(detail.text).toContain('Back to the blog');
    expect(detail.text).toContain('Community garden opens');
    expect(detail.text).toContain('The community garden opened this week.');
    expect(detail.text).toContain('Written by');
    expect(detail.text).toContain('No likes yet');
    expect(detail.text).toContain('Comments');
    expect(detail.text).toContain('Sign in to read and join the discussion.');
    expect(detail.text).toContain('href="/blog/community-news/comments"');
    expect(detail.text).not.toContain('Laravel Blade route');

    const unsignedComments = await request(app).get('/blog/community-news/comments');

    expect(unsignedComments.status).toBe(302);
    expect(unsignedComments.headers.location).toBe('/login?status=auth-required');

    const comments = await request(app)
      .get('/blog/community-news/comments?status=reply-added')
      .set('Cookie', signedCookieHeader());

    expect(comments.status).toBe(200);
    expect(api.getComments).toHaveBeenCalledWith('test-token', {
      target_type: 'blog',
      target_id: 42
    });
    expect(api.getReactionSummary).toHaveBeenCalledWith('test-token', 'blog', 42);
    expect(comments.text).toContain('Blog discussion');
    expect(comments.text).toContain('React to this post');
    expect(comments.text).toContain('3 reactions');
    expect(comments.text).toContain('Love (1)');
    expect(comments.text).toContain('See who reacted (2)');
    expect(comments.text).toContain('This is brilliant news.');
    expect(comments.text).toContain('I can help on Saturday.');
    expect(comments.text).toContain('Your reply has been posted.');
    expect(comments.text).toContain('action="/blog/community-news/comments/add"');
    expect(comments.text).toContain('action="/blog/comments/12/update"');
    expect(comments.text).toContain('action="/blog/comments/12/delete"');

    const likers = await request(app)
      .get('/blog/community-news/likers/like?page=1')
      .set('Cookie', signedCookieHeader());

    expect(likers.status).toBe(200);
    expect(api.getReactors).toHaveBeenCalledWith('test-token', 'blog', 42, 'like', {
      page: 1,
      per_page: 20
    });
    expect(likers.text).toContain('Blog reactions');
    expect(likers.text).toContain('People who reacted');
    expect(likers.text).toContain('2 people');
    expect(likers.text).toContain('Grace Hopper');
    expect(likers.text).toContain('Alan Turing');
    expect(likers.text).not.toContain('Laravel Blade route');
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

  it('renders and submits Laravel feed post images with multipart file data', async () => {
    const api = require('../src/lib/api');
    const cookieSignature = require('cookie-signature');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const page = await agent
      .get('/feed')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = page.text.match(/name="_csrf" value="([^"]+)"/);

    expect(page.status).toBe(200);
    expect(page.text).toContain('action="/feed/posts"');
    expect(page.text).toContain('enctype="multipart/form-data"');
    expect(page.text).toContain('name="image"');
    expect(page.text).toContain('name="image_alt"');
    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/feed/posts')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .field('_csrf', csrfMatch[1])
      .field('content', ' Garden day update ')
      .field('image_alt', ' Volunteers planting herbs ')
      .attach('image', Buffer.from('fake image bytes', 'utf8'), {
        filename: 'garden.webp',
        contentType: 'image/webp'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/feed?status=post-created');
    expect(api.createFeedPostV2).toHaveBeenCalledWith('test-token', expect.objectContaining({
      content: 'Garden day update',
      visibility: 'public',
      image_alt: 'Volunteers planting herbs',
      file: expect.objectContaining({
        filename: 'garden.webp',
        contentType: 'image/webp',
        buffer: Buffer.from('fake image bytes', 'utf8')
      })
    }));
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

  it('renders Laravel-backed poll list, detail, ranked, create, manage and export pages', async () => {
    const api = require('../src/lib/api');

    const openPoll = {
      id: 42,
      question: 'Which project should happen next?',
      description: 'Choose the next community project.',
      status: 'open',
      poll_type: 'standard',
      creator: { id: 77, name: 'Ada Lovelace' },
      expires_at: '2026-08-01T00:00:00Z',
      has_voted: false,
      total_votes: 5,
      results_visible: false,
      is_creator: true,
      like_count: 2,
      has_liked: true,
      options: [
        { id: 7, text: 'Community garden', vote_count: 3, percentage: 60 },
        { id: 8, text: 'Tool library', vote_count: 2, percentage: 40 }
      ]
    };
    const rankedPoll = {
      id: 43,
      question: 'Rank the neighbourhood ideas',
      description: 'Put the ideas in order.',
      status: 'open',
      poll_type: 'ranked',
      creator: { id: 88, name: 'Grace Hopper' },
      expires_at: '2026-08-15T00:00:00Z',
      has_voted: false,
      total_votes: 0,
      results_visible: false,
      is_creator: true,
      options: [
        { id: 11, text: 'Orchard' },
        { id: 12, text: 'Repair cafe' }
      ]
    };
    const closedPoll = {
      id: 44,
      question: 'Which workshop did people prefer?',
      description: 'Closed result example.',
      status: 'closed',
      poll_type: 'standard',
      creator: { id: 89, name: 'Alan Turing' },
      expires_at: '2026-07-01T00:00:00Z',
      has_voted: true,
      voted_option_id: 13,
      total_votes: 10,
      results_visible: true,
      options: [
        { id: 13, text: 'Bike repair', vote_count: 7, percentage: 70 },
        { id: 14, text: 'Bread making', vote_count: 3, percentage: 30 }
      ]
    };

    api.getPolls.mockResolvedValue({ data: [openPoll, rankedPoll, closedPoll], meta: { has_more: false } });
    api.getPollCategories.mockResolvedValue({ data: ['community', 'skills'] });
    api.getPoll.mockResolvedValue({ data: openPoll });
    api.getComments.mockResolvedValue({
      data: {
        comments: [
          {
            id: 91,
            content: 'The garden would be brilliant.',
            user: { id: 90, name: 'Katherine Johnson' },
            created_at: '2026-07-03T10:00:00Z',
            replies: []
          }
        ],
        count: 1
      }
    });
    api.getPollRankedResults.mockResolvedValue({
      data: {
        poll: rankedPoll,
        ranked_results: {
          total_voters: 2,
          results: [
            { option_id: 11, text: 'Orchard', votes: 2 },
            { option_id: 12, text: 'Repair cafe', votes: 1 }
          ]
        },
        my_rankings: [{ option_id: 11, rank: 1 }]
      }
    });
    api.getPollExport.mockResolvedValue({
      status: 200,
      body: Buffer.from('option,votes\nCommunity garden,3\n'),
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="poll-42-export.csv"'
      }
    });

    const unsigned = await request(app).get('/polls');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const list = await request(app)
      .get('/polls?mine=1&category=community&status=voted')
      .set('Cookie', signedCookieHeader());

    expect(list.status).toBe(200);
    expect(api.getPolls).toHaveBeenCalledWith('test-token', {
      mine: true,
      category: 'community',
      per_page: 30
    });
    expect(api.getPollCategories).toHaveBeenCalledWith('test-token');
    expect(list.text).toContain('Polls');
    expect(list.text).toContain('Have your say on questions put to the community.');
    expect(list.text).toContain('Show only polls I created');
    expect(list.text).toContain('Create a poll');
    expect(list.text).toContain('Manage my polls');
    expect(list.text).toContain('Which project should happen next?');
    expect(list.text).toContain('Rank the neighbourhood ideas');
    expect(list.text).toContain('Which workshop did people prefer?');
    expect(list.text).toContain('Community garden');
    expect(list.text).toContain('Rank this poll');
    expect(list.text).toContain('View and discuss');
    expect(list.text).not.toContain('Laravel Blade route');

    const detail = await request(app)
      .get('/polls/42?status=poll-comment-created')
      .set('Cookie', signedCookieHeader());

    expect(detail.status).toBe(200);
    expect(api.getPoll).toHaveBeenCalledWith('test-token', 42);
    expect(api.getComments).toHaveBeenCalledWith('test-token', {
      target_type: 'poll',
      target_id: 42
    });
    expect(detail.text).toContain('Back to polls');
    expect(detail.text).toContain('Which project should happen next?');
    expect(detail.text).toContain('Likes and comments');
    expect(detail.text).toContain('2 likes');
    expect(detail.text).toContain('1 comment');
    expect(detail.text).toContain('The garden would be brilliant.');
    expect(detail.text).toContain('Your comment has been posted.');
    expect(detail.text).toContain('action="/polls/42/like"');
    expect(detail.text).toContain('action="/polls/42/comment"');
    expect(detail.text).not.toContain('Laravel Blade route');

    const ranked = await request(app)
      .get('/polls/43/rank?status=ranked')
      .set('Cookie', signedCookieHeader());

    expect(ranked.status).toBe(200);
    expect(api.getPollRankedResults).toHaveBeenCalledWith('test-token', 43);
    expect(ranked.text).toContain('Ranked');
    expect(ranked.text).toContain('Rank the neighbourhood ideas');
    expect(ranked.text).toContain('Your ranking has been recorded.');
    expect(ranked.text).toContain('Results');
    expect(ranked.text).toContain('2 voters');
    expect(ranked.text).toContain('Orchard');

    const create = await request(app)
      .get('/polls/parity/create?status=poll-create-failed')
      .set('Cookie', signedCookieHeader());

    expect(create.status).toBe(200);
    expect(create.text).toContain('Create a poll');
    expect(create.text).toContain('Ranked choice');
    expect(create.text).toContain('We could not create your poll.');
    expect(create.text).toContain('Community');

    const manage = await request(app)
      .get('/polls/parity/manage?status=poll-deleted')
      .set('Cookie', signedCookieHeader());

    expect(manage.status).toBe(200);
    expect(api.getPolls).toHaveBeenCalledWith('test-token', {
      mine: true,
      per_page: 30
    });
    expect(manage.text).toContain('Manage my polls');
    expect(manage.text).toContain('The poll has been deleted.');
    expect(manage.text).toContain('Export results');
    expect(manage.text).toContain('Delete poll');

    const exported = await request(app)
      .get('/polls/42/export')
      .set('Cookie', signedCookieHeader());

    expect(exported.status).toBe(200);
    expect(api.getPollExport).toHaveBeenCalledWith('test-token', 42);
    expect(exported.headers['content-type']).toContain('text/csv');
    expect(exported.text).toContain('Community garden,3');
  });

  it('preselects ranked poll options in their natural order before voting', async () => {
    const api = require('../src/lib/api');

    api.getPollRankedResults.mockResolvedValue({
      data: {
        poll: {
          id: 43,
          question: 'Rank the neighbourhood ideas',
          status: 'open',
          poll_type: 'ranked',
          options: [
            { id: 11, text: 'Orchard' },
            { id: 12, text: 'Repair cafe' }
          ]
        },
        ranked_results: { total_voters: 0, results: [] },
        my_rankings: []
      }
    });

    const ranked = await request(app)
      .get('/polls/43/rank')
      .set('Cookie', signedCookieHeader());

    expect(ranked.status).toBe(200);
    expect(ranked.text).toMatch(/id="rank-11"[\s\S]*?<option value="1" selected>Position 1<\/option>[\s\S]*?<option value="2">Position 2<\/option>/);
    expect(ranked.text).toMatch(/id="rank-12"[\s\S]*?<option value="1">Position 1<\/option>[\s\S]*?<option value="2" selected>Position 2<\/option>/);
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

  it('renders the Laravel-backed clubs directory for signed-in members', async () => {
    const staticPageRoutes = require('../src/routes/static-pages');
    const api = require('../src/lib/api');

    api.getClubs.mockResolvedValue({
      data: [
        {
          id: 7,
          name: 'Velo Club',
          description: 'Sunday cycling tours around the lake for new and experienced riders.',
          logo_url: '/storage/velo-club.png',
          contact_email: 'chair@example.test',
          website: 'velo.example.test',
          meeting_schedule: 'Sundays at 9am',
          member_count: 24
        }
      ],
      meta: { total: 1, page: 1, per_page: 50 }
    });

    const unsigned = await request(app).get('/clubs');

    expect(unsigned.status).toBe(302);
    expect(unsigned.headers.location).toBe('/login?status=auth-required');

    const response = await request(app)
      .get('/clubs?q=velo')
      .set('Cookie', signedCookieHeader());

    expect(staticPageRoutes.pages['/clubs']).toBeUndefined();
    expect(api.getClubs).toHaveBeenCalledWith({ search: 'velo', per_page: 50 });
    expect(response.status).toBe(200);
    expect(response.text).toContain('Clubs');
    expect(response.text).toContain('Clubs and associations organised within your community.');
    expect(response.text).toContain('Find a club');
    expect(response.text).toContain('value="velo"');
    expect(response.text).toContain('Velo Club');
    expect(response.text).toContain('24 members');
    expect(response.text).toContain('Sunday cycling tours around the lake');
    expect(response.text).toContain('Sundays at 9am');
    expect(response.text).toContain('mailto:chair@example.test');
    expect(response.text).toContain('href="https://velo.example.test"');
    expect(response.text).toContain('opens in new tab');
    expect(response.text).not.toContain('shared accessible frontend preparation page');
    expect(response.text).not.toContain('Club pages will follow the Laravel accessible frontend contract.');
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

  it('renders the Laravel-backed jobs browse page with Blade filters and pagination', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getJobs.mockResolvedValueOnce({
      items: [
        {
          id: 501,
          title: 'Volunteer Coordinator',
          type: 'volunteer',
          commitment: 'part_time',
          is_remote: true,
          description: 'Coordinate volunteer shifts.',
          organization: { name: 'Community Club' },
          deadline: '2026-08-01',
          salary_min: 20000,
          salary_max: 30000,
          salary_currency: 'EUR',
          views_count: 8,
          applications_count: 3,
          status: 'open'
        }
      ],
      meta: { total: 1, has_more: true, offset: 12, per_page: 12 }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs?q=coordinator&type=paid&commitment=part_time&sort=deadline&remote=1&offset=12')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getJobs).toHaveBeenCalledWith('test-token', {
      limit: 12,
      offset: 12,
      status: 'open',
      sort: 'deadline',
      search: 'coordinator',
      type: 'paid',
      commitment: 'part_time',
      is_remote: 1
    });
    expect(response.status).toBe(200);
    expect(response.text).toContain('Jobs');
    expect(response.text).toContain('Roles and opportunities in this community.');
    expect(response.text).toContain('Browse opportunities');
    expect(response.text).toContain('Saved');
    expect(response.text).toContain('My applications');
    expect(response.text).toContain('Find an opportunity');
    expect(response.text).toContain('name="q"');
    expect(response.text).toContain('name="type"');
    expect(response.text).toContain('name="commitment"');
    expect(response.text).toContain('name="sort"');
    expect(response.text).toContain('name="remote"');
    expect(response.text).toContain('1 opportunity');
    expect(response.text).toContain('href="/jobs/501"');
    expect(response.text).toContain('Volunteer Coordinator');
    expect(response.text).toContain('Posted by Community Club');
    expect(response.text).toContain('Volunteer');
    expect(response.text).toContain('Part time');
    expect(response.text).toContain('Remote');
    expect(response.text).toContain('Closing date');
    expect(response.text).toContain('Load more');
    expect(response.text).not.toContain('Job pages will follow the Laravel accessible frontend contract');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('redirects signed-out visitors away from the jobs browse page before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.getJobs.mockClear();

    const response = await request(app).get('/jobs');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.getJobs).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed job detail page with save and apply actions', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getJob.mockResolvedValueOnce({
      data: {
        id: 501,
        title: 'Volunteer Coordinator',
        type: 'paid',
        commitment: 'part_time',
        is_remote: false,
        location: 'Cork',
        description: 'Coordinate volunteer shifts.',
        organization: { name: 'Community Club' },
        creator: { name: 'Aisha Khan' },
        deadline: '2026-08-01',
        salary_min: 20000,
        salary_max: 30000,
        salary_currency: 'EUR',
        views_count: 8,
        applications_count: 3,
        skills: ['Scheduling', 'Community outreach'],
        has_applied: false,
        is_saved: false,
        user_id: 99,
        status: 'open'
      }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/501?status=saved')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getJob).toHaveBeenCalledWith('test-token', '501');
    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/jobs"');
    expect(response.text).toContain('Opportunity saved.');
    expect(response.text).toContain('Community Club');
    expect(response.text).toContain('Volunteer Coordinator');
    expect(response.text).toContain('Paid');
    expect(response.text).toContain('Save opportunity');
    expect(response.text).toContain('name="from" value="detail"');
    expect(response.text).toContain('Part time');
    expect(response.text).toContain('Cork');
    expect(response.text).toContain('EUR 20,000 - EUR 30,000');
    expect(response.text).toContain('Applications received');
    expect(response.text).toContain('3');
    expect(response.text).toContain('Coordinate volunteer shifts.');
    expect(response.text).toContain('Scheduling');
    expect(response.text).toContain('Community outreach');
    expect(response.text).toContain('Apply for this opportunity');
    expect(response.text).toContain('name="cover_letter"');
    expect(response.text).toContain('Why are you a good fit? (optional)');
    expect(response.text).toContain('name="cv"');
    expect(response.text).toContain('Upload your CV');
    expect(response.text).not.toContain('Laravel Blade route');
    expect(response.text).not.toContain('does not certify ASP.NET route or workflow');
  });

  it('redirects signed-out visitors away from job detail pages before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.getJob.mockClear();

    const response = await request(app).get('/jobs/501');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.getJob).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed saved jobs page with unsave actions', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockResolvedValueOnce({
      data: [
        {
          id: 501,
          title: 'Volunteer Coordinator',
          type: 'volunteer',
          commitment: 'part_time',
          is_remote: true,
          organization: { name: 'Community Club' },
          deadline: '2026-08-01',
          is_saved: true
        }
      ],
      cursor: 'next-saved',
      has_more: true
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/saved?cursor=abc&status=unsaved')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenCalledWith('test-token', 'GET', '/saved?per_page=12&cursor=abc');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Saved opportunities');
    expect(response.text).toContain('Opportunities you have bookmarked.');
    expect(response.text).toContain('Browse opportunities');
    expect(response.text).toContain('Saved');
    expect(response.text).toContain('Opportunity removed from your saved list.');
    expect(response.text).toContain('href="/jobs/501"');
    expect(response.text).toContain('Volunteer Coordinator');
    expect(response.text).toContain('Posted by Community Club');
    expect(response.text).toContain('Part time');
    expect(response.text).toContain('Remote');
    expect(response.text).toContain('Remove from saved');
    expect(response.text).toContain('action="/jobs/501/unsave"');
    expect(response.text).toContain('name="from" value="saved"');
    expect(response.text).toContain('Load more');
    expect(response.text).toContain('cursor=next-saved');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('redirects signed-out visitors away from saved jobs before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.callJobApi.mockClear();

    const response = await request(app).get('/jobs/saved');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.callJobApi).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed jobs applications page with status filters and withdrawal actions', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 91,
            vacancy_id: 501,
            status: 'interview',
            created_at: '2026-07-01',
            vacancy: {
              id: 501,
              title: 'Volunteer Coordinator'
            }
          }
        ],
        cursor: 'next-apps',
        has_more: true
      }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/applications?status_filter=interview&cursor=abc&status=withdrawn')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenCalledWith(
      'test-token',
      'GET',
      '/my-applications?per_page=12&status=interview&cursor=abc'
    );
    expect(response.status).toBe(200);
    expect(response.text).toContain('My applications');
    expect(response.text).toContain('Opportunities you have applied for and their status.');
    expect(response.text).toContain('Browse opportunities');
    expect(response.text).toContain('Your application has been withdrawn.');
    expect(response.text).toContain('name="status_filter"');
    expect(response.text).toContain('Interview');
    expect(response.text).toContain('href="/jobs/501"');
    expect(response.text).toContain('Volunteer Coordinator');
    expect(response.text).toContain('Applied on 1 July 2026');
    expect(response.text).toContain('Withdraw application');
    expect(response.text).toContain('action="/jobs/applications/91/withdraw"');
    expect(response.text).toContain('Load more');
    expect(response.text).toContain('cursor=next-apps');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('redirects signed-out visitors away from job applications before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.callJobApi.mockClear();

    const response = await request(app).get('/jobs/applications');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.callJobApi).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed my job postings page with owner actions', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockResolvedValueOnce({
      data: [
        {
          id: 501,
          title: 'Volunteer Coordinator',
          status: 'draft',
          views_count: 12,
          applications_count: 3
        }
      ],
      cursor: 'next-postings',
      has_more: true
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/mine?cursor=abc&status=deleted')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenCalledWith('test-token', 'GET', '/my-postings?per_page=12&cursor=abc');
    expect(response.status).toBe(200);
    expect(response.text).toContain('My postings');
    expect(response.text).toContain('Manage the opportunities you have posted.');
    expect(response.text).toContain('Post an opportunity');
    expect(response.text).toContain('The opportunity has been deleted.');
    expect(response.text).toContain('href="/jobs/501"');
    expect(response.text).toContain('Volunteer Coordinator');
    expect(response.text).toContain('Draft');
    expect(response.text).toContain('12 views');
    expect(response.text).toContain('3 applications');
    expect(response.text).toContain('Manage applications');
    expect(response.text).toContain('href="/jobs/501/applications"');
    expect(response.text).toContain('href="/jobs/501/edit"');
    expect(response.text).toContain('action="/jobs/501/renew"');
    expect(response.text).toContain('action="/jobs/501/delete"');
    expect(response.text).toContain('Load more');
    expect(response.text).toContain('cursor=next-postings');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('redirects signed-out visitors away from my job postings before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.callJobApi.mockClear();

    const response = await request(app).get('/jobs/mine');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.callJobApi).not.toHaveBeenCalled();
  });

  it('renders the Laravel-style create job form for signed-in users', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockClear();
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/create')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(response.status).toBe(200);
    expect(api.callJobApi).not.toHaveBeenCalled();
    expect(response.text).toContain('Post an opportunity');
    expect(response.text).toContain('Share a paid role, volunteer role or time-credit exchange with the community.');
    expect(response.text).toContain('action="/jobs"');
    expect(response.text).toContain('name="title"');
    expect(response.text).toContain('A short, clear role title.');
    expect(response.text).toContain('name="description"');
    expect(response.text).toContain('Describe the role, what is involved and who it suits.');
    expect(response.text).toContain('name="type"');
    expect(response.text).toContain('Volunteer');
    expect(response.text).toContain('name="commitment"');
    expect(response.text).toContain('name="is_remote"');
    expect(response.text).toContain('This opportunity can be done remotely');
    expect(response.text).toContain('name="salary_negotiable"');
    expect(response.text).toContain('Publish now');
    expect(response.text).toContain('Save as draft');
    expect(response.text).toContain('Post opportunity');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('redirects signed-out visitors away from the create job form', async () => {
    const response = await request(app).get('/jobs/create');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  it('renders the Laravel-backed edit job form with existing opportunity values', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getJob.mockResolvedValueOnce({
      data: {
        id: 501,
        user_id: 101,
        title: 'Volunteer Coordinator',
        description: 'Coordinate community volunteers.',
        type: 'volunteer',
        commitment: 'part_time',
        category: 'Community',
        location: 'Cork',
        is_remote: true,
        skills_required: 'Planning, communication',
        deadline: '2099-08-15T00:00:00Z',
        salary_min: 1000,
        salary_max: 2000,
        salary_currency: 'EUR',
        salary_type: 'monthly',
        salary_negotiable: true,
        hours_per_week: 12,
        time_credits: 4,
        contact_email: 'jobs@example.org',
        status: 'draft'
      }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/501/edit')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getJob).toHaveBeenCalledWith('test-token', 501);
    expect(api.getProfile).toHaveBeenCalledWith('test-token');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Edit opportunity');
    expect(response.text).toContain('Update the details of your opportunity.');
    expect(response.text).toContain('action="/jobs/501/update"');
    expect(response.text).toContain('value="Volunteer Coordinator"');
    expect(response.text).toContain('Coordinate community volunteers.');
    expect(response.text).toContain('value="volunteer" selected');
    expect(response.text).toContain('value="part_time" selected');
    expect(response.text).toContain('value="Community"');
    expect(response.text).toContain('value="Cork"');
    expect(response.text).toContain('name="is_remote" type="checkbox" value="1" checked');
    expect(response.text).toContain('value="Planning, communication"');
    expect(response.text).toContain('value="2099-08-15"');
    expect(response.text).toContain('value="1000"');
    expect(response.text).toContain('value="2000"');
    expect(response.text).toContain('value="EUR"');
    expect(response.text).toContain('value="monthly" selected');
    expect(response.text).toContain('name="salary_negotiable" type="checkbox" value="1" checked');
    expect(response.text).toContain('value="12"');
    expect(response.text).toContain('value="4"');
    expect(response.text).toContain('value="jobs@example.org"');
    expect(response.text).toContain('value="draft" checked');
    expect(response.text).toContain('Save changes');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('redirects signed-out visitors away from the edit job form before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.getJob.mockClear();
    api.getProfile.mockClear();

    const response = await request(app).get('/jobs/501/edit');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.getJob).not.toHaveBeenCalled();
    expect(api.getProfile).not.toHaveBeenCalled();
  });

  it('forbids editing a Laravel-backed job owned by another member', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getProfile.mockResolvedValueOnce({ id: 202 });
    api.getJob.mockResolvedValueOnce({
      data: {
        id: 501,
        user_id: 101,
        title: 'Volunteer Coordinator'
      }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/501/edit')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getJob).toHaveBeenCalledWith('test-token', 501);
    expect(api.getProfile).toHaveBeenCalledWith('test-token');
    expect(response.status).toBe(403);
    expect(response.text).not.toContain('action="/jobs/501/update"');
  });

  it('renders the Laravel-backed owner applicants page with analytics and stage controls', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getJob.mockResolvedValueOnce({
      data: {
        id: 501,
        title: 'Volunteer Coordinator'
      }
    });
    api.callJobApi.mockResolvedValueOnce({
      data: [
        {
          id: 91,
          applicant: { name: 'Alex Morgan', email: 'alex@example.org' },
          status: 'screening',
          created_at: '2099-07-02T10:00:00Z',
          message: 'I can coordinate rotas and training.'
        }
      ]
    }).mockResolvedValueOnce({
      data: {
        total_views: 120,
        unique_viewers: 80,
        total_applications: 3,
        conversion_rate: 2.5
      }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/501/applications?status=status-updated')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getJob).toHaveBeenCalledWith('test-token', 501);
    expect(api.callJobApi).toHaveBeenNthCalledWith(1, 'test-token', 'GET', '/501/applications');
    expect(api.callJobApi).toHaveBeenNthCalledWith(2, 'test-token', 'GET', '/501/analytics');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Volunteer Coordinator');
    expect(response.text).toContain('Applications');
    expect(response.text).toContain('Review and progress the people who have applied.');
    expect(response.text).toContain('The application stage has been updated.');
    expect(response.text).toContain('Performance');
    expect(response.text).toContain('Total views');
    expect(response.text).toContain('120');
    expect(response.text).toContain('Unique viewers');
    expect(response.text).toContain('80');
    expect(response.text).toContain('Conversion rate');
    expect(response.text).toContain('2.5%');
    expect(response.text).toContain('href="/jobs/501/applications/export.csv"');
    expect(response.text).toContain('Download applications (CSV)');
    expect(response.text).toContain('Alex Morgan');
    expect(response.text).toContain('Screening');
    expect(response.text).toContain('Applied on 2 July 2099');
    expect(response.text).toContain('I can coordinate rotas and training.');
    expect(response.text).toContain('action="/jobs/501/applications/91/status"');
    expect(response.text).toContain('Move to stage');
    expect(response.text).toContain('name="app_status"');
    expect(response.text).toContain('value="shortlisted"');
    expect(response.text).toContain('Notes for your records (optional)');
    expect(response.text).toContain('Update');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('redirects signed-out visitors away from the owner applicants page before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.getJob.mockClear();
    api.callJobApi.mockClear();

    const response = await request(app).get('/jobs/501/applications');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.getJob).not.toHaveBeenCalled();
    expect(api.callJobApi).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed job analytics dashboard', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getJob.mockResolvedValueOnce({
      data: {
        id: 501,
        title: 'Volunteer Coordinator'
      }
    });
    api.callJobApi.mockResolvedValueOnce({
      data: {
        total_views: 120,
        unique_viewers: 80,
        total_applications: 3,
        conversion_rate: 2.5,
        avg_time_to_apply_hours: 12.5,
        time_to_fill_days: 10,
        views_by_day: [{ date: '2099-07-01', count: 7 }],
        weekly_trend: [{ week: '209927', count: 2 }],
        applications_by_stage: [{ stage: 'screening', count: 3 }],
        referral_stats: {
          total_shares: 5,
          referral_applications: 2,
          referral_conversion_pct: 40
        },
        scorecard_avg: 88.5
      }
    }).mockResolvedValueOnce({
      data: {
        expected_applications: { value: 5, current: 3, above_average: false },
        estimated_time_to_fill: { value: 14, days_posted: 4 },
        conversion_rate: { yours: 2.5, average: 1.8, above_average: true },
        salary_comparison: { your_salary: 35000, market_avg: 32000, diff_percent: 9 },
        similar_jobs_analyzed: 4
      }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/501/analytics')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getJob).toHaveBeenCalledWith('test-token', 501);
    expect(api.callJobApi).toHaveBeenNthCalledWith(1, 'test-token', 'GET', '/501/analytics');
    expect(api.callJobApi).toHaveBeenNthCalledWith(2, 'test-token', 'GET', '/501/predictions');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Volunteer Coordinator');
    expect(response.text).toContain('Opportunity analytics');
    expect(response.text).toContain('See how your opportunity is performing');
    expect(response.text).toContain('href="/jobs/501/pipeline"');
    expect(response.text).toContain('href="/jobs/501/applications/export.csv"');
    expect(response.text).toContain('Key metrics');
    expect(response.text).toContain('Total views');
    expect(response.text).toContain('120');
    expect(response.text).toContain('Unique viewers');
    expect(response.text).toContain('80');
    expect(response.text).toContain('Average time to apply');
    expect(response.text).toContain('12.5 hours');
    expect(response.text).toContain('Views over the last 30 days');
    expect(response.text).toContain('1 July');
    expect(response.text).toContain('Applications by stage');
    expect(response.text).toContain('Screening');
    expect(response.text).toContain('Referrals');
    expect(response.text).toContain('Referral shares');
    expect(response.text).toContain('Average scorecard');
    expect(response.text).toContain('88.5%');
    expect(response.text).toContain('Predictions');
    expect(response.text).toContain('Based on 4 similar filled opportunities');
    expect(response.text).toContain('Expected applications');
    expect(response.text).toContain('14 days');
    expect(response.text).toContain('Salary vs market');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('returns forbidden when Laravel denies job analytics access', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getJob.mockResolvedValueOnce({
      data: {
        id: 501,
        title: 'Volunteer Coordinator'
      }
    });
    api.callJobApi.mockRejectedValueOnce(new api.ApiError('Forbidden', 403, {}));
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/501/analytics')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getJob).toHaveBeenCalledWith('test-token', 501);
    expect(api.callJobApi).toHaveBeenCalledWith('test-token', 'GET', '/501/analytics');
    expect(response.status).toBe(403);
  });

  it('renders the Laravel-backed application pipeline board', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getJob.mockResolvedValueOnce({
      data: {
        id: 501,
        title: 'Volunteer Coordinator'
      }
    });
    api.callJobApi.mockResolvedValueOnce({
      data: [
        {
          id: 91,
          applicant: { name: 'Alex Morgan', email: 'alex@example.org' },
          stage: 'screening',
          created_at: '2099-07-02T10:00:00Z',
          cv_filename: 'Alex_Morgan_CV.pdf'
        }
      ]
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/501/pipeline?status=status-updated')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getJob).toHaveBeenCalledWith('test-token', 501);
    expect(api.callJobApi).toHaveBeenCalledWith('test-token', 'GET', '/501/applications');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Volunteer Coordinator');
    expect(response.text).toContain('Application pipeline');
    expect(response.text).toContain('Candidates are grouped by stage');
    expect(response.text).toContain('Candidate moved to the new stage.');
    expect(response.text).toContain('View full applicant list');
    expect(response.text).toContain('Applied');
    expect(response.text).toContain('Screening');
    expect(response.text).toContain('Interview');
    expect(response.text).toContain('Offer');
    expect(response.text).toContain('Alex Morgan');
    expect(response.text).toContain('Applied 2 July 2099');
    expect(response.text).toContain('href="/jobs/applications/91/cv"');
    expect(response.text).toContain('Download CV');
    expect(response.text).toContain('Alex_Morgan_CV.pdf');
    expect(response.text).toContain('action="/jobs/501/applications/91/status"');
    expect(response.text).toContain('Move to stage');
    expect(response.text).toContain('value="offer"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed qualification assessment page', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockResolvedValueOnce({
      data: {
        job_id: 501,
        job_title: 'Volunteer Coordinator',
        percentage: 87,
        level: 'good',
        total_required: 4,
        total_matched: 3,
        breakdown: [
          { skill: 'Planning', matched: true },
          { skill: 'Safeguarding', matched: false }
        ],
        dimensions: [
          { label: 'Skills Match', score: 87, detail: '3/4 skills matched' },
          { label: 'Remote Work', score: 100, detail: 'Remote position available' }
        ],
        ai_summary: 'Strong match (87%). You have: Planning, communication.'
      }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/501/qualified')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenCalledWith('test-token', 'GET', '/501/qualified');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Volunteer Coordinator');
    expect(response.text).toContain('Am I qualified?');
    expect(response.text).toContain('A quick comparison of your skills');
    expect(response.text).toContain('Overall match');
    expect(response.text).toContain('87%');
    expect(response.text).toContain('Good match');
    expect(response.text).toContain('3 of 4 skills matched');
    expect(response.text).toContain('Required skills');
    expect(response.text).toContain('You have this');
    expect(response.text).toContain('Planning');
    expect(response.text).toContain('To develop');
    expect(response.text).toContain('Safeguarding');
    expect(response.text).toContain('How you compare');
    expect(response.text).toContain('Skills Match');
    expect(response.text).toContain('3/4 skills matched');
    expect(response.text).toContain('Summary');
    expect(response.text).toContain('Strong match (87%). You have: Planning, communication.');
    expect(response.text).toContain('href="/jobs/501"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('redirects signed-out visitors away from job depth tools before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.getJob.mockClear();
    api.callJobApi.mockClear();

    const response = await request(app).get('/jobs/501/analytics');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.getJob).not.toHaveBeenCalled();
    expect(api.callJobApi).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed talent search page', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 77,
            name: 'Riley Quinn',
            headline: 'Community mentor',
            location: 'Derry',
            skills: ['Gardening', 'Mentoring', 'First aid', 'Safeguarding', 'Events', 'Driving', 'Extra skill'],
            last_active: '2099-07-02T10:00:00Z'
          }
        ],
        total: 41
      }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/talent-search?keywords=mentor&skills=gardening,mentoring&location=Derry&offset=20')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenCalledWith(
      'test-token',
      'GET',
      '/talent-search?per_page=20&offset=20&keywords=mentor&skills=gardening%2Cmentoring&location=Derry'
    );
    expect(response.status).toBe(200);
    expect(response.text).toContain('Find candidates');
    expect(response.text).toContain('Search community members who have made their profile available to employers');
    expect(response.text).toContain('Keywords');
    expect(response.text).toContain('value="mentor"');
    expect(response.text).toContain('value="gardening,mentoring"');
    expect(response.text).toContain('value="Derry"');
    expect(response.text).toContain('41 candidates found');
    expect(response.text).toContain('href="/jobs/talent-search/77"');
    expect(response.text).toContain('Riley Quinn');
    expect(response.text).toContain('Community mentor');
    expect(response.text).toContain('Gardening');
    expect(response.text).toContain('Mentoring');
    expect(response.text).toContain('Derry');
    expect(response.text).toContain('Last active 2 July 2099');
    expect(response.text).toContain('Show more candidates');
    expect(response.text).toContain('offset=40');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('returns forbidden when Laravel denies talent search access', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockRejectedValueOnce(new api.ApiError('Forbidden', 403, {}));
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/talent-search?keywords=mentor')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenCalledWith(
      'test-token',
      'GET',
      '/talent-search?per_page=20&offset=0&keywords=mentor'
    );
    expect(response.status).toBe(403);
  });

  it('renders the Laravel-backed talent profile page', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockResolvedValueOnce({
      data: {
        id: 77,
        name: 'Riley Quinn',
        headline: 'Community mentor',
        location: 'Derry',
        skills: ['Gardening', 'Mentoring'],
        summary: 'Experienced with community gardens.',
        bio: 'Enjoys helping local groups plan inclusive activities.',
        last_active: '2099-07-02T10:00:00Z',
        member_since: '2099-07-01T09:00:00Z'
      }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/talent-search/77')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenCalledWith('test-token', 'GET', '/talent-search/77');
    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/jobs/talent-search"');
    expect(response.text).toContain('Riley Quinn');
    expect(response.text).toContain('Community mentor');
    expect(response.text).toContain('Derry');
    expect(response.text).toContain('Last active 2 July 2099');
    expect(response.text).toContain('Member since July 2099');
    expect(response.text).toContain('Skills');
    expect(response.text).toContain('Gardening');
    expect(response.text).toContain('Summary');
    expect(response.text).toContain('Experienced with community gardens.');
    expect(response.text).toContain('About');
    expect(response.text).toContain('Enjoys helping local groups plan inclusive activities.');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('returns not found when Laravel cannot find a talent profile', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockRejectedValueOnce(new api.ApiError('Not found', 404, {}));
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/talent-search/77')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenCalledWith('test-token', 'GET', '/talent-search/77');
    expect(response.status).toBe(404);
  });

  it('redirects signed-out visitors away from talent search before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.callJobApi.mockClear();

    const response = await request(app).get('/jobs/talent-search?keywords=mentor');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.callJobApi).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed employer onboarding page for returning posters', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockResolvedValueOnce({
      data: {
        items: [{ id: 501, title: 'Community mentor' }],
        total: 1
      }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/employer-onboarding')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenCalledWith('test-token', 'GET', '/my-postings?per_page=1');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Get started as an employer');
    expect(response.text).toContain('Post another opportunity');
    expect(response.text).toContain('You already post opportunities here. Create another one whenever you are ready.');
    expect(response.text).toContain('How it works');
    expect(response.text).toContain('Describe the opportunity');
    expect(response.text).toContain('Tips for more applicants');
    expect(response.text).toContain('Post an opportunity');
    expect(response.text).toContain('View my opportunities');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('redirects signed-out visitors away from employer onboarding before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.callJobApi.mockClear();

    const response = await request(app).get('/jobs/employer-onboarding');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.callJobApi).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed employer brand page', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getUser.mockResolvedValueOnce({
      data: {
        id: 88,
        first_name: 'Morgan',
        last_name: 'Patel',
        resume_headline: 'Community garden coordinator',
        location: 'Belfast',
        bio: 'Runs inclusive neighbourhood garden projects.',
        created_at: '2099-06-01T09:00:00Z'
      }
    });
    api.getJobs.mockResolvedValueOnce({
      data: {
        items: [{
          id: 501,
          title: 'Garden volunteer lead',
          type: 'volunteer',
          commitment: 'part_time',
          location: 'Belfast',
          deadline: '2099-08-05'
        }],
        total: 1
      }
    });
    api.callJobApi.mockResolvedValueOnce({
      data: {
        reviews: [{
          id: 9,
          rating: 5,
          comment: 'Clear communication and kind support.',
          reviewer: { name: 'Avery Stone' },
          created_at: '2099-07-03T10:00:00Z'
        }],
        stats: {
          average_rating: 4.5,
          total_reviews: 1,
          dimensions: {
            respect: 5,
            communication: 4
          }
        }
      }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/employers/88')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.getUser).toHaveBeenCalledWith('test-token', 88);
    expect(api.getJobs).toHaveBeenCalledWith('test-token', {
      user_id: 88,
      status: 'open',
      limit: 50,
      sort: 'newest'
    });
    expect(api.callJobApi).toHaveBeenCalledWith('test-token', 'GET', '/employer-reviews/88');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Morgan Patel');
    expect(response.text).toContain('Open opportunities and reviews for this employer.');
    expect(response.text).toContain('Community garden coordinator');
    expect(response.text).toContain('Runs inclusive neighbourhood garden projects.');
    expect(response.text).toContain('Belfast');
    expect(response.text).toContain('Member since June 2099');
    expect(response.text).toContain('Open opportunities');
    expect(response.text).toContain('1 open opportunity');
    expect(response.text).toContain('Garden volunteer lead');
    expect(response.text).toContain('Employer reviews');
    expect(response.text).toContain('Average rating');
    expect(response.text).toContain('4.5');
    expect(response.text).toContain('Clear communication and kind support.');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed jobs bias audit page', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callAdminJobApi.mockResolvedValueOnce({
      data: {
        period: { from: '2099-07-01', to: '2099-07-31' },
        total_applications: 24,
        hiring_velocity_days: 6.5,
        funnel: { applied: 24, screening: 18, interview: 8, offer: 3, accepted: 2 },
        rejection_rates: {
          applied: { rejected: 2, total: 24, rate: 8.3 },
          screening: { rejected: 5, total: 18, rate: 27.8 }
        },
        avg_time_in_stage: { applied: 1.5, screening: 3.2, interview: 5.1 },
        skills_match_correlation: {
          accepted_avg: 0.6,
          rejected_avg: 0.4,
          accepted_count: 6,
          rejected_count: 4
        },
        source_effectiveness: {
          direct: { applications: 20, accepted: 5, rate: 25 },
          referral: { applications: 4, accepted: 1, rate: 25 }
        }
      }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/bias-audit?from=2099-07-01&to=2099-07-31&job_id=501')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callAdminJobApi).toHaveBeenCalledWith(
      'test-token',
      'GET',
      '/bias-audit?job_id=501&date_from=2099-07-01&date_to=2099-07-31'
    );
    expect(response.status).toBe(200);
    expect(response.text).toContain('Hiring bias audit');
    expect(response.text).toContain('Review your hiring pipeline for patterns that may indicate bias');
    expect(response.text).toContain('value="2099-07-01"');
    expect(response.text).toContain('value="2099-07-31"');
    expect(response.text).toContain('value="501"');
    expect(response.text).toContain('Period: 1 July 2099 to 31 July 2099');
    expect(response.text).toContain('Total applications');
    expect(response.text).toContain('24');
    expect(response.text).toContain('Average time to hire');
    expect(response.text).toContain('6.5 days');
    expect(response.text).toContain('Application funnel');
    expect(response.text).toContain('Interview');
    expect(response.text).toContain('Rejection rates by stage');
    expect(response.text).toContain('27.8%');
    expect(response.text).toContain('Average time in stage');
    expect(response.text).toContain('Outcome breakdown');
    expect(response.text).toContain('Accepted');
    expect(response.text).toContain('6');
    expect(response.text).toContain('Source effectiveness');
    expect(response.text).toContain('Direct');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('returns forbidden when Laravel denies jobs bias audit access', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callAdminJobApi.mockRejectedValueOnce(new api.ApiError('Forbidden', 403, {}));
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/bias-audit?from=2099-07-01')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callAdminJobApi).toHaveBeenCalledWith(
      'test-token',
      'GET',
      '/bias-audit?date_from=2099-07-01'
    );
    expect(response.status).toBe(403);
  });

  it('streams the Laravel-backed owner applications CSV export', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockResolvedValueOnce('ID,Name,Email,Status,Stage,Applied At,Updated At\n91,Alex Morgan,alex@example.org,screening,screening,2099-07-02 10:00:00,2099-07-03 11:00:00\n');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/501/applications/export.csv')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenCalledWith('test-token', 'GET', '/501/applications/export-csv');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toMatch(/attachment; filename="job_501_applications_\d{8}_\d{6}\.csv"/);
    expect(response.text).toContain('ID,Name,Email,Status,Stage,Applied At,Updated At');
    expect(response.text).toContain('91,Alex Morgan,alex@example.org,screening,screening');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('redirects signed-out visitors away from the applications CSV export before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.callJobApi.mockClear();

    const response = await request(app).get('/jobs/501/applications/export.csv');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.callJobApi).not.toHaveBeenCalled();
  });

  it('redirects failed application CSV exports back to the applicants page', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockRejectedValueOnce(new api.ApiError('Forbidden', 403, {}));
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/501/applications/export.csv')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenCalledWith('test-token', 'GET', '/501/applications/export-csv');
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/jobs/501/applications?status=export-failed');
  });

  it('renders the Laravel-backed application timeline page', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockResolvedValueOnce({
      data: [
        {
          id: 11,
          application_id: 91,
          from_status: 'applied',
          to_status: 'interview',
          changed_at: '2099-07-02T10:30:00Z',
          changed_by_name: 'Riley Casey',
          notes: 'Strong rota experience.'
        }
      ]
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/applications/91/history')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenCalledWith('test-token', 'GET', '/applications/91/history');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Back to my applications');
    expect(response.text).toContain('Application timeline');
    expect(response.text).toContain('Interview');
    expect(response.text).toContain('from Applied');
    expect(response.text).toContain('2 July 2099, 10:30am');
    expect(response.text).toContain('by Riley Casey');
    expect(response.text).toContain('Strong rota experience.');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the empty Laravel-backed application timeline state', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockResolvedValueOnce({ data: [] });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/applications/91/history')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenCalledWith('test-token', 'GET', '/applications/91/history');
    expect(response.status).toBe(200);
    expect(response.text).toContain('There are no status updates for this application yet.');
  });

  it('redirects signed-out visitors away from application history before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.callJobApi.mockClear();

    const response = await request(app).get('/jobs/applications/91/history');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.callJobApi).not.toHaveBeenCalled();
  });

  it('returns not found when Laravel denies application history access', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockRejectedValueOnce(new api.ApiError('Forbidden', 403, {}));
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/applications/91/history')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenCalledWith('test-token', 'GET', '/applications/91/history');
    expect(response.status).toBe(404);
  });

  it('streams the Laravel-backed application CV download', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const cvBody = Buffer.from('%PDF-1.4 test cv\n', 'utf8');
    api.callJobDownload.mockResolvedValueOnce({
      body: cvBody,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="Alex_Morgan_CV.pdf"',
        'content-length': String(cvBody.length)
      }
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/applications/91/cv')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobDownload).toHaveBeenCalledWith('test-token', '/applications/91/cv');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toBe('attachment; filename="Alex_Morgan_CV.pdf"');
    expect(response.headers['content-length']).toBe(String(cvBody.length));
    expect(response.body.equals(cvBody)).toBe(true);
  });

  it('redirects signed-out visitors away from CV downloads before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.callJobDownload.mockClear();

    const response = await request(app).get('/jobs/applications/91/cv');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.callJobDownload).not.toHaveBeenCalled();
  });

  it('returns forbidden when Laravel denies application CV access', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobDownload.mockRejectedValueOnce(new api.ApiError('Forbidden', 403, {}));
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/applications/91/cv')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobDownload).toHaveBeenCalledWith('test-token', '/applications/91/cv');
    expect(response.status).toBe(403);
  });

  it('returns not found when Laravel has no application CV to download', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobDownload.mockRejectedValueOnce(new api.ApiError('No CV', 404, {}));
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/applications/91/cv')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobDownload).toHaveBeenCalledWith('test-token', '/applications/91/cv');
    expect(response.status).toBe(404);
  });

  it('renders the Laravel-backed job alerts page with alert controls', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockResolvedValueOnce({
      data: [
        {
          id: 12,
          keywords: 'coordinator',
          type: 'volunteer',
          commitment: 'part_time',
          location: 'Cork',
          is_remote_only: true,
          is_active: true
        }
      ]
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/alerts?status=alert-paused')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenCalledWith('test-token', 'GET', '/alerts');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Job alerts');
    expect(response.text).toContain('Get notified when new opportunities match your interests.');
    expect(response.text).toContain('The alert has been paused.');
    expect(response.text).toContain('Create an alert');
    expect(response.text).toContain('name="keywords"');
    expect(response.text).toContain('For example, gardening or admin.');
    expect(response.text).toContain('name="is_remote_only"');
    expect(response.text).toContain('Your alerts');
    expect(response.text).toContain('Keywords: coordinator');
    expect(response.text).toContain('Type: Volunteer');
    expect(response.text).toContain('Commitment: Part time');
    expect(response.text).toContain('Location: Cork');
    expect(response.text).toContain('Remote opportunities only');
    expect(response.text).toContain('Active');
    expect(response.text).toContain('action="/jobs/alerts/12/pause"');
    expect(response.text).toContain('action="/jobs/alerts/12/delete"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('redirects signed-out visitors away from job alerts before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.callJobApi.mockClear();

    const response = await request(app).get('/jobs/alerts');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.callJobApi).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed jobs responses page with interview and offer actions', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi
      .mockResolvedValueOnce({
        data: [
          {
            id: 33,
            vacancy_id: 501,
            vacancy_title: 'Volunteer Coordinator',
            interview_type: 'video',
            scheduled_at: '2099-07-01T14:30:00Z',
            duration_mins: 45,
            location_notes: 'Video link sent by email',
            status: 'proposed'
          }
        ]
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 44,
            vacancy_id: 501,
            vacancy_title: 'Volunteer Coordinator',
            salary_offered: 20000,
            salary_currency: 'EUR',
            salary_type: 'annual',
            start_date: '2099-08-01',
            expires_at: '2099-08-05',
            message: 'Welcome aboard.',
            status: 'pending'
          }
        ]
      });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;

    const response = await request(app)
      .get('/jobs/responses?status=interview-accepted')
      .set('Cookie', [`token=${encodeURIComponent(signedToken)}`]);

    expect(api.callJobApi).toHaveBeenNthCalledWith(1, 'test-token', 'GET', '/my-interviews');
    expect(api.callJobApi).toHaveBeenNthCalledWith(2, 'test-token', 'GET', '/my-offers');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Interviews and offers');
    expect(response.text).toContain('Interviews and offers from employers appear here.');
    expect(response.text).toContain('You accepted the interview. The employer has been notified.');
    expect(response.text).toContain('Interview invitations');
    expect(response.text).toContain('Video');
    expect(response.text).toContain('Awaiting your response');
    expect(response.text).toContain('For: Volunteer Coordinator');
    expect(response.text).toContain('Scheduled for 1 July 2099, 14:30');
    expect(response.text).toContain('Duration: 45 minutes');
    expect(response.text).toContain('Video link sent by email');
    expect(response.text).toContain('action="/jobs/interviews/33/accept"');
    expect(response.text).toContain('Accept interview');
    expect(response.text).toContain('action="/jobs/interviews/33/decline"');
    expect(response.text).toContain('Offers');
    expect(response.text).toContain('20,000 EUR per year');
    expect(response.text).toContain('Start date: 1 August 2099');
    expect(response.text).toContain('Respond by 5 August 2099');
    expect(response.text).toContain('Message from the employer');
    expect(response.text).toContain('Welcome aboard.');
    expect(response.text).toContain('action="/jobs/offers/44/accept"');
    expect(response.text).toContain('Accept offer');
    expect(response.text).toContain('action="/jobs/offers/44/reject"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('redirects signed-out visitors away from job responses before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.callJobApi.mockClear();

    const response = await request(app).get('/jobs/responses');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
    expect(api.callJobApi).not.toHaveBeenCalled();
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

  it('redirects signed-out visitors away from Laravel ideation GET pages before calling Laravel', async () => {
    const api = require('../src/lib/api');

    const index = await request(app).get('/ideation');
    const detail = await request(app).get('/ideation/7');

    expect(index.status).toBe(302);
    expect(index.headers.location).toBe('/login?status=auth-required');
    expect(detail.status).toBe(302);
    expect(detail.headers.location).toBe('/login?status=auth-required');
    expect(api.callIdeationApi).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed ideation challenge list and detail pages', async () => {
    const api = require('../src/lib/api');
    const staticPageRoutes = require('../src/routes/static-pages');
    api.callIdeationApi
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 7,
              title: 'Better local parks',
              description: 'Gather practical ideas for improving local parks.',
              status: 'open',
              ideas_count: 3
            },
            {
              id: 8,
              title: 'Community transport',
              status: 'voting',
              ideas_count: 12
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          id: 7,
          title: 'Better local parks',
          description: 'Gather practical ideas for improving local parks.',
          status: 'open',
          category: 'Environment',
          submission_deadline: '2026-10-01',
          voting_deadline: '2026-11-01',
          max_ideas_per_user: 2,
          views_count: 18,
          favorites_count: 5,
          tags: ['parks', 'accessibility'],
          prize_description: 'Winning ideas receive seed funding.'
        }
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 12,
              title: 'More accessible benches',
              description: 'Add seating near the entrances and main path.',
              vote_count: 9,
              creator: { name: 'Avery Stone' }
            }
          ]
        }
      });

    const index = await request(app)
      .get('/ideation?status=open&q=parks')
      .set('Cookie', signedCookieHeader());
    const detail = await request(app)
      .get('/ideation/7?status=idea-submitted')
      .set('Cookie', signedCookieHeader());

    expect(index.status).toBe(200);
    expect(staticPageRoutes.pages['/ideation']).toBeUndefined();
    expect(index.text).toContain('Ideas');
    expect(index.text).toContain('Share ideas and vote on suggestions for the community.');
    expect(index.text).toContain('name="q"');
    expect(index.text).toContain('value="parks"');
    expect(index.text).toContain('name="status"');
    expect(index.text).toContain('Better local parks');
    expect(index.text).toContain('Gather practical ideas for improving local parks.');
    expect(index.text).toContain('Open');
    expect(index.text).toContain('3 ideas');
    expect(index.text).toContain('Community transport');
    expect(index.text).toContain('Voting');
    expect(index.text).toContain('href="/ideation/7"');
    expect(index.text).not.toContain('Ideation pages will follow the Laravel accessible frontend contract.');

    expect(detail.status).toBe(200);
    expect(detail.text).toContain('Back to challenges');
    expect(detail.text).toContain('your idea has been submitted');
    expect(detail.text).toContain('Better local parks');
    expect(detail.text).toContain('Environment');
    expect(detail.text).toContain('parks');
    expect(detail.text).toContain('accessibility');
    expect(detail.text).toContain('Winning ideas receive seed funding.');
    expect(detail.text).toContain('More accessible benches');
    expect(detail.text).toContain('9 votes');
    expect(detail.text).toContain('Avery Stone');
    expect(detail.text).toContain('method="post" action="/ideation/7/ideas/12/vote"');
    expect(detail.text).toContain('method="post" action="/ideation/7/ideas"');
    expect(detail.text).toContain('name="idea_title"');
    expect(api.callIdeationApi).toHaveBeenNthCalledWith(1, 'test-token', 'GET', '/ideation-challenges?limit=30&status=open&search=parks');
    expect(api.callIdeationApi).toHaveBeenNthCalledWith(2, 'test-token', 'GET', '/ideation-challenges/7');
    expect(api.callIdeationApi).toHaveBeenNthCalledWith(3, 'test-token', 'GET', '/ideation-challenges/7/ideas?limit=30&sort=votes');
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

  it('redirects signed-out visitors away from Laravel group exchange GET pages before calling Laravel', async () => {
    const api = require('../src/lib/api');

    const index = await request(app).get('/group-exchanges');
    const create = await request(app).get('/group-exchanges/new');
    const detail = await request(app).get('/group-exchanges/7');

    expect(index.status).toBe(302);
    expect(index.headers.location).toBe('/login?status=auth-required');
    expect(create.status).toBe(302);
    expect(create.headers.location).toBe('/login?status=auth-required');
    expect(detail.status).toBe(302);
    expect(detail.headers.location).toBe('/login?status=auth-required');
    expect(api.callGroupExchangeApi).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed group exchange list, create, and detail pages', async () => {
    const api = require('../src/lib/api');
    api.getProfile.mockResolvedValue({ data: { id: 101, name: 'Avery Stone' } });
    api.searchUsers.mockResolvedValue({
      data: {
        items: [
          { id: 77, name: 'Morgan Lee' }
        ]
      }
    });
    api.callGroupExchangeApi
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 7,
              title: 'Community garden build',
              status: 'active',
              total_hours: 12.5
            },
            {
              id: 8,
              title: 'Neighbour cooking circle',
              status: 'completed',
              total_hours: 6
            }
          ],
          has_more: false
        }
      })
      .mockResolvedValueOnce({
        data: {
          id: 7,
          title: 'Community garden build',
          description: 'Build raised beds on Saturday.',
          status: 'draft',
          total_hours: 12.5,
          organizer_id: 101,
          participants: [
            { user_id: 101, name: 'Avery Stone', role: 'provider', hours: 4, confirmed: true },
            { user_id: 55, name: 'Sam Taylor', role: 'receiver', hours: 8.5, confirmed: false }
          ],
          calculated_split: [
            { user_id: 101, hours: 4 },
            { user_id: 55, hours: 8.5 }
          ]
        }
      });

    const index = await request(app)
      .get('/group-exchanges?state=active&status=cancelled')
      .set('Cookie', signedCookieHeader());
    const detail = await request(app)
      .get('/group-exchanges/7?status=participant-added&participant_q=morgan')
      .set('Cookie', signedCookieHeader());
    const create = await request(app)
      .get('/group-exchanges/new?status=create-invalid')
      .set('Cookie', signedCookieHeader());

    expect(index.status).toBe(200);
    expect(index.text).toContain('Group exchanges');
    expect(index.text).toContain('Exchanges of time between several members at once');
    expect(index.text).toContain('Start a group exchange');
    expect(index.text).toContain('The group exchange has been cancelled.');
    expect(index.text).toContain('Community garden build');
    expect(index.text).toContain('Neighbour cooking circle');
    expect(index.text).toContain('12.50');
    expect(index.text).toContain('href="/group-exchanges/7"');
    expect(index.text).not.toContain('shared accessible frontend preparation page');

    expect(detail.status).toBe(200);
    expect(detail.text).toContain('id="group-exchange-top"');
    expect(detail.text).toContain('Community garden build');
    expect(detail.text).toContain('Build raised beds on Saturday.');
    expect(detail.text).toContain('Person added to the exchange');
    expect(detail.text).toContain('People in this exchange');
    expect(detail.text).toContain('Avery Stone');
    expect(detail.text).toContain('Sam Taylor');
    expect(detail.text).toContain('Giving time');
    expect(detail.text).toContain('Receiving time');
    expect(detail.text).toContain('Not yet');
    expect(detail.text).toContain('method="post" action="/group-exchanges/7/participants/55/remove"');
    expect(detail.text).toContain('method="post" action="/group-exchanges/7/participants"');
    expect(detail.text).toContain('Morgan Lee');
    expect(detail.text).toContain('method="post" action="/group-exchanges/7/complete"');
    expect(detail.text).toContain('method="post" action="/group-exchanges/7/cancel"');

    expect(create.status).toBe(200);
    expect(create.text).toContain('Start a group exchange');
    expect(create.text).toContain('name="title"');
    expect(create.text).toContain('name="total_hours"');
    expect(create.text).toContain('name="split_type"');
    expect(create.text).toContain('Create group exchange');
    expect(create.text).toContain('Something went wrong. Please try again.');
    expect(create.text).not.toContain('shared accessible frontend preparation page');

    expect(api.callGroupExchangeApi).toHaveBeenNthCalledWith(1, 'test-token', 'GET', '?limit=50&status=active');
    expect(api.callGroupExchangeApi).toHaveBeenNthCalledWith(2, 'test-token', 'GET', '/7');
    expect(api.getProfile).toHaveBeenCalledWith('test-token');
    expect(api.searchUsers).toHaveBeenCalledWith('test-token', 'morgan', { limit: 20 });
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

  it('submits Laravel group depth aliases and redirects signed-out visitors', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callGroupApi.mockImplementation(async (_token, _method, pathName) => {
      if (pathName === '/42/discussions') {
        return { data: { id: 33 } };
      }
      return { data: { id: 42 } };
    });

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

    const inviteLinkResponse = await post('/groups/42/invite/link', { expiry_days: '30' });
    expect(inviteLinkResponse.headers.location).toBe('/groups/42/invite?status=invite-link-created');
    expect(api.callGroupApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/invites/link', {
      expiry_days: 30
    });

    const inviteEmailResponse = await post('/groups/42/invite/email', {
      emails: ' one@example.com, two@example.com\nthree@example.com ',
      message: ' Join us '
    });
    expect(inviteEmailResponse.headers.location).toBe('/groups/42/invite?status=invite-emails-sent');
    expect(api.callGroupApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/invites/email', {
      emails: ['one@example.com', 'two@example.com', 'three@example.com'],
      message: 'Join us'
    });

    const revokeInviteResponse = await post('/groups/42/invite/12/revoke');
    expect(revokeInviteResponse.headers.location).toBe('/groups/42/invite?status=invite-revoked');
    expect(api.callGroupApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/42/invites/12');

    const notificationsResponse = await post('/groups/42/notifications', {
      frequency: 'digest',
      email_enabled: 'on'
    });
    expect(notificationsResponse.headers.location).toBe('/groups/42/notifications?status=prefs-saved');
    expect(api.callGroupApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/42/notification-prefs', {
      frequency: 'digest',
      email_enabled: true,
      push_enabled: false
    });

    const callCountBeforeImage = api.callGroupApi.mock.calls.length;
    const imageResponse = await post('/groups/42/image', { type: 'cover' });
    expect(imageResponse.headers.location).toBe('/groups/42/image?status=image-missing');
    expect(api.callGroupApi).toHaveBeenCalledTimes(callCountBeforeImage);

    const fileResponse = await post('/groups/42/files', { folder: 'Policies' });
    expect(fileResponse.headers.location).toBe('/groups/42/files?status=file-missing');
    expect(api.callGroupApi).toHaveBeenCalledTimes(callCountBeforeImage);

    const fileDeleteResponse = await post('/groups/42/files/5/delete');
    expect(fileDeleteResponse.headers.location).toBe('/groups/42/files?status=file-deleted');
    expect(api.callGroupApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/42/files/5');

    const announcementResponse = await post('/groups/42/announcements', {
      title: ' AGM ',
      content: ' Bring reports ',
      is_pinned: '1',
      expires_at: '2026-09-01'
    });
    expect(announcementResponse.headers.location).toBe('/groups/42/announcements?status=ann-created');
    expect(api.callGroupApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/announcements', {
      title: 'AGM',
      content: 'Bring reports',
      is_pinned: true,
      expires_at: '2026-09-01'
    });

    const announcementEditResponse = await post('/groups/42/announcements/9/edit', {
      title: ' Updated AGM ',
      content: ' Bring updated reports '
    });
    expect(announcementEditResponse.headers.location).toBe('/groups/42/announcements?status=ann-updated');
    expect(api.callGroupApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/42/announcements/9', {
      title: 'Updated AGM',
      content: 'Bring updated reports',
      is_pinned: false,
      expires_at: null
    });

    const announcementDeleteResponse = await post('/groups/42/announcements/9/delete');
    expect(announcementDeleteResponse.headers.location).toBe('/groups/42/announcements?status=ann-deleted');
    expect(api.callGroupApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/42/announcements/9');

    const announcementPinResponse = await post('/groups/42/announcements/9/pin', { is_pinned: '1' });
    expect(announcementPinResponse.headers.location).toBe('/groups/42/announcements?status=ann-pinned');
    expect(api.callGroupApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/42/announcements/9', {
      is_pinned: true
    });

    const discussionResponse = await post('/groups/42/discussions/new', {
      title: ' Monthly plan ',
      content: ' Talk through the plan. '
    });
    expect(discussionResponse.headers.location).toBe('/groups/42/discussions/33?status=discussion-created');
    expect(api.callGroupApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/discussions', {
      title: 'Monthly plan',
      content: 'Talk through the plan.'
    });

    const discussionReplyResponse = await post('/groups/42/discussions/33/reply', {
      content: ' Count me in. '
    });
    expect(discussionReplyResponse.headers.location).toBe('/groups/42/discussions/33?status=reply-posted#discussion-replies');
    expect(api.callGroupApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/discussions/33/messages', {
      content: 'Count me in.'
    });

    const feedResponse = await post('/groups/42/feed', { content: ' Working bee on Friday. ' });
    expect(feedResponse.headers.location).toBe('/groups/42?status=group-posted#group-feed');
    expect(api.createFeedPostV2).toHaveBeenLastCalledWith('test-token', {
      content: 'Working bee on Friday.',
      visibility: 'public',
      group_id: 42
    });

    const memberResponse = await post('/groups/42/members/55', { action: 'promote' });
    expect(memberResponse.headers.location).toBe('/groups/42/manage?status=member-promoted');
    expect(api.callGroupApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/42/members/55', {
      role: 'admin'
    });

    const requestResponse = await post('/groups/42/requests/77', { action: 'reject' });
    expect(requestResponse.headers.location).toBe('/groups/42/manage?status=request-rejected');
    expect(api.callGroupApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/requests/77', {
      action: 'reject'
    });

    api.callGroupApi.mockClear();
    api.createFeedPostV2.mockClear();
    const unsigned = request.agent(app);
    const unsignedFirst = await unsigned.get('/contact');
    const unsignedCsrf = unsignedFirst.text.match(/name="_csrf" value="([^"]+)"/);
    const unsignedResponse = await unsigned
      .post('/groups/42/announcements')
      .type('form')
      .send({ _csrf: unsignedCsrf[1], title: 'AGM', content: 'Bring reports' });
    expect(unsignedResponse.status).toBe(302);
    expect(unsignedResponse.headers.location).toBe('/login');
    expect(api.callGroupApi).not.toHaveBeenCalled();
    expect(api.createFeedPostV2).not.toHaveBeenCalled();
  });

  it('submits Laravel group image and file uploads with multipart file data', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const imageResponse = await agent
      .post('/groups/42/image')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .field('_csrf', csrfMatch[1])
      .field('type', 'cover')
      .attach('image', Buffer.from('fake group cover image', 'utf8'), {
        filename: 'group-cover.png',
        contentType: 'image/png'
      });

    expect(imageResponse.status).toBe(302);
    expect(imageResponse.headers.location).toBe('/groups/42/image?status=cover-updated');
    expect(api.uploadGroupImage).toHaveBeenCalledWith('test-token', 42, expect.objectContaining({
      type: 'cover',
      file: expect.objectContaining({
        filename: 'group-cover.png',
        contentType: 'image/png',
        buffer: Buffer.from('fake group cover image', 'utf8')
      })
    }));

    const fileResponse = await agent
      .post('/groups/42/files')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .field('_csrf', csrfMatch[1])
      .field('folder', ' Policies ')
      .field('description', ' Member handbook ')
      .attach('file', Buffer.from('%PDF group handbook', 'utf8'), {
        filename: 'handbook.pdf',
        contentType: 'application/pdf'
      });

    expect(fileResponse.status).toBe(302);
    expect(fileResponse.headers.location).toBe('/groups/42/files?status=file-uploaded');
    expect(api.uploadGroupFile).toHaveBeenCalledWith('test-token', 42, expect.objectContaining({
      folder: 'Policies',
      description: 'Member handbook',
      file: expect.objectContaining({
        filename: 'handbook.pdf',
        contentType: 'application/pdf',
        buffer: Buffer.from('%PDF group handbook', 'utf8')
      })
    }));
  });

  it('submits Laravel jobs action aliases and redirects signed-out visitors', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.callJobApi.mockImplementation(async (_token, _method, pathName) => {
      if (pathName === '') {
        return { data: { id: 42 } };
      }
      return { data: { id: 42 } };
    });

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

    const jobFormBody = {
      title: ' Volunteer Coordinator ',
      description: ' Coordinate volunteer shifts. ',
      type: 'paid',
      commitment: 'part_time',
      category: 'Community',
      location: 'Cork',
      is_remote: '1',
      skills_required: 'Scheduling',
      hours_per_week: '12',
      time_credits: '4',
      deadline: '2026-10-01',
      salary_min: '20000',
      salary_max: '30000',
      salary_currency: 'EUR',
      salary_type: 'annual',
      salary_negotiable: '1',
      contact_email: 'jobs@example.com',
      status: 'draft'
    };
    const expectedJobPayload = {
      title: 'Volunteer Coordinator',
      description: 'Coordinate volunteer shifts.',
      type: 'paid',
      commitment: 'part_time',
      category: 'Community',
      location: 'Cork',
      is_remote: true,
      skills_required: 'Scheduling',
      hours_per_week: '12',
      time_credits: '4',
      deadline: '2026-10-01',
      salary_min: '20000',
      salary_max: '30000',
      salary_currency: 'EUR',
      salary_type: 'annual',
      salary_negotiable: true,
      contact_email: 'jobs@example.com',
      status: 'draft'
    };

    const createResponse = await post('/jobs', jobFormBody);
    expect(createResponse.headers.location).toBe('/jobs/42?status=created');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'POST', '', expectedJobPayload);

    const updateResponse = await post('/jobs/42/update', jobFormBody);
    expect(updateResponse.headers.location).toBe('/jobs/42?status=updated');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/42', expectedJobPayload);

    const deleteResponse = await post('/jobs/42/delete');
    expect(deleteResponse.headers.location).toBe('/jobs/mine?status=deleted');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/42');

    const renewResponse = await post('/jobs/42/renew');
    expect(renewResponse.headers.location).toBe('/jobs/42?status=renewed');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/renew', {
      days: 30
    });

    const applyResponse = await post('/jobs/42/apply', { cover_letter: ' I can help. ' });
    expect(applyResponse.headers.location).toBe('/jobs/42?status=applied');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/apply', {
      message: 'I can help.'
    });

    const saveResponse = await post('/jobs/42/save');
    expect(saveResponse.headers.location).toBe('/jobs/42?status=saved');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/save');

    const unsaveResponse = await post('/jobs/42/unsave', { from: 'saved' });
    expect(unsaveResponse.headers.location).toBe('/jobs/saved?status=unsaved');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/42/save');

    const statusResponse = await post('/jobs/42/applications/91/status', {
      app_status: 'shortlisted',
      notes: ' Strong fit. '
    });
    expect(statusResponse.headers.location).toBe('/jobs/42/applications?status=status-updated');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/applications/91', {
      status: 'shortlisted',
      notes: 'Strong fit.'
    });

    const withdrawResponse = await post('/jobs/applications/91/withdraw');
    expect(withdrawResponse.headers.location).toBe('/jobs/applications?status=withdrawn');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/applications/91', {
      status: 'withdrawn'
    });

    const alertResponse = await post('/jobs/alerts', {
      keywords: ' coordinator ',
      categories: ' community ',
      type: 'volunteer',
      commitment: 'flexible',
      location: ' Remote ',
      is_remote_only: '1'
    });
    expect(alertResponse.headers.location).toBe('/jobs/alerts?status=alert-created');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'POST', '/alerts', {
      keywords: 'coordinator',
      categories: 'community',
      type: 'volunteer',
      commitment: 'flexible',
      location: 'Remote',
      is_remote_only: true
    });

    const pauseAlertResponse = await post('/jobs/alerts/12/pause');
    expect(pauseAlertResponse.headers.location).toBe('/jobs/alerts?status=alert-paused');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/alerts/12/unsubscribe');

    const resumeAlertResponse = await post('/jobs/alerts/12/resume');
    expect(resumeAlertResponse.headers.location).toBe('/jobs/alerts?status=alert-resumed');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/alerts/12/resubscribe');

    const deleteAlertResponse = await post('/jobs/alerts/12/delete');
    expect(deleteAlertResponse.headers.location).toBe('/jobs/alerts?status=alert-deleted');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/alerts/12');

    const acceptInterviewResponse = await post('/jobs/interviews/33/accept', { note: ' See you then. ' });
    expect(acceptInterviewResponse.headers.location).toBe('/jobs/responses?status=interview-accepted');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/interviews/33/accept', {
      notes: 'See you then.'
    });

    const declineInterviewResponse = await post('/jobs/interviews/33/decline', { note: ' Not available. ' });
    expect(declineInterviewResponse.headers.location).toBe('/jobs/responses?status=interview-declined');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/interviews/33/decline', {
      notes: 'Not available.'
    });

    const acceptOfferResponse = await post('/jobs/offers/44/accept');
    expect(acceptOfferResponse.headers.location).toBe('/jobs/responses?status=offer-accepted');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/offers/44/accept');

    const rejectOfferResponse = await post('/jobs/offers/44/reject');
    expect(rejectOfferResponse.headers.location).toBe('/jobs/responses?status=offer-rejected');
    expect(api.callJobApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/offers/44/reject');

    api.callJobApi.mockClear();
    const unsigned = request.agent(app);
    const unsignedFirst = await unsigned.get('/contact');
    const unsignedCsrf = unsignedFirst.text.match(/name="_csrf" value="([^"]+)"/);
    const unsignedResponse = await unsigned
      .post('/jobs/42/apply')
      .type('form')
      .send({ _csrf: unsignedCsrf[1], cover_letter: 'Hello' });
    expect(unsignedResponse.status).toBe(302);
    expect(unsignedResponse.headers.location).toBe('/login');
    expect(api.callJobApi).not.toHaveBeenCalled();
  });

  it('submits the Laravel job application route with multipart CV data', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.uploadJobApplication.mockClear();
    api.callJobApi.mockClear();
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/jobs/42/apply')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .field('_csrf', csrfMatch[1])
      .field('cover_letter', ' I can help with delivery. ')
      .attach('cv', Buffer.from('%PDF-1.4 fake cv', 'utf8'), {
        filename: 'alex-cv.pdf',
        contentType: 'application/pdf'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/jobs/42?status=applied');
    expect(api.uploadJobApplication).toHaveBeenCalledWith('test-token', 42, expect.objectContaining({
      message: 'I can help with delivery.',
      file: expect.objectContaining({
        filename: 'alex-cv.pdf',
        contentType: 'application/pdf',
        buffer: expect.any(Buffer)
      })
    }));
    expect(api.callJobApi).not.toHaveBeenCalled();
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

  it('renders and submits Laravel event cover images with multipart data', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    api.getMyGroups.mockResolvedValueOnce({ data: [] });
    api.createEvent.mockResolvedValueOnce({ id: 42 });

    const page = await agent
      .get('/events/new')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = page.text.match(/name="_csrf" value="([^"]+)"/);

    expect(page.status).toBe(200);
    expect(page.text).toContain('action="/events/new"');
    expect(page.text).toContain('enctype="multipart/form-data"');
    expect(page.text).toContain('name="image"');
    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/events/new')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .field('_csrf', csrfMatch[1])
      .field('title', ' Community garden day ')
      .field('description', ' Planting and tea ')
      .field('starts_at_date', '2026-08-01')
      .field('starts_at_time', '10:00')
      .attach('image', Buffer.from('fake event image', 'utf8'), {
        filename: 'garden.webp',
        contentType: 'image/webp'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/events/42');
    expect(api.createEvent).toHaveBeenCalledWith('test-token', expect.objectContaining({
      title: 'Community garden day',
      description: 'Planting and tea',
      starts_at: '2026-08-01T10:00:00'
    }));
    expect(api.uploadEventImage).toHaveBeenCalledWith('test-token', 42, {
      file: expect.objectContaining({
        filename: 'garden.webp',
        contentType: 'image/webp',
        buffer: Buffer.from('fake event image', 'utf8')
      })
    });
  });

  it('renders and submits Laravel event edit cover images with multipart data', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    api.getEvent.mockResolvedValueOnce({
      event: {
        id: 42,
        title: 'Community garden day',
        description: 'Planting and tea',
        location: 'Village hall',
        max_attendees: 20,
        starts_at: '2026-08-01T10:00:00'
      }
    });
    api.getMyGroups.mockResolvedValueOnce({ data: [] });

    const page = await agent
      .get('/events/42/edit')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = page.text.match(/name="_csrf" value="([^"]+)"/);

    expect(page.status).toBe(200);
    expect(page.text).toContain('action="/events/42/edit"');
    expect(page.text).toContain('enctype="multipart/form-data"');
    expect(page.text).toContain('name="image"');
    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/events/42/edit')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .field('_csrf', csrfMatch[1])
      .field('title', ' Community garden day ')
      .field('description', ' Planting and tea ')
      .field('starts_at_date', '2026-08-01')
      .field('starts_at_time', '10:00')
      .attach('image', Buffer.from('updated event image', 'utf8'), {
        filename: 'updated-garden.webp',
        contentType: 'image/webp'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/events/42');
    expect(api.updateEvent).toHaveBeenCalledWith('test-token', '42', expect.objectContaining({
      title: 'Community garden day',
      description: 'Planting and tea',
      starts_at: '2026-08-01T10:00:00'
    }));
    expect(api.uploadEventImage).toHaveBeenCalledWith('test-token', '42', {
      file: expect.objectContaining({
        filename: 'updated-garden.webp',
        contentType: 'image/webp',
        buffer: Buffer.from('updated event image', 'utf8')
      })
    });
  });

  it('renders and submits Laravel event category choices on create', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);

    api.getEventCategories.mockResolvedValueOnce({
      data: [
        { id: 7, name: 'Gardening' },
        { id: 9, name: 'Skills swap' }
      ]
    });
    api.getMyGroups.mockResolvedValueOnce({ data: [] });
    api.createEvent.mockResolvedValueOnce({ id: 42 });

    const page = await agent
      .get('/events/new')
      .set('Cookie', signedCookieHeader());
    const csrfMatch = page.text.match(/name="_csrf" value="([^"]+)"/);

    expect(page.status).toBe(200);
    expect(api.getEventCategories).toHaveBeenCalledWith('test-token');
    expect(page.text).toContain('name="category_id"');
    expect(page.text).toContain('value="7"');
    expect(page.text).toContain('Gardening');
    expect(page.text).toContain('Skills swap');
    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/events/new')
      .set('Cookie', signedCookieHeader())
      .field('_csrf', csrfMatch[1])
      .field('title', ' Seed swap ')
      .field('description', ' Bring spare seeds ')
      .field('location', ' Community garden ')
      .field('starts_at_date', '2026-08-01')
      .field('starts_at_time', '10:00')
      .field('category_id', '7');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/events/42');
    expect(api.createEvent).toHaveBeenCalledWith('test-token', expect.objectContaining({
      category_id: 7
    }));
  });

  it('renders and submits Laravel event category choices on edit', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);

    api.getEvent.mockResolvedValueOnce({
      event: {
        id: 42,
        title: 'Community garden day',
        description: 'Planting and tea',
        location: 'Village hall',
        category_id: 7,
        starts_at: '2026-08-01T10:00:00'
      }
    });
    api.getEventCategories.mockResolvedValueOnce({
      data: [
        { id: 7, name: 'Gardening' },
        { id: 9, name: 'Skills swap' }
      ]
    });
    api.getMyGroups.mockResolvedValueOnce({ data: [] });

    const page = await agent
      .get('/events/42/edit')
      .set('Cookie', signedCookieHeader());
    const csrfMatch = page.text.match(/name="_csrf" value="([^"]+)"/);

    expect(page.status).toBe(200);
    expect(api.getEventCategories).toHaveBeenCalledWith('test-token');
    expect(page.text).toContain('name="category_id"');
    expect(page.text).toContain('<option value="7" selected>Gardening</option>');
    expect(page.text).toContain('Skills swap');
    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/events/42/edit')
      .set('Cookie', signedCookieHeader())
      .field('_csrf', csrfMatch[1])
      .field('title', ' Community garden day ')
      .field('description', ' Planting and tea ')
      .field('location', ' Village hall ')
      .field('starts_at_date', '2026-08-01')
      .field('starts_at_time', '10:00')
      .field('category_id', '9');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/events/42');
    expect(api.updateEvent).toHaveBeenCalledWith('test-token', '42', expect.objectContaining({
      category_id: 9
    }));
  });

  it('renders and submits Laravel recurring event fields on create', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);

    api.getMyGroups.mockResolvedValueOnce({ data: [] });
    api.getEventCategories.mockResolvedValueOnce({ data: [{ id: 7, name: 'Gardening' }] });
    api.callEventApi.mockResolvedValueOnce({
      data: {
        template: { id: 42 },
        occurrences_created: 10
      }
    });

    const page = await agent
      .get('/events/new')
      .set('Cookie', signedCookieHeader());
    const csrfMatch = page.text.match(/name="_csrf" value="([^"]+)"/);

    expect(page.status).toBe(200);
    expect(page.text).toContain('name="is_recurring"');
    expect(page.text).toContain('name="recurrence_frequency"');
    expect(page.text).toContain('value="daily"');
    expect(page.text).toContain('Every two weeks');
    expect(page.text).toContain('data-recurrence-interval="2"');
    expect(page.text).toContain('name="recurrence_interval"');
    expect(page.text).toContain('name="recurrence_ends_type"');
    expect(page.text).toContain('name="recurrence_ends_after_count"');
    expect(page.text).toContain('name="recurrence_ends_on_date"');
    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/events/new')
      .set('Cookie', signedCookieHeader())
      .field('_csrf', csrfMatch[1])
      .field('title', ' Weekly seed swap ')
      .field('description', ' Bring spare seeds ')
      .field('location', ' Community garden ')
      .field('starts_at_date', '2026-08-01')
      .field('starts_at_time', '10:00')
      .field('ends_at_date', '2026-08-01')
      .field('ends_at_time', '11:30')
      .field('category_id', '7')
      .field('is_recurring', '1')
      .field('recurrence_frequency', 'weekly')
      .field('recurrence_interval', '2')
      .field('recurrence_ends_type', 'after_count')
      .field('recurrence_ends_after_count', '10');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/events/42');
    expect(api.callEventApi).toHaveBeenCalledWith('test-token', 'POST', '/recurring', expect.objectContaining({
      title: 'Weekly seed swap',
      description: 'Bring spare seeds',
      start_time: '2026-08-01T10:00:00',
      end_time: '2026-08-01T11:30:00',
      location: 'Community garden',
      category_id: 7,
      recurrence_frequency: 'weekly',
      recurrence_interval: 2,
      recurrence_ends_type: 'after_count',
      recurrence_ends_after_count: 10,
      recurrence_ends_on_date: null
    }));
    expect(api.createEvent).not.toHaveBeenCalled();
  });

  it('renders and submits Laravel event online attendance fields on create', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);

    api.getMyGroups.mockResolvedValueOnce({ data: [] });
    api.createEvent.mockResolvedValueOnce({ id: 42 });

    const page = await agent
      .get('/events/new')
      .set('Cookie', signedCookieHeader());
    const csrfMatch = page.text.match(/name="_csrf" value="([^"]+)"/);

    expect(page.status).toBe(200);
    expect(page.text).toContain('name="is_online"');
    expect(page.text).toContain('name="online_link"');
    expect(page.text).toContain('name="allow_remote_attendance"');
    expect(page.text).toContain('name="video_url"');
    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/events/new')
      .set('Cookie', signedCookieHeader())
      .field('_csrf', csrfMatch[1])
      .field('title', ' Online garden planning ')
      .field('description', ' Planning on a call ')
      .field('location', ' Zoom ')
      .field('starts_at_date', '2026-08-01')
      .field('starts_at_time', '10:00')
      .field('is_online', '1')
      .field('online_link', ' https://meet.example/garden ')
      .field('allow_remote_attendance', '1')
      .field('video_url', ' https://video.example/garden ');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/events/42');
    expect(api.createEvent).toHaveBeenCalledWith('test-token', expect.objectContaining({
      is_online: true,
      online_link: 'https://meet.example/garden',
      allow_remote_attendance: true,
      video_url: 'https://video.example/garden'
    }));
  });

  it('renders and submits Laravel event online attendance fields on edit', async () => {
    const api = require('../src/lib/api');
    const agent = request.agent(app);

    api.getEvent.mockResolvedValueOnce({
      event: {
        id: 42,
        title: 'Community garden day',
        description: 'Planting and tea',
        location: 'Village hall',
        is_online: true,
        online_link: 'https://meet.example/garden',
        allow_remote_attendance: true,
        video_url: 'https://video.example/garden',
        max_attendees: 20,
        starts_at: '2026-08-01T10:00:00'
      }
    });
    api.getMyGroups.mockResolvedValueOnce({ data: [] });

    const page = await agent
      .get('/events/42/edit')
      .set('Cookie', signedCookieHeader());
    const csrfMatch = page.text.match(/name="_csrf" value="([^"]+)"/);

    expect(page.status).toBe(200);
    expect(page.text).toContain('name="is_online"');
    expect(page.text).toContain('value="https://meet.example/garden"');
    expect(page.text).toContain('name="allow_remote_attendance"');
    expect(page.text).toContain('value="https://video.example/garden"');
    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/events/42/edit')
      .set('Cookie', signedCookieHeader())
      .field('_csrf', csrfMatch[1])
      .field('title', ' Community garden day ')
      .field('description', ' Planting and tea ')
      .field('location', ' Village hall ')
      .field('starts_at_date', '2026-08-01')
      .field('starts_at_time', '10:00')
      .field('is_online', '1')
      .field('online_link', ' https://meet.example/updated ')
      .field('allow_remote_attendance', '1')
      .field('video_url', ' https://video.example/updated ');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/events/42');
    expect(api.updateEvent).toHaveBeenCalledWith('test-token', '42', expect.objectContaining({
      is_online: true,
      online_link: 'https://meet.example/updated',
      allow_remote_attendance: true,
      video_url: 'https://video.example/updated'
    }));
  });

  it('renders the current Laravel event cover image on the edit form', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    api.getEvent.mockResolvedValueOnce({
      event: {
        id: 42,
        title: 'Community garden day',
        description: 'Planting and tea',
        location: 'Village hall',
        cover_image: '/uploads/events/garden.webp',
        max_attendees: 20,
        starts_at: '2026-08-01T10:00:00'
      }
    });
    api.getMyGroups.mockResolvedValueOnce({ data: [] });

    const page = await agent
      .get('/events/42/edit')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = page.text.match(/name="_csrf" value="([^"]+)"/);

    expect(page.status).toBe(200);
    expect(page.text).toContain('/uploads/events/garden.webp');
    expect(page.text).toContain('Current image for Community garden day');
    expect(csrfMatch).not.toBeNull();
  });

  it('renders Laravel event cover images on the events list', async () => {
    const api = require('../src/lib/api');

    api.getEvents.mockResolvedValueOnce({
      data: [
        {
          id: 42,
          title: 'Community garden day',
          description: 'Planting and tea',
          location: 'Village hall',
          cover_image: '/uploads/events/garden.webp',
          attendee_count: 3,
          max_attendees: 20,
          starts_at: '2026-08-01T10:00:00'
        }
      ],
      pagination: { page: 1, totalPages: 1 }
    });

    const response = await request(app)
      .get('/events')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(response.text).toContain('/uploads/events/garden.webp');
    expect(response.text).toContain('Photo for Community garden day');
  });

  it('renders the Laravel event cover image on the event detail page', async () => {
    const api = require('../src/lib/api');

    api.getEvent.mockResolvedValueOnce({
      event: {
        id: 42,
        title: 'Community garden day',
        description: 'Planting and tea',
        location: 'Village hall',
        cover_image: '/uploads/events/garden.webp',
        attendee_count: 3,
        max_attendees: 20,
        starts_at: '2026-08-01T10:00:00'
      }
    });
    api.getEventRsvps.mockResolvedValueOnce({ data: [] });

    const response = await request(app)
      .get('/events/42')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(response.text).toContain('/uploads/events/garden.webp');
    expect(response.text).toContain('Photo for Community garden day');
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

  it('submits the Laravel settings insurance upload route with multipart file data', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent.get('/contact');
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/settings/insurance')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .field('_csrf', csrfMatch[1])
      .field('insurance_type', 'public_liability')
      .field('provider_name', 'Example Mutual')
      .field('policy_number', 'PL-123')
      .field('expiry_date', '2027-06-30')
      .attach('certificate_file', Buffer.from('%PDF insurance certificate', 'utf8'), {
        filename: 'insurance.pdf',
        contentType: 'application/pdf'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/settings/insurance?status=insurance-uploaded#certificates');
    expect(api.uploadInsuranceCertificate).toHaveBeenCalledWith('test-token', expect.objectContaining({
      insurance_type: 'public_liability',
      provider_name: 'Example Mutual',
      policy_number: 'PL-123',
      expiry_date: '2027-06-30',
      file: expect.objectContaining({
        filename: 'insurance.pdf',
        contentType: 'application/pdf',
        buffer: Buffer.from('%PDF insurance certificate', 'utf8')
      })
    }));
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

  it('renders and submits Laravel-style message attachments with multipart file data', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    api.getConversation.mockResolvedValueOnce({
      id: 77,
      other_user_name: 'Avery Stone',
      messages: [{ id: 12, sender_id: 77, body: 'Can you send the guide?' }]
    });
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const page = await agent
      .get('/messages/77')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = page.text.match(/name="_csrf" value="([^"]+)"/);

    expect(page.status).toBe(200);
    expect(page.text).toContain('enctype="multipart/form-data"');
    expect(page.text).toContain('name="attachments[]"');
    expect(page.text).toContain('Can you send the guide?');
    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/messages/77')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .field('_csrf', csrfMatch[1])
      .field('content', ' Here is the handbook. ')
      .attach('attachments', Buffer.from('%PDF message attachment', 'utf8'), {
        filename: 'handbook.pdf',
        contentType: 'application/pdf'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/messages/77');
    expect(api.uploadMessageAttachments).toHaveBeenCalledWith('test-token', expect.objectContaining({
      recipient_id: 77,
      body: 'Here is the handbook.',
      files: [expect.objectContaining({
        filename: 'handbook.pdf',
        contentType: 'application/pdf',
        buffer: Buffer.from('%PDF message attachment', 'utf8')
      })]
    }));
    expect(api.replyToConversation).not.toHaveBeenCalled();
  });

  it('submits the Laravel voice message route with multipart audio data', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/messages/77/voice')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .field('_csrf', csrfMatch[1])
      .attach('voice', Buffer.from('fake webm audio bytes', 'utf8'), {
        filename: 'voice-note.webm',
        contentType: 'audio/webm'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/messages/77?status=message-sent');
    expect(api.uploadVoiceMessage).toHaveBeenCalledWith('test-token', expect.objectContaining({
      recipient_id: 77,
      file: expect.objectContaining({
        filename: 'voice-note.webm',
        contentType: 'audio/webm',
        buffer: Buffer.from('fake webm audio bytes', 'utf8')
      })
    }));
  });

  it('renders the Laravel-backed podcast index page', async () => {
    const api = require('../src/lib/api');
    api.callPodcastApi.mockResolvedValueOnce({
      data: [
        {
          id: 7,
          title: 'Community voices',
          description: 'Weekly audio updates from the community.',
          owner: { name: 'Aisha Khan' },
          approved_episode_count: 4,
          artwork_url: '/uploads/podcast.png'
        }
      ],
      meta: { total: 1, page: 1, per_page: 30 }
    });

    const response = await request(app)
      .get('/podcasts?q=climate&sort=followers')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callPodcastApi).toHaveBeenCalledWith('test-token', 'GET', '?per_page=30&sort=followers&q=climate');
    expect(response.text).toContain('Podcasts');
    expect(response.text).toContain('Listen to podcasts from your community.');
    expect(response.text).toContain('Find a podcast');
    expect(response.text).toContain('Community voices');
    expect(response.text).toContain('By Aisha Khan');
    expect(response.text).toContain('4 episodes');
    expect(response.text).toContain('href="/podcasts/7"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('redirects signed-out visitors away from podcasts before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.callPodcastApi.mockClear();

    const response = await request(app).get('/podcasts');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
    expect(api.callPodcastApi).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed podcast detail page', async () => {
    const api = require('../src/lib/api');
    api.callPodcastApi.mockResolvedValueOnce({
      data: {
        id: 7,
        title: 'Community voices',
        description: 'Stories from local members.',
        owner: { name: 'Aisha Khan' },
        rss_enabled: true,
        rss_url: 'https://example.test/feed.xml',
        episodes: [
          {
            id: 99,
            title: 'First update',
            description: 'A short first episode.',
            audio_url: 'https://media.example.test/first.mp3',
            status: 'published'
          }
        ]
      }
    });

    const response = await request(app)
      .get('/podcasts/7?status=subscribed')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callPodcastApi).toHaveBeenCalledWith('test-token', 'GET', '/7');
    expect(response.text).toContain('Back to podcasts');
    expect(response.text).toContain('You have subscribed to this podcast.');
    expect(response.text).toContain('By Aisha Khan');
    expect(response.text).toContain('Community voices');
    expect(response.text).toContain('Stories from local members.');
    expect(response.text).toContain('RSS feed');
    expect(response.text).toContain('Subscribe to this podcast');
    expect(response.text).toContain('First update');
    expect(response.text).toContain('href="/podcasts/7/episodes/99"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed podcast episode page', async () => {
    const api = require('../src/lib/api');
    api.callPodcastApi.mockResolvedValueOnce({
      data: {
        id: 99,
        title: 'First update',
        description: 'Episode notes for listeners.',
        audio_url: 'https://media.example.test/first.mp3',
        transcript: 'Welcome to the first update.',
        show: { id: 7, title: 'Community voices' }
      }
    });

    const response = await request(app)
      .get('/podcasts/7/episodes/99')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callPodcastApi).toHaveBeenCalledWith('test-token', 'GET', '/7/99');
    expect(response.text).toContain('Back to podcast');
    expect(response.text).toContain('Community voices');
    expect(response.text).toContain('First update');
    expect(response.text).toContain('Episode notes for listeners.');
    expect(response.text).toContain('Listen to First update');
    expect(response.text).toContain('Read transcript');
    expect(response.text).toContain('Welcome to the first update.');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed podcast studio dashboard', async () => {
    const api = require('../src/lib/api');
    api.callPodcastApi.mockResolvedValueOnce({
      data: [
        {
          id: 42,
          title: 'Community voices',
          status: 'draft',
          episodes_count: 2
        }
      ]
    });

    const response = await request(app)
      .get('/podcasts/studio?status=show-deleted')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callPodcastApi).toHaveBeenCalledWith('test-token', 'GET', '/mine');
    expect(response.text).toContain('Podcast studio');
    expect(response.text).toContain('Your show was deleted.');
    expect(response.text).toContain('Create and manage your podcast shows and episodes.');
    expect(response.text).toContain('Community voices');
    expect(response.text).toContain('Draft');
    expect(response.text).toContain('2 episodes');
    expect(response.text).toContain('href="/podcasts/studio/42"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed podcast create form', async () => {
    const api = require('../src/lib/api');
    api.callPodcastApi.mockClear();

    const response = await request(app)
      .get('/podcasts/studio/new')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callPodcastApi).not.toHaveBeenCalled();
    expect(response.text).toContain('Back to podcast studio');
    expect(response.text).toContain('Create a podcast');
    expect(response.text).toContain('Show title');
    expect(response.text).toContain('Who can listen?');
    expect(response.text).toContain('Anyone');
    expect(response.text).toContain('Members only');
    expect(response.text).toContain('Only me');
    expect(response.text).toContain('Create show');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed podcast manage page', async () => {
    const api = require('../src/lib/api');
    api.callPodcastApi.mockResolvedValueOnce({
      data: [
        {
          id: 42,
          title: 'Community voices',
          summary: 'Weekly local audio',
          description: 'Stories and updates.',
          category: 'Community',
          visibility: 'members',
          status: 'draft',
          moderation_status: 'approved',
          episodes: [
            {
              id: 99,
              title: 'First update',
              status: 'draft',
              episode_number: 3
            }
          ]
        }
      ]
    });

    const response = await request(app)
      .get('/podcasts/studio/42?status=episode-added')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callPodcastApi).toHaveBeenCalledWith('test-token', 'GET', '/mine');
    expect(response.text).toContain('Edit your podcast');
    expect(response.text).toContain('Your episode was added.');
    expect(response.text).toContain('Publish your show');
    expect(response.text).toContain('Community voices');
    expect(response.text).toContain('Weekly local audio');
    expect(response.text).toContain('Episode 3');
    expect(response.text).toContain('First update');
    expect(response.text).toContain('Add an episode');
    expect(response.text).toContain('Audio link');
    expect(response.text).toContain('Delete this show?');
    expect(response.text).not.toContain('Laravel Blade route');
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

  it('submits the Laravel podcast episode route with multipart audio data', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);

    const response = await agent
      .post('/podcasts/studio/42/episodes')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .field('_csrf', csrfMatch[1])
      .field('episode_title', ' First update ')
      .field('episode_summary', ' Short summary ')
      .field('episode_description', ' Longer notes ')
      .field('episode_number', '3')
      .attach('audio', Buffer.from('fake mp3 podcast bytes', 'utf8'), {
        filename: 'first-update.mp3',
        contentType: 'audio/mpeg'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/podcasts/studio/42?status=episode-added');
    expect(api.uploadPodcastEpisode).toHaveBeenCalledWith('test-token', 42, expect.objectContaining({
      title: 'First update',
      summary: 'Short summary',
      description: 'Longer notes',
      episode_number: 3,
      file: expect.objectContaining({
        filename: 'first-update.mp3',
        contentType: 'audio/mpeg',
        buffer: Buffer.from('fake mp3 podcast bytes', 'utf8')
      })
    }));
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

  it('submits Laravel course learner and instructor action aliases', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);
    api.callCourseApi.mockReset().mockImplementation(async (_token, _method, pathName) => {
      if (pathName === '') {
        return { data: { id: 91 } };
      }
      if (pathName === '/42/publish') {
        return { data: { id: 42, moderation_status: 'approved' } };
      }
      if (pathName === '/42/lessons/7/complete') {
        return { data: { course_completed: false } };
      }
      if (pathName === '/quizzes/51/attempt') {
        return { data: { passed: true, needs_review: false } };
      }
      return { data: { id: 42 } };
    });

    const first = await agent
      .get('/contact')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = first.text.match(/name="_csrf" value="([^"]+)"/);
    const post = (pathName, body = {}) => agent
      .post(pathName)
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .type('form')
      .send({ _csrf: csrfMatch[1], ...body });

    const enrolResponse = await post('/courses/42/enrol');
    expect(enrolResponse.status).toBe(302);
    expect(enrolResponse.headers.location).toBe('/courses/42?status=enrolled');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/enroll');

    const completeResponse = await post('/courses/42/lessons/7/complete', {
      watch_percent: '80'
    });
    expect(completeResponse.headers.location).toBe('/courses/42/learn?status=lesson-completed');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/lessons/7/complete', {
      watch_percent: 80
    });

    const quizResponse = await post('/courses/42/lessons/7/quiz', {
      quiz_id: '51',
      answers: {
        101: 'b',
        102: ['x', 'y']
      }
    });
    expect(quizResponse.headers.location).toBe('/courses/42/learn?lesson=7&status=quiz-passed');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'POST', '/quizzes/51/attempt', {
      answers: {
        101: 'b',
        102: ['x', 'y']
      }
    });

    const reviewResponse = await post('/courses/42/reviews', {
      rating: '5',
      body: ' Very useful '
    });
    expect(reviewResponse.headers.location).toBe('/courses/42?status=review-saved#reviews');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/reviews', {
      rating: 5,
      body: 'Very useful'
    });

    const createResponse = await post('/courses/instructor/new', {
      title: ' Community teaching ',
      summary: ' Practical skills ',
      description: ' Build lessons ',
      level: 'intermediate',
      visibility: 'public',
      enrollment_type: 'cohort',
      credit_cost: '12.50',
      category_id: '3'
    });
    expect(createResponse.headers.location).toBe('/courses/instructor/91/edit?status=created');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'POST', '', {
      title: 'Community teaching',
      summary: 'Practical skills',
      description: 'Build lessons',
      level: 'intermediate',
      visibility: 'public',
      enrollment_type: 'cohort',
      credit_cost: 12.5,
      category_id: 3
    });

    const updateResponse = await post('/courses/instructor/42/update', {
      title: ' Updated course ',
      summary: ' New summary ',
      description: ' New description ',
      level: 'advanced',
      visibility: 'members',
      enrollment_type: 'self_paced',
      credit_cost: '0',
      category_id: ''
    });
    expect(updateResponse.headers.location).toBe('/courses/instructor/42/edit?status=saved');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/42', {
      title: 'Updated course',
      summary: 'New summary',
      description: 'New description',
      level: 'advanced',
      visibility: 'members',
      enrollment_type: 'self_paced',
      credit_cost: 0,
      category_id: null
    });

    const publishResponse = await post('/courses/instructor/42/publish');
    expect(publishResponse.headers.location).toBe('/courses/instructor/42/edit?status=published');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/publish');

    const unpublishResponse = await post('/courses/instructor/42/unpublish');
    expect(unpublishResponse.headers.location).toBe('/courses/instructor/42/edit?status=unpublished');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/unpublish');

    const deleteResponse = await post('/courses/instructor/42/delete');
    expect(deleteResponse.headers.location).toBe('/courses/instructor?status=deleted');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/42');

    const gradeResponse = await post('/courses/instructor/42/grading/99', {
      score_percent: '88',
      passed: '1',
      feedback: ' Strong answer '
    });
    expect(gradeResponse.headers.location).toBe('/courses/instructor/42/grading?status=graded');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'POST', '/attempts/99/grade', {
      score_percent: 88,
      passed: true,
      feedback: 'Strong answer'
    });

    const sectionResponse = await post('/courses/instructor/42/sections', {
      section_title: ' Basics '
    });
    expect(sectionResponse.headers.location).toBe('/courses/instructor/42/edit?status=section-added');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/sections', {
      title: 'Basics'
    });

    const sectionUpdateResponse = await post('/courses/instructor/42/sections/5/update', {
      section_title: ' Foundations '
    });
    expect(sectionUpdateResponse.headers.location).toBe('/courses/instructor/42/edit?status=section-saved');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/42/sections/5', {
      title: 'Foundations'
    });

    const sectionDeleteResponse = await post('/courses/instructor/42/sections/5/delete');
    expect(sectionDeleteResponse.headers.location).toBe('/courses/instructor/42/edit?status=section-deleted');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/42/sections/5');

    const lessonResponse = await post('/courses/instructor/42/lessons', {
      lesson_title: ' Intro video ',
      section_id: '5',
      content_type: 'video',
      body: ' Watch this first ',
      media_url: ' https://video.test/intro '
    });
    expect(lessonResponse.headers.location).toBe('/courses/instructor/42/edit?status=lesson-added');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'POST', '/42/lessons', {
      title: 'Intro video',
      content_type: 'video',
      body: 'Watch this first',
      section_id: 5,
      video_url: 'https://video.test/intro'
    });

    const lessonUpdateResponse = await post('/courses/instructor/42/lessons/7/update', {
      lesson_title: ' Updated lesson ',
      section_id: '',
      content_type: 'pdf',
      body: ' Read this ',
      media_url: ' https://docs.test/guide.pdf '
    });
    expect(lessonUpdateResponse.headers.location).toBe('/courses/instructor/42/edit?status=lesson-saved');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'PUT', '/42/lessons/7', {
      title: 'Updated lesson',
      content_type: 'pdf',
      body: 'Read this',
      attachment_url: 'https://docs.test/guide.pdf'
    });

    const lessonDeleteResponse = await post('/courses/instructor/42/lessons/7/delete');
    expect(lessonDeleteResponse.headers.location).toBe('/courses/instructor/42/edit?status=lesson-deleted');
    expect(api.callCourseApi).toHaveBeenLastCalledWith('test-token', 'DELETE', '/42/lessons/7');

    api.callCourseApi.mockClear();
    const unsigned = request.agent(app);
    const unsignedFirst = await unsigned.get('/contact');
    const unsignedCsrf = unsignedFirst.text.match(/name="_csrf" value="([^"]+)"/);
    const unsignedResponse = await unsigned
      .post('/courses/42/enrol')
      .type('form')
      .send({ _csrf: unsignedCsrf[1] });
    expect(unsignedResponse.status).toBe(302);
    expect(unsignedResponse.headers.location).toBe('/login?status=auth-required');
    expect(api.callCourseApi).not.toHaveBeenCalled();
  });

  it('renders Laravel-backed course browse, learner, and instructor GET pages', async () => {
    const api = require('../src/lib/api');
    api.getMyCourses.mockResolvedValue({
      data: [
        {
          course: {
            id: 42,
            title: 'Advanced community care',
            cover_image: '/uploads/care.jpg'
          },
          progress_percent: 55,
          status: 'active'
        }
      ]
    });
    api.callCourseApi.mockImplementation(async (_token, method, pathName) => {
      if (method !== 'GET') return { data: { id: 42 } };
      if (pathName === '?per_page=30&q=care&category_id=3&level=advanced') {
        return {
          data: [
            {
              id: 42,
              title: 'Advanced community care',
              description: 'Build practical skills for supporting neighbours safely.',
              level: 'advanced',
              credit_cost: 2
            }
          ],
          meta: { total: 1, per_page: 30 }
        };
      }
      if (pathName === '/categories') {
        return { data: [{ id: 3, name: 'Care' }] };
      }
      if (pathName === '/42') {
        return {
          data: {
            id: 42,
            title: 'Advanced community care',
            summary: 'Practical neighbour support',
            description: 'Build practical skills for supporting neighbours safely.',
            level: 'advanced',
            visibility: 'members',
            enrollment_type: 'self_paced',
            credit_cost: 2,
            category_id: 3,
            status: 'draft',
            moderation_status: 'pending',
            author: { name: 'North Team' },
            is_enrolled: true,
            rating_avg: 4.5,
            rating_count: 2,
            sections: [
              {
                id: 5,
                title: 'Safety basics',
                lessons: [
                  {
                    id: 11,
                    title: 'Risk check',
                    content_type: 'text',
                    body: 'Use a simple checklist before each visit.'
                  },
                  {
                    id: 12,
                    title: 'Safeguarding quiz',
                    content_type: 'quiz',
                    quiz_id: 51
                  }
                ]
              }
            ]
          }
        };
      }
      if (pathName === '/42/prerequisites') {
        return { data: [{ id: 7, title: 'Intro to community support', completed: true }] };
      }
      if (pathName === '/42/reviews') {
        return {
          data: [
            {
              rating: 5,
              body: 'Useful and clear.',
              created_at: '2026-01-02T10:00:00Z',
              user: { name: 'Ada Learner' }
            }
          ]
        };
      }
      if (pathName === '/42/progress') {
        return {
          data: {
            enrollment: { status: 'completed', progress_percent: 100 },
            lessons: [{ lesson_id: 11, status: 'completed' }],
            availability: [
              { lesson_id: 11, available: true },
              { lesson_id: 12, available: true }
            ]
          }
        };
      }
      if (pathName === '/quizzes/51') {
        return {
          data: {
            id: 51,
            title: 'Safeguarding quiz',
            description: 'Check your understanding.',
            pass_mark_percent: 80,
            attempts_remaining: 2,
            questions: [
              {
                id: 101,
                prompt: 'What should you do first?',
                type: 'mcq',
                options: [{ id: 'ask', label: 'Ask for consent' }]
              }
            ]
          }
        };
      }
      if (pathName === '/mine') {
        return {
          data: [
            {
              id: 42,
              title: 'Advanced community care',
              status: 'published',
              moderation_status: 'pending',
              enrollment_count: 4,
              completion_count: 1
            }
          ]
        };
      }
      if (pathName === '/42/analytics') {
        return {
          data: {
            course: { id: 42, title: 'Advanced community care' },
            enrollments: { total: 4, active: 3, completed: 1, dropped: 0 },
            completion_rate: 25,
            avg_progress: 61.5,
            avg_quiz_score: 88,
            quiz_attempts: 3,
            per_lesson: [{ lesson_id: 11, title: 'Risk check', completed: 3 }]
          }
        };
      }
      if (pathName === '/42/grading') {
        return {
          data: [
            {
              id: 99,
              user_id: 77,
              user: { name: 'Manual Review Learner' },
              quiz: {
                title: 'Safeguarding quiz',
                questions: [{ id: 101, prompt: 'What should you do first?' }]
              },
              answers: { 101: 'Ask for consent' },
              score_percent: 0,
              passed: false,
              submitted_at: '2026-02-03T11:00:00Z'
            }
          ]
        };
      }
      if (pathName === '/42/certificate') {
        return { data: { html: '<!doctype html><html><body><h1>Course certificate</h1></body></html>' } };
      }
      throw new Error(`Unexpected course API call: ${method} ${pathName}`);
    });

    const browse = await request(app)
      .get('/courses?q=care&category=3&level=advanced')
      .set('Cookie', signedCookieHeader());
    expect(browse.status).toBe(200);
    expect(api.callCourseApi).toHaveBeenCalledWith('test-token', 'GET', '?per_page=30&q=care&category_id=3&level=advanced');
    expect(api.callCourseApi).toHaveBeenCalledWith('test-token', 'GET', '/categories');
    expect(browse.text).toContain('Find a course');
    expect(browse.text).toContain('Advanced community care');
    expect(browse.text).toContain('2 time credits');
    expect(browse.text).not.toContain('Laravel Blade route');

    const detail = await request(app)
      .get('/courses/42?status=enrolled')
      .set('Cookie', signedCookieHeader());
    expect(detail.status).toBe(200);
    expect(api.callCourseApi).toHaveBeenCalledWith('test-token', 'GET', '/42');
    expect(api.callCourseApi).toHaveBeenCalledWith('test-token', 'GET', '/42/prerequisites');
    expect(api.callCourseApi).toHaveBeenCalledWith('test-token', 'GET', '/42/reviews');
    expect(api.callCourseApi).toHaveBeenCalledWith('test-token', 'GET', '/42/progress');
    expect(detail.text).toContain('Advanced community care');
    expect(detail.text).toContain('Intro to community support');
    expect(detail.text).toContain('Download your certificate');
    expect(detail.text).toContain('Leave a review');

    const enrolRequired = await request(app)
      .get('/courses/42?status=enrol-required')
      .set('Cookie', signedCookieHeader());
    expect(enrolRequired.status).toBe(200);
    expect(enrolRequired.text).toContain('Enrol on this course before opening the learning area.');

    const learn = await request(app)
      .get('/courses/42/learn?lesson=12&status=quiz-passed')
      .set('Cookie', signedCookieHeader());
    expect(learn.status).toBe(200);
    expect(api.callCourseApi).toHaveBeenCalledWith('test-token', 'GET', '/quizzes/51');
    expect(learn.text).toContain('Safeguarding quiz');
    expect(learn.text).toContain('Ask for consent');
    expect(learn.text).toContain('Mark lesson as complete');

    const certificate = await request(app)
      .get('/courses/42/certificate')
      .set('Cookie', signedCookieHeader());
    expect(certificate.status).toBe(200);
    expect(certificate.text).toContain('Course certificate');

    const mine = await request(app)
      .get('/courses/mine')
      .set('Cookie', signedCookieHeader());
    expect(mine.status).toBe(200);
    expect(api.getMyCourses).toHaveBeenCalledWith('test-token');
    expect(mine.text).toContain('My learning');
    expect(mine.text).toContain('55% complete');
    expect(mine.text).toContain('Resume');

    const instructor = await request(app)
      .get('/courses/instructor?status=deleted')
      .set('Cookie', signedCookieHeader());
    expect(instructor.status).toBe(200);
    expect(api.callCourseApi).toHaveBeenCalledWith('test-token', 'GET', '/mine');
    expect(instructor.text).toContain('Courses you teach');
    expect(instructor.text).toContain('Awaiting review');
    expect(instructor.text).toContain('View analytics');

    const createForm = await request(app)
      .get('/courses/instructor/new?status=create-failed')
      .set('Cookie', signedCookieHeader());
    expect(createForm.status).toBe(200);
    expect(createForm.text).toContain('Create a course');
    expect(createForm.text).toContain('Enter a course title before creating the course.');
    expect(createForm.text).toContain('Course title');
    expect(createForm.text).toContain('Care');

    const editForm = await request(app)
      .get('/courses/instructor/42/edit?status=created')
      .set('Cookie', signedCookieHeader());
    expect(editForm.status).toBe(200);
    expect(editForm.text).toContain('Edit your course');
    expect(editForm.text).toContain('Safety basics');
    expect(editForm.text).toContain('Add a lesson');
    expect(editForm.text).toContain('Delete this course');

    const analytics = await request(app)
      .get('/courses/instructor/42/analytics')
      .set('Cookie', signedCookieHeader());
    expect(analytics.status).toBe(200);
    expect(analytics.text).toContain('Course analytics');
    expect(analytics.text).toContain('Total enrolments');
    expect(analytics.text).toContain('61.5%');
    expect(analytics.text).toContain('Risk check');

    const grading = await request(app)
      .get('/courses/instructor/42/grading?status=graded')
      .set('Cookie', signedCookieHeader());
    expect(grading.status).toBe(200);
    expect(api.callCourseApi).toHaveBeenCalledWith('test-token', 'GET', '/42/grading');
    expect(grading.text).toContain('Grading queue');
    expect(grading.text).toContain('Manual Review Learner');
    expect(grading.text).toContain('Ask for consent');
    expect(grading.text).toContain('Save grade');
  });

  it('renders the Laravel-backed marketplace browse page', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi
      .mockResolvedValueOnce({
        data: [
          {
            id: 42,
            title: 'Community bike',
            tagline: 'Freshly serviced',
            price: 15.5,
            price_currency: 'GBP',
            condition: 'good',
            location: 'Belfast',
            image: { thumbnail_url: '/uploads/bike-thumb.jpg' }
          }
        ],
        meta: { cursor: null, has_more: false, per_page: 30 }
      })
      .mockResolvedValueOnce({
        data: [
          { id: 9, name: 'Transport', slug: 'transport' }
        ]
      });

    const response = await request(app)
      .get('/marketplace?q=bike&category_id=9')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(1, 'test-token', 'GET', '/listings?limit=30&q=bike&category_id=9');
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(2, 'test-token', 'GET', '/categories');
    expect(response.text).toContain('Marketplace');
    expect(response.text).toContain('Buy, sell and swap goods and services with your community.');
    expect(response.text).toContain('Filter listings');
    expect(response.text).toContain('Community bike');
    expect(response.text).toContain('Freshly serviced');
    expect(response.text).toContain('GBP 15.50');
    expect(response.text).toContain('Belfast');
    expect(response.text).toContain('href="/marketplace/42"');
    expect(response.text).toContain('href="/marketplace/category/transport"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('redirects signed-out visitors away from marketplace GET pages before calling Laravel', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi.mockClear();

    const response = await request(app).get('/marketplace');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login?status=auth-required');
    expect(api.callMarketplaceApi).not.toHaveBeenCalled();
  });

  it('renders the Laravel-backed marketplace detail page', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi.mockResolvedValueOnce({
      data: {
        id: 42,
        title: 'Community bike',
        description: 'A road-ready bicycle for local trips.',
        price: 15.5,
        price_currency: 'GBP',
        condition: 'good',
        location: 'Belfast',
        delivery_method: 'pickup',
        user: { id: 77, name: 'Aisha Khan' },
        images: [{ url: '/uploads/bike.jpg' }]
      }
    });

    const response = await request(app)
      .get('/marketplace/42?status=saved')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenCalledWith('test-token', 'GET', '/listings/42');
    expect(response.text).toContain('Back to marketplace');
    expect(response.text).toContain('This item has been saved.');
    expect(response.text).toContain('Community bike');
    expect(response.text).toContain('A road-ready bicycle for local trips.');
    expect(response.text).toContain('GBP 15.50');
    expect(response.text).toContain('Condition');
    expect(response.text).toContain('good');
    expect(response.text).toContain('Seller');
    expect(response.text).toContain('Aisha Khan');
    expect(response.text).toContain('Buy this item');
    expect(response.text).toContain('href="/marketplace/42/buy"');
    expect(response.text).toContain('href="/marketplace/42/offer"');
    expect(response.text).toContain('href="/marketplace/42/report"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace create form', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi.mockResolvedValueOnce({
      data: [{ id: 9, name: 'Transport', slug: 'transport' }]
    });

    const response = await request(app)
      .get('/marketplace/create?status=listing-validation')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenCalledWith('test-token', 'GET', '/categories');
    expect(response.text).toContain('Create a listing');
    expect(response.text).toContain('Check the listing details and try again.');
    expect(response.text).toContain('About the item');
    expect(response.text).toContain('Title');
    expect(response.text).toContain('How are you pricing this item?');
    expect(response.text).toContain('Fixed price');
    expect(response.text).toContain('Open to offers');
    expect(response.text).toContain('Free to a good home');
    expect(response.text).toContain('Transport');
    expect(response.text).toContain('Publish listing');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace edit form', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi
      .mockResolvedValueOnce({
        data: {
          id: 42,
          title: 'Community bike',
          tagline: 'Freshly serviced',
          description: 'A road-ready bicycle.',
          price: 15.5,
          price_currency: 'GBP',
          price_type: 'fixed',
          condition: 'good',
          category_id: 9,
          delivery_method: 'both',
          location: 'Belfast',
          quantity: 2
        }
      })
      .mockResolvedValueOnce({
        data: [{ id: 9, name: 'Transport', slug: 'transport' }]
      });

    const response = await request(app)
      .get('/marketplace/42/edit')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(1, 'test-token', 'GET', '/listings/42');
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(2, 'test-token', 'GET', '/categories');
    expect(response.text).toContain('Edit your listing');
    expect(response.text).toContain('Community bike');
    expect(response.text).toContain('Freshly serviced');
    expect(response.text).toContain('A road-ready bicycle.');
    expect(response.text).toContain('value="15.5"');
    expect(response.text).toContain('value="GBP"');
    expect(response.text).toContain('value="Belfast"');
    expect(response.text).toContain('value="2"');
    expect(response.text).toContain('Save changes');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace buy form', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi.mockResolvedValueOnce({
      data: {
        id: 42,
        title: 'Community bike',
        price: 15.5,
        price_currency: 'GBP',
        user: { id: 77, name: 'Aisha Khan' }
      }
    });

    const response = await request(app)
      .get('/marketplace/42/buy?status=order-failed')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenCalledWith('test-token', 'GET', '/listings/42');
    expect(response.text).toContain('Confirm your purchase');
    expect(response.text).toContain('Sorry, your order could not be placed. Please try again.');
    expect(response.text).toContain('Community bike');
    expect(response.text).toContain('GBP 15.50');
    expect(response.text).toContain('Quantity');
    expect(response.text).toContain('Delivery notes');
    expect(response.text).toContain('Confirm order');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace offer form', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi.mockResolvedValueOnce({
      data: {
        id: 42,
        title: 'Community bike',
        price: 15.5,
        price_currency: 'GBP'
      }
    });

    const response = await request(app)
      .get('/marketplace/42/offer?status=offer-amount-invalid')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenCalledWith('test-token', 'GET', '/listings/42');
    expect(response.text).toContain('Make an offer');
    expect(response.text).toContain('Enter an offer amount greater than zero');
    expect(response.text).toContain('Community bike');
    expect(response.text).toContain('Asking price');
    expect(response.text).toContain('GBP 15.50');
    expect(response.text).toContain('Your offer');
    expect(response.text).toContain('Message to the seller');
    expect(response.text).toContain('Send offer');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace report form', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi.mockResolvedValueOnce({
      data: {
        id: 42,
        title: 'Community bike'
      }
    });

    const response = await request(app)
      .get('/marketplace/42/report?status=report-validation')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenCalledWith('test-token', 'GET', '/listings/42');
    expect(response.text).toContain('Report a listing');
    expect(response.text).toContain('Select a reason for reporting');
    expect(response.text).toContain('Community bike');
    expect(response.text).toContain('Why are you reporting this listing?');
    expect(response.text).toContain('Unsafe or dangerous');
    expect(response.text).toContain('Tell us more');
    expect(response.text).toContain('Send report');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace my listings dashboard', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi.mockResolvedValueOnce({
      data: [
        {
          id: 42,
          title: 'Expired bike',
          tagline: 'Ready to renew',
          status: 'expired',
          price: 0,
          price_currency: 'GBP',
          location: 'Belfast'
        },
        { id: 43, title: 'Active helmet', status: 'active', price: 8, price_currency: 'GBP' }
      ]
    });

    const response = await request(app)
      .get('/marketplace/mine?tab=expired&status=renewed')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenCalledWith('test-token', 'GET', '/listings?limit=100');
    expect(response.text).toContain('My listings');
    expect(response.text).toContain('Your listing was renewed.');
    expect(response.text).toContain('Expired bike');
    expect(response.text).toContain('Ready to renew');
    expect(response.text).toContain('Renew');
    expect(response.text).toContain('href="/marketplace/42/edit"');
    expect(response.text).not.toContain('Active helmet');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace saved and free listing pages', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi
      .mockResolvedValueOnce({
        data: [
          { id: 42, title: 'Saved bike', tagline: 'Saved for later', price: 15.5, price_currency: 'GBP' }
        ]
      })
      .mockResolvedValueOnce({
        data: [
          { id: 77, title: 'Free table', tagline: 'Collection only', price: 0, price_currency: 'GBP' }
        ]
      });

    const saved = await request(app)
      .get('/marketplace/saved?status=unsaved')
      .set('Cookie', signedCookieHeader());
    const free = await request(app)
      .get('/marketplace/free')
      .set('Cookie', signedCookieHeader());

    expect(saved.status).toBe(200);
    expect(free.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(1, 'test-token', 'GET', '/listings/saved?limit=50');
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(2, 'test-token', 'GET', '/listings/free?limit=50');
    expect(saved.text).toContain('Saved items');
    expect(saved.text).toContain('Item removed from your saved list.');
    expect(saved.text).toContain('Saved bike');
    expect(saved.text).toContain('Remove from saved');
    expect(free.text).toContain('Free items');
    expect(free.text).toContain('Items being given away for free');
    expect(free.text).toContain('Free table');
    expect(free.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace category page', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi
      .mockResolvedValueOnce({
        data: [
          { id: 9, name: 'Transport', slug: 'transport' },
          { id: 10, name: 'Home', slug: 'home' }
        ]
      })
      .mockResolvedValueOnce({
        data: [
          { id: 42, title: 'Category bike', tagline: 'Transport item', price: 12, price_currency: 'GBP' }
        ]
      });

    const response = await request(app)
      .get('/marketplace/category/transport?q=bike')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(1, 'test-token', 'GET', '/categories');
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(2, 'test-token', 'GET', '/listings?limit=30&q=bike&category=transport');
    expect(response.text).toContain('Back to marketplace');
    expect(response.text).toContain('Transport');
    expect(response.text).toContain('1 item');
    expect(response.text).toContain('Category bike');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace advanced search page', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi
      .mockResolvedValueOnce({
        data: [
          { id: 42, title: 'Filtered bike', condition: 'good', price: 20, price_currency: 'GBP' }
        ]
      })
      .mockResolvedValueOnce({
        data: [{ id: 9, name: 'Transport', slug: 'transport' }]
      });

    const response = await request(app)
      .get('/marketplace/search?q=bike&category_id=9&price_min=10&price_max=50&condition=good&condition=fair&seller_type=private&delivery_method=pickup&posted_within=7&sort=price_asc')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(1, 'test-token', 'GET', '/listings?limit=30&q=bike&category_id=9&price_min=10&price_max=50&condition=good&condition=fair&seller_type=private&delivery_method=pickup&posted_within=7&sort=price_asc');
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(2, 'test-token', 'GET', '/categories');
    expect(response.text).toContain('Advanced search');
    expect(response.text).toContain('Narrow your search by price, condition, delivery and more.');
    expect(response.text).toContain('Filtered bike');
    expect(response.text).toContain('Good');
    expect(response.text).toContain('Price: low to high');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace seller profile page', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi
      .mockResolvedValueOnce({
        data: {
          id: 77,
          user_id: 77,
          display_name: 'Aisha Khan',
          avatar_url: '/uploads/aisha.jpg',
          avg_rating: 4.7,
          total_ratings: 9,
          total_sales: 14,
          created_at: '2026-01-15T12:00:00Z',
          is_verified: true
        }
      })
      .mockResolvedValueOnce({
        data: [
          { id: 42, title: 'Seller bike', tagline: 'From Aisha', price: 15.5, price_currency: 'GBP' }
        ]
      });

    const response = await request(app)
      .get('/marketplace/seller/77')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(1, 'test-token', 'GET', '/sellers/77');
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(2, 'test-token', 'GET', '/sellers/77/listings?per_page=50');
    expect(response.text).toContain('Seller profile');
    expect(response.text).toContain('Aisha Khan');
    expect(response.text).toContain('Average rating: 4.7 out of 5 from 9 reviews');
    expect(response.text).toContain('14 completed sales');
    expect(response.text).toContain('Seller bike');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace offers dashboard', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi.mockResolvedValueOnce({
      data: [
        {
          id: 12,
          amount: 13.25,
          currency: 'GBP',
          status: 'pending',
          message: 'Can collect today',
          listing: { id: 42, title: 'Community bike' },
          buyer: { name: 'Sam Buyer' }
        }
      ]
    });

    const response = await request(app)
      .get('/marketplace/offers?tab=received&status=accepted')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenCalledWith('test-token', 'GET', '/my-offers/received?per_page=50');
    expect(response.text).toContain('My offers');
    expect(response.text).toContain('You accepted the offer.');
    expect(response.text).toContain('Community bike');
    expect(response.text).toContain('GBP 13.25');
    expect(response.text).toContain('From: Sam Buyer');
    expect(response.text).toContain('Accept');
    expect(response.text).toContain('action="/marketplace/offers/12/decline"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace buyer and seller order dashboards', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi
      .mockResolvedValueOnce({
        data: [
          {
            id: 91,
            order_number: 'MKT-91',
            status: 'shipped',
            total_price: 15.5,
            currency: 'GBP',
            tracking_number: 'TRACK123',
            listing: { title: 'Community bike' },
            seller: { name: 'Aisha Khan' }
          }
        ]
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 92,
            order_number: 'MKT-92',
            status: 'paid',
            total_price: 25,
            currency: 'GBP',
            listing: { title: 'Garden chair' },
            buyer: { name: 'Sam Buyer' }
          }
        ]
      });

    const buyer = await request(app)
      .get('/marketplace/orders?tab=completed&status=confirmed')
      .set('Cookie', signedCookieHeader());
    const seller = await request(app)
      .get('/marketplace/sales?tab=paid&status=shipped')
      .set('Cookie', signedCookieHeader());

    expect(buyer.status).toBe(200);
    expect(seller.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(1, 'test-token', 'GET', '/orders/purchases?limit=50&status=completed');
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(2, 'test-token', 'GET', '/orders/sales?limit=50&status=paid');
    expect(buyer.text).toContain('My orders');
    expect(buyer.text).toContain('Delivery confirmed. Thank you.');
    expect(buyer.text).toContain('Order MKT-91');
    expect(buyer.text).toContain('Community bike');
    expect(buyer.text).toContain('Confirm delivery');
    expect(seller.text).toContain('Sales');
    expect(seller.text).toContain('The order was marked as shipped.');
    expect(seller.text).toContain('Garden chair');
    expect(seller.text).toContain('Mark as shipped');
    expect(seller.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace pickups page', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi.mockResolvedValueOnce({
      data: [
        {
          id: 5,
          order_id: 91,
          listing_title: 'Community bike',
          status: 'reserved',
          qr_code: 'PICKUP-123',
          slot: { slot_start: '2026-07-07T10:30:00Z' }
        }
      ]
    });

    const response = await request(app)
      .get('/marketplace/pickups')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenCalledWith('test-token', 'GET', '/me/pickups');
    expect(response.text).toContain('My collections');
    expect(response.text).toContain('Community bike');
    expect(response.text).toContain('Reserved');
    expect(response.text).toContain('PICKUP-123');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace seller onboarding page', async () => {
    const api = require('../src/lib/api');
    api.callMarketplaceApi.mockResolvedValueOnce({
      data: {
        has_profile: true,
        onboarding_completed: true,
        profile: {
          business_name: 'Ford Cycles',
          display_name: 'Jasper Cycles',
          bio: 'Repairs and refurbished bikes',
          seller_type: 'business',
          business_registration: 'FC-123',
          business_address: {
            street: '1 Market Street',
            city: 'Belfast',
            postal_code: 'BT1 1AA',
            country: 'United Kingdom'
          }
        }
      }
    });

    const response = await request(app)
      .get('/marketplace/onboarding?status=onboarding-complete')
      .set('Cookie', signedCookieHeader());

    expect(response.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenCalledWith('test-token', 'GET', '/merchant-onboarding/status');
    expect(response.text).toContain('Become a seller');
    expect(response.text).toContain('Your seller details were saved. You can now start selling.');
    expect(response.text).toContain('You have completed seller setup.');
    expect(response.text).toContain('value="Ford Cycles"');
    expect(response.text).toContain('value="Jasper Cycles"');
    expect(response.text).toContain('Repairs and refurbished bikes');
    expect(response.text).toContain('value="1 Market Street"');
    expect(response.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace seller pickup slot pages', async () => {
    const api = require('../src/lib/api');
    const slots = {
      data: [
        {
          id: 7,
          slot_start: '2026-07-07T10:30:00Z',
          slot_end: '2026-07-07T12:00:00Z',
          capacity: 4,
          booked_count: 1,
          remaining: 3,
          is_recurring: true,
          is_active: false
        }
      ]
    };
    api.callMarketplaceApi
      .mockResolvedValueOnce(slots)
      .mockResolvedValueOnce(slots);

    const index = await request(app)
      .get('/marketplace/slots?status=pickup-confirmed&order_id=91')
      .set('Cookie', signedCookieHeader());
    const edit = await request(app)
      .get('/marketplace/slots/7/edit?status=slot-saved')
      .set('Cookie', signedCookieHeader());

    expect(index.status).toBe(200);
    expect(edit.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(1, 'test-token', 'GET', '/seller/pickup-slots');
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(2, 'test-token', 'GET', '/seller/pickup-slots');
    expect(index.text).toContain('Pickup slots');
    expect(index.text).toContain('Collection confirmed. The order is marked as collected.');
    expect(index.text).toContain('Order reference: 91');
    expect(index.text).toContain('Confirm a collection');
    expect(index.text).toContain('1 of 4 booked');
    expect(index.text).toContain('3 remaining');
    expect(index.text).toContain('Repeats weekly');
    expect(index.text).toContain('Not active');
    expect(index.text).toContain('href="/marketplace/slots/7/edit"');
    expect(edit.text).toContain('Edit pickup slot');
    expect(edit.text).toContain('Pickup slot updated.');
    expect(edit.text).toContain('value="2026-07-07T10:30"');
    expect(edit.text).toContain('action="/marketplace/slots/7/update"');
    expect(edit.text).toContain('Delete this slot');
    expect(edit.text).not.toContain('Laravel Blade route');
  });

  it('renders the Laravel-backed marketplace seller coupon pages', async () => {
    const api = require('../src/lib/api');
    const coupons = {
      data: {
        items: [
          {
            id: 5,
            title: 'Summer sale',
            code: 'SUMMER10',
            description: 'Ten percent off',
            discount_type: 'percent',
            discount_value: 10,
            min_order_cents: 500,
            max_uses: 20,
            valid_until: '2026-08-01T00:00:00Z',
            status: 'active',
            usage_count: 3
          }
        ]
      }
    };
    api.callMarketplaceApi
      .mockResolvedValueOnce(coupons)
      .mockResolvedValueOnce(coupons);

    const index = await request(app)
      .get('/marketplace/coupons?status=coupon-created')
      .set('Cookie', signedCookieHeader());
    const edit = await request(app)
      .get('/marketplace/coupons/5/edit?status=coupon-saved')
      .set('Cookie', signedCookieHeader());
    const create = await request(app)
      .get('/marketplace/coupons/new?status=coupon-title-required')
      .set('Cookie', signedCookieHeader());

    expect(index.status).toBe(200);
    expect(edit.status).toBe(200);
    expect(create.status).toBe(200);
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(1, 'test-token', 'GET', '/seller/coupons');
    expect(api.callMarketplaceApi).toHaveBeenNthCalledWith(2, 'test-token', 'GET', '/seller/coupons');
    expect(index.text).toContain('My coupons');
    expect(index.text).toContain('Your coupon was created.');
    expect(index.text).toContain('Summer sale');
    expect(index.text).toContain('SUMMER10');
    expect(index.text).toContain('10%');
    expect(index.text).toContain('Active');
    expect(index.text).toContain('href="/marketplace/coupons/5/edit"');
    expect(edit.text).toContain('Edit your coupon');
    expect(edit.text).toContain('Your changes were saved.');
    expect(edit.text).toContain('value="Summer sale"');
    expect(edit.text).toContain('Ten percent off');
    expect(edit.text).toContain('value="2026-08-01"');
    expect(edit.text).toContain('Delete this coupon?');
    expect(create.text).toContain('Create a coupon');
    expect(create.text).toContain('Enter a coupon title');
    expect(create.text).not.toContain('Laravel Blade route');
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

  it('renders and submits Laravel marketplace listing images with multipart data', async () => {
    const cookieSignature = require('cookie-signature');
    const api = require('../src/lib/api');
    const signedToken = `s:${cookieSignature.sign('test-token', process.env.COOKIE_SECRET)}`;
    const agent = request.agent(app);

    api.callMarketplaceApi
      .mockResolvedValueOnce({ data: [{ id: 9, name: 'Home' }] })
      .mockResolvedValueOnce({ data: { id: 42 } });

    const page = await agent
      .get('/marketplace/create')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`);
    const csrfMatch = page.text.match(/name="_csrf" value="([^"]+)"/);

    expect(page.status).toBe(200);
    expect(page.text).toContain('action="/marketplace/create"');
    expect(page.text).toContain('enctype="multipart/form-data"');
    expect(page.text).toContain('name="image"');
    expect(csrfMatch).not.toBeNull();

    const response = await agent
      .post('/marketplace/create')
      .set('Cookie', `token=${encodeURIComponent(signedToken)}`)
      .field('_csrf', csrfMatch[1])
      .field('title', ' Community lamp ')
      .field('description', ' Warm table lamp ')
      .field('price_type', 'fixed')
      .field('price', '12')
      .field('delivery_method', 'pickup')
      .attach('image', Buffer.from('fake marketplace image', 'utf8'), {
        filename: 'lamp.webp',
        contentType: 'image/webp'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/marketplace/42?status=listing-created');
    expect(api.callMarketplaceApi).toHaveBeenLastCalledWith('test-token', 'POST', '/listings', expect.objectContaining({
      title: 'Community lamp',
      description: 'Warm table lamp'
    }));
    expect(api.uploadMarketplaceListingImages).toHaveBeenCalledWith('test-token', 42, {
      file: expect.objectContaining({
        filename: 'lamp.webp',
        contentType: 'image/webp',
        buffer: Buffer.from('fake marketplace image', 'utf8')
      })
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

  it('submits the Laravel volunteering credential upload route with multipart file data', async () => {
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
      .field('_csrf', csrfMatch[1])
      .field('credential_type', 'garda_vetting')
      .field('expires_at', '2026-12-31')
      .attach('file', Buffer.from('%PDF volunteer credential', 'utf8'), {
        filename: 'garda-vetting.pdf',
        contentType: 'application/pdf'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/volunteering/credentials?status=credential-uploaded');
    expect(api.uploadVolunteerCredential).toHaveBeenCalledWith('test-token', expect.objectContaining({
      credential_type: 'garda_vetting',
      expires_at: '2026-12-31',
      file: expect.objectContaining({
        filename: 'garda-vetting.pdf',
        contentType: 'application/pdf',
        buffer: Buffer.from('%PDF volunteer credential', 'utf8')
      })
    }));
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
