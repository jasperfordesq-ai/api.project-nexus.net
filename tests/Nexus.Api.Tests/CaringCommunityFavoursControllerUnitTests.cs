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

public class CaringCommunityFavoursControllerUnitTests
{
    [Fact]
    public void Actions_ExposeLaravelAdminFavoursRoute()
    {
        typeof(AdminCaringCommunityFavoursController)
            .GetCustomAttribute<RouteAttribute>()?.Template
            .Should().Be("api/admin/caring-community/favours");

        typeof(AdminCaringCommunityFavoursController)
            .GetMethod(nameof(AdminCaringCommunityFavoursController.Index))
            ?.GetCustomAttribute<HttpGetAttribute>()?.Template.Should().BeNull();
    }

    [Fact]
    public async Task Index_ReturnsTenantFavoursOrderedByCreatedAtWithAnonymousOfferersHidden()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        SeedUsers(db);

        db.CaringFavours.AddRange(
            new CaringFavour
            {
                TenantId = 42,
                OfferedByUserId = 10,
                Category = "shopping",
                Description = "Picked up groceries",
                FavourDate = new DateOnly(2026, 7, 1),
                IsAnonymous = false,
                CreatedAt = new DateTime(2026, 7, 3, 12, 0, 0, DateTimeKind.Utc)
            },
            new CaringFavour
            {
                TenantId = 42,
                OfferedByUserId = 11,
                Category = null,
                Description = "Quiet check-in",
                FavourDate = new DateOnly(2026, 7, 2),
                IsAnonymous = true,
                CreatedAt = new DateTime(2026, 7, 3, 13, 0, 0, DateTimeKind.Utc)
            },
            new CaringFavour
            {
                TenantId = 7,
                OfferedByUserId = 70,
                Category = "meals",
                Description = "Other tenant",
                FavourDate = new DateOnly(2026, 7, 2),
                IsAnonymous = false,
                CreatedAt = new DateTime(2026, 7, 3, 14, 0, 0, DateTimeKind.Utc)
            });
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 9001);

        var result = await controller.Index(CancellationToken.None);

        var data = ReadData(result);
        data.GetProperty("count").GetInt32().Should().Be(2);
        var items = data.GetProperty("items").EnumerateArray().ToArray();
        items.Should().HaveCount(2);

        items[0].GetProperty("description").GetString().Should().Be("Quiet check-in");
        items[0].GetProperty("category").ValueKind.Should().Be(JsonValueKind.Null);
        items[0].GetProperty("is_anonymous").GetBoolean().Should().BeTrue();
        items[0].GetProperty("offerer_name").ValueKind.Should().Be(JsonValueKind.Null);

        items[1].GetProperty("description").GetString().Should().Be("Picked up groceries");
        items[1].GetProperty("category").GetString().Should().Be("shopping");
        items[1].GetProperty("favour_date").GetString().Should().Be("2026-07-01");
        items[1].GetProperty("offerer_name").GetString().Should().Be("Ada Lovelace");
        items[1].GetProperty("created_at").GetString().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Index_LimitsItemsToLatestFiftyButCountIncludesAllTenantRows()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        db.Users.Add(new User
        {
            Id = 10,
            TenantId = 42,
            FirstName = "Ada",
            LastName = "Lovelace",
            Email = "ada@example.test",
            PasswordHash = "x",
            Role = Role.Names.Member
        });

        for (var i = 0; i < 55; i++)
        {
            db.CaringFavours.Add(new CaringFavour
            {
                TenantId = 42,
                OfferedByUserId = 10,
                Description = $"Favour {i:00}",
                FavourDate = new DateOnly(2026, 7, 1),
                CreatedAt = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc).AddMinutes(i)
            });
        }
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 9001);

        var result = await controller.Index(CancellationToken.None);

        var data = ReadData(result);
        data.GetProperty("count").GetInt32().Should().Be(55);
        var items = data.GetProperty("items").EnumerateArray().ToArray();
        items.Should().HaveCount(50);
        items[0].GetProperty("description").GetString().Should().Be("Favour 54");
        items[^1].GetProperty("description").GetString().Should().Be("Favour 05");
    }

    [Fact]
    public async Task Index_WhenFeatureDisabled_ReturnsLaravelFeatureDisabledError()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: false);
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 9001);

        var result = await controller.Index(CancellationToken.None);

        AssertSingleError(result, StatusCodes.Status403Forbidden, "FEATURE_DISABLED", null);
    }

    private static JsonElement ReadData(IActionResult result)
    {
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        return document.RootElement.GetProperty("data").Clone();
    }

    private static void AssertSingleError(IActionResult result, int statusCode, string code, string? field)
    {
        var objectResult = result.Should().BeAssignableTo<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(statusCode);
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(objectResult.Value));
        var error = document.RootElement.GetProperty("errors")[0];
        error.GetProperty("code").GetString().Should().Be(code);
        if (field is not null)
        {
            error.GetProperty("field").GetString().Should().Be(field);
        }
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
            new User
            {
                Id = 10,
                TenantId = 42,
                FirstName = "Ada",
                LastName = "Lovelace",
                Email = "ada@example.test",
                PasswordHash = "x",
                Role = Role.Names.Member
            },
            new User
            {
                Id = 11,
                TenantId = 42,
                FirstName = "Grace",
                LastName = "Hopper",
                Email = "grace@example.test",
                PasswordHash = "x",
                Role = Role.Names.Member
            },
            new User
            {
                Id = 70,
                TenantId = 7,
                FirstName = "Other",
                LastName = "User",
                Email = "other@example.test",
                PasswordHash = "x",
                Role = Role.Names.Member
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

    private static AdminCaringCommunityFavoursController CreateController(
        NexusDbContext db,
        TenantContext tenant,
        int userId)
    {
        var service = new CaringFavourService(db);
        return new AdminCaringCommunityFavoursController(service, tenant)
        {
            ControllerContext = ControllerContextFor(userId, tenant.GetTenantIdOrThrow())
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
