// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Entities;
using Nexus.Api.Data.Configurations;

namespace Nexus.Api.Data;

/// <summary>
/// EF Core database context with tenant isolation via global query filters.
/// </summary>
public class NexusDbContext : DbContext
{
    private readonly TenantContext _tenantContext;

    // Direct properties for EF Core query filter parameterization.
    // EF Core can only parameterize expressions that reference DbContext members directly —
    // chained access like _tenantContext.TenantId is evaluated once at model build time.
    public int? CurrentTenantId => _tenantContext.TenantId;
    public bool IsTenantResolved => _tenantContext.IsResolved;

    public NexusDbContext(DbContextOptions<NexusDbContext> options, TenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Listing> Listings => Set<Listing>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<Connection> Connections => Set<Connection>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<EventRsvp> EventRsvps => Set<EventRsvp>();
    public DbSet<FeedPost> FeedPosts => Set<FeedPost>();
    public DbSet<PostLike> PostLikes => Set<PostLike>();
    public DbSet<PostComment> PostComments => Set<PostComment>();
    public DbSet<Badge> Badges => Set<Badge>();
    public DbSet<UserBadge> UserBadges => Set<UserBadge>();
    public DbSet<XpLog> XpLogs => Set<XpLog>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<AiConversation> AiConversations => Set<AiConversation>();
    public DbSet<AiMessage> AiMessages => Set<AiMessage>();
    public DbSet<KnowledgeChunk> KnowledgeChunks => Set<KnowledgeChunk>();
    public DbSet<AiMessageFeedback> AiMessageFeedbacks => Set<AiMessageFeedback>();
    public DbSet<AiRequestAuditLog> AiRequestAuditLogs => Set<AiRequestAuditLog>();
    public DbSet<AiConversationLongMemory> AiConversationLongMemories => Set<AiConversationLongMemory>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<TenantConfig> TenantConfigs => Set<TenantConfig>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Exchange> Exchanges => Set<Exchange>();
    public DbSet<ExchangeRating> ExchangeRatings => Set<ExchangeRating>();

    // Phase 17: Smart Matching
    public DbSet<MatchPreference> MatchPreferences => Set<MatchPreference>();
    public DbSet<MatchResult> MatchResults => Set<MatchResult>();

    // Phase 18: Volunteering
    public DbSet<VolunteerOpportunity> VolunteerOpportunities => Set<VolunteerOpportunity>();
    public DbSet<VolunteerShift> VolunteerShifts => Set<VolunteerShift>();
    public DbSet<VolunteerApplication> VolunteerApplications => Set<VolunteerApplication>();
    public DbSet<VolunteerCheckIn> VolunteerCheckIns => Set<VolunteerCheckIn>();
    public DbSet<RecurringShiftPattern> RecurringShiftPatterns => Set<RecurringShiftPattern>();
    public DbSet<ShiftGroupReservation> ShiftGroupReservations => Set<ShiftGroupReservation>();
    public DbSet<ShiftGroupMember> ShiftGroupMembers => Set<ShiftGroupMember>();
    public DbSet<ShiftSwapRequest> ShiftSwapRequests => Set<ShiftSwapRequest>();
    public DbSet<ShiftWaitlistEntry> ShiftWaitlistEntries => Set<ShiftWaitlistEntry>();

    // Phase 19: Wallet expansion
    public DbSet<TransactionCategory> TransactionCategories => Set<TransactionCategory>();
    public DbSet<TransactionLimit> TransactionLimits => Set<TransactionLimit>();
    public DbSet<BalanceAlert> BalanceAlerts => Set<BalanceAlert>();
    public DbSet<CreditDonation> CreditDonations => Set<CreditDonation>();

    // Phase 20: Listings expansion
    public DbSet<ListingAnalytics> ListingAnalytics => Set<ListingAnalytics>();
    public DbSet<ListingFavorite> ListingFavorites => Set<ListingFavorite>();
    public DbSet<ListingTag> ListingTags => Set<ListingTag>();

    // Phase 21: Groups expansion
    public DbSet<GroupAnnouncement> GroupAnnouncements => Set<GroupAnnouncement>();
    public DbSet<GroupPolicy> GroupPolicies => Set<GroupPolicy>();
    public DbSet<GroupFile> GroupFiles => Set<GroupFile>();
    public DbSet<GroupDiscussion> GroupDiscussions => Set<GroupDiscussion>();
    public DbSet<GroupDiscussionReply> GroupDiscussionReplies => Set<GroupDiscussionReply>();
    public DbSet<GroupInvite> GroupInvites => Set<GroupInvite>();
    public DbSet<GroupMediaItem> GroupMediaItems => Set<GroupMediaItem>();
    public DbSet<GroupWikiPage> GroupWikiPages => Set<GroupWikiPage>();
    public DbSet<GroupWikiRevision> GroupWikiRevisions => Set<GroupWikiRevision>();
    public DbSet<GroupQuestion> GroupQuestions => Set<GroupQuestion>();
    public DbSet<GroupAnswer> GroupAnswers => Set<GroupAnswer>();
    public DbSet<GroupQaVote> GroupQaVotes => Set<GroupQaVote>();
    public DbSet<GroupChallenge> GroupChallenges => Set<GroupChallenge>();
    public DbSet<GroupScheduledPost> GroupScheduledPosts => Set<GroupScheduledPost>();
    public DbSet<GroupWebhook> GroupWebhooks => Set<GroupWebhook>();
    public DbSet<GroupNotificationPreference> GroupNotificationPreferences => Set<GroupNotificationPreference>();
    public DbSet<GroupCustomField> GroupCustomFields => Set<GroupCustomField>();
    public DbSet<GroupWelcomeSettings> GroupWelcomeSettings => Set<GroupWelcomeSettings>();
    public DbSet<GroupChatroomPin> GroupChatroomPins => Set<GroupChatroomPin>();
    public DbSet<GroupRecommendationEvent> GroupRecommendationEvents => Set<GroupRecommendationEvent>();

    // Phase 22: Gamification expansion
    public DbSet<Challenge> Challenges => Set<Challenge>();
    public DbSet<ChallengeParticipant> ChallengeParticipants => Set<ChallengeParticipant>();
    public DbSet<Streak> Streaks => Set<Streak>();
    public DbSet<LeaderboardSeason> LeaderboardSeasons => Set<LeaderboardSeason>();
    public DbSet<LeaderboardEntry> LeaderboardEntries => Set<LeaderboardEntry>();
    public DbSet<DailyReward> DailyRewards => Set<DailyReward>();
    public DbSet<Story> Stories => Set<Story>();
    public DbSet<StoryView> StoryViews => Set<StoryView>();
    public DbSet<StoryReaction> StoryReactions => Set<StoryReaction>();
    public DbSet<StoryCloseFriend> StoryCloseFriends => Set<StoryCloseFriend>();
    public DbSet<StoryHighlight> StoryHighlights => Set<StoryHighlight>();
    public DbSet<StoryHighlightItem> StoryHighlightItems => Set<StoryHighlightItem>();

    // Phase 23: Skills & Endorsements
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<UserSkill> UserSkills => Set<UserSkill>();
    public DbSet<Endorsement> Endorsements => Set<Endorsement>();

    // Phase 24: Audit Logging
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<CompatibilityAuditEntry> CompatibilityAuditEntries => Set<CompatibilityAuditEntry>();

    // Phase 25: Email Notifications
    public DbSet<EmailTemplate> EmailTemplates => Set<EmailTemplate>();
    public DbSet<EmailLog> EmailLogs => Set<EmailLog>();
    public DbSet<DigestPreference> DigestPreferences => Set<DigestPreference>();

    // Phase 26: Content Reporting
    public DbSet<ContentReport> ContentReports => Set<ContentReport>();
    public DbSet<UserWarning> UserWarnings => Set<UserWarning>();

    // Phase 27: GDPR
    public DbSet<DataExportRequest> DataExportRequests => Set<DataExportRequest>();
    public DbSet<DataDeletionRequest> DataDeletionRequests => Set<DataDeletionRequest>();
    public DbSet<ConsentRecord> ConsentRecords => Set<ConsentRecord>();

    // Phase 28: Geocoding
    public DbSet<UserLocation> UserLocations => Set<UserLocation>();

    // Phase 29: Feed Ranking
    public DbSet<FeedBookmark> FeedBookmarks => Set<FeedBookmark>();
    public DbSet<PostShare> PostShares => Set<PostShare>();

    // Phase 30: Admin CRM
    public DbSet<AdminNote> AdminNotes => Set<AdminNote>();
    public DbSet<CrmTask> CrmTasks => Set<CrmTask>();
    public DbSet<UserTag> UserTags => Set<UserTag>();

    // Phase 31: Newsletter
    public DbSet<Newsletter> Newsletters => Set<Newsletter>();
    public DbSet<NewsletterSubscription> NewsletterSubscriptions => Set<NewsletterSubscription>();

    // Phase 32: Cookie Consent
    public DbSet<CookieConsent> CookieConsents => Set<CookieConsent>();
    public DbSet<CookiePolicy> CookiePolicies => Set<CookiePolicy>();

    // Phase 33: Push Notifications
    public DbSet<PushSubscription> PushSubscriptions => Set<PushSubscription>();
    public DbSet<PushNotificationLog> PushNotificationLogs => Set<PushNotificationLog>();
    public DbSet<NotificationPreference> NotificationPreferences => Set<NotificationPreference>();

    // Phase 34: i18n
    public DbSet<Translation> Translations => Set<Translation>();
    public DbSet<SupportedLocale> SupportedLocales => Set<SupportedLocale>();
    public DbSet<UserLanguagePreference> UserLanguagePreferences => Set<UserLanguagePreference>();

    // Phase 35: Federation
    public DbSet<FederationPartner> FederationPartners => Set<FederationPartner>();
    public DbSet<FederatedListing> FederatedListings => Set<FederatedListing>();
    public DbSet<FederatedExchange> FederatedExchanges => Set<FederatedExchange>();
    public DbSet<FederationAuditLog> FederationAuditLogs => Set<FederationAuditLog>();
    public DbSet<FederationApiKey> FederationApiKeys => Set<FederationApiKey>();
    public DbSet<FederationFeatureToggle> FederationFeatureToggles => Set<FederationFeatureToggle>();
    public DbSet<FederationUserSetting> FederationUserSettings => Set<FederationUserSetting>();
    public DbSet<FederationApiLog> FederationApiLogs => Set<FederationApiLog>();
    public DbSet<FederationExternalPartner> FederationExternalPartners => Set<FederationExternalPartner>();
    public DbSet<FederationExternalPartnerLog> FederationExternalPartnerLogs => Set<FederationExternalPartnerLog>();
    public DbSet<FederationWebhookNonce> FederationWebhookNonces => Set<FederationWebhookNonce>();
    public DbSet<FederationSystemControl> FederationSystemControls => Set<FederationSystemControl>();
    public DbSet<FederationTenantWhitelist> FederationTenantWhitelists => Set<FederationTenantWhitelist>();
    public DbSet<FederationTenantFeature> FederationTenantFeatures => Set<FederationTenantFeature>();
    public DbSet<FederationWebhookSubscription> FederationWebhookSubscriptions => Set<FederationWebhookSubscription>();
    public DbSet<FederationWebhookDeliveryLog> FederationWebhookDeliveryLogs => Set<FederationWebhookDeliveryLog>();

    // Phase 36: Predictive Staffing
    public DbSet<StaffingPrediction> StaffingPredictions => Set<StaffingPrediction>();
    public DbSet<VolunteerAvailability> VolunteerAvailabilities => Set<VolunteerAvailability>();

    // Phase 65: Volunteering long-tail
    // Phase 68: Federation protocol extensions
    public DbSet<FederatedHourTransfer> FederatedHourTransfers => Set<FederatedHourTransfer>();

    // Phase 72: Long-tail (donations, bookmarks, peer endorsements, presence)
    public DbSet<MoneyDonation> MoneyDonations => Set<MoneyDonation>();
    public DbSet<Bookmark> Bookmarks => Set<Bookmark>();
    public DbSet<BookmarkCollection> BookmarkCollections => Set<BookmarkCollection>();
    public DbSet<PeerEndorsement> PeerEndorsements => Set<PeerEndorsement>();
    public DbSet<UserPresence> UserPresences => Set<UserPresence>();

    public DbSet<VolunteerExpense> VolunteerExpenses => Set<VolunteerExpense>();
    public DbSet<VolunteerWellbeing> VolunteerWellbeings => Set<VolunteerWellbeing>();
    public DbSet<VolunteerCertificate> VolunteerCertificates => Set<VolunteerCertificate>();
    public DbSet<VolunteerEmergencyAlert> VolunteerEmergencyAlerts => Set<VolunteerEmergencyAlert>();
    public DbSet<VolunteerTrainingCourse> VolunteerTrainingCourses => Set<VolunteerTrainingCourse>();
    public DbSet<VolunteerTrainingCompletion> VolunteerTrainingCompletions => Set<VolunteerTrainingCompletion>();
    public DbSet<VolunteerGuardianConsent> VolunteerGuardianConsents => Set<VolunteerGuardianConsent>();
    public DbSet<VolunteerTenantPolicy> VolunteerTenantPolicies => Set<VolunteerTenantPolicy>();

    // Phase 37: Advanced Admin
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<ScheduledTask> ScheduledTasks => Set<ScheduledTask>();
    public DbSet<ScheduledJobRun> ScheduledJobRuns => Set<ScheduledJobRun>();
    public DbSet<PlatformAnnouncement> PlatformAnnouncements => Set<PlatformAnnouncement>();

    // WebAuthn/Passkeys
    public DbSet<UserPasskey> UserPasskeys => Set<UserPasskey>();

    // Registration Policy Engine
    public DbSet<TenantRegistrationPolicy> TenantRegistrationPolicies => Set<TenantRegistrationPolicy>();
    public DbSet<IdentityVerificationSession> IdentityVerificationSessions => Set<IdentityVerificationSession>();
    public DbSet<IdentityVerificationEvent> IdentityVerificationEvents => Set<IdentityVerificationEvent>();

    // TOTP Backup Codes
    public DbSet<TotpBackupCode> TotpBackupCodes => Set<TotpBackupCode>();

    // File Uploads
    public DbSet<FileUpload> FileUploads => Set<FileUpload>();

    // User Preferences
    public DbSet<UserPreference> UserPreferences => Set<UserPreference>();

    // Jobs Module
    public DbSet<JobVacancy> JobVacancies => Set<JobVacancy>();
    public DbSet<JobApplication> JobApplications => Set<JobApplication>();
    public DbSet<SavedJob> SavedJobs => Set<SavedJob>();

    // Knowledge Base
    public DbSet<KnowledgeArticle> KnowledgeArticles => Set<KnowledgeArticle>();

    // Legal Documents
    public DbSet<LegalDocument> LegalDocuments => Set<LegalDocument>();
    public DbSet<LegalDocumentAcceptance> LegalDocumentAcceptances => Set<LegalDocumentAcceptance>();

    // Polls Module
    public DbSet<Poll> Polls => Set<Poll>();
    public DbSet<PollOption> PollOptions => Set<PollOption>();
    public DbSet<PollVote> PollVotes => Set<PollVote>();

    // Goals Module
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<GoalMilestone> GoalMilestones => Set<GoalMilestone>();

    // Member Availability
    public DbSet<MemberAvailability> MemberAvailabilities => Set<MemberAvailability>();
    public DbSet<AvailabilityException> AvailabilityExceptions => Set<AvailabilityException>();

    // Ideation
    public DbSet<Idea> Ideas => Set<Idea>();
    public DbSet<IdeaVote> IdeaVotes => Set<IdeaVote>();
    public DbSet<IdeaComment> IdeaComments => Set<IdeaComment>();

    // Blog/CMS
    public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
    public DbSet<BlogCategory> BlogCategories => Set<BlogCategory>();

    // Pages
    public DbSet<Page> Pages => Set<Page>();
    public DbSet<PageVersion> PageVersions => Set<PageVersion>();

    // Organisations
    public DbSet<Organisation> Organisations => Set<Organisation>();
    public DbSet<OrganisationMember> OrganisationMembers => Set<OrganisationMember>();

    // Organisation Wallets
    public DbSet<OrgWallet> OrgWallets => Set<OrgWallet>();
    public DbSet<OrgWalletTransaction> OrgWalletTransactions => Set<OrgWalletTransaction>();

    // NexusScore
    public DbSet<NexusScore> NexusScores => Set<NexusScore>();
    public DbSet<NexusScoreHistory> NexusScoreHistories => Set<NexusScoreHistory>();

    // Onboarding
    public DbSet<OnboardingStep> OnboardingSteps => Set<OnboardingStep>();
    public DbSet<OnboardingProgress> OnboardingProgresses => Set<OnboardingProgress>();

    // Tenant Hierarchy
    public DbSet<TenantHierarchy> TenantHierarchies => Set<TenantHierarchy>();

    // Insurance
    public DbSet<InsuranceCertificate> InsuranceCertificates => Set<InsuranceCertificate>();

    // Voice Messages
    public DbSet<VoiceMessage> VoiceMessages => Set<VoiceMessage>();

    // Resources Library
    public DbSet<Resource> Resources => Set<Resource>();
    public DbSet<ResourceCategory> ResourceCategories => Set<ResourceCategory>();

    // Threaded Comments V2
    public DbSet<ThreadedComment> ThreadedComments => Set<ThreadedComment>();

    // Vetting/DBS Records
    public DbSet<VettingRecord> VettingRecords => Set<VettingRecord>();

    // GDPR Breach & Consent Types
    public DbSet<GdprBreach> GdprBreaches => Set<GdprBreach>();
    public DbSet<GdprConsentType> GdprConsentTypes => Set<GdprConsentType>();

    // Verification Badges
    public DbSet<VerificationBadgeType> VerificationBadgeTypes => Set<VerificationBadgeType>();
    public DbSet<UserVerificationBadge> UserVerificationBadges => Set<UserVerificationBadge>();

    // Member Activity
    public DbSet<MemberActivityLog> MemberActivityLogs => Set<MemberActivityLog>();

    // FAQs
    public DbSet<Faq> Faqs => Set<Faq>();

    // Email Verification
    public DbSet<EmailVerificationToken> EmailVerificationTokens => Set<EmailVerificationToken>();

    // User Sessions
    public DbSet<UserSession> UserSessions => Set<UserSession>();

    // Event Reminders
    public DbSet<EventReminder> EventReminders => Set<EventReminder>();

    // Group Exchanges
    public DbSet<GroupExchange> GroupExchanges => Set<GroupExchange>();
    public DbSet<GroupExchangeParticipant> GroupExchangeParticipants => Set<GroupExchangeParticipant>();

    // Broker Assignments
    public DbSet<BrokerAssignment> BrokerAssignments => Set<BrokerAssignment>();
    public DbSet<BrokerNote> BrokerNotes => Set<BrokerNote>();
    public DbSet<SafeguardingOption> SafeguardingOptions => Set<SafeguardingOption>();
    public DbSet<SafeguardingAssignment> SafeguardingAssignments => Set<SafeguardingAssignment>();
    public DbSet<SafeguardingMessageReview> SafeguardingMessageReviews => Set<SafeguardingMessageReview>();
    public DbSet<BrokerRiskTag> BrokerRiskTags => Set<BrokerRiskTag>();
    public DbSet<UserMonitoringRestriction> UserMonitoringRestrictions => Set<UserMonitoringRestriction>();

    // Enterprise Config
    public DbSet<EnterpriseConfig> EnterpriseConfigs => Set<EnterpriseConfig>();
    // Collaborative Filtering + Match Learning
    public DbSet<UserInteraction> UserInteractions => Set<UserInteraction>();
    public DbSet<UserSimilarity> UserSimilarities => Set<UserSimilarity>();
    public DbSet<MatchFeedback> MatchFeedbacks => Set<MatchFeedback>();

    // Hashtag Discovery
    public DbSet<Hashtag> Hashtags => Set<Hashtag>();
    public DbSet<HashtagUsage> HashtagUsages => Set<HashtagUsage>();

    // Personal Insights
    public DbSet<PersonalInsight> PersonalInsights => Set<PersonalInsight>();

    // Saved Searches
    public DbSet<SavedSearch> SavedSearches => Set<SavedSearch>();

    // Sub-Accounts / Family Profiles
    public DbSet<SubAccount> SubAccounts => Set<SubAccount>();
    public DbSet<XpShopRedemption> XpShopRedemptions => Set<XpShopRedemption>();

    // Contact Forms
    public DbSet<ContactSubmission> ContactSubmissions => Set<ContactSubmission>();

    // Emergency Alerts
    public DbSet<EmergencyAlert> EmergencyAlerts => Set<EmergencyAlert>();

    // Message Attachments
    public DbSet<MessageAttachment> MessageAttachments => Set<MessageAttachment>();

    // Subscriptions & Plans
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<UserSubscription> UserSubscriptions => Set<UserSubscription>();

    // Deliverables
    public DbSet<Deliverable> Deliverables => Set<Deliverable>();
    public DbSet<DeliverableComment> DeliverableComments => Set<DeliverableComment>();

    // Idea Favorites
    public DbSet<IdeaFavorite> IdeaFavorites => Set<IdeaFavorite>();

    // Post Reactions
    public DbSet<PostReaction> PostReactions => Set<PostReaction>();

    // Feed Moderation
    public DbSet<HiddenPost> HiddenPosts => Set<HiddenPost>();
    public DbSet<MutedUser> MutedUsers => Set<MutedUser>();
    public DbSet<FeedReport> FeedReports => Set<FeedReport>();

    // Gamification Challenges (GamificationChallenge + ChallengeProgress)
    public DbSet<GamificationChallenge> GamificationChallenges => Set<GamificationChallenge>();
    public DbSet<ChallengeProgress> ChallengeProgresses => Set<ChallengeProgress>();

    // Daily Reward Log
    public DbSet<DailyRewardLog> DailyRewardLogs => Set<DailyRewardLog>();

    // Badge Collections & Showcase
    public DbSet<BadgeCollection> BadgeCollections => Set<BadgeCollection>();
    public DbSet<BadgeShowcase> BadgeShowcases => Set<BadgeShowcase>();

    // XP Shop
    public DbSet<ShopItem> ShopItems => Set<ShopItem>();
    public DbSet<ShopPurchase> ShopPurchases => Set<ShopPurchase>();

    // Webhook Events
    public DbSet<WebhookEvent> WebhookEvents => Set<WebhookEvent>();

    // Marketplace
    public DbSet<MarketplaceCategory> MarketplaceCategories => Set<MarketplaceCategory>();
    public DbSet<MarketplaceListing> MarketplaceListings => Set<MarketplaceListing>();
    public DbSet<MarketplaceImage> MarketplaceImages => Set<MarketplaceImage>();
    public DbSet<MarketplaceSellerProfile> MarketplaceSellerProfiles => Set<MarketplaceSellerProfile>();
    public DbSet<MarketplaceSavedListing> MarketplaceSavedListings => Set<MarketplaceSavedListing>();
    public DbSet<MarketplaceOffer> MarketplaceOffers => Set<MarketplaceOffer>();
    public DbSet<MarketplaceOrder> MarketplaceOrders => Set<MarketplaceOrder>();
    public DbSet<MarketplaceReport> MarketplaceReports => Set<MarketplaceReport>();
    public DbSet<MarketplaceSavedSearch> MarketplaceSavedSearches => Set<MarketplaceSavedSearch>();
    public DbSet<MarketplaceCollection> MarketplaceCollections => Set<MarketplaceCollection>();
    public DbSet<MarketplaceCollectionItem> MarketplaceCollectionItems => Set<MarketplaceCollectionItem>();
    public DbSet<MarketplacePromotion> MarketplacePromotions => Set<MarketplacePromotion>();
    public DbSet<MarketplaceShippingOption> MarketplaceShippingOptions => Set<MarketplaceShippingOption>();
    public DbSet<MarketplacePickupSlot> MarketplacePickupSlots => Set<MarketplacePickupSlot>();
    public DbSet<MarketplacePickupReservation> MarketplacePickupReservations => Set<MarketplacePickupReservation>();
    public DbSet<MarketplaceDeliveryOffer> MarketplaceDeliveryOffers => Set<MarketplaceDeliveryOffer>();
    public DbSet<MarketplaceSellerRating> MarketplaceSellerRatings => Set<MarketplaceSellerRating>();
    public DbSet<MerchantCoupon> MerchantCoupons => Set<MerchantCoupon>();
    public DbSet<MerchantCouponRedemption> MerchantCouponRedemptions => Set<MerchantCouponRedemption>();

    // Jobs parity
    public DbSet<JobSavedProfile> JobSavedProfiles => Set<JobSavedProfile>();
    public DbSet<JobTemplate> JobTemplates => Set<JobTemplate>();
    public DbSet<JobVacancyTeamMember> JobVacancyTeamMembers => Set<JobVacancyTeamMember>();
    public DbSet<JobInterview> JobInterviews => Set<JobInterview>();
    public DbSet<JobInterviewSlot> JobInterviewSlots => Set<JobInterviewSlot>();
    public DbSet<JobOffer> JobOffers => Set<JobOffer>();
    public DbSet<JobOfferTemplate> JobOfferTemplates => Set<JobOfferTemplate>();
    public DbSet<JobScorecard> JobScorecards => Set<JobScorecard>();
    public DbSet<JobPipelineRule> JobPipelineRules => Set<JobPipelineRule>();
    public DbSet<JobReferral> JobReferrals => Set<JobReferral>();
    public DbSet<EmployerReview> EmployerReviews => Set<EmployerReview>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var configurations = new IEntityGroupConfiguration[]
        {
            new TenantConfiguration(_tenantContext),
            new AuthConfiguration(_tenantContext),
            new ListingConfiguration(_tenantContext),
            new WalletConfiguration(_tenantContext),
            new MessagingConfiguration(_tenantContext),
            new SocialConfiguration(_tenantContext),
            new GroupConfiguration(_tenantContext),
            new EventConfiguration(_tenantContext),
            new GamificationConfiguration(_tenantContext),
            new NotificationConfiguration(_tenantContext),
            new FederationConfiguration(_tenantContext),
            new GdprConfiguration(_tenantContext),
            new AdminConfiguration(_tenantContext),
            new ReviewConfiguration(_tenantContext),
            new SkillConfiguration(_tenantContext),
            new EmailConfiguration(_tenantContext),
            new AiConfiguration(_tenantContext),
            new JobsConfiguration(_tenantContext),
            new OrganisationConfiguration(_tenantContext),
            new OrgWalletConfiguration(_tenantContext),
            new VolunteerConfiguration(_tenantContext),
            new VolunteerLongTailConfiguration(_tenantContext),
            new VolunteerAdminConfiguration(_tenantContext),
            new FederationProtocolsConfiguration(_tenantContext),
            new Phase72Configuration(_tenantContext),
            new MatchingConfiguration(_tenantContext),
            new LocationConfiguration(_tenantContext),
            new NewsletterConfiguration(_tenantContext),
            new I18nConfiguration(_tenantContext),
            new SystemConfiguration(_tenantContext),
            new FileContentConfiguration(_tenantContext),
            new PollsGoalsConfiguration(_tenantContext),
            new IdeationAvailabilityConfiguration(_tenantContext),
            new CmsConfiguration(_tenantContext),
            new NexusScoreOnboardingConfiguration(_tenantContext),
            new TenantHierarchyInsuranceConfiguration(_tenantContext),
            new ResourcesCommentsConfiguration(_tenantContext),
            new VettingVerificationConfiguration(_tenantContext),
            new MemberActivityFaqConfiguration(_tenantContext),
            new BrokerEnterpriseConfiguration(_tenantContext),
            new DiscoveryConfiguration(_tenantContext),
            new ContactEmergencyConfiguration(_tenantContext),
            new FeedModerationGamificationConfiguration(_tenantContext),
            new WebhookConfiguration(_tenantContext),
            new ScheduledJobRunConfiguration(),
        };

        foreach (var config in configurations)
        {
            config.Configure(modelBuilder);
        }

        ConfigureMarketplace(modelBuilder);
        ConfigureJobsParity(modelBuilder);
        ConfigureGroupsParity(modelBuilder);
        ConfigureStories(modelBuilder);

        // Re-apply tenant query filters referencing DbContext's _tenantContext field
        // so EF Core can parameterize them per-query (fixes broken config class references)
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType))
            {
                var method = typeof(NexusDbContext)
                    .GetMethod(nameof(ApplyTenantQueryFilter), BindingFlags.NonPublic | BindingFlags.Instance)!
                    .MakeGenericMethod(entityType.ClrType);
                method.Invoke(this, new object[] { modelBuilder });
            }
        }
    }

        public override int SaveChanges()
    {
        SetTenantIdOnInsert();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SetTenantIdOnInsert();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyTenantQueryFilter<T>(ModelBuilder modelBuilder) where T : class, ITenantEntity
    {
        if (typeof(T) == typeof(Listing))
        {
            modelBuilder.Entity<Listing>().HasQueryFilter(e =>
                (!IsTenantResolved || e.TenantId == CurrentTenantId)
                && e.DeletedAt == null);
        }
        else
        {
            modelBuilder.Entity<T>().HasQueryFilter(e =>
                !IsTenantResolved || e.TenantId == CurrentTenantId);
        }
    }

    private static void ConfigureMarketplace(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MarketplaceCategory>(entity =>
        {
            entity.ToTable("marketplace_categories");
            entity.HasIndex(e => new { e.TenantId, e.Slug }).IsUnique();
        });
        modelBuilder.Entity<MarketplaceListing>(entity =>
        {
            entity.ToTable("marketplace_listings");
            entity.HasIndex(e => new { e.TenantId, e.Status, e.ModerationStatus });
            entity.HasIndex(e => new { e.TenantId, e.UserId });
        });
        modelBuilder.Entity<MarketplaceImage>().ToTable("marketplace_images");
        modelBuilder.Entity<MarketplaceSellerProfile>(entity =>
        {
            entity.ToTable("marketplace_seller_profiles");
            entity.HasIndex(e => new { e.TenantId, e.UserId }).IsUnique();
        });
        modelBuilder.Entity<MarketplaceSavedListing>(entity =>
        {
            entity.ToTable("marketplace_saved_listings");
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.MarketplaceListingId }).IsUnique();
        });
        modelBuilder.Entity<MarketplaceOffer>().ToTable("marketplace_offers");
        modelBuilder.Entity<MarketplaceOrder>().ToTable("marketplace_orders");
        modelBuilder.Entity<MarketplaceReport>().ToTable("marketplace_reports");
        modelBuilder.Entity<MarketplaceSavedSearch>().ToTable("marketplace_saved_searches");
        modelBuilder.Entity<MarketplaceCollection>().ToTable("marketplace_collections");
        modelBuilder.Entity<MarketplaceCollectionItem>(entity =>
        {
            entity.ToTable("marketplace_collection_items");
            entity.HasIndex(e => new { e.TenantId, e.MarketplaceCollectionId, e.MarketplaceListingId }).IsUnique();
        });
        modelBuilder.Entity<MarketplacePromotion>().ToTable("marketplace_promotions");
        modelBuilder.Entity<MarketplaceShippingOption>().ToTable("marketplace_shipping_options");
        modelBuilder.Entity<MarketplacePickupSlot>().ToTable("marketplace_pickup_slots");
        modelBuilder.Entity<MarketplacePickupReservation>().ToTable("marketplace_pickup_reservations");
        modelBuilder.Entity<MarketplaceDeliveryOffer>().ToTable("marketplace_delivery_offers");
        modelBuilder.Entity<MarketplaceSellerRating>().ToTable("marketplace_seller_ratings");
        modelBuilder.Entity<MerchantCoupon>(entity =>
        {
            entity.ToTable("merchant_coupons");
            entity.HasIndex(e => new { e.TenantId, e.Code }).IsUnique();
        });
        modelBuilder.Entity<MerchantCouponRedemption>().ToTable("merchant_coupon_redemptions");
    }

    private static void ConfigureJobsParity(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<JobSavedProfile>(entity =>
        {
            entity.ToTable("job_saved_profiles");
            entity.HasIndex(e => new { e.TenantId, e.UserId }).IsUnique();
        });
        modelBuilder.Entity<JobTemplate>().ToTable("job_templates");
        modelBuilder.Entity<JobVacancyTeamMember>(entity =>
        {
            entity.ToTable("job_vacancy_team_members");
            entity.HasIndex(e => new { e.TenantId, e.JobId, e.UserId }).IsUnique();
        });
        modelBuilder.Entity<JobInterview>().ToTable("job_interviews");
        modelBuilder.Entity<JobInterviewSlot>().ToTable("job_interview_slots");
        modelBuilder.Entity<JobOffer>().ToTable("job_offers");
        modelBuilder.Entity<JobOfferTemplate>().ToTable("job_offer_templates");
        modelBuilder.Entity<JobScorecard>(entity =>
        {
            entity.ToTable("job_scorecards");
            entity.HasIndex(e => new { e.TenantId, e.ApplicationId, e.ReviewerUserId }).IsUnique();
        });
        modelBuilder.Entity<JobPipelineRule>().ToTable("job_pipeline_rules");
        modelBuilder.Entity<JobReferral>(entity =>
        {
            entity.ToTable("job_referrals");
            entity.HasIndex(e => new { e.TenantId, e.JobId, e.ReferrerUserId }).IsUnique();
            entity.HasIndex(e => new { e.TenantId, e.Code }).IsUnique();
        });
        modelBuilder.Entity<EmployerReview>().ToTable("employer_reviews");
    }

    private static void ConfigureGroupsParity(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<GroupInvite>(entity => { entity.ToTable("group_invites"); entity.HasIndex(e => new { e.TenantId, e.Token }).IsUnique(); });
        modelBuilder.Entity<GroupMediaItem>().ToTable("group_media_items");
        modelBuilder.Entity<GroupWikiPage>(entity => { entity.ToTable("group_wiki_pages"); entity.HasIndex(e => new { e.TenantId, e.GroupId, e.Slug }).IsUnique(); });
        modelBuilder.Entity<GroupWikiRevision>().ToTable("group_wiki_revisions");
        modelBuilder.Entity<GroupQuestion>().ToTable("group_questions");
        modelBuilder.Entity<GroupAnswer>().ToTable("group_answers");
        modelBuilder.Entity<GroupQaVote>(entity => { entity.ToTable("group_qa_votes"); entity.HasIndex(e => new { e.TenantId, e.UserId, e.TargetType, e.TargetId }).IsUnique(); });
        modelBuilder.Entity<GroupChallenge>().ToTable("group_challenges");
        modelBuilder.Entity<GroupScheduledPost>().ToTable("group_scheduled_posts");
        modelBuilder.Entity<GroupWebhook>().ToTable("group_webhooks");
        modelBuilder.Entity<GroupNotificationPreference>(entity => { entity.ToTable("group_notification_preferences"); entity.HasIndex(e => new { e.TenantId, e.GroupId, e.UserId }).IsUnique(); });
        modelBuilder.Entity<GroupCustomField>(entity => { entity.ToTable("group_custom_fields"); entity.HasIndex(e => new { e.TenantId, e.GroupId, e.Key }).IsUnique(); });
        modelBuilder.Entity<GroupWelcomeSettings>(entity => { entity.ToTable("group_welcome_settings"); entity.HasIndex(e => new { e.TenantId, e.GroupId }).IsUnique(); });
        modelBuilder.Entity<GroupChatroomPin>().ToTable("group_chatroom_pins");
        modelBuilder.Entity<GroupRecommendationEvent>().ToTable("group_recommendation_events");
    }

    private static void ConfigureStories(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Story>(entity => { entity.ToTable("stories"); entity.HasIndex(e => new { e.TenantId, e.UserId }); });
        modelBuilder.Entity<StoryView>(entity => { entity.ToTable("story_views"); entity.HasIndex(e => new { e.TenantId, e.StoryId, e.UserId }).IsUnique(); });
        modelBuilder.Entity<StoryReaction>(entity => { entity.ToTable("story_reactions"); entity.HasIndex(e => new { e.TenantId, e.StoryId, e.UserId, e.Reaction }); });
        modelBuilder.Entity<StoryCloseFriend>(entity => { entity.ToTable("story_close_friends"); entity.HasIndex(e => new { e.TenantId, e.UserId, e.FriendUserId }).IsUnique(); });
        modelBuilder.Entity<StoryHighlight>(entity => { entity.ToTable("story_highlights"); entity.HasIndex(e => new { e.TenantId, e.UserId }); });
        modelBuilder.Entity<StoryHighlightItem>(entity => { entity.ToTable("story_highlight_items"); entity.HasIndex(e => new { e.TenantId, e.HighlightId, e.StoryId }).IsUnique(); });
    }

    /// <summary>
    /// Automatically sets TenantId on new tenant-scoped entities.
    /// </summary>
    private void SetTenantIdOnInsert()
    {
        if (!_tenantContext.IsResolved) return;

        var tenantId = _tenantContext.GetTenantIdOrThrow();

        foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
        {
            if (entry.State == EntityState.Added && entry.Entity.TenantId == 0)
            {
                entry.Entity.TenantId = tenantId;
            }
        }
    }
}
