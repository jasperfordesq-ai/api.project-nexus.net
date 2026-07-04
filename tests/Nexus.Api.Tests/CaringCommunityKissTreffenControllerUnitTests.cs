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

public sealed class CaringCommunityKissTreffenControllerUnitTests
{
    private const string ControllerTypeName = "Nexus.Api.Controllers.CaringCommunityKissTreffenController, Nexus.Api";
    private const string ServiceTypeName = "Nexus.Api.Services.KissTreffenService, Nexus.Api";
    private const string EntityTypeName = "Nexus.Api.Entities.CaringKissTreffen, Nexus.Api";

    [Fact]
    public void Actions_ExposeLaravelKissTreffenReadRoutes()
    {
        var controller = Resolve(ControllerTypeName);

        controller.GetCustomAttribute<RouteAttribute>()?.Template
            .Should().Be("api/caring-community/kiss-treffen");
        controller.GetMethod("Index")
            ?.GetCustomAttribute<HttpGetAttribute>()?.Template.Should().BeNull();
        controller.GetMethod("Show")
            ?.GetCustomAttribute<HttpGetAttribute>()?.Template.Should().Be("{eventId}");
    }

    [Fact]
    public async Task Index_ReturnsTenantKissTreffenOrderedByEventStartWithQuorum()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        SeedUsers(db);
        SeedEvents(db);
        db.AddRange(
            Treffen(42, id: 100, eventId: 10, type: "monthly_stamm", quorumRequired: 2, membersOnly: true),
            Treffen(42, id: 101, eventId: 11, type: "governance_circle", quorumRequired: null, membersOnly: false),
            Treffen(42, id: 102, eventId: 12, type: "other", quorumRequired: 1, membersOnly: true),
            Treffen(7, id: 900, eventId: 70, type: "monthly_stamm", quorumRequired: 1, membersOnly: true));
        db.EventRsvps.AddRange(
            Rsvp(42, 10, 20, "going"),
            Rsvp(42, 10, 21, "attended"),
            Rsvp(42, 10, 22, "maybe"),
            Rsvp(42, 11, 20, "going"),
            Rsvp(7, 70, 70, "going"));
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 20);

        var result = await Invoke(controller, "Index", 10, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        var items = document.RootElement.GetProperty("data").GetProperty("items").EnumerateArray().ToArray();
        items.Select(row => row.GetProperty("event_id").GetInt32()).Should().Equal(11, 10);
        items.Should().HaveCount(2);
        items[0].GetProperty("treffen_type").GetString().Should().Be("governance_circle");
        items[0].GetProperty("members_only").GetBoolean().Should().BeFalse();
        items[0].GetProperty("event").GetProperty("status").GetString().Should().Be("active");
        items[0].GetProperty("event").GetProperty("organizer_name").GetString().Should().Be("Ada Organizer");
        items[1].GetProperty("quorum").GetProperty("required").GetInt32().Should().Be(2);
        items[1].GetProperty("quorum").GetProperty("current").GetInt32().Should().Be(2);
        items[1].GetProperty("quorum").GetProperty("met").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task Show_ReturnsTenantEventRecordOrLaravelNotFoundError()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        SeedUsers(db);
        SeedEvents(db);
        db.Add(Treffen(42, id: 100, eventId: 10, type: "monthly_stamm", quorumRequired: 3, membersOnly: true));
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 20);

        var result = await Invoke(controller, "Show", 10, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        var data = document.RootElement.GetProperty("data");
        data.GetProperty("id").GetInt64().Should().Be(100);
        data.GetProperty("event").GetProperty("title").GetString().Should().Be("Monthly KISS circle");

        var missing = await Invoke(controller, "Show", 999, CancellationToken.None);
        var notFound = missing.Should().BeOfType<ObjectResult>().Subject;
        notFound.StatusCode.Should().Be(StatusCodes.Status404NotFound);
        using var error = JsonDocument.Parse(JsonSerializer.Serialize(notFound.Value));
        error.RootElement.GetProperty("errors")[0].GetProperty("code").GetString().Should().Be("NOT_FOUND");
    }

    [Fact]
    public async Task Index_WhenFeatureDisabled_ReturnsLaravelFeatureDisabledError()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: false);
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 20);

        var result = await Invoke(controller, "Index", 20, CancellationToken.None);

        var forbidden = result.Should().BeOfType<ObjectResult>().Subject;
        forbidden.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(forbidden.Value));
        document.RootElement.GetProperty("errors")[0].GetProperty("code").GetString()
            .Should().Be("FEATURE_DISABLED");
    }

    private static object Treffen(
        int tenantId,
        long id,
        int eventId,
        string type,
        int? quorumRequired,
        bool membersOnly)
    {
        var row = Activator.CreateInstance(Resolve(EntityTypeName))!;
        Set(row, "Id", id);
        Set(row, "TenantId", tenantId);
        Set(row, "EventId", eventId);
        Set(row, "TreffenType", type);
        Set(row, "MembersOnly", membersOnly);
        Set(row, "QuorumRequired", quorumRequired);
        Set(row, "FondationHeader", "KISS Schweiz");
        Set(row, "MinutesDocumentUrl", "https://cdn.example.test/minutes.pdf");
        Set(row, "CreatedAt", new DateTime(2026, 7, 1, 9, 0, 0, DateTimeKind.Utc));
        Set(row, "UpdatedAt", new DateTime(2026, 7, 1, 9, 0, 0, DateTimeKind.Utc));
        return row;
    }

    private static void SeedEvents(NexusDbContext db)
    {
        db.Events.AddRange(
            Event(42, 10, "Monthly KISS circle", startsAt: new DateTime(2026, 7, 20, 9, 0, 0, DateTimeKind.Utc), isCancelled: false),
            Event(42, 11, "Governance circle", startsAt: new DateTime(2026, 7, 10, 9, 0, 0, DateTimeKind.Utc), isCancelled: false),
            Event(42, 12, "Cancelled circle", startsAt: new DateTime(2026, 7, 1, 9, 0, 0, DateTimeKind.Utc), isCancelled: true),
            Event(7, 70, "Other tenant circle", startsAt: new DateTime(2026, 7, 5, 9, 0, 0, DateTimeKind.Utc), isCancelled: false));
    }

    private static Event Event(int tenantId, int id, string title, DateTime startsAt, bool isCancelled)
    {
        return new Event
        {
            Id = id,
            TenantId = tenantId,
            CreatedById = 10,
            Title = title,
            Description = $"{title} description",
            Location = "Basel",
            StartsAt = startsAt,
            EndsAt = startsAt.AddHours(2),
            IsCancelled = isCancelled,
            CreatedAt = startsAt.AddDays(-10)
        };
    }

    private static EventRsvp Rsvp(int tenantId, int eventId, int userId, string status)
    {
        return new EventRsvp
        {
            TenantId = tenantId,
            EventId = eventId,
            UserId = userId,
            Status = status,
            RespondedAt = new DateTime(2026, 7, 1, 9, 0, 0, DateTimeKind.Utc)
        };
    }

    private static void SeedUsers(NexusDbContext db)
    {
        db.Users.AddRange(
            User(42, 10, "organizer@example.test", "Ada", "Organizer"),
            User(42, 20, "member@example.test", "Max", "Member"),
            User(42, 21, "attended@example.test", "Attended", "Member"),
            User(42, 22, "maybe@example.test", "Maybe", "Member"),
            User(7, 70, "other@example.test", "Other", "Tenant"));
    }

    private static User User(int tenantId, int id, string email, string firstName, string lastName)
    {
        return new User
        {
            Id = id,
            TenantId = tenantId,
            Email = email,
            PasswordHash = "test",
            FirstName = firstName,
            LastName = lastName,
            Role = "member",
            IsActive = true
        };
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

    private static ControllerBase CreateController(NexusDbContext db, TenantContext tenant, int userId)
    {
        var service = Activator.CreateInstance(Resolve(ServiceTypeName), db, tenant);
        var controller = Activator.CreateInstance(Resolve(ControllerTypeName), service, tenant)
            .Should().BeAssignableTo<ControllerBase>().Subject;
        controller.ControllerContext = ControllerContextFor(userId, tenant.GetTenantIdOrThrow());
        return controller;
    }

    private static async Task<IActionResult> Invoke(object controller, string actionName, params object?[] args)
    {
        var method = controller.GetType().GetMethod(actionName);
        method.Should().NotBeNull();
        var result = method!.Invoke(controller, args);
        return await result.Should().BeAssignableTo<Task<IActionResult>>().Subject;
    }

    private static Type Resolve(string typeName)
    {
        var type = Type.GetType(typeName);
        type.Should().NotBeNull();
        return type!;
    }

    private static void Set(object target, string propertyName, object? value)
    {
        var property = target.GetType().GetProperty(propertyName);
        property.Should().NotBeNull();
        property!.SetValue(target, value);
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
                [
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                    new Claim("tenant_id", tenantId.ToString()),
                    new Claim(ClaimTypes.Role, "member"),
                    new Claim("role", "member")
                ], "Test"))
            }
        };
    }
}
