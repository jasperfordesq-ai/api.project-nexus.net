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

public sealed class CaringCommunityMemberReadControllerUnitTests
{
    private const string ControllerTypeName = "Nexus.Api.Controllers.CaringCommunityMemberController, Nexus.Api";

    [Fact]
    public void Actions_ExposeLaravelMemberReadRoutes()
    {
        var controller = Resolve(ControllerTypeName);

        controller.GetCustomAttribute<RouteAttribute>()?.Template
            .Should().Be("api/caring-community");

        controller.GetMethod("MyRelationships")
            ?.GetCustomAttribute<HttpGetAttribute>()?.Template
            .Should().Be("my-relationships");

        controller.GetMethod("SafeguardingMyReports")
            ?.GetCustomAttribute<HttpGetAttribute>()?.Template
            .Should().Be("safeguarding/my-reports");

        controller.GetMethod("PauseRelationship")
            ?.GetCustomAttribute<HttpPostAttribute>()?.Template
            .Should().Be("my-relationships/{id:int}/pause");

        controller.GetMethod("EndRelationship")
            ?.GetCustomAttribute<HttpPostAttribute>()?.Template
            .Should().Be("my-relationships/{id:int}/end");

        controller.GetMethod("ResumeRelationship")
            ?.GetCustomAttribute<HttpPostAttribute>()?.Template
            .Should().Be("my-relationships/{id:int}/resume");
    }

    [Fact]
    public async Task MyRelationships_ReturnsLaravelMemberRowsWithRecentLogs()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        db.Users.AddRange(
            User(10, 42, "Ada", "Supporter", "/avatars/ada.png"),
            User(11, 42, "Grace", "Recipient", "/avatars/grace.png"),
            User(12, 42, "Linus", "Helper", "/avatars/linus.png"),
            User(70, 7, "Other", "Tenant", "/avatars/other.png"));

        var now = DateTime.UtcNow;
        db.CaringSupportRelationships.AddRange(
            Relationship(201, 42, supporterId: 10, recipientId: 11, "Weekly shop", "Shopping and tea",
                "weekly", 2.5m, "active", new DateOnly(2026, 7, 1), now.AddDays(1), now.AddDays(-10)),
            Relationship(202, 42, supporterId: 12, recipientId: 10, "Call check-in", null,
                "fortnightly", 1.25m, "paused", new DateOnly(2026, 6, 1), now.AddDays(3), now.AddDays(-9)),
            Relationship(203, 42, supporterId: 10, recipientId: 11, "Completed", null,
                "monthly", 1m, "completed", new DateOnly(2026, 5, 1), now.AddDays(4), now.AddDays(-8)),
            Relationship(901, 7, supporterId: 10, recipientId: 70, "Other tenant", null,
                "weekly", 99m, "active", new DateOnly(2026, 5, 1), now.AddDays(-2), now.AddDays(-7)));
        db.VolunteerLogs.AddRange(
            Log(701, 42, 10, 201, 11, new DateOnly(2026, 7, 3), 1.5m, "approved"),
            Log(702, 42, 10, 201, 11, new DateOnly(2026, 7, 4), 2.0m, "pending"),
            Log(703, 42, 10, 201, 11, new DateOnly(2026, 7, 5), 2.25m, "approved"),
            Log(704, 42, 10, 201, 11, new DateOnly(2026, 7, 6), 3.0m, "approved"),
            Log(799, 7, 10, 201, 70, new DateOnly(2026, 7, 7), 9.0m, "approved"));
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 10);

        var data = ReadData(await Invoke(controller, "MyRelationships", CancellationToken.None));

        data.ValueKind.Should().Be(JsonValueKind.Array);
        data.GetArrayLength().Should().Be(2);

        data[0].GetProperty("id").GetInt32().Should().Be(201);
        data[0].GetProperty("role").GetString().Should().Be("supporter");
        data[0].GetProperty("partner").GetProperty("id").GetInt32().Should().Be(11);
        data[0].GetProperty("partner").GetProperty("name").GetString().Should().Be("Grace Recipient");
        data[0].GetProperty("partner").GetProperty("avatar_url").GetString().Should().Be("/avatars/grace.png");
        data[0].GetProperty("intergenerational").GetBoolean().Should().BeFalse();
        data[0].GetProperty("expected_hours").GetDecimal().Should().Be(2.5m);
        data[0].GetProperty("start_date").GetString().Should().Be("2026-07-01");

        var logs = data[0].GetProperty("recent_logs");
        logs.GetArrayLength().Should().Be(3);
        logs[0].GetProperty("date").GetString().Should().Be("2026-07-06");
        logs[0].GetProperty("hours").GetDecimal().Should().Be(3.0m);
        logs[0].GetProperty("status").GetString().Should().Be("approved");
        logs[2].GetProperty("date").GetString().Should().Be("2026-07-04");

        data[1].GetProperty("id").GetInt32().Should().Be(202);
        data[1].GetProperty("role").GetString().Should().Be("recipient");
        data[1].GetProperty("partner").GetProperty("id").GetInt32().Should().Be(12);
        data[1].GetProperty("partner").GetProperty("name").GetString().Should().Be("Linus Helper");
    }

    [Fact]
    public async Task SafeguardingMyReports_ReturnsReporterScopedPreviewRows()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        var longDescription = new string('x', 205);
        db.SafeguardingReports.AddRange(
            Report(301, 42, reporterId: 10, "neglect", "high", longDescription, "triaged",
                dueAt: new DateTime(2026, 7, 10, 9, 0, 0, DateTimeKind.Utc),
                createdAt: new DateTime(2026, 7, 4, 9, 0, 0, DateTimeKind.Utc),
                escalated: true),
            Report(302, 42, reporterId: 10, "other", "low", "Short report", "resolved",
                dueAt: null,
                createdAt: new DateTime(2026, 7, 3, 9, 0, 0, DateTimeKind.Utc),
                resolvedAt: new DateTime(2026, 7, 4, 10, 0, 0, DateTimeKind.Utc)),
            Report(303, 42, reporterId: 11, "other", "critical", "Other reporter", "submitted",
                dueAt: null,
                createdAt: new DateTime(2026, 7, 5, 9, 0, 0, DateTimeKind.Utc)),
            Report(901, 7, reporterId: 10, "other", "critical", "Other tenant", "submitted",
                dueAt: null,
                createdAt: new DateTime(2026, 7, 6, 9, 0, 0, DateTimeKind.Utc)));
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 10);

        var data = ReadData(await Invoke(controller, "SafeguardingMyReports", CancellationToken.None));

        var items = data.GetProperty("items");
        items.GetArrayLength().Should().Be(2);
        items[0].GetProperty("id").GetInt64().Should().Be(301);
        items[0].GetProperty("category").GetString().Should().Be("neglect");
        items[0].GetProperty("severity").GetString().Should().Be("high");
        items[0].GetProperty("description_preview").GetString().Should().HaveLength(201);
        items[0].GetProperty("description_preview").GetString().Should().EndWith("\u2026");
        items[0].GetProperty("status").GetString().Should().Be("triaged");
        items[0].GetProperty("review_due_at").GetString().Should().Be("2026-07-10 09:00:00");
        items[0].GetProperty("escalated").GetBoolean().Should().BeTrue();
        items[0].GetProperty("resolved_at").ValueKind.Should().Be(JsonValueKind.Null);

        items[1].GetProperty("id").GetInt64().Should().Be(302);
        items[1].GetProperty("description_preview").GetString().Should().Be("Short report");
        items[1].GetProperty("resolved_at").GetString().Should().Be("2026-07-04 10:00:00");
    }

    [Fact]
    public async Task MemberReads_WhenFeatureDisabled_ReturnLaravelForbiddenError()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: false);
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 10);

        AssertSingleError(await Invoke(controller, "MyRelationships", CancellationToken.None),
            StatusCodes.Status403Forbidden,
            "FEATURE_DISABLED");
        AssertSingleError(await Invoke(controller, "SafeguardingMyReports", CancellationToken.None),
            StatusCodes.Status403Forbidden,
            "FEATURE_DISABLED");
    }

    [Fact]
    public async Task RelationshipLifecycle_PauseEndAndResumeOwnedTenantScopedRelationships()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        db.Users.AddRange(
            User(10, 42, "Ada", "Supporter"),
            User(11, 42, "Grace", "Recipient"),
            User(12, 42, "Linus", "Other"));
        db.CaringSupportRelationships.AddRange(
            Relationship(401, 42, supporterId: 10, recipientId: 11, "Active", null,
                "weekly", 1m, "active", new DateOnly(2026, 7, 1), null, DateTime.UtcNow.AddDays(-3)),
            Relationship(402, 42, supporterId: 12, recipientId: 11, "Paused", null,
                "weekly", 1m, "paused", new DateOnly(2026, 7, 1), null, DateTime.UtcNow.AddDays(-2)),
            Relationship(901, 7, supporterId: 10, recipientId: 70, "Other tenant", null,
                "weekly", 1m, "active", new DateOnly(2026, 7, 1), null, DateTime.UtcNow.AddDays(-1)));
        await db.SaveChangesAsync();
        var supporterController = CreateController(db, tenant, userId: 10);
        var recipientController = CreateController(db, tenant, userId: 11);

        var paused = ReadData(await Invoke(
            supporterController,
            "PauseRelationship",
            401,
            new Dictionary<string, object?> { ["reason"] = "Holiday", ["resume_at"] = "2026-08-01" },
            CancellationToken.None));

        paused.GetProperty("success").GetBoolean().Should().BeTrue();
        paused.GetProperty("status").GetString().Should().Be("paused");
        (await db.CaringSupportRelationships.IgnoreQueryFilters().SingleAsync(row => row.Id == 401))
            .Status.Should().Be("paused");

        var resumed = ReadData(await Invoke(recipientController, "ResumeRelationship", 401, null, CancellationToken.None));

        resumed.GetProperty("success").GetBoolean().Should().BeTrue();
        resumed.GetProperty("status").GetString().Should().Be("active");
        (await db.CaringSupportRelationships.IgnoreQueryFilters().SingleAsync(row => row.Id == 401))
            .Status.Should().Be("active");

        var ended = ReadData(await Invoke(
            recipientController,
            "EndRelationship",
            402,
            new Dictionary<string, object?> { ["reason"] = "Support completed" },
            CancellationToken.None));

        ended.GetProperty("success").GetBoolean().Should().BeTrue();
        ended.GetProperty("status").GetString().Should().Be("cancelled");
        var cancelled = await db.CaringSupportRelationships.IgnoreQueryFilters().SingleAsync(row => row.Id == 402);
        cancelled.Status.Should().Be("cancelled");
        cancelled.EndDate.Should().Be(DateOnly.FromDateTime(DateTime.UtcNow));
    }

    [Fact]
    public async Task RelationshipLifecycle_RejectsInvalidStateInvalidDateAndUnownedRows()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        db.Users.AddRange(
            User(10, 42, "Ada", "Supporter"),
            User(11, 42, "Grace", "Recipient"),
            User(12, 42, "Linus", "Other"));
        db.CaringSupportRelationships.AddRange(
            Relationship(501, 42, supporterId: 10, recipientId: 11, "Active", null,
                "weekly", 1m, "active", new DateOnly(2026, 7, 1), null, DateTime.UtcNow.AddDays(-3)),
            Relationship(502, 42, supporterId: 10, recipientId: 11, "Completed", null,
                "weekly", 1m, "completed", new DateOnly(2026, 7, 1), null, DateTime.UtcNow.AddDays(-2)),
            Relationship(503, 42, supporterId: 12, recipientId: 11, "Unowned", null,
                "weekly", 1m, "active", new DateOnly(2026, 7, 1), null, DateTime.UtcNow.AddDays(-1)));
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 10);

        AssertSingleError(
            await Invoke(
                controller,
                "PauseRelationship",
                501,
                new Dictionary<string, object?> { ["resume_at"] = "not-a-date" },
                CancellationToken.None),
            StatusCodes.Status422UnprocessableEntity,
            "VALIDATION_ERROR");

        AssertSingleError(
            await Invoke(controller, "PauseRelationship", 502, null, CancellationToken.None),
            StatusCodes.Status422UnprocessableEntity,
            "INVALID_STATE");

        AssertSingleError(
            await Invoke(controller, "ResumeRelationship", 501, null, CancellationToken.None),
            StatusCodes.Status422UnprocessableEntity,
            "INVALID_STATE");

        AssertSingleError(
            await Invoke(controller, "EndRelationship", 503, null, CancellationToken.None),
            StatusCodes.Status404NotFound,
            "NOT_FOUND");
    }

    private static object CreateController(NexusDbContext db, TenantContext tenant, int userId)
    {
        var relationships = new CaringSupportRelationshipService(db);
        var safeguarding = new CaringSafeguardingService(db);
        var controller = (ControllerBase)Activator.CreateInstance(
            Resolve(ControllerTypeName),
            relationships,
            safeguarding,
            tenant)!;
        controller.ControllerContext = ControllerContextFor(userId, tenant.GetTenantIdOrThrow());
        return controller;
    }

    private static async Task<IActionResult> Invoke(object controller, string method, params object?[] args)
    {
        var info = controller.GetType().GetMethod(method);
        info.Should().NotBeNull();
        args = CoerceArgs(info!, args);
        var result = info!.Invoke(controller, args);
        result.Should().BeAssignableTo<Task<IActionResult>>();
        return await (Task<IActionResult>)result!;
    }

    private static object?[] CoerceArgs(MethodInfo info, object?[] args)
    {
        var parameters = info.GetParameters();
        var coerced = new object?[parameters.Length];
        for (var index = 0; index < parameters.Length; index++)
        {
            var value = args[index];
            var parameterType = parameters[index].ParameterType;
            if (value is Dictionary<string, object?> dictionary
                && parameterType != typeof(Dictionary<string, object?>))
            {
                var body = Activator.CreateInstance(parameterType)!;
                foreach (var (key, raw) in dictionary)
                {
                    var property = parameterType.GetProperties()
                        .FirstOrDefault(item =>
                            string.Equals(item.Name, key, StringComparison.OrdinalIgnoreCase)
                            || string.Equals(ToSnakeCase(item.Name), key, StringComparison.OrdinalIgnoreCase));
                    property?.SetValue(body, raw);
                }

                coerced[index] = body;
            }
            else
            {
                coerced[index] = value;
            }
        }

        return coerced;
    }

    private static string ToSnakeCase(string value)
    {
        return string.Concat(value.Select((character, index) =>
            index > 0 && char.IsUpper(character)
                ? "_" + char.ToLowerInvariant(character)
                : char.ToLowerInvariant(character).ToString()));
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

    private static CaringSupportRelationship Relationship(
        int id,
        int tenantId,
        int supporterId,
        int recipientId,
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
            Title = title,
            Description = description,
            Frequency = frequency,
            ExpectedHours = expectedHours,
            Status = status,
            StartDate = startDate,
            NextCheckInAt = nextCheckInAt,
            CreatedAt = createdAt,
            UpdatedAt = createdAt.AddHours(1)
        };
    }

    private static VolunteerLog Log(
        int id,
        int tenantId,
        int userId,
        int relationshipId,
        int recipientId,
        DateOnly date,
        decimal hours,
        string status)
    {
        return new VolunteerLog
        {
            Id = id,
            TenantId = tenantId,
            UserId = userId,
            CaringSupportRelationshipId = relationshipId,
            SupportRecipientId = recipientId,
            DateLogged = date,
            Hours = hours,
            Status = status,
            CreatedAt = date.ToDateTime(TimeOnly.FromTimeSpan(TimeSpan.FromHours(12)))
        };
    }

    private static SafeguardingReport Report(
        long id,
        int tenantId,
        int reporterId,
        string category,
        string severity,
        string description,
        string status,
        DateTime? dueAt,
        DateTime createdAt,
        bool escalated = false,
        DateTime? resolvedAt = null)
    {
        return new SafeguardingReport
        {
            Id = id,
            TenantId = tenantId,
            ReporterUserId = reporterId,
            Category = category,
            Severity = severity,
            Description = description,
            Status = status,
            ReviewDueAt = dueAt,
            Escalated = escalated,
            ResolvedAt = resolvedAt,
            CreatedAt = createdAt,
            UpdatedAt = createdAt.AddHours(1)
        };
    }

    private static User User(int id, int tenantId, string firstName, string lastName, string? avatarUrl = null)
    {
        return new User
        {
            Id = id,
            TenantId = tenantId,
            Email = $"user{id}@example.test",
            PasswordHash = "hash",
            FirstName = firstName,
            LastName = lastName,
            Role = Role.Names.Member,
            AvatarUrl = avatarUrl,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
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
                        new Claim(ClaimTypes.Role, Role.Names.Member),
                        new Claim("role", Role.Names.Member)
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
