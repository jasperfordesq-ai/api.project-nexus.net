// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using Microsoft.EntityFrameworkCore;
using Nexus.Api.Entities;

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

    // Phase 36: Predictive Staffing
    public DbSet<StaffingPrediction> StaffingPredictions => Set<StaffingPrediction>();
    public DbSet<VolunteerAvailability> VolunteerAvailabilities => Set<VolunteerAvailability>();

    // Phase 37: Advanced Admin
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<ScheduledTask> ScheduledTasks => Set<ScheduledTask>();
    public DbSet<PlatformAnnouncement> PlatformAnnouncements => Set<PlatformAnnouncement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Tenant configuration
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.ToTable("tenants");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Slug).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.HasIndex(e => e.Slug).IsUnique();
        });

        // User configuration with tenant filter
        // NOTE: Each ITenantEntity must have its query filter configured here.
        // The filter ensures users can only see data from their own tenant.
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
            entity.Property(e => e.PasswordHash).HasMaxLength(255).IsRequired();
            entity.Property(e => e.FirstName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.LastName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Role).HasMaxLength(50).IsRequired();

            // Composite unique: email per tenant
            entity.HasIndex(e => new { e.TenantId, e.Email }).IsUnique();

            // Relationship
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            // Optimistic concurrency control
            entity.Property(e => e.RowVersion)
                .IsRowVersion();

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // Listing configuration with tenant filter
        modelBuilder.Entity<Listing>(entity =>
        {
            entity.ToTable("listings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnType("text");
            entity.Property(e => e.Location).HasMaxLength(255);
            entity.Property(e => e.EstimatedHours).HasPrecision(10, 2);

            // Enum conversions stored as strings for readability
            entity.Property(e => e.Type)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Status);

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // CRITICAL: Global query filter for tenant isolation + soft delete
            entity.HasQueryFilter(e =>
                (!_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId)
                && e.DeletedAt == null);
        });

        // Transaction configuration with tenant filter
        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.ToTable("transactions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(10, 2);
            entity.Property(e => e.Description).HasMaxLength(500);

            // Optimistic concurrency control
            entity.Property(e => e.RowVersion)
                .IsRowVersion();

            // Enum conversion
            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.SenderId);
            entity.HasIndex(e => e.ReceiverId);
            entity.HasIndex(e => e.CreatedAt);

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Sender)
                .WithMany()
                .HasForeignKey(e => e.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Receiver)
                .WithMany()
                .HasForeignKey(e => e.ReceiverId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Listing)
                .WithMany()
                .HasForeignKey(e => e.ListingId)
                .OnDelete(DeleteBehavior.SetNull);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // Conversation configuration with tenant filter
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.ToTable("conversations");
            entity.HasKey(e => e.Id);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.Participant1Id);
            entity.HasIndex(e => e.Participant2Id);
            entity.HasIndex(e => new { e.TenantId, e.Participant1Id, e.Participant2Id }).IsUnique();

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Participant1)
                .WithMany()
                .HasForeignKey(e => e.Participant1Id)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Participant2)
                .WithMany()
                .HasForeignKey(e => e.Participant2Id)
                .OnDelete(DeleteBehavior.Restrict);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // Message configuration with tenant filter
        modelBuilder.Entity<Message>(entity =>
        {
            entity.ToTable("messages");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).HasColumnType("text").IsRequired();

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.ConversationId);
            entity.HasIndex(e => e.SenderId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.ConversationId, e.IsRead });

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(e => e.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Sender)
                .WithMany()
                .HasForeignKey(e => e.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // RefreshToken configuration with tenant filter
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TokenHash).HasMaxLength(255).IsRequired();
            entity.Property(e => e.RevokedReason).HasMaxLength(100);
            entity.Property(e => e.ClientType).HasMaxLength(50);
            entity.Property(e => e.CreatedByIp).HasMaxLength(50);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.TokenHash);
            entity.HasIndex(e => e.ExpiresAt);

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // PasswordResetToken configuration with tenant filter
        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.ToTable("password_reset_tokens");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TokenHash).HasMaxLength(255).IsRequired();

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.TokenHash);
            entity.HasIndex(e => e.ExpiresAt);

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // Connection configuration with tenant filter
        modelBuilder.Entity<Connection>(entity =>
        {
            entity.ToTable("connections");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasMaxLength(20).IsRequired();

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.RequesterId);
            entity.HasIndex(e => e.AddresseeId);
            entity.HasIndex(e => e.Status);
            // Unique constraint: one connection record per user pair
            entity.HasIndex(e => new { e.TenantId, e.RequesterId, e.AddresseeId }).IsUnique();

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Requester)
                .WithMany()
                .HasForeignKey(e => e.RequesterId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Addressee)
                .WithMany()
                .HasForeignKey(e => e.AddresseeId)
                .OnDelete(DeleteBehavior.Restrict);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // Notification configuration with tenant filter
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("notifications");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Body).HasMaxLength(1000);
            entity.Property(e => e.Data).HasColumnType("text");

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.IsRead);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.UserId, e.IsRead });
            // Composite index for common query: unread notifications for user, sorted by date
            entity.HasIndex(e => new { e.UserId, e.IsRead, e.CreatedAt });

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // Group configuration with tenant filter
        modelBuilder.Entity<Group>(entity =>
        {
            entity.ToTable("groups");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnType("text");
            entity.Property(e => e.ImageUrl).HasMaxLength(500);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.CreatedById);
            entity.HasIndex(e => e.Name);

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.CreatedBy)
                .WithMany()
                .HasForeignKey(e => e.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // GroupMember configuration with tenant filter
        modelBuilder.Entity<GroupMember>(entity =>
        {
            entity.ToTable("group_members");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Role).HasMaxLength(20).IsRequired();

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.GroupId);
            entity.HasIndex(e => e.UserId);
            // Unique constraint: one membership per user per group
            entity.HasIndex(e => new { e.TenantId, e.GroupId, e.UserId }).IsUnique();

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Group)
                .WithMany(g => g.Members)
                .HasForeignKey(e => e.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // Event configuration with tenant filter
        modelBuilder.Entity<Event>(entity =>
        {
            entity.ToTable("events");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnType("text");
            entity.Property(e => e.Location).HasMaxLength(500);
            entity.Property(e => e.ImageUrl).HasMaxLength(500);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.CreatedById);
            entity.HasIndex(e => e.GroupId);
            entity.HasIndex(e => e.StartsAt);
            entity.HasIndex(e => e.IsCancelled);

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.CreatedBy)
                .WithMany()
                .HasForeignKey(e => e.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Group)
                .WithMany(g => g.Events)
                .HasForeignKey(e => e.GroupId)
                .OnDelete(DeleteBehavior.SetNull);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // EventRsvp configuration with tenant filter
        modelBuilder.Entity<EventRsvp>(entity =>
        {
            entity.ToTable("event_rsvps");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasMaxLength(20).IsRequired();

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.EventId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.RespondedAt);
            // Unique constraint: one RSVP per user per event
            entity.HasIndex(e => new { e.TenantId, e.EventId, e.UserId }).IsUnique();

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Event)
                .WithMany(ev => ev.Rsvps)
                .HasForeignKey(e => e.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // FeedPost configuration with tenant filter
        modelBuilder.Entity<FeedPost>(entity =>
        {
            entity.ToTable("feed_posts");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).HasColumnType("text").IsRequired();
            entity.Property(e => e.ImageUrl).HasMaxLength(500);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.GroupId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.IsPinned);

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Group)
                .WithMany()
                .HasForeignKey(e => e.GroupId)
                .OnDelete(DeleteBehavior.SetNull);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // PostLike configuration with tenant filter
        modelBuilder.Entity<PostLike>(entity =>
        {
            entity.ToTable("post_likes");
            entity.HasKey(e => e.Id);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.PostId);
            entity.HasIndex(e => e.UserId);
            // Unique constraint: one like per user per post
            entity.HasIndex(e => new { e.TenantId, e.PostId, e.UserId }).IsUnique();

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Post)
                .WithMany(p => p.Likes)
                .HasForeignKey(e => e.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // PostComment configuration with tenant filter
        modelBuilder.Entity<PostComment>(entity =>
        {
            entity.ToTable("post_comments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).HasMaxLength(2000).IsRequired();

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.PostId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Post)
                .WithMany(p => p.Comments)
                .HasForeignKey(e => e.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // Badge configuration with tenant filter
        modelBuilder.Entity<Badge>(entity =>
        {
            entity.ToTable("badges");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Slug).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Icon).HasMaxLength(500);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.Slug);
            entity.HasIndex(e => e.IsActive);
            // Unique constraint: slug per tenant
            entity.HasIndex(e => new { e.TenantId, e.Slug }).IsUnique();

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // UserBadge configuration with tenant filter
        modelBuilder.Entity<UserBadge>(entity =>
        {
            entity.ToTable("user_badges");
            entity.HasKey(e => e.Id);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.BadgeId);
            entity.HasIndex(e => e.EarnedAt);
            // Unique constraint: one badge per user (can't earn same badge twice)
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.BadgeId }).IsUnique();

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.User)
                .WithMany(u => u.UserBadges)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Badge)
                .WithMany(b => b.UserBadges)
                .HasForeignKey(e => e.BadgeId)
                .OnDelete(DeleteBehavior.Cascade);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // XpLog configuration with tenant filter
        modelBuilder.Entity<XpLog>(entity =>
        {
            entity.ToTable("xp_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Source).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Source);
            entity.HasIndex(e => e.CreatedAt);

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.User)
                .WithMany(u => u.XpLogs)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // Review configuration with tenant filter
        modelBuilder.Entity<Review>(entity =>
        {
            entity.ToTable("reviews");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Comment).HasMaxLength(2000);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.ReviewerId);
            entity.HasIndex(e => e.TargetUserId);
            entity.HasIndex(e => e.TargetListingId);
            entity.HasIndex(e => e.CreatedAt);
            // Prevent duplicate reviews: one review per reviewer per target
            entity.HasIndex(e => new { e.TenantId, e.ReviewerId, e.TargetUserId })
                .IsUnique()
                .HasFilter("\"TargetUserId\" IS NOT NULL");
            entity.HasIndex(e => new { e.TenantId, e.ReviewerId, e.TargetListingId })
                .IsUnique()
                .HasFilter("\"TargetListingId\" IS NOT NULL");

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Reviewer)
                .WithMany()
                .HasForeignKey(e => e.ReviewerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.TargetUser)
                .WithMany()
                .HasForeignKey(e => e.TargetUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.TargetListing)
                .WithMany()
                .HasForeignKey(e => e.TargetListingId)
                .OnDelete(DeleteBehavior.Restrict);

            // Ensure a review targets at least one entity (user or listing)
            entity.ToTable(t => t.HasCheckConstraint(
                "CK_reviews_has_target",
                "\"TargetUserId\" IS NOT NULL OR \"TargetListingId\" IS NOT NULL"));

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // AiConversation configuration with tenant filter
        modelBuilder.Entity<AiConversation>(entity =>
        {
            entity.ToTable("ai_conversations");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255);
            entity.Property(e => e.Context).HasMaxLength(500);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.IsActive);

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // AiMessage configuration with tenant filter (defense-in-depth)
        modelBuilder.Entity<AiMessage>(entity =>
        {
            entity.ToTable("ai_messages");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Role).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Content).HasColumnType("text").IsRequired();

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.ConversationId);
            entity.HasIndex(e => e.CreatedAt);

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(e => e.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // Category configuration with tenant filter
        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Slug).HasMaxLength(100).IsRequired();

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.Slug);
            entity.HasIndex(e => e.ParentCategoryId);
            entity.HasIndex(e => e.IsActive);
            // Unique constraint: slug per tenant
            entity.HasIndex(e => new { e.TenantId, e.Slug }).IsUnique();

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ParentCategory)
                .WithMany(c => c.ChildCategories)
                .HasForeignKey(e => e.ParentCategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // TenantConfig configuration with tenant filter
        modelBuilder.Entity<TenantConfig>(entity =>
        {
            entity.ToTable("tenant_configs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Key).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Value).HasColumnType("text").IsRequired();

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.Key);
            // Unique constraint: key per tenant
            entity.HasIndex(e => new { e.TenantId, e.Key }).IsUnique();

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // Role configuration with tenant filter
        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("roles");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Permissions).HasColumnType("text").IsRequired();

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.Name);
            // Unique constraint: name per tenant
            entity.HasIndex(e => new { e.TenantId, e.Name }).IsUnique();

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // Exchange configuration with tenant filter
        modelBuilder.Entity<Exchange>(entity =>
        {
            entity.ToTable("exchanges");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RequestMessage).HasMaxLength(2000);
            entity.Property(e => e.DeclineReason).HasMaxLength(1000);
            entity.Property(e => e.Notes).HasColumnType("text");
            entity.Property(e => e.AgreedHours).HasPrecision(10, 2);
            entity.Property(e => e.ActualHours).HasPrecision(10, 2);

            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(e => e.RowVersion)
                .IsRowVersion();

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.ListingId);
            entity.HasIndex(e => e.InitiatorId);
            entity.HasIndex(e => e.ListingOwnerId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.GroupId);

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Listing)
                .WithMany()
                .HasForeignKey(e => e.ListingId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Initiator)
                .WithMany()
                .HasForeignKey(e => e.InitiatorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ListingOwner)
                .WithMany()
                .HasForeignKey(e => e.ListingOwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Provider)
                .WithMany()
                .HasForeignKey(e => e.ProviderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Receiver)
                .WithMany()
                .HasForeignKey(e => e.ReceiverId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Transaction)
                .WithMany()
                .HasForeignKey(e => e.TransactionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Group)
                .WithMany()
                .HasForeignKey(e => e.GroupId)
                .OnDelete(DeleteBehavior.SetNull);

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // ExchangeRating configuration with tenant filter
        modelBuilder.Entity<ExchangeRating>(entity =>
        {
            entity.ToTable("exchange_ratings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Comment).HasMaxLength(2000);

            // Indexes
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.ExchangeId);
            entity.HasIndex(e => e.RaterId);
            entity.HasIndex(e => e.RatedUserId);
            // One rating per rater per exchange
            entity.HasIndex(e => new { e.TenantId, e.ExchangeId, e.RaterId }).IsUnique();

            // Relationships
            entity.HasOne(e => e.Tenant)
                .WithMany()
                .HasForeignKey(e => e.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Exchange)
                .WithMany(ex => ex.Ratings)
                .HasForeignKey(e => e.ExchangeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Rater)
                .WithMany()
                .HasForeignKey(e => e.RaterId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.RatedUser)
                .WithMany()
                .HasForeignKey(e => e.RatedUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Rating must be 1-5
            entity.ToTable(t => t.HasCheckConstraint(
                "CK_exchange_ratings_valid_range",
                "\"Rating\" >= 1 AND \"Rating\" <= 5"));

            // CRITICAL: Global query filter for tenant isolation
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 17: Smart Matching
        // =================================================================
        modelBuilder.Entity<MatchPreference>(entity =>
        {
            entity.ToTable("match_preferences");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PreferredCategories).HasColumnType("text");
            entity.Property(e => e.AvailableDays).HasColumnType("text");
            entity.Property(e => e.AvailableTimeSlots).HasMaxLength(500);
            entity.Property(e => e.SkillsOffered).HasColumnType("text");
            entity.Property(e => e.SkillsWanted).HasColumnType("text");
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<MatchResult>(entity =>
        {
            entity.ToTable("match_results");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Score).HasPrecision(5, 4);
            entity.Property(e => e.Reasons).HasColumnType("text");
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.MatchedUserId);
            entity.HasIndex(e => e.Score);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.MatchedUser).WithMany().HasForeignKey(e => e.MatchedUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.MatchedListing).WithMany().HasForeignKey(e => e.MatchedListingId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 18: Volunteering
        // =================================================================
        modelBuilder.Entity<VolunteerOpportunity>(entity =>
        {
            entity.ToTable("volunteer_opportunities");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnType("text");
            entity.Property(e => e.Location).HasMaxLength(500);
            entity.Property(e => e.SkillsRequired).HasColumnType("text");
            entity.Property(e => e.CreditReward).HasPrecision(10, 2);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.OrganizerId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.StartsAt);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Organizer).WithMany().HasForeignKey(e => e.OrganizerId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Group).WithMany().HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Category).WithMany().HasForeignKey(e => e.CategoryId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<VolunteerShift>(entity =>
        {
            entity.ToTable("volunteer_shifts");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255);
            entity.Property(e => e.Location).HasMaxLength(500);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.OpportunityId);
            entity.HasIndex(e => e.StartsAt);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Opportunity).WithMany(o => o.Shifts).HasForeignKey(e => e.OpportunityId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<VolunteerApplication>(entity =>
        {
            entity.ToTable("volunteer_applications");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Message).HasMaxLength(2000);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.OpportunityId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.TenantId, e.OpportunityId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Opportunity).WithMany(o => o.Applications).HasForeignKey(e => e.OpportunityId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ReviewedBy).WithMany().HasForeignKey(e => e.ReviewedById).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<VolunteerCheckIn>(entity =>
        {
            entity.ToTable("volunteer_check_ins");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.HoursLogged).HasPrecision(10, 2);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.ShiftId);
            entity.HasIndex(e => e.UserId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Shift).WithMany(s => s.CheckIns).HasForeignKey(e => e.ShiftId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Transaction).WithMany().HasForeignKey(e => e.TransactionId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 19: Wallet expansion
        // =================================================================
        modelBuilder.Entity<TransactionCategory>(entity =>
        {
            entity.ToTable("transaction_categories");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Color).HasMaxLength(7);
            entity.Property(e => e.Icon).HasMaxLength(50);
            entity.HasIndex(e => e.TenantId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<TransactionLimit>(entity =>
        {
            entity.ToTable("transaction_limits");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MaxDailyAmount).HasPrecision(10, 2);
            entity.Property(e => e.MaxSingleAmount).HasPrecision(10, 2);
            entity.Property(e => e.MinBalance).HasPrecision(10, 2);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<BalanceAlert>(entity =>
        {
            entity.ToTable("balance_alerts");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ThresholdAmount).HasPrecision(10, 2);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<CreditDonation>(entity =>
        {
            entity.ToTable("credit_donations");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(10, 2);
            entity.Property(e => e.Message).HasMaxLength(500);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.DonorId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Donor).WithMany().HasForeignKey(e => e.DonorId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Recipient).WithMany().HasForeignKey(e => e.RecipientId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Transaction).WithMany().HasForeignKey(e => e.TransactionId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 20: Listings expansion
        // =================================================================
        modelBuilder.Entity<ListingAnalytics>(entity =>
        {
            entity.ToTable("listing_analytics");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.ListingId }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Listing).WithMany().HasForeignKey(e => e.ListingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<ListingFavorite>(entity =>
        {
            entity.ToTable("listing_favorites");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.ListingId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Listing).WithMany().HasForeignKey(e => e.ListingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<ListingTag>(entity =>
        {
            entity.ToTable("listing_tags");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Tag).HasMaxLength(100).IsRequired();
            entity.Property(e => e.TagType).HasMaxLength(20).IsRequired();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.ListingId, e.Tag }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Listing).WithMany().HasForeignKey(e => e.ListingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 21: Groups expansion
        // =================================================================
        modelBuilder.Entity<GroupAnnouncement>(entity =>
        {
            entity.ToTable("group_announcements");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Content).HasColumnType("text").IsRequired();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.GroupId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Group).WithMany().HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Author).WithMany().HasForeignKey(e => e.AuthorId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<GroupPolicy>(entity =>
        {
            entity.ToTable("group_policies");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Key).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Value).HasColumnType("text").IsRequired();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.GroupId, e.Key }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Group).WithMany().HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<GroupFile>(entity =>
        {
            entity.ToTable("group_files");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.FileUrl).HasMaxLength(1000).IsRequired();
            entity.Property(e => e.ContentType).HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.GroupId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Group).WithMany().HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.UploadedBy).WithMany().HasForeignKey(e => e.UploadedById).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<GroupDiscussion>(entity =>
        {
            entity.ToTable("group_discussions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Content).HasColumnType("text").IsRequired();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.GroupId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Group).WithMany().HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Author).WithMany().HasForeignKey(e => e.AuthorId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<GroupDiscussionReply>(entity =>
        {
            entity.ToTable("group_discussion_replies");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).HasColumnType("text").IsRequired();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.DiscussionId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Discussion).WithMany(d => d.Replies).HasForeignKey(e => e.DiscussionId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Author).WithMany().HasForeignKey(e => e.AuthorId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 22: Gamification expansion
        // =================================================================
        modelBuilder.Entity<Challenge>(entity =>
        {
            entity.ToTable("challenges");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnType("text");
            entity.Property(e => e.TargetAction).HasMaxLength(100).IsRequired();
            entity.Property(e => e.ChallengeType).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Difficulty).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.StartsAt);
            entity.HasIndex(e => e.EndsAt);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Badge).WithMany().HasForeignKey(e => e.BadgeId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<ChallengeParticipant>(entity =>
        {
            entity.ToTable("challenge_participants");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.ChallengeId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Challenge).WithMany(c => c.Participants).HasForeignKey(e => e.ChallengeId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<Streak>(entity =>
        {
            entity.ToTable("streaks");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.StreakType).HasMaxLength(50).IsRequired();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.StreakType }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<LeaderboardSeason>(entity =>
        {
            entity.ToTable("leaderboard_seasons");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.PrizeDescription).HasMaxLength(1000);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.Status);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<LeaderboardEntry>(entity =>
        {
            entity.ToTable("leaderboard_entries");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.SeasonId, e.UserId }).IsUnique();
            entity.HasIndex(e => new { e.SeasonId, e.Score });
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Season).WithMany(s => s.Entries).HasForeignKey(e => e.SeasonId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<DailyReward>(entity =>
        {
            entity.ToTable("daily_rewards");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ClaimedAt);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 23: Skills & Endorsements
        // =================================================================
        modelBuilder.Entity<Skill>(entity =>
        {
            entity.ToTable("skills");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Slug).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.Slug }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Category).WithMany().HasForeignKey(e => e.CategoryId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<UserSkill>(entity =>
        {
            entity.ToTable("user_skills");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProficiencyLevel).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.SkillId }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Skill).WithMany().HasForeignKey(e => e.SkillId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<Endorsement>(entity =>
        {
            entity.ToTable("endorsements");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Comment).HasMaxLength(500);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.UserSkillId, e.EndorserId }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.UserSkill).WithMany(us => us.Endorsements).HasForeignKey(e => e.UserSkillId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Endorser).WithMany().HasForeignKey(e => e.EndorserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.EndorsedUser).WithMany().HasForeignKey(e => e.EndorsedUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 24: Audit Logging
        // =================================================================
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("audit_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Action).HasMaxLength(100).IsRequired();
            entity.Property(e => e.EntityType).HasMaxLength(100);
            entity.Property(e => e.OldValues).HasColumnType("text");
            entity.Property(e => e.NewValues).HasColumnType("text");
            entity.Property(e => e.IpAddress).HasMaxLength(50);
            entity.Property(e => e.UserAgent).HasMaxLength(500);
            entity.Property(e => e.Metadata).HasColumnType("text");
            entity.Property(e => e.Severity).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Action);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.Severity);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 25: Email Notifications
        // =================================================================
        modelBuilder.Entity<EmailTemplate>(entity =>
        {
            entity.ToTable("email_templates");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Key).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Subject).HasMaxLength(500).IsRequired();
            entity.Property(e => e.BodyHtml).HasColumnType("text").IsRequired();
            entity.Property(e => e.BodyText).HasColumnType("text");
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.Key }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<EmailLog>(entity =>
        {
            entity.ToTable("email_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ToEmail).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Subject).HasMaxLength(500).IsRequired();
            entity.Property(e => e.TemplateKey).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.ErrorMessage).HasMaxLength(2000);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<DigestPreference>(entity =>
        {
            entity.ToTable("digest_preferences");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Frequency).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 26: Content Reporting
        // =================================================================
        modelBuilder.Entity<ContentReport>(entity =>
        {
            entity.ToTable("content_reports");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ContentType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.ReviewNotes).HasMaxLength(2000);
            entity.Property(e => e.ActionTaken).HasMaxLength(500);
            entity.Property(e => e.Reason).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.ReporterId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Reporter).WithMany().HasForeignKey(e => e.ReporterId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ReviewedBy).WithMany().HasForeignKey(e => e.ReviewedById).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<UserWarning>(entity =>
        {
            entity.ToTable("user_warnings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Reason).HasMaxLength(2000).IsRequired();
            entity.Property(e => e.Severity).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.IssuedBy).WithMany().HasForeignKey(e => e.IssuedById).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Report).WithMany().HasForeignKey(e => e.ReportId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 27: GDPR
        // =================================================================
        modelBuilder.Entity<DataExportRequest>(entity =>
        {
            entity.ToTable("data_export_requests");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Format).HasMaxLength(20);
            entity.Property(e => e.FileUrl).HasMaxLength(1000);
            entity.Property(e => e.ErrorMessage).HasMaxLength(1000);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<DataDeletionRequest>(entity =>
        {
            entity.ToTable("data_deletion_requests");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Reason).HasMaxLength(2000);
            entity.Property(e => e.DataRetainedReason).HasMaxLength(1000);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.ReviewedBy).WithMany().HasForeignKey(e => e.ReviewedById).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<ConsentRecord>(entity =>
        {
            entity.ToTable("consent_records");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ConsentType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.IpAddress).HasMaxLength(50);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.ConsentType }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 28: Geocoding / Location
        // =================================================================
        modelBuilder.Entity<UserLocation>(entity =>
        {
            entity.ToTable("user_locations");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.City).HasMaxLength(255);
            entity.Property(e => e.Region).HasMaxLength(255);
            entity.Property(e => e.Country).HasMaxLength(100);
            entity.Property(e => e.PostalCode).HasMaxLength(20);
            entity.Property(e => e.FormattedAddress).HasMaxLength(500);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.UserId }).IsUnique();
            entity.HasIndex(e => new { e.Latitude, e.Longitude });
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 29: Feed Ranking
        // =================================================================
        modelBuilder.Entity<FeedBookmark>(entity =>
        {
            entity.ToTable("feed_bookmarks");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.PostId }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Post).WithMany().HasForeignKey(e => e.PostId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<PostShare>(entity =>
        {
            entity.ToTable("post_shares");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SharedTo).HasMaxLength(50);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.PostId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Post).WithMany().HasForeignKey(e => e.PostId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 30: Admin CRM
        // =================================================================
        modelBuilder.Entity<AdminNote>(entity =>
        {
            entity.ToTable("admin_notes");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).HasColumnType("text").IsRequired();
            entity.Property(e => e.Category).HasMaxLength(50);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Admin).WithMany().HasForeignKey(e => e.AdminId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 31: Newsletter
        // =================================================================
        modelBuilder.Entity<Newsletter>(entity =>
        {
            entity.ToTable("newsletters");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Subject).HasMaxLength(500).IsRequired();
            entity.Property(e => e.ContentHtml).HasColumnType("text").IsRequired();
            entity.Property(e => e.ContentText).HasColumnType("text");
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.Status);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.CreatedBy).WithMany().HasForeignKey(e => e.CreatedById).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<NewsletterSubscription>(entity =>
        {
            entity.ToTable("newsletter_subscriptions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Source).HasMaxLength(50);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.Email }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 32: Cookie Consent
        // =================================================================
        modelBuilder.Entity<CookieConsent>(entity =>
        {
            entity.ToTable("cookie_consents");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SessionId).HasMaxLength(100);
            entity.Property(e => e.IpAddress).HasMaxLength(50);
            entity.Property(e => e.UserAgent).HasMaxLength(500);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.SessionId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<CookiePolicy>(entity =>
        {
            entity.ToTable("cookie_policies");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Version).HasMaxLength(20).IsRequired();
            entity.Property(e => e.ContentHtml).HasColumnType("text").IsRequired();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.Version }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 33: Push Notifications
        // =================================================================
        modelBuilder.Entity<PushSubscription>(entity =>
        {
            entity.ToTable("push_subscriptions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DeviceToken).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Platform).HasMaxLength(20).IsRequired();
            entity.Property(e => e.DeviceName).HasMaxLength(255);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.DeviceToken }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<PushNotificationLog>(entity =>
        {
            entity.ToTable("push_notification_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Body).HasMaxLength(1000);
            entity.Property(e => e.Data).HasColumnType("text");
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.ErrorMessage).HasMaxLength(1000);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.UserId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Subscription).WithMany().HasForeignKey(e => e.SubscriptionId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<NotificationPreference>(entity =>
        {
            entity.ToTable("notification_preferences");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NotificationType).HasMaxLength(50).IsRequired();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.NotificationType }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 34: i18n / Translation
        // =================================================================
        modelBuilder.Entity<Translation>(entity =>
        {
            entity.ToTable("translations");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Locale).HasMaxLength(10).IsRequired();
            entity.Property(e => e.Key).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Value).HasColumnType("text").IsRequired();
            entity.Property(e => e.Namespace).HasMaxLength(100);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.Locale, e.Key }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ApprovedBy).WithMany().HasForeignKey(e => e.ApprovedById).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<SupportedLocale>(entity =>
        {
            entity.ToTable("supported_locales");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Locale).HasMaxLength(10).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.NativeName).HasMaxLength(100).IsRequired();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.Locale }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<UserLanguagePreference>(entity =>
        {
            entity.ToTable("user_language_preferences");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PreferredLocale).HasMaxLength(10).IsRequired();
            entity.Property(e => e.FallbackLocale).HasMaxLength(10);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 35: Federation
        // =================================================================
        modelBuilder.Entity<FederationPartner>(entity =>
        {
            entity.ToTable("federation_partners");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.CreditExchangeRate).HasPrecision(10, 4);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.PartnerTenantId }).IsUnique();
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.PartnerTenant).WithMany().HasForeignKey(e => e.PartnerTenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.RequestedBy).WithMany().HasForeignKey(e => e.RequestedById).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ApprovedBy).WithMany().HasForeignKey(e => e.ApprovedById).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<FederatedListing>(entity =>
        {
            entity.ToTable("federated_listings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnType("text");
            entity.Property(e => e.ListingType).HasMaxLength(20);
            entity.Property(e => e.OwnerDisplayName).HasMaxLength(255);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.SourceTenantId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.SourceTenant).WithMany().HasForeignKey(e => e.SourceTenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<FederatedExchange>(entity =>
        {
            entity.ToTable("federated_exchanges");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RemoteUserDisplayName).HasMaxLength(255);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.AgreedHours).HasPrecision(10, 2);
            entity.Property(e => e.ActualHours).HasPrecision(10, 2);
            entity.Property(e => e.CreditExchangeRate).HasPrecision(10, 4);
            entity.Property(e => e.Notes).HasColumnType("text");
            entity.HasIndex(e => e.TenantId);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.PartnerTenant).WithMany().HasForeignKey(e => e.PartnerTenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.LocalUser).WithMany().HasForeignKey(e => e.LocalUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.LocalTransaction).WithMany().HasForeignKey(e => e.LocalTransactionId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<FederationAuditLog>(entity =>
        {
            entity.ToTable("federation_audit_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Action).HasMaxLength(100).IsRequired();
            entity.Property(e => e.EntityType).HasMaxLength(50);
            entity.Property(e => e.Details).HasColumnType("text");
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 36: Predictive Staffing
        // =================================================================
        modelBuilder.Entity<StaffingPrediction>(entity =>
        {
            entity.ToTable("staffing_predictions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ShortfallRisk).HasPrecision(5, 4);
            entity.Property(e => e.Factors).HasColumnType("text");
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.PredictedDate);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Opportunity).WithMany().HasForeignKey(e => e.OpportunityId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<VolunteerAvailability>(entity =>
        {
            entity.ToTable("volunteer_availabilities");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.UserId, e.DayOfWeek });
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // =================================================================
        // Phase 37: Advanced Admin
        // =================================================================
        modelBuilder.Entity<SystemSetting>(entity =>
        {
            entity.ToTable("system_settings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Key).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Value).HasColumnType("text").IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Category).HasMaxLength(50);
            entity.HasIndex(e => e.Key).IsUnique();
        });

        modelBuilder.Entity<ScheduledTask>(entity =>
        {
            entity.ToTable("scheduled_tasks");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TaskName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.CronExpression).HasMaxLength(50);
            entity.Property(e => e.Parameters).HasColumnType("text");
            entity.Property(e => e.ErrorMessage).HasMaxLength(2000);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.TaskName);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        modelBuilder.Entity<PlatformAnnouncement>(entity =>
        {
            entity.ToTable("platform_announcements");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Content).HasColumnType("text").IsRequired();
            entity.Property(e => e.Type).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.IsActive);
            entity.HasOne(e => e.Tenant).WithMany().HasForeignKey(e => e.TenantId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.CreatedBy).WithMany().HasForeignKey(e => e.CreatedById).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !_tenantContext.IsResolved || e.TenantId == _tenantContext.TenantId);
        });

        // Configure Listing -> Category relationship
        modelBuilder.Entity<Listing>(entity =>
        {
            entity.HasOne(e => e.Category)
                .WithMany(c => c.Listings)
                .HasForeignKey(e => e.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ReviewedByUser)
                .WithMany()
                .HasForeignKey(e => e.ReviewedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });
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
