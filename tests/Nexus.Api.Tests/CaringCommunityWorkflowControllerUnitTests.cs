// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Services;

namespace Nexus.Api.Tests;

public sealed class CaringCommunityWorkflowControllerUnitTests
{
    private const string ControllerTypeName = "Nexus.Api.Controllers.AdminCaringCommunityWorkflowController, Nexus.Api";
    private const string ServiceTypeName = "Nexus.Api.Services.CaringCommunityWorkflowService, Nexus.Api";

    [Fact]
    public void Workflow_ExposesLaravelAdminRoute()
    {
        var controller = Resolve(ControllerTypeName);

        controller.GetCustomAttribute<RouteAttribute>()?.Template.Should().Be("api/admin/caring-community");
        controller.GetCustomAttribute<AuthorizeAttribute>()?.Policy.Should().Be("AdminOnly");
        controller.GetMethod("Workflow")?.GetCustomAttribute<HttpGetAttribute>()?.Template
            .Should().Be("workflow");
        controller.GetMethod("UpdatePolicy")?.GetCustomAttribute<HttpPutAttribute>()?.Template
            .Should().Be("workflow/policy");
    }

    [Fact]
    public async Task Workflow_ReturnsLaravelSummaryWithTenantScopedStatsReviewsSignalsAndPolicy()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        SeedPolicy(db, 42);
        db.Users.AddRange(
            User(1, 42, "Ava", "Admin", Role.Names.Admin),
            User(10, 42, "Mia", "Member", Role.Names.Member),
            User(11, 42, "Ben", "Broker", Role.Names.Admin),
            User(99, 7, "Other", "Tenant", Role.Names.Admin));
        db.VolunteerLogs.AddRange(
            Log(100, 42, 10, "pending", 2.4m, DateTime.UtcNow.AddDays(-4), assignedTo: 11),
            Log(101, 42, 10, "pending", 1.0m, DateTime.UtcNow.AddDays(-1), escalatedAt: DateTime.UtcNow.AddHours(-2)),
            Log(102, 42, 10, "approved", 1.5m, DateTime.UtcNow.AddDays(-2), updatedAt: DateTime.UtcNow.AddHours(-3)),
            Log(103, 42, 10, "declined", 0.5m, DateTime.UtcNow.AddDays(-3), updatedAt: DateTime.UtcNow.AddHours(-5)),
            Log(200, 7, 99, "pending", 9m, DateTime.UtcNow.AddDays(-10)));
        db.Listings.AddRange(
            Listing(500, 42, 10, ListingType.Request, ListingStatus.Active),
            Listing(501, 42, 10, ListingType.Offer, ListingStatus.Active),
            Listing(502, 42, 10, ListingType.Offer, ListingStatus.Draft),
            Listing(900, 7, 99, ListingType.Request, ListingStatus.Active));
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 1);

        var result = await Invoke(controller, "Workflow", CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        var data = document.RootElement.GetProperty("data");

        var stats = data.GetProperty("stats");
        stats.GetProperty("pending_count").GetInt32().Should().Be(2);
        stats.GetProperty("pending_hours").GetDecimal().Should().Be(3.4m);
        stats.GetProperty("overdue_count").GetInt32().Should().Be(1);
        stats.GetProperty("escalated_count").GetInt32().Should().Be(1);
        stats.GetProperty("approved_30d_hours").GetDecimal().Should().Be(1.5m);
        stats.GetProperty("declined_30d_count").GetInt32().Should().Be(1);
        stats.GetProperty("coordinator_count").GetInt32().Should().Be(2);
        stats.GetProperty("intergenerational_tandem_count").GetInt32().Should().Be(0);

        var pending = data.GetProperty("pending_reviews").EnumerateArray().ToArray();
        pending.Should().HaveCount(2);
        pending[0].GetProperty("id").GetInt32().Should().Be(100);
        pending[0].GetProperty("member_name").GetString().Should().Be("Mia Member");
        pending[0].GetProperty("assigned_to").GetInt32().Should().Be(11);
        pending[0].GetProperty("assigned_name").GetString().Should().Be("Ben Broker");
        pending[0].GetProperty("hours").GetDecimal().Should().Be(2.4m);
        pending[0].GetProperty("is_overdue").GetBoolean().Should().BeTrue();
        pending[0].GetProperty("is_escalated").GetBoolean().Should().BeFalse();
        pending[1].GetProperty("is_escalated").GetBoolean().Should().BeTrue();

        var recent = data.GetProperty("recent_decisions").EnumerateArray().ToArray();
        recent.Should().HaveCount(2);
        recent[0].GetProperty("id").GetInt32().Should().Be(102);
        recent[0].GetProperty("status").GetString().Should().Be("approved");
        recent[1].GetProperty("status").GetString().Should().Be("declined");

        var signals = data.GetProperty("coordinator_signals");
        signals.GetProperty("active_requests").GetInt32().Should().Be(1);
        signals.GetProperty("active_offers").GetInt32().Should().Be(1);
        signals.GetProperty("trusted_organisations").GetInt32().Should().Be(0);

        var coordinators = data.GetProperty("coordinators").EnumerateArray().ToArray();
        coordinators.Select(item => item.GetProperty("name").GetString())
            .Should().Equal("Ava Admin", "Ben Broker");

        var rolePack = data.GetProperty("role_pack");
        rolePack.GetProperty("available").GetBoolean().Should().BeTrue();
        rolePack.GetProperty("total_count").GetInt32().Should().Be(6);

        var policy = data.GetProperty("policy");
        policy.GetProperty("approval_required").GetBoolean().Should().BeTrue();
        policy.GetProperty("review_sla_days").GetInt32().Should().Be(3);
        policy.GetProperty("escalation_sla_days").GetInt32().Should().Be(5);
        policy.GetProperty("municipal_report_default_period").GetString().Should().Be("previous_quarter");
        policy.GetProperty("default_hour_value_chf").GetInt32().Should().Be(50);
    }

    [Fact]
    public async Task UpdatePolicy_NormalizesAndPersistsLaravelWorkflowPolicy()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        SeedPolicy(db, 42);
        db.TenantConfigs.Add(new TenantConfig
        {
            TenantId = 7,
            Key = "caring_community.workflow.default_hour_value_chf",
            Value = "77"
        });
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 1);

        var result = await Invoke(controller, "UpdatePolicy", new Dictionary<string, object?>
        {
            ["approval_required"] = false,
            ["auto_approve_trusted_reviewers"] = true,
            ["review_sla_days"] = 0,
            ["escalation_sla_days"] = 99,
            ["allow_member_self_log"] = false,
            ["require_organisation_for_partner_hours"] = false,
            ["monthly_statement_day"] = 31,
            ["municipal_report_default_period"] = "unsupported_period",
            ["include_social_value_estimate"] = false,
            ["default_hour_value_chf"] = 999
        }, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        var data = document.RootElement.GetProperty("data");
        data.GetProperty("approval_required").GetBoolean().Should().BeFalse();
        data.GetProperty("auto_approve_trusted_reviewers").GetBoolean().Should().BeTrue();
        data.GetProperty("review_sla_days").GetInt32().Should().Be(1);
        data.GetProperty("escalation_sla_days").GetInt32().Should().Be(60);
        data.GetProperty("allow_member_self_log").GetBoolean().Should().BeFalse();
        data.GetProperty("require_organisation_for_partner_hours").GetBoolean().Should().BeFalse();
        data.GetProperty("monthly_statement_day").GetInt32().Should().Be(28);
        data.GetProperty("municipal_report_default_period").GetString().Should().Be("last_90_days");
        data.GetProperty("include_social_value_estimate").GetBoolean().Should().BeFalse();
        data.GetProperty("default_hour_value_chf").GetInt32().Should().Be(500);

        var rows = await db.TenantConfigs
            .IgnoreQueryFilters()
            .Where(config => config.TenantId == 42 && config.Key.StartsWith("caring_community.workflow."))
            .ToDictionaryAsync(config => config.Key, config => config.Value);

        rows["caring_community.workflow.approval_required"].Should().Be("0");
        rows["caring_community.workflow.auto_approve_trusted_reviewers"].Should().Be("1");
        rows["caring_community.workflow.review_sla_days"].Should().Be("1");
        rows["caring_community.workflow.escalation_sla_days"].Should().Be("60");
        rows["caring_community.workflow.municipal_report_default_period"].Should().Be("last_90_days");
        rows["caring_community.workflow.default_hour_value_chf"].Should().Be("500");

        (await db.TenantConfigs.IgnoreQueryFilters()
            .SingleAsync(config => config.TenantId == 7 && config.Key == "caring_community.workflow.default_hour_value_chf"))
            .Value.Should().Be("77");
    }

    [Fact]
    public async Task UpdatePolicy_WhenFeatureDisabled_ReturnsLaravelForbidden()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: false);
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 1);

        var result = await Invoke(controller, "UpdatePolicy", new Dictionary<string, object?>(), CancellationToken.None);

        var forbidden = result.Should().BeOfType<ObjectResult>().Subject;
        forbidden.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(forbidden.Value));
        document.RootElement.GetProperty("errors")[0].GetProperty("code").GetString()
            .Should().Be("FEATURE_DISABLED");
    }

    [Fact]
    public async Task Workflow_WhenFeatureDisabled_ReturnsLaravelForbidden()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: false);
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 1);

        var result = await Invoke(controller, "Workflow", CancellationToken.None);

        var forbidden = result.Should().BeOfType<ObjectResult>().Subject;
        forbidden.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(forbidden.Value));
        document.RootElement.GetProperty("errors")[0].GetProperty("code").GetString()
            .Should().Be("FEATURE_DISABLED");
    }

    private static object CreateController(NexusDbContext db, TenantContext tenant, int userId)
    {
        var rolePresetService = new CaringCommunityRolePresetService(db);
        var service = Activator.CreateInstance(Resolve(ServiceTypeName), db, rolePresetService)!;
        var controller = (ControllerBase)Activator.CreateInstance(Resolve(ControllerTypeName), service, tenant)!;
        controller.ControllerContext = ControllerContextFor(userId, tenant.GetTenantIdOrThrow());
        return controller;
    }

    private static async Task<IActionResult> Invoke(object controller, string method, params object?[] args)
    {
        var action = controller.GetType().GetMethod(method);
        action.Should().NotBeNull();
        var result = action!.Invoke(controller, args);
        if (result is Task<IActionResult> task)
        {
            return await task;
        }

        return result.Should().BeAssignableTo<IActionResult>().Subject;
    }

    private static Type Resolve(string typeName)
    {
        var type = Type.GetType(typeName, throwOnError: false);
        type.Should().NotBeNull($"Laravel caring workflow parity type {typeName} should exist");
        return type!;
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

    private static void SeedFeature(NexusDbContext db, int tenantId, bool enabled)
    {
        db.TenantConfigs.Add(new TenantConfig
        {
            TenantId = tenantId,
            Key = "features.caring_community",
            Value = enabled ? "true" : "false"
        });
    }

    private static void SeedPolicy(NexusDbContext db, int tenantId)
    {
        foreach (var (key, value) in new[]
                 {
                     ("approval_required", "1"),
                     ("review_sla_days", "3"),
                     ("escalation_sla_days", "5"),
                     ("municipal_report_default_period", "previous_quarter"),
                     ("default_hour_value_chf", "50")
                 })
        {
            db.TenantConfigs.Add(new TenantConfig
            {
                TenantId = tenantId,
                Key = "caring_community.workflow." + key,
                Value = value
            });
        }
    }

    private static User User(int id, int tenantId, string firstName, string lastName, string role)
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
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    private static VolunteerLog Log(
        int id,
        int tenantId,
        int userId,
        string status,
        decimal hours,
        DateTime createdAt,
        int? assignedTo = null,
        DateTime? escalatedAt = null,
        DateTime? updatedAt = null)
    {
        return new VolunteerLog
        {
            Id = id,
            TenantId = tenantId,
            UserId = userId,
            Status = status,
            Hours = hours,
            Description = $"Log {id}",
            DateLogged = DateOnly.FromDateTime(createdAt),
            AssignedTo = assignedTo,
            AssignedAt = assignedTo is null ? null : createdAt.AddHours(1),
            EscalatedAt = escalatedAt,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt
        };
    }

    private static Listing Listing(int id, int tenantId, int userId, ListingType type, ListingStatus status)
    {
        return new Listing
        {
            Id = id,
            TenantId = tenantId,
            UserId = userId,
            Title = $"Listing {id}",
            Type = type,
            Status = status,
            CreatedAt = DateTime.UtcNow
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
                    new Claim(ClaimTypes.Role, Role.Names.Admin),
                    new Claim("role", Role.Names.Admin)
                ], "Test"))
            }
        };
    }
}
