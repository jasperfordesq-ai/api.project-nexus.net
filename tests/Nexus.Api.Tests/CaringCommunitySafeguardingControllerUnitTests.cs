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

namespace Nexus.Api.Tests;

public class CaringCommunitySafeguardingControllerUnitTests
{
    private const string ControllerTypeName = "Nexus.Api.Controllers.AdminCaringCommunitySafeguardingController, Nexus.Api";
    private const string ServiceTypeName = "Nexus.Api.Services.CaringSafeguardingService, Nexus.Api";
    private const string ActionTypeName = "Nexus.Api.Entities.SafeguardingReportAction, Nexus.Api";

    [Fact]
    public void Actions_ExposeLaravelSafeguardingReadRoutes()
    {
        var controller = Resolve(ControllerTypeName);

        controller.GetCustomAttribute<RouteAttribute>()?.Template
            .Should().Be("api/admin/caring-community/safeguarding");

        controller.GetMethod("Dashboard")
            ?.GetCustomAttribute<HttpGetAttribute>()?.Template
            .Should().Be("dashboard");

        controller.GetMethod("Reports")
            ?.GetCustomAttribute<HttpGetAttribute>()?.Template
            .Should().Be("reports");

        controller.GetMethod("Report")
            ?.GetCustomAttribute<HttpGetAttribute>()?.Template
            .Should().Be("reports/{id:long}");
    }

    [Fact]
    public async Task Dashboard_ReturnsLaravelSummaryWithTenantScopedRecentRows()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        SeedUsers(db);
        SeedReport(db, 101, 42, reporterId: 10, subjectId: 11, assigneeId: 12,
            category: "neglect", severity: "critical", status: "submitted",
            dueAt: DateTime.UtcNow.AddHours(-2), createdAt: new DateTime(2026, 7, 1, 9, 0, 0, DateTimeKind.Utc));
        SeedReport(db, 102, 42, reporterId: 11, subjectId: 10, assigneeId: null,
            category: "financial_concern", severity: "high", status: "triaged",
            dueAt: DateTime.UtcNow.AddHours(4), createdAt: new DateTime(2026, 7, 2, 9, 0, 0, DateTimeKind.Utc));
        SeedReport(db, 103, 42, reporterId: 12, subjectId: null, assigneeId: null,
            category: "other", severity: "medium", status: "investigating",
            dueAt: null, createdAt: new DateTime(2026, 7, 3, 9, 0, 0, DateTimeKind.Utc));
        SeedReport(db, 104, 42, reporterId: 10, subjectId: null, assigneeId: null,
            category: "medical_concern", severity: "low", status: "resolved",
            dueAt: DateTime.UtcNow.AddHours(-10), createdAt: new DateTime(2026, 7, 4, 9, 0, 0, DateTimeKind.Utc));
        SeedReport(db, 901, 7, reporterId: 70, subjectId: null, assigneeId: null,
            category: "other", severity: "critical", status: "submitted",
            dueAt: DateTime.UtcNow.AddHours(-1), createdAt: new DateTime(2026, 7, 5, 9, 0, 0, DateTimeKind.Utc));
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 9);

        var data = ReadData(await Invoke(controller, "Dashboard", CancellationToken.None));

        data.GetProperty("total").GetInt32().Should().Be(4);
        data.GetProperty("open_total").GetInt32().Should().Be(3);
        data.GetProperty("open_by_severity").GetProperty("critical").GetInt32().Should().Be(1);
        data.GetProperty("open_by_severity").GetProperty("high").GetInt32().Should().Be(1);
        data.GetProperty("open_by_severity").GetProperty("medium").GetInt32().Should().Be(1);
        data.GetProperty("open_by_severity").GetProperty("low").GetInt32().Should().Be(0);
        data.GetProperty("by_status").GetProperty("submitted").GetInt32().Should().Be(1);
        data.GetProperty("by_status").GetProperty("triaged").GetInt32().Should().Be(1);
        data.GetProperty("by_status").GetProperty("investigating").GetInt32().Should().Be(1);
        data.GetProperty("by_status").GetProperty("resolved").GetInt32().Should().Be(1);
        data.GetProperty("overdue").GetInt32().Should().Be(1);

        var recent = data.GetProperty("recent");
        recent.GetArrayLength().Should().Be(4);
        recent[0].GetProperty("id").GetInt64().Should().Be(101);
        recent[0].GetProperty("reporter_name").GetString().Should().Be("Ada Reporter");
        recent[0].GetProperty("subject_user_name").GetString().Should().Be("Grace Subject");
        recent[0].GetProperty("assigned_to_name").GetString().Should().Be("Linus Assignee");
        recent[0].GetProperty("is_overdue").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task Reports_AppliesLaravelStatusAndSeverityFilters()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        SeedUsers(db);
        SeedReport(db, 201, 42, reporterId: 10, subjectId: null, assigneeId: null,
            category: "neglect", severity: "critical", status: "submitted",
            dueAt: DateTime.UtcNow.AddHours(-1), createdAt: new DateTime(2026, 7, 1, 9, 0, 0, DateTimeKind.Utc));
        SeedReport(db, 202, 42, reporterId: 11, subjectId: null, assigneeId: null,
            category: "neglect", severity: "high", status: "submitted",
            dueAt: null, createdAt: new DateTime(2026, 7, 2, 9, 0, 0, DateTimeKind.Utc));
        SeedReport(db, 203, 42, reporterId: 12, subjectId: null, assigneeId: null,
            category: "neglect", severity: "critical", status: "resolved",
            dueAt: null, createdAt: new DateTime(2026, 7, 3, 9, 0, 0, DateTimeKind.Utc));
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 9);

        var data = ReadData(await Invoke(controller, "Reports", "submitted", "critical", CancellationToken.None));

        var items = data.GetProperty("items");
        items.GetArrayLength().Should().Be(1);
        items[0].GetProperty("id").GetInt64().Should().Be(201);
        items[0].GetProperty("status").GetString().Should().Be("submitted");
        items[0].GetProperty("severity").GetString().Should().Be("critical");
    }

    [Fact]
    public async Task Report_ReturnsLaravelDetailWithActions()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        SeedUsers(db);
        SeedReport(db, 301, 42, reporterId: 10, subjectId: 11, assigneeId: 12,
            category: "exploitation", severity: "high", status: "investigating",
            dueAt: DateTime.UtcNow.AddHours(6), createdAt: new DateTime(2026, 7, 1, 9, 0, 0, DateTimeKind.Utc));
        db.Add(Entity(ActionTypeName,
            ("Id", 701L), ("TenantId", 42), ("ReportId", 301L), ("ActorUserId", 12),
            ("Action", "assigned"), ("Notes", "Assigned to safeguarding lead."),
            ("CreatedAt", new DateTime(2026, 7, 1, 10, 0, 0, DateTimeKind.Utc))));
        db.Add(Entity(ActionTypeName,
            ("Id", 799L), ("TenantId", 7), ("ReportId", 301L), ("ActorUserId", 70),
            ("Action", "note_added"), ("Notes", "Other tenant action"),
            ("CreatedAt", new DateTime(2026, 7, 1, 11, 0, 0, DateTimeKind.Utc))));
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 9);

        var data = ReadData(await Invoke(controller, "Report", 301L, CancellationToken.None));

        data.GetProperty("id").GetInt64().Should().Be(301);
        data.GetProperty("category").GetString().Should().Be("exploitation");
        data.GetProperty("reporter_name").GetString().Should().Be("Ada Reporter");
        data.GetProperty("subject_user_name").GetString().Should().Be("Grace Subject");
        data.GetProperty("assigned_to_name").GetString().Should().Be("Linus Assignee");

        var actions = data.GetProperty("actions");
        actions.GetArrayLength().Should().Be(1);
        actions[0].GetProperty("id").GetInt64().Should().Be(701);
        actions[0].GetProperty("actor_id").GetInt32().Should().Be(12);
        actions[0].GetProperty("actor_name").GetString().Should().Be("Linus Assignee");
        actions[0].GetProperty("action").GetString().Should().Be("assigned");
        actions[0].GetProperty("notes").GetString().Should().Be("Assigned to safeguarding lead.");
    }

    [Fact]
    public async Task Report_WhenMissing_ReturnsLaravelNotFoundEnvelope()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 9);

        AssertSingleError(await Invoke(controller, "Report", 404L, CancellationToken.None),
            StatusCodes.Status404NotFound,
            "NOT_FOUND");
    }

    [Fact]
    public async Task AdminReads_WhenCaringCommunityDisabled_ReturnLaravelFeatureDisabledError()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: false);
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 9);

        AssertSingleError(await Invoke(controller, "Dashboard", CancellationToken.None),
            StatusCodes.Status403Forbidden,
            "FEATURE_DISABLED");
        AssertSingleError(await Invoke(controller, "Reports", null, null, CancellationToken.None),
            StatusCodes.Status403Forbidden,
            "FEATURE_DISABLED");
    }

    private static object CreateController(NexusDbContext db, TenantContext tenant, int userId)
    {
        var service = Activator.CreateInstance(Resolve(ServiceTypeName), db)!;
        var controller = Activator.CreateInstance(Resolve(ControllerTypeName), service, tenant)!;
        ((ControllerBase)controller).ControllerContext = ControllerContextFor(userId, tenant.GetTenantIdOrThrow());
        return controller;
    }

    private static async Task<IActionResult> Invoke(object controller, string method, params object?[] args)
    {
        controller.GetType().GetMethod(method).Should().NotBeNull();
        var result = controller.GetType().GetMethod(method)!.Invoke(controller, args);
        result.Should().BeAssignableTo<Task<IActionResult>>();
        return await (Task<IActionResult>)result!;
    }

    private static JsonElement ReadData(IActionResult result)
    {
        result.Should().BeOfType<OkObjectResult>();
        using var document = JsonSerializer.SerializeToDocument(((OkObjectResult)result).Value);
        return document.RootElement.GetProperty("data").Clone();
    }

    private static void AssertSingleError(IActionResult result, int statusCode, string code)
    {
        result.Should().BeOfType<ObjectResult>();
        var objectResult = (ObjectResult)result;
        objectResult.StatusCode.Should().Be(statusCode);
        using var document = JsonSerializer.SerializeToDocument(objectResult.Value);
        document.RootElement.GetProperty("errors")[0].GetProperty("code").GetString().Should().Be(code);
    }

    private static object Entity(string typeName, params (string Name, object? Value)[] values)
    {
        var type = Resolve(typeName);
        var entity = Activator.CreateInstance(type)!;
        foreach (var (name, value) in values)
        {
            type.GetProperty(name).Should().NotBeNull($"property {name} should exist on {typeName}");
            type.GetProperty(name)!.SetValue(entity, value);
        }

        return entity;
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

    private static void SeedUsers(NexusDbContext db)
    {
        db.Users.AddRange(
            User(42, 9, "admin@example.test", "Admin", "User", Role.Names.Admin),
            User(42, 10, "ada@example.test", "Ada", "Reporter"),
            User(42, 11, "grace@example.test", "Grace", "Subject"),
            User(42, 12, "linus@example.test", "Linus", "Assignee"),
            User(7, 70, "other@example.test", "Other", "Tenant"));
    }

    private static User User(int tenantId, int id, string email, string first, string last, string role = Role.Names.Member)
    {
        return new User
        {
            TenantId = tenantId,
            Id = id,
            Email = email,
            PasswordHash = "test",
            FirstName = first,
            LastName = last,
            Role = role,
            IsActive = true
        };
    }

    private static void SeedReport(
        NexusDbContext db,
        long id,
        int tenantId,
        int reporterId,
        int? subjectId,
        int? assigneeId,
        string category,
        string severity,
        string status,
        DateTime? dueAt,
        DateTime createdAt)
    {
        db.SafeguardingReports.Add(new SafeguardingReport
        {
            Id = id,
            TenantId = tenantId,
            ReporterUserId = reporterId,
            SubjectUserId = subjectId,
            AssignedToUserId = assigneeId,
            Category = category,
            Severity = severity,
            Description = "Safeguarding concern " + id,
            Status = status,
            ReviewDueAt = dueAt,
            CreatedAt = createdAt,
            UpdatedAt = createdAt.AddHours(1)
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

    private static Type Resolve(string name)
    {
        var type = Type.GetType(name, throwOnError: false);
        type.Should().NotBeNull($"{name} should exist for Laravel parity");
        return type!;
    }
}
