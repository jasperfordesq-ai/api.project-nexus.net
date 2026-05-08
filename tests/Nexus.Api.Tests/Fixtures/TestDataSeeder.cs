// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Tests.Fixtures;

/// <summary>
/// Seeds test data for integration tests.
/// </summary>
public static class TestDataSeeder
{
    public const string TestPassword = "Test123!";
    public const string TestPasswordHash = "$2a$11$K7RqMfJ8XEQH8h8O8mP5P.5XQzC5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5O"; // BCrypt hash of Test123!
    public const string Tenant1FederationApiKey = "nxfed_test_tenant1";
    public const string Tenant2FederationApiKey = "nxfed_test_tenant2";

    public static async Task<TestData> SeedAsync(NexusDbContext db)
    {
        // Clear existing data
        await ClearDataAsync(db);

        // Create tenants
        var tenant1 = new Tenant
        {
            Slug = "test-tenant",
            Name = "Test Tenant",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var tenant2 = new Tenant
        {
            Slug = "other-tenant",
            Name = "Other Tenant",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Tenants.AddRange(tenant1, tenant2);
        await db.SaveChangesAsync();

        // Create users
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword);

        var adminUser = new User
        {
            TenantId = tenant1.Id,
            Email = "admin@test.com",
            PasswordHash = passwordHash,
            FirstName = "Admin",
            LastName = "User",
            Role = "admin",
            IsActive = true,
            TotalXp = 100,
            Level = 2,
            CreatedAt = DateTime.UtcNow
        };

        var memberUser = new User
        {
            TenantId = tenant1.Id,
            Email = "member@test.com",
            PasswordHash = passwordHash,
            FirstName = "Member",
            LastName = "User",
            Role = "member",
            IsActive = true,
            TotalXp = 500, // Enough balance for transfers
            Level = 3,
            CreatedAt = DateTime.UtcNow
        };

        var otherTenantUser = new User
        {
            TenantId = tenant2.Id,
            Email = "other@test.com",
            PasswordHash = passwordHash,
            FirstName = "Other",
            LastName = "User",
            Role = "member",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Users.AddRange(adminUser, memberUser, otherTenantUser);
        await db.SaveChangesAsync();

        // Create initial transactions to give memberUser a balance
        var initialTransaction = new Transaction
        {
            TenantId = tenant1.Id,
            SenderId = adminUser.Id,
            ReceiverId = memberUser.Id,
            Amount = 10.0m,
            Description = "Initial balance",
            Status = TransactionStatus.Completed,
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };

        db.Transactions.Add(initialTransaction);
        await db.SaveChangesAsync();

        // Create listings
        var listing1 = new Listing
        {
            TenantId = tenant1.Id,
            UserId = adminUser.Id,
            Title = "Test Service",
            Description = "A test service listing",
            Type = ListingType.Offer,
            Status = ListingStatus.Active,
            EstimatedHours = 2.0m,
            CreatedAt = DateTime.UtcNow
        };

        var listing2 = new Listing
        {
            TenantId = tenant1.Id,
            UserId = memberUser.Id,
            Title = "Member Service",
            Description = "A service offered by member",
            Type = ListingType.Offer,
            Status = ListingStatus.Active,
            EstimatedHours = 1.5m,
            CreatedAt = DateTime.UtcNow
        };

        var listing3 = new Listing
        {
            TenantId = tenant2.Id,
            UserId = otherTenantUser.Id,
            Title = "Partner Gardening",
            Description = "A federated service from the partner tenant",
            Type = ListingType.Offer,
            Status = ListingStatus.Active,
            EstimatedHours = 3.0m,
            CreatedAt = DateTime.UtcNow
        };

        db.Listings.AddRange(listing1, listing2, listing3);
        await db.SaveChangesAsync();

        await SeedFederationAsync(db, tenant1, tenant2, adminUser, memberUser, otherTenantUser);

        // Listing reviews require a completed exchange involving the reviewer.
        // Seed one so review tests exercise the real production precondition.
        var completedExchange = new Exchange
        {
            TenantId = tenant1.Id,
            ListingId = listing1.Id,
            InitiatorId = memberUser.Id,
            ListingOwnerId = adminUser.Id,
            Status = ExchangeStatus.Completed,
            AgreedHours = 2.0m,
            CompletedAt = DateTime.UtcNow.AddHours(-1),
            CreatedAt = DateTime.UtcNow.AddDays(-2),
            UpdatedAt = DateTime.UtcNow.AddHours(-1)
        };

        db.Exchanges.Add(completedExchange);
        await db.SaveChangesAsync();

        // Create badges for gamification tests
        var badges = new[]
        {
            new Badge { TenantId = tenant1.Id, Slug = Badge.Slugs.FirstListing, Name = "First Listing", XpReward = 25, IsActive = true },
            new Badge { TenantId = tenant1.Id, Slug = Badge.Slugs.FirstConnection, Name = "First Connection", XpReward = 25, IsActive = true },
            new Badge { TenantId = tenant1.Id, Slug = Badge.Slugs.FirstTransaction, Name = "First Transaction", XpReward = 30, IsActive = true },
        };

        db.Badges.AddRange(badges);
        await db.SaveChangesAsync();

        return new TestData
        {
            Tenant1 = tenant1,
            Tenant2 = tenant2,
            AdminUser = adminUser,
            MemberUser = memberUser,
            OtherTenantUser = otherTenantUser,
            Listing1 = listing1,
            Listing2 = listing2,
            PartnerListing = listing3
        };
    }

    private static async Task SeedFederationAsync(
        NexusDbContext db,
        Tenant tenant1,
        Tenant tenant2,
        User adminUser,
        User memberUser,
        User otherTenantUser)
    {
        db.Set<FederationSystemControl>().Add(new FederationSystemControl
        {
            FederationEnabled = true,
            EmergencyLockdown = false,
            RequireTenantWhitelist = true,
            UpdatedAt = DateTime.UtcNow
        });

        db.Set<FederationTenantWhitelist>().AddRange(
            new FederationTenantWhitelist { TenantId = tenant1.Id, IsEnabled = true, ApprovedAt = DateTime.UtcNow, ApprovedByUserId = adminUser.Id },
            new FederationTenantWhitelist { TenantId = tenant2.Id, IsEnabled = true, ApprovedAt = DateTime.UtcNow, ApprovedByUserId = adminUser.Id });

        var features = new[]
        {
            "profiles", "members", "listings", "messages", "transactions", "reviews",
            "events", "groups", "connections", "volunteering", "member_sync"
        };

        db.Set<FederationTenantFeature>().AddRange(
            features.SelectMany(feature => new[]
            {
                new FederationTenantFeature { TenantId = tenant1.Id, Feature = feature, IsEnabled = true, UpdatedAt = DateTime.UtcNow },
                new FederationTenantFeature { TenantId = tenant2.Id, Feature = feature, IsEnabled = true, UpdatedAt = DateTime.UtcNow }
            }));

        db.Set<FederationPartner>().AddRange(
            new FederationPartner
            {
                TenantId = tenant1.Id,
                PartnerTenantId = tenant2.Id,
                Status = PartnerStatus.Active,
                SharedListings = true,
                SharedEvents = true,
                SharedMembers = true,
                CreditExchangeRate = 1.0m,
                RequestedById = adminUser.Id,
                ApprovedById = adminUser.Id,
                ApprovedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            },
            new FederationPartner
            {
                TenantId = tenant2.Id,
                PartnerTenantId = tenant1.Id,
                Status = PartnerStatus.Active,
                SharedListings = true,
                SharedEvents = true,
                SharedMembers = true,
                CreditExchangeRate = 1.0m,
                RequestedById = otherTenantUser.Id,
                ApprovedById = adminUser.Id,
                ApprovedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            });

        db.Set<FederationUserSetting>().AddRange(
            new FederationUserSetting { TenantId = tenant1.Id, UserId = adminUser.Id, FederationOptIn = true, ProfileVisible = true, ListingsVisible = true },
            new FederationUserSetting { TenantId = tenant1.Id, UserId = memberUser.Id, FederationOptIn = true, ProfileVisible = true, ListingsVisible = true },
            new FederationUserSetting { TenantId = tenant2.Id, UserId = otherTenantUser.Id, FederationOptIn = true, ProfileVisible = true, ListingsVisible = true });

        const string scopes = "*,listings,members,messages,messages:read,messages:write,transactions,transactions:read,transactions:write,reviews,reviews:read,reviews:write,exchanges";
        db.Set<FederationApiKey>().AddRange(
            new FederationApiKey
            {
                TenantId = tenant1.Id,
                Name = "Tenant 1 federation test key",
                KeyHash = Sha256(Tenant1FederationApiKey),
                KeyPrefix = Tenant1FederationApiKey[..8],
                Scopes = scopes,
                IsActive = true,
                RateLimitPerMinute = 600,
                CreatedAt = DateTime.UtcNow
            },
            new FederationApiKey
            {
                TenantId = tenant2.Id,
                Name = "Tenant 2 federation test key",
                KeyHash = Sha256(Tenant2FederationApiKey),
                KeyPrefix = Tenant2FederationApiKey[..8],
                Scopes = scopes,
                IsActive = true,
                RateLimitPerMinute = 600,
                CreatedAt = DateTime.UtcNow
            });

        await db.SaveChangesAsync();
    }

    private static async Task ClearDataAsync(NexusDbContext db)
    {
        // Use raw SQL to truncate all tables and reset sequences in the correct order
        // This is faster and avoids FK constraint issues.
        // Uses DO block to skip tables that may not exist yet (e.g. pending migrations).
        await db.Database.ExecuteSqlRawAsync(@"
            DO $$
            DECLARE
                tbl TEXT;
                tables TEXT[] := ARRAY[
                    'federation_external_partner_logs','federation_external_partners',
                    'federation_webhook_nonces','federation_system_control',
                    'federation_tenant_whitelist','federation_tenant_features',
                    'federation_api_logs','federation_api_keys',
                    'federation_user_settings','federation_feature_toggles',
                    'legal_document_acceptances','legal_documents',
                    'knowledge_articles','user_preferences',
                    'saved_jobs','job_applications','job_vacancies'
                ];
            BEGIN
                FOREACH tbl IN ARRAY tables LOOP
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
                        EXECUTE 'TRUNCATE TABLE ' || tbl || ' CASCADE';
                    END IF;
                END LOOP;
            END $$;

            TRUNCATE TABLE
                -- Phase 16-37 tables (scaffolded)
                file_uploads,
                totp_backup_codes,
                user_passkeys,
                platform_announcements,
                scheduled_tasks,
                system_settings,
                volunteer_availabilities,
                staffing_predictions,
                federation_audit_logs,
                federated_exchanges,
                federated_listings,
                federation_partners,
                user_language_preferences,
                supported_locales,
                translations,
                notification_preferences,
                push_notification_logs,
                push_subscriptions,
                cookie_policies,
                cookie_consents,
                newsletter_subscriptions,
                newsletters,
                admin_notes,
                post_shares,
                feed_bookmarks,
                user_locations,
                consent_records,
                data_deletion_requests,
                data_export_requests,
                user_warnings,
                content_reports,
                digest_preferences,
                email_logs,
                email_templates,
                audit_logs,
                endorsements,
                user_skills,
                skills,
                daily_rewards,
                leaderboard_entries,
                leaderboard_seasons,
                streaks,
                challenge_participants,
                challenges,
                group_discussion_replies,
                group_discussions,
                group_files,
                group_policies,
                group_announcements,
                listing_tags,
                listing_favorites,
                listing_analytics,
                credit_donations,
                balance_alerts,
                transaction_limits,
                transaction_categories,
                volunteer_check_ins,
                volunteer_applications,
                volunteer_shifts,
                volunteer_opportunities,
                match_results,
                match_preferences,
                exchange_ratings,
                exchanges,
                -- Phase 0-15 tables (tested)
                identity_verification_events,
                identity_verification_sessions,
                tenant_registration_policies,
                ai_messages,
                ai_conversations,
                xp_logs,
                user_badges,
                post_comments,
                post_likes,
                feed_posts,
                event_rsvps,
                events,
                group_members,
                groups,
                notifications,
                connections,
                messages,
                conversations,
                transactions,
                reviews,
                listings,
                password_reset_tokens,
                refresh_tokens,
                badges,
                categories,
                tenant_configs,
                roles,
                users,
                tenants
            RESTART IDENTITY CASCADE;
        ");
    }

    private static string Sha256(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}

public class TestData
{
    public required Tenant Tenant1 { get; init; }
    public required Tenant Tenant2 { get; init; }
    public required User AdminUser { get; init; }
    public required User MemberUser { get; init; }
    public required User OtherTenantUser { get; init; }
    public required Listing Listing1 { get; init; }
    public required Listing Listing2 { get; init; }
    public required Listing PartnerListing { get; init; }
}
