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
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Services;

namespace Nexus.Api.Tests;

public sealed class CaringCommunitySlaAndSupportAdminControllerUnitTests
{
    private const string ControllerTypeName = "Nexus.Api.Controllers.AdminCaringCommunitySupportController, Nexus.Api";
    private const string SlaServiceTypeName = "Nexus.Api.Services.CaringHelpRequestSlaService, Nexus.Api";
    private const string SupportServiceTypeName = "Nexus.Api.Services.CaringSupportRelationshipService, Nexus.Api";

    [Fact]
    public void Actions_ExposeLaravelSlaAndSupportRelationshipRoutes()
    {
        var controller = Resolve(ControllerTypeName);

        controller.GetCustomAttribute<RouteAttribute>()?.Template
            .Should().Be("api/admin/caring-community");

        controller.GetMethod("SlaDashboard")
            ?.GetCustomAttribute<HttpGetAttribute>()?.Template
            .Should().Be("sla-dashboard");

        controller.GetMethod("SupportRelationships")
            ?.GetCustomAttribute<HttpGetAttribute>()?.Template
            .Should().Be("support-relationships");
    }

    [Fact]
    public async Task SlaDashboard_ReturnsLaravelPolicySummaryAndTenantScopedRows()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        SeedOperatingPolicy(db, 42, firstResponseHours: 4, resolutionHours: 10);

        var now = DateTime.UtcNow;
        db.CaringHelpRequests.AddRange(
            HelpRequest(101, 42, 10, "Needs food", "today", "pending", now.AddHours(-6), null),
            HelpRequest(102, 42, 11, "Needs a lift", "tomorrow", "pending", now.AddHours(-3.25), null),
            HelpRequest(103, 42, 12, "Needs forms", "this week", "matched", now.AddHours(-11), now.AddHours(-2)),
            HelpRequest(104, 42, 13, "Resolved", "yesterday", "closed", now.AddHours(-2), now.AddHours(-1)),
            HelpRequest(901, 7, 70, "Other tenant", "today", "pending", now.AddHours(-100), null));
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 9);

        var data = ReadData(await Invoke(controller, "SlaDashboard", CancellationToken.None));

        var policy = data.GetProperty("policy");
        policy.GetProperty("first_response_hours").GetInt32().Should().Be(4);
        policy.GetProperty("resolution_hours").GetInt32().Should().Be(10);
        policy.GetProperty("source").GetString().Should().Be("tenant_policy");

        var summary = data.GetProperty("summary");
        summary.GetProperty("pending").GetInt32().Should().Be(2);
        summary.GetProperty("in_progress").GetInt32().Should().Be(1);
        summary.GetProperty("first_response_breached").GetInt32().Should().Be(1);
        summary.GetProperty("first_response_at_risk").GetInt32().Should().Be(1);
        summary.GetProperty("resolution_breached").GetInt32().Should().Be(1);
        summary.GetProperty("resolution_at_risk").GetInt32().Should().Be(0);
        summary.GetProperty("resolved_within_window_24h").GetInt32().Should().Be(1);

        var open = data.GetProperty("open_requests").EnumerateArray().ToArray();
        open.Should().HaveCount(3);
        open[0].GetProperty("id").GetInt32().Should().Be(101);
        open[0].GetProperty("bucket").GetString().Should().Be("breached");
        open[0].GetProperty("sla_dimension").GetString().Should().Be("first_response");
        open[1].GetProperty("id").GetInt32().Should().Be(103);
        open[1].GetProperty("bucket").GetString().Should().Be("breached");
        open[1].GetProperty("sla_dimension").GetString().Should().Be("resolution");
        open[2].GetProperty("id").GetInt32().Should().Be(102);
        open[2].GetProperty("bucket").GetString().Should().Be("at_risk");

        var resolved = data.GetProperty("recently_resolved");
        resolved.GetArrayLength().Should().Be(1);
        resolved[0].GetProperty("id").GetInt32().Should().Be(104);
        resolved[0].GetProperty("within_resolution_sla").GetBoolean().Should().BeTrue();
        data.GetProperty("generated_at").GetString().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task SupportRelationships_DefaultsToActiveAndReturnsLaravelStats()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        db.Users.AddRange(
            User(9, 42, "Admin", "User", Role.Names.Admin),
            User(10, 42, "Ada", "Supporter"),
            User(11, 42, "Grace", "Recipient"),
            User(12, 42, "Linus", "Coordinator"),
            User(70, 7, "Other", "Tenant"));
        var now = DateTime.UtcNow;
        db.CaringSupportRelationships.AddRange(
            Relationship(201, 42, 10, 11, 12, "Weekly shop", "Shopping and tea", "weekly", 2.5m, "active", new DateOnly(2026, 7, 1), now.AddDays(-1), now.AddDays(-10)),
            Relationship(202, 42, 10, 11, 12, "Paused help", null, "monthly", 1.25m, "paused", new DateOnly(2026, 6, 1), now.AddDays(7), now.AddDays(-5)),
            Relationship(203, 7, 70, 11, null, "Other tenant", null, "weekly", 99m, "active", new DateOnly(2026, 6, 1), now.AddDays(-7), now.AddDays(-20)));
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 9);

        var data = ReadData(await Invoke(controller, "SupportRelationships", null, CancellationToken.None));

        var stats = data.GetProperty("stats");
        stats.GetProperty("active_count").GetInt32().Should().Be(1);
        stats.GetProperty("paused_count").GetInt32().Should().Be(1);
        stats.GetProperty("check_ins_due").GetInt32().Should().Be(1);
        stats.GetProperty("expected_active_hours").GetDecimal().Should().Be(2.5m);

        var items = data.GetProperty("items");
        items.GetArrayLength().Should().Be(1);
        items[0].GetProperty("id").GetInt32().Should().Be(201);
        items[0].GetProperty("supporter").GetProperty("name").GetString().Should().Be("Ada Supporter");
        items[0].GetProperty("recipient").GetProperty("name").GetString().Should().Be("Grace Recipient");
        items[0].GetProperty("coordinator").GetProperty("name").GetString().Should().Be("Linus Coordinator");
        items[0].GetProperty("organization_name").GetString().Should().Be(string.Empty);
        items[0].GetProperty("category_name").GetString().Should().Be(string.Empty);
        items[0].GetProperty("title").GetString().Should().Be("Weekly shop");
        items[0].GetProperty("description").GetString().Should().Be("Shopping and tea");
        items[0].GetProperty("frequency").GetString().Should().Be("weekly");
        items[0].GetProperty("expected_hours").GetDecimal().Should().Be(2.5m);
        items[0].GetProperty("start_date").GetString().Should().Be("2026-07-01");
        items[0].GetProperty("status").GetString().Should().Be("active");

        var allData = ReadData(await Invoke(controller, "SupportRelationships", "all", CancellationToken.None));
        allData.GetProperty("items").GetArrayLength().Should().Be(2);
    }

    [Fact]
    public async Task AdminReads_WhenFeatureDisabled_ReturnLaravelErrors()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: false);
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 9);

        AssertSingleError(
            await Invoke(controller, "SlaDashboard", CancellationToken.None),
            StatusCodes.Status403Forbidden,
            "FORBIDDEN");
        AssertSingleError(
            await Invoke(controller, "SupportRelationships", null, CancellationToken.None),
            StatusCodes.Status403Forbidden,
            "FEATURE_DISABLED");
    }

    private static object CreateController(NexusDbContext db, TenantContext tenant, int userId)
    {
        var policy = new OperatingPolicyService(db);
        var sla = Activator.CreateInstance(Resolve(SlaServiceTypeName), db, policy)!;
        var relationships = Activator.CreateInstance(Resolve(SupportServiceTypeName), db)!;
        var controller = (ControllerBase)Activator.CreateInstance(Resolve(ControllerTypeName), sla, relationships, tenant)!;
        controller.ControllerContext = ControllerContextFor(userId, tenant.GetTenantIdOrThrow());
        return controller;
    }

    private static async Task<IActionResult> Invoke(object controller, string method, params object?[] args)
    {
        var info = controller.GetType().GetMethod(method);
        info.Should().NotBeNull();
        var result = info!.Invoke(controller, args);
        result.Should().BeAssignableTo<Task<IActionResult>>();
        return await (Task<IActionResult>)result!;
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

    private static void SeedFeature(NexusDbContext db, int tenantId, bool enabled)
    {
        db.TenantConfigs.Add(new TenantConfig
        {
            TenantId = tenantId,
            Key = "features.caring_community",
            Value = enabled ? "true" : "false"
        });
    }

    private static void SeedOperatingPolicy(
        NexusDbContext db,
        int tenantId,
        int firstResponseHours,
        int resolutionHours)
    {
        var now = DateTime.UtcNow;
        db.TenantConfigs.AddRange(
            new TenantConfig
            {
                TenantId = tenantId,
                Key = OperatingPolicyService.KeyPrefix + "sla_first_response_hours",
                Value = firstResponseHours.ToString(),
                UpdatedAt = now
            },
            new TenantConfig
            {
                TenantId = tenantId,
                Key = OperatingPolicyService.KeyPrefix + "sla_help_request_hours",
                Value = resolutionHours.ToString(),
                UpdatedAt = now
            });
    }

    private static CaringHelpRequest HelpRequest(
        int id,
        int tenantId,
        int userId,
        string what,
        string whenNeeded,
        string status,
        DateTime createdAt,
        DateTime? updatedAt)
    {
        return new CaringHelpRequest
        {
            Id = id,
            TenantId = tenantId,
            UserId = userId,
            What = what,
            WhenNeeded = whenNeeded,
            ContactPreference = "either",
            Status = status,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt
        };
    }

    private static CaringSupportRelationship Relationship(
        int id,
        int tenantId,
        int supporterId,
        int recipientId,
        int? coordinatorId,
        string title,
        string? description,
        string frequency,
        decimal expectedHours,
        string status,
        DateOnly startDate,
        DateTime? nextCheckInAt,
        DateTime createdAt)
    {
        return new CaringSupportRelationship
        {
            Id = id,
            TenantId = tenantId,
            SupporterId = supporterId,
            RecipientId = recipientId,
            CoordinatorId = coordinatorId,
            Title = title,
            Description = description,
            Frequency = frequency,
            ExpectedHours = expectedHours,
            StartDate = startDate,
            Status = status,
            NextCheckInAt = nextCheckInAt,
            CreatedAt = createdAt
        };
    }

    private static User User(int id, int tenantId, string firstName, string lastName, string role = Role.Names.Member)
    {
        return new User
        {
            Id = id,
            TenantId = tenantId,
            Email = $"user{id}@example.test",
            PasswordHash = "hash",
            FirstName = firstName,
            LastName = lastName,
            Role = role,
            IsActive = true
        };
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

    private static ControllerContext ControllerContextFor(int userId, int tenantId)
    {
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                        new Claim("tenant_id", tenantId.ToString()),
                        new Claim(ClaimTypes.Role, Role.Names.Admin)
                    },
                    "TestAuth"))
            }
        };
    }

    private static Type Resolve(string typeName)
    {
        var type = Type.GetType(typeName, throwOnError: false);
        type.Should().NotBeNull($"{typeName} should exist for Laravel parity");
        return type!;
    }
}
