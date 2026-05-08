// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
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
        content.GetProperty("necessary_cookies").GetBoolean().Should().BeTrue();
    }
}
