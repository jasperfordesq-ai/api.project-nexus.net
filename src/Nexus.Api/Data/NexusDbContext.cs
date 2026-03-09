// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

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

    // Phase 22: Gamification expansion
    public DbSet<Challenge> Challenges => Set<Challenge>();
    public DbSet<ChallengeParticipant> ChallengeParticipants => Set<ChallengeParticipant>();
    public DbSet<Streak> Streaks => Set<Streak>();
    public DbSet<LeaderboardSeason> LeaderboardSeasons => Set<LeaderboardSeason>();
    public DbSet<LeaderboardEntry> LeaderboardEntries => Set<LeaderboardEntry>();
    public DbSet<DailyReward> DailyRewards => Set<DailyReward>();

    // Phase 23: Skills & Endorsements
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<UserSkill> UserSkills => Set<UserSkill>();
    public DbSet<Endorsement> Endorsements => Set<Endorsement>();

    // Phase 24: Audit Logging
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

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

    // Phase 36: Predictive Staffing
    public DbSet<StaffingPrediction> StaffingPredictions => Set<StaffingPrediction>();
    public DbSet<VolunteerAvailability> VolunteerAvailabilities => Set<VolunteerAvailability>();

    // Phase 37: Advanced Admin
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<ScheduledTask> ScheduledTasks => Set<ScheduledTask>();
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
        };

        foreach (var config in configurations)
        {
            config.Configure(modelBuilder);
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
