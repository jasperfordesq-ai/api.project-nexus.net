// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

/// <summary>
/// Integration tests for public compatibility endpoints used by the React frontend at first page load.
/// </summary>
[Collection("Integration")]
public class PublicCompatibilityEndpointsTests : IntegrationTestBase
{
    public PublicCompatibilityEndpointsTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task TenantBootstrap_WithoutTenantHeader_ReturnsDefaultTenant()
    {
        ClearAuthToken();

        var response = await Client.GetAsync("/api/tenant/bootstrap");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("id").GetInt32().Should().BeGreaterThan(0);
        content.GetProperty("features").GetProperty("explore").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task TenantBootstrap_ExploreFeatureHonorsTenantOverride()
    {
        TenantConfig? existing;
        string? originalValue;

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            existing = await db.TenantConfigs.IgnoreQueryFilters().FirstOrDefaultAsync(config =>
                config.TenantId == TestData.Tenant1.Id && config.Key == "feature.explore");
            originalValue = existing?.Value;

            if (existing is null)
            {
                db.TenantConfigs.Add(new TenantConfig
                {
                    TenantId = TestData.Tenant1.Id,
                    Key = "feature.explore",
                    Value = "false"
                });
            }
            else
            {
                existing.Value = "false";
                existing.UpdatedAt = DateTime.UtcNow;
            }

            await db.SaveChangesAsync();
        }

        try
        {
            ClearAuthToken();
            var response = await Client.GetAsync("/api/tenant/bootstrap?slug=test-tenant");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadFromJsonAsync<JsonElement>();
            content.GetProperty("features").GetProperty("explore").GetBoolean().Should().BeFalse();
        }
        finally
        {
            using var scope = Factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var stored = await db.TenantConfigs.IgnoreQueryFilters().SingleAsync(config =>
                config.TenantId == TestData.Tenant1.Id && config.Key == "feature.explore");
            if (existing is null)
            {
                db.TenantConfigs.Remove(stored);
            }
            else
            {
                stored.Value = originalValue!;
                stored.UpdatedAt = DateTime.UtcNow;
            }

            await db.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task LaravelReactV2TenantAndRegistrationDiscovery_ReturnPublicShapes()
    {
        ClearAuthToken();

        var tenantsResponse = await Client.GetAsync("/api/v2/tenants?include_master=1");
        tenantsResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var tenants = await tenantsResponse.Content.ReadFromJsonAsync<JsonElement>();
        tenants.ValueKind.Should().Be(JsonValueKind.Array);
        tenants.EnumerateArray().Should().Contain(t => t.GetProperty("slug").GetString() == "test-tenant");

        var registrationInfoResponse = await Client.GetAsync("/api/v2/auth/registration-info");
        registrationInfoResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var registrationInfo = await registrationInfoResponse.Content.ReadFromJsonAsync<JsonElement>();
        registrationInfo.GetProperty("data").TryGetProperty("registration_mode", out _).Should().BeTrue();

        var inviteResponse = await Client.PostAsJsonAsync("/api/v2/auth/validate-invite", new { code = "not-a-real-code" });
        inviteResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var invite = await inviteResponse.Content.ReadFromJsonAsync<JsonElement>();
        invite.TryGetProperty("valid", out _).Should().BeTrue();
    }

    [Fact]
    public async Task PlatformStats_WithoutTenantHeader_ReturnsFrontendStatsShape()
    {
        ClearAuthToken();

        var response = await Client.GetAsync("/api/platform/stats");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        var stats = content.GetProperty("data");

        stats.TryGetProperty("members", out _).Should().BeTrue();
        stats.TryGetProperty("hours_exchanged", out _).Should().BeTrue();
        stats.TryGetProperty("listings", out _).Should().BeTrue();
        stats.TryGetProperty("skills", out _).Should().BeTrue();
        stats.TryGetProperty("communities", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Menus_WithoutTenantHeader_ReturnsDefaultMenuContract()
    {
        ClearAuthToken();

        var response = await Client.GetAsync("/api/menus");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        var menus = content.GetProperty("data");

        menus.TryGetProperty("header-main", out var headerMain).Should().BeTrue();
        headerMain.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task CookieConsentStatus_WithoutTenantHeader_ReturnsOk()
    {
        ClearAuthToken();

        var response = await Client.GetAsync("/api/cookie-consent");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.TryGetProperty("consented", out var consented).Should().BeTrue();
        consented.GetBoolean().Should().BeFalse();
    }
}
