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

        db.Listings.AddRange(listing1, listing2);
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
            Listing2 = listing2
        };
    }

    private static async Task ClearDataAsync(NexusDbContext db)
    {
        // Use raw SQL to truncate all tables and reset sequences in the correct order
        // This is faster and avoids FK constraint issues
        await db.Database.ExecuteSqlRawAsync(@"
            TRUNCATE TABLE
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
                users,
                tenants
            RESTART IDENTITY CASCADE;
        ");
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
}
