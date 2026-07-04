// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Controllers;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Services;

namespace Nexus.Api.Tests;

public class CaringCommunityNudgeAnalyticsControllerUnitTests
{
    [Fact]
    public void Actions_ExposeLaravelNudgeAnalyticsRoute()
    {
        typeof(AdminCaringCommunityNudgesController)
            .GetCustomAttribute<RouteAttribute>()?.Template
            .Should().Be("api/admin/caring-community");

        typeof(AdminCaringCommunityNudgesController)
            .GetMethod(nameof(AdminCaringCommunityNudgesController.Analytics))
            ?.GetCustomAttribute<HttpGetAttribute>()?.Template
            .Should().Be("nudges/analytics");
    }

    [Fact]
    public async Task Analytics_WithRows_ReturnsLaravelStatsRecentAndConfig()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedTenants(db);
        SeedFeature(db, 42, enabled: true);
        SeedConfig(db);
        SeedUsers(db);
        SeedOptOuts(db);
        SeedNudges(db);
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant);

        var data = ReadData(await controller.Analytics(CancellationToken.None));

        var config = data.GetProperty("config");
        config.GetProperty("enabled").GetBoolean().Should().BeTrue();
        config.GetProperty("min_score").GetDecimal().Should().Be(0.8m);
        config.GetProperty("cooldown_days").GetInt32().Should().Be(21);
        config.GetProperty("daily_limit").GetInt32().Should().Be(10);

        var stats = data.GetProperty("stats");
        stats.GetProperty("sent_total").GetInt32().Should().Be(3);
        stats.GetProperty("sent_30d").GetInt32().Should().Be(2);
        stats.GetProperty("converted_total").GetInt32().Should().Be(2);
        stats.GetProperty("converted_30d").GetInt32().Should().Be(1);
        stats.GetProperty("conversion_rate_30d").GetDecimal().Should().Be(0.5m);
        stats.GetProperty("opted_out_members").GetInt32().Should().Be(1);

        var recent = data.GetProperty("recent").EnumerateArray().ToArray();
        recent.Should().HaveCount(3);
        recent[0].GetProperty("id").GetInt64().Should().Be(100);
        recent[0].GetProperty("target_user").GetProperty("id").GetInt32().Should().Be(10);
        recent[0].GetProperty("target_user").GetProperty("name").GetString().Should().Be("Ada Lovelace");
        recent[0].GetProperty("related_user").GetProperty("id").GetInt32().Should().Be(11);
        recent[0].GetProperty("related_user").GetProperty("name").GetString().Should().Be("Grace Hopper");
        recent[0].GetProperty("score").GetDecimal().Should().Be(0.876m);
        recent[0].GetProperty("status").GetString().Should().Be("sent");
        recent[0].GetProperty("converted_at").ValueKind.Should().Be(JsonValueKind.Null);

        data.GetProperty("eligible_candidates").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task Analytics_WithoutRows_ReturnsLaravelDefaultConfigAndEmptyStats()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant);

        var data = ReadData(await controller.Analytics(CancellationToken.None));

        var config = data.GetProperty("config");
        config.GetProperty("enabled").GetBoolean().Should().BeFalse();
        config.GetProperty("min_score").GetDecimal().Should().Be(0.55m);
        config.GetProperty("cooldown_days").GetInt32().Should().Be(14);
        config.GetProperty("daily_limit").GetInt32().Should().Be(25);

        var stats = data.GetProperty("stats");
        stats.GetProperty("sent_total").GetInt32().Should().Be(0);
        stats.GetProperty("sent_30d").GetInt32().Should().Be(0);
        stats.GetProperty("converted_total").GetInt32().Should().Be(0);
        stats.GetProperty("converted_30d").GetInt32().Should().Be(0);
        stats.GetProperty("conversion_rate_30d").GetDecimal().Should().Be(0m);
        stats.GetProperty("opted_out_members").GetInt32().Should().Be(0);

        data.GetProperty("recent").EnumerateArray().Should().BeEmpty();
        data.GetProperty("eligible_candidates").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task Analytics_WhenFeatureDisabled_ReturnsLaravelFeatureDisabledError()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: false);
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant);

        AssertSingleError(
            await controller.Analytics(CancellationToken.None),
            StatusCodes.Status403Forbidden,
            "FEATURE_DISABLED");
    }

    private static JsonElement ReadData(IActionResult result)
    {
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        return document.RootElement.GetProperty("data").Clone();
    }

    private static void AssertSingleError(IActionResult result, int statusCode, string code)
    {
        var objectResult = result.Should().BeAssignableTo<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(statusCode);
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(objectResult.Value));
        document.RootElement.GetProperty("errors")[0].GetProperty("code").GetString().Should().Be(code);
    }

    private static void SeedTenants(NexusDbContext db)
    {
        db.Tenants.AddRange(
            new Tenant { Id = 42, Slug = "acme", Name = "Acme" },
            new Tenant { Id = 7, Slug = "globex", Name = "Globex" });
    }

    private static void SeedFeature(NexusDbContext db, int tenantId, bool enabled)
    {
        db.TenantConfigs.Add(new TenantConfig
        {
            TenantId = tenantId,
            Key = "features.caring_community",
            Value = enabled ? "true" : "false"
        });
    }

    private static void SeedConfig(NexusDbContext db)
    {
        db.TenantConfigs.AddRange(
            new TenantConfig { TenantId = 42, Key = "caring_community.nudges.enabled", Value = "true" },
            new TenantConfig { TenantId = 42, Key = "caring_community.nudges.min_score", Value = "0.8" },
            new TenantConfig { TenantId = 42, Key = "caring_community.nudges.cooldown_days", Value = "21" },
            new TenantConfig { TenantId = 42, Key = "caring_community.nudges.daily_limit", Value = "10" },
            new TenantConfig { TenantId = 7, Key = "caring_community.nudges.enabled", Value = "false" },
            new TenantConfig { TenantId = 7, Key = "caring_community.nudges.min_score", Value = "0.95" });
    }

    private static void SeedUsers(NexusDbContext db)
    {
        db.Users.AddRange(
            User(10, 42, "Ada", "Lovelace"),
            User(11, 42, "Grace", "Hopper"),
            User(12, 42, "Pat", "Recipient"),
            User(70, 7, "Other", "Tenant"));
    }

    private static User User(int id, int tenantId, string firstName, string lastName) =>
        new()
        {
            Id = id,
            TenantId = tenantId,
            FirstName = firstName,
            LastName = lastName,
            Email = $"{firstName.ToLowerInvariant()}-{id}@example.test",
            PasswordHash = "x",
            Role = Role.Names.Member
        };

    private static void SeedOptOuts(NexusDbContext db)
    {
        db.NotificationPreferences.AddRange(
            new NotificationPreference
            {
                TenantId = 42,
                UserId = 12,
                NotificationType = "caring_smart_nudges",
                EnableInApp = false,
                EnablePush = false,
                EnableEmail = false
            },
            new NotificationPreference
            {
                TenantId = 7,
                UserId = 70,
                NotificationType = "caring_smart_nudges",
                EnableInApp = false,
                EnablePush = false,
                EnableEmail = false
            });
    }

    private static void SeedNudges(NexusDbContext db)
    {
        var now = DateTime.UtcNow;
        db.CaringSmartNudges.AddRange(
            new CaringSmartNudge
            {
                Id = 100,
                TenantId = 42,
                TargetUserId = 10,
                RelatedUserId = 11,
                SourceType = "tandem_candidate",
                Score = 0.8764m,
                Status = "sent",
                SentAt = now.AddDays(-2),
                CreatedAt = now.AddDays(-2)
            },
            new CaringSmartNudge
            {
                Id = 101,
                TenantId = 42,
                TargetUserId = 12,
                RelatedUserId = null,
                SourceType = "helper_at_risk",
                Score = 0.7m,
                Status = "converted",
                SentAt = now.AddDays(-10),
                ConvertedAt = now.AddDays(-1),
                CreatedAt = now.AddDays(-10)
            },
            new CaringSmartNudge
            {
                Id = 102,
                TenantId = 42,
                TargetUserId = 10,
                RelatedUserId = null,
                SourceType = "low_coverage_subregion",
                Score = 0.65m,
                Status = "converted",
                SentAt = now.AddDays(-45),
                ConvertedAt = now.AddDays(-40),
                CreatedAt = now.AddDays(-45)
            },
            new CaringSmartNudge
            {
                Id = 700,
                TenantId = 7,
                TargetUserId = 70,
                RelatedUserId = null,
                SourceType = "helper_at_risk",
                Score = 0.99m,
                Status = "converted",
                SentAt = now.AddDays(-1),
                ConvertedAt = now.AddDays(-1),
                CreatedAt = now.AddDays(-1)
            });
    }

    private static TenantContext CreateTenantContext(int tenantId)
    {
        var tenant = new TenantContext();
        tenant.SetTenant(tenantId);
        return tenant;
    }

    private static NexusDbContext CreateDbContext(TenantContext tenant)
    {
        var options = new DbContextOptionsBuilder<NexusDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new NexusDbContext(options, tenant);
    }

    private static AdminCaringCommunityNudgesController CreateController(
        NexusDbContext db,
        TenantContext tenant)
    {
        var service = new CaringNudgeAnalyticsService(db);
        return new AdminCaringCommunityNudgesController(service, tenant)
        {
            ControllerContext = ControllerContextFor(userId: 9001, tenant.GetTenantIdOrThrow())
        };
    }

    private static ControllerContext ControllerContextFor(int userId, int tenantId)
    {
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                    new Claim("tenant_id", tenantId.ToString()),
                    new Claim(ClaimTypes.Role, "admin"),
                    new Claim("role", "admin")
                ], "Test"))
            }
        };
    }
}
