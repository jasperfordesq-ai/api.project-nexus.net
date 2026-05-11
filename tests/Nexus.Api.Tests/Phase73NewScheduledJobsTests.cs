// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Services.Scheduled;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

/// <summary>
/// Phase 73 follow-up — tests for the 5 new scheduled hosted services added
/// after the 2026-05-11 production-readiness audit:
///   - JobVacancyExpiryJob
///   - FeaturedExpiryJob
///   - ListingExpiryJob
///   - OnboardingNurtureJob
///   - ExpiredTokenCleanupJob
///
/// Pattern mirrors Phase63ScheduledJobsTests: a test-only subclass exposes the
/// protected per-tenant / global tick, and we verify observable side effects
/// (state change + notification creation) plus idempotency on a second run.
/// </summary>
[Collection("Integration")]
public class Phase73NewScheduledJobsTests : IntegrationTestBase
{
    public Phase73NewScheduledJobsTests(NexusWebApplicationFactory factory) : base(factory) { }

    // ─── Test-only subclasses ──────────────────────────────────────────────

    private sealed class TestableJobVacancyExpiryJob : JobVacancyExpiryJob
    {
        public TestableJobVacancyExpiryJob(IServiceScopeFactory s, IConfiguration c, ILogger<JobVacancyExpiryJob> l) : base(s, c, l) { }
        public Task RunForTenantPublic(IServiceProvider sp, int tid, CancellationToken ct = default) => RunForTenantAsync(sp, tid, ct);
    }
    private sealed class TestableFeaturedExpiryJob : FeaturedExpiryJob
    {
        public TestableFeaturedExpiryJob(IServiceScopeFactory s, IConfiguration c, ILogger<FeaturedExpiryJob> l) : base(s, c, l) { }
        public Task RunForTenantPublic(IServiceProvider sp, int tid, CancellationToken ct = default) => RunForTenantAsync(sp, tid, ct);
    }
    private sealed class TestableListingExpiryJob : ListingExpiryJob
    {
        public TestableListingExpiryJob(IServiceScopeFactory s, IConfiguration c, ILogger<ListingExpiryJob> l) : base(s, c, l) { }
        public Task RunForTenantPublic(IServiceProvider sp, int tid, CancellationToken ct = default) => RunForTenantAsync(sp, tid, ct);
    }
    private sealed class TestableOnboardingNurtureJob : OnboardingNurtureJob
    {
        public TestableOnboardingNurtureJob(IServiceScopeFactory s, IConfiguration c, ILogger<OnboardingNurtureJob> l) : base(s, c, l) { }
        public Task RunForTenantPublic(IServiceProvider sp, int tid, CancellationToken ct = default) => RunForTenantAsync(sp, tid, ct);
    }
    private sealed class TestableExpiredTokenCleanupJob : ExpiredTokenCleanupJob
    {
        public TestableExpiredTokenCleanupJob(IServiceScopeFactory s, IConfiguration c, ILogger<ExpiredTokenCleanupJob> l) : base(s, c, l) { }
        public Task RunGlobalPublic(IServiceProvider sp, CancellationToken ct = default) => RunGlobalAsync(sp, ct);
    }

    // ─── 1. JobVacancyExpiryJob ────────────────────────────────────────────

    [Fact]
    public async Task JobVacancyExpiry_PastExpiresAt_MarkedExpired()
    {
        using var arrange = Factory.Services.CreateScope();
        var arrangeDb = arrange.ServiceProvider.GetRequiredService<NexusDbContext>();
        var job = new JobVacancy
        {
            TenantId = TestData.Tenant1.Id,
            PostedByUserId = TestData.AdminUser.Id,
            Title = "Already expired",
            Category = "Test",
            Status = "active",
            ExpiresAt = DateTime.UtcNow.AddDays(-1),
            CreatedAt = DateTime.UtcNow.AddDays(-30)
        };
        arrangeDb.JobVacancies.Add(job);
        await arrangeDb.SaveChangesAsync();

        using var act = Factory.Services.CreateScope();
        var sut = ActivatorUtilities.CreateInstance<TestableJobVacancyExpiryJob>(act.ServiceProvider);
        await sut.RunForTenantPublic(act.ServiceProvider, TestData.Tenant1.Id);

        using var assertScope = Factory.Services.CreateScope();
        var assertDb = assertScope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var refreshed = await assertDb.JobVacancies.IgnoreQueryFilters().FirstAsync(j => j.Id == job.Id);
        refreshed.Status.Should().Be("expired");
    }

    [Fact]
    public async Task JobVacancyExpiry_OneDayWindow_CreatesReminderOnce()
    {
        using var arrange = Factory.Services.CreateScope();
        var arrangeDb = arrange.ServiceProvider.GetRequiredService<NexusDbContext>();
        var job = new JobVacancy
        {
            TenantId = TestData.Tenant1.Id,
            PostedByUserId = TestData.AdminUser.Id,
            Title = "Closing tomorrow",
            Category = "Test",
            Status = "active",
            ExpiresAt = DateTime.UtcNow.AddHours(20),
            CreatedAt = DateTime.UtcNow.AddDays(-5)
        };
        arrangeDb.JobVacancies.Add(job);
        await arrangeDb.SaveChangesAsync();

        using var act = Factory.Services.CreateScope();
        var sut = ActivatorUtilities.CreateInstance<TestableJobVacancyExpiryJob>(act.ServiceProvider);
        await sut.RunForTenantPublic(act.ServiceProvider, TestData.Tenant1.Id);
        await sut.RunForTenantPublic(act.ServiceProvider, TestData.Tenant1.Id); // idempotent: second run must not double-send

        using var assertScope = Factory.Services.CreateScope();
        var assertDb = assertScope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var notes = await assertDb.Notifications.IgnoreQueryFilters()
            .Where(n => n.TenantId == TestData.Tenant1.Id
                && n.UserId == TestData.AdminUser.Id
                && n.Type == "job_vacancy_expiring"
                && n.Data!.Contains($"\"job_id\":{job.Id}"))
            .CountAsync();
        notes.Should().Be(1, "the 7d/1d bucket dedupe must prevent a second reminder");
    }

    // ─── 2. FeaturedExpiryJob ─────────────────────────────────────────────

    [Fact]
    public async Task FeaturedExpiry_PastFeaturedUntil_UnsetsIsFeatured()
    {
        using var arrange = Factory.Services.CreateScope();
        var arrangeDb = arrange.ServiceProvider.GetRequiredService<NexusDbContext>();
        var job = new JobVacancy
        {
            TenantId = TestData.Tenant1.Id,
            PostedByUserId = TestData.AdminUser.Id,
            Title = "Was featured",
            Category = "Test",
            Status = "active",
            IsFeatured = true,
            FeaturedUntil = DateTime.UtcNow.AddHours(-1),
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };
        arrangeDb.JobVacancies.Add(job);
        await arrangeDb.SaveChangesAsync();

        using var act = Factory.Services.CreateScope();
        var sut = ActivatorUtilities.CreateInstance<TestableFeaturedExpiryJob>(act.ServiceProvider);
        await sut.RunForTenantPublic(act.ServiceProvider, TestData.Tenant1.Id);

        using var assertScope = Factory.Services.CreateScope();
        var assertDb = assertScope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var refreshed = await assertDb.JobVacancies.IgnoreQueryFilters().FirstAsync(j => j.Id == job.Id);
        refreshed.IsFeatured.Should().BeFalse();
    }

    [Fact]
    public async Task FeaturedExpiry_FutureFeaturedUntil_LeavesAlone()
    {
        using var arrange = Factory.Services.CreateScope();
        var arrangeDb = arrange.ServiceProvider.GetRequiredService<NexusDbContext>();
        var job = new JobVacancy
        {
            TenantId = TestData.Tenant1.Id,
            PostedByUserId = TestData.AdminUser.Id,
            Title = "Still featured",
            Category = "Test",
            Status = "active",
            IsFeatured = true,
            FeaturedUntil = DateTime.UtcNow.AddDays(3),
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };
        arrangeDb.JobVacancies.Add(job);
        await arrangeDb.SaveChangesAsync();

        using var act = Factory.Services.CreateScope();
        var sut = ActivatorUtilities.CreateInstance<TestableFeaturedExpiryJob>(act.ServiceProvider);
        await sut.RunForTenantPublic(act.ServiceProvider, TestData.Tenant1.Id);

        using var assertScope = Factory.Services.CreateScope();
        var assertDb = assertScope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var refreshed = await assertDb.JobVacancies.IgnoreQueryFilters().FirstAsync(j => j.Id == job.Id);
        refreshed.IsFeatured.Should().BeTrue();
    }

    // ─── 3. ListingExpiryJob ──────────────────────────────────────────────

    [Fact]
    public async Task ListingExpiry_PastExpiresAt_MarkedExpiredAndNotifiesOwner()
    {
        using var arrange = Factory.Services.CreateScope();
        var arrangeDb = arrange.ServiceProvider.GetRequiredService<NexusDbContext>();
        var listing = new Listing
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.MemberUser.Id,
            Title = "Stale listing",
            Type = ListingType.Offer,
            Status = ListingStatus.Active,
            ExpiresAt = DateTime.UtcNow.AddHours(-2),
            CreatedAt = DateTime.UtcNow.AddDays(-30)
        };
        arrangeDb.Listings.Add(listing);
        await arrangeDb.SaveChangesAsync();

        using var act = Factory.Services.CreateScope();
        var sut = ActivatorUtilities.CreateInstance<TestableListingExpiryJob>(act.ServiceProvider);
        await sut.RunForTenantPublic(act.ServiceProvider, TestData.Tenant1.Id);

        using var assertScope = Factory.Services.CreateScope();
        var assertDb = assertScope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var refreshed = await assertDb.Listings.IgnoreQueryFilters().FirstAsync(l => l.Id == listing.Id);
        refreshed.Status.Should().Be(ListingStatus.Expired);

        var note = await assertDb.Notifications.IgnoreQueryFilters()
            .FirstOrDefaultAsync(n => n.UserId == TestData.MemberUser.Id
                && n.Type == "listing_expired"
                && n.Data!.Contains($"\"listing_id\":{listing.Id}"));
        note.Should().NotBeNull();
    }

    [Fact]
    public async Task ListingExpiry_AlreadyExpired_NotPickedUpAgain()
    {
        using var arrange = Factory.Services.CreateScope();
        var arrangeDb = arrange.ServiceProvider.GetRequiredService<NexusDbContext>();
        var listing = new Listing
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.MemberUser.Id,
            Title = "Already expired",
            Type = ListingType.Offer,
            Status = ListingStatus.Expired,
            ExpiresAt = DateTime.UtcNow.AddDays(-10),
            CreatedAt = DateTime.UtcNow.AddDays(-60)
        };
        arrangeDb.Listings.Add(listing);
        await arrangeDb.SaveChangesAsync();
        var notifsBefore = await arrangeDb.Notifications.IgnoreQueryFilters()
            .Where(n => n.UserId == TestData.MemberUser.Id && n.Type == "listing_expired").CountAsync();

        using var act = Factory.Services.CreateScope();
        var sut = ActivatorUtilities.CreateInstance<TestableListingExpiryJob>(act.ServiceProvider);
        await sut.RunForTenantPublic(act.ServiceProvider, TestData.Tenant1.Id);

        using var assertScope = Factory.Services.CreateScope();
        var assertDb = assertScope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var notifsAfter = await assertDb.Notifications.IgnoreQueryFilters()
            .Where(n => n.UserId == TestData.MemberUser.Id && n.Type == "listing_expired").CountAsync();
        notifsAfter.Should().Be(notifsBefore, "expired listings must not be re-notified");
    }

    // ─── 4. OnboardingNurtureJob ──────────────────────────────────────────

    [Fact]
    public async Task OnboardingNurture_NewUserAtDay2_ReceivesDay2NurtureOnly()
    {
        using var arrange = Factory.Services.CreateScope();
        var arrangeDb = arrange.ServiceProvider.GetRequiredService<NexusDbContext>();
        var u = new User
        {
            TenantId = TestData.Tenant1.Id,
            Email = $"nurture-{Guid.NewGuid():N}@test.local",
            FirstName = "Nur",
            LastName = "Ture",
            PasswordHash = "x",
            Role = "member",
            CreatedAt = DateTime.UtcNow.AddDays(-2.5)
        };
        arrangeDb.Users.Add(u);
        await arrangeDb.SaveChangesAsync();

        using var act = Factory.Services.CreateScope();
        var sut = ActivatorUtilities.CreateInstance<TestableOnboardingNurtureJob>(act.ServiceProvider);
        await sut.RunForTenantPublic(act.ServiceProvider, TestData.Tenant1.Id);
        await sut.RunForTenantPublic(act.ServiceProvider, TestData.Tenant1.Id); // idempotent

        using var assertScope = Factory.Services.CreateScope();
        var assertDb = assertScope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var types = await assertDb.Notifications.IgnoreQueryFilters()
            .Where(n => n.UserId == u.Id && n.Type.StartsWith("onboarding_nurture_"))
            .Select(n => n.Type)
            .ToListAsync();
        types.Should().ContainSingle().Which.Should().Be("onboarding_nurture_day2");
    }

    [Fact]
    public async Task OnboardingNurture_NewUserAtDay7_ReceivesAllThreeNurtures()
    {
        using var arrange = Factory.Services.CreateScope();
        var arrangeDb = arrange.ServiceProvider.GetRequiredService<NexusDbContext>();
        var u = new User
        {
            TenantId = TestData.Tenant1.Id,
            Email = $"nurture-day7-{Guid.NewGuid():N}@test.local",
            FirstName = "Day",
            LastName = "Seven",
            PasswordHash = "x",
            Role = "member",
            CreatedAt = DateTime.UtcNow.AddDays(-7.5)
        };
        arrangeDb.Users.Add(u);
        await arrangeDb.SaveChangesAsync();

        using var act = Factory.Services.CreateScope();
        var sut = ActivatorUtilities.CreateInstance<TestableOnboardingNurtureJob>(act.ServiceProvider);
        await sut.RunForTenantPublic(act.ServiceProvider, TestData.Tenant1.Id);

        using var assertScope = Factory.Services.CreateScope();
        var assertDb = assertScope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var types = await assertDb.Notifications.IgnoreQueryFilters()
            .Where(n => n.UserId == u.Id && n.Type.StartsWith("onboarding_nurture_"))
            .Select(n => n.Type)
            .OrderBy(t => t)
            .ToListAsync();
        types.Should().BeEquivalentTo(new[] { "onboarding_nurture_day2", "onboarding_nurture_day5", "onboarding_nurture_day7" });
    }

    // ─── 5. ExpiredTokenCleanupJob ────────────────────────────────────────

    [Fact]
    public async Task ExpiredTokenCleanup_DeletesExpiredAndRevoked_KeepsValid()
    {
        using var arrange = Factory.Services.CreateScope();
        var arrangeDb = arrange.ServiceProvider.GetRequiredService<NexusDbContext>();
        var expired = new RefreshToken
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.MemberUser.Id,
            TokenHash = $"expired-{Guid.NewGuid():N}",
            ExpiresAt = DateTime.UtcNow.AddDays(-1)
        };
        var revoked = new RefreshToken
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.MemberUser.Id,
            TokenHash = $"revoked-{Guid.NewGuid():N}",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            RevokedAt = DateTime.UtcNow.AddHours(-2)
        };
        var valid = new RefreshToken
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.MemberUser.Id,
            TokenHash = $"valid-{Guid.NewGuid():N}",
            ExpiresAt = DateTime.UtcNow.AddDays(14)
        };
        arrangeDb.RefreshTokens.AddRange(expired, revoked, valid);
        await arrangeDb.SaveChangesAsync();
        var expiredId = expired.Id;
        var revokedId = revoked.Id;
        var validId = valid.Id;

        using var act = Factory.Services.CreateScope();
        var sut = ActivatorUtilities.CreateInstance<TestableExpiredTokenCleanupJob>(act.ServiceProvider);
        await sut.RunGlobalPublic(act.ServiceProvider);

        using var assertScope = Factory.Services.CreateScope();
        var assertDb = assertScope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var remaining = await assertDb.RefreshTokens.IgnoreQueryFilters()
            .Where(t => t.Id == expiredId || t.Id == revokedId || t.Id == validId)
            .Select(t => t.Id)
            .ToListAsync();
        remaining.Should().BeEquivalentTo(new[] { validId });
    }
}
