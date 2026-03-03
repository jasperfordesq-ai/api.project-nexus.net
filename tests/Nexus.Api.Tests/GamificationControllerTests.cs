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
/// Integration tests for the GamificationController.
/// Tests profile retrieval, badge listing, and leaderboard.
/// </summary>
[Collection("Integration")]
public class GamificationControllerTests : IntegrationTestBase
{
    public GamificationControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    #region GET /api/gamification/profile

    [Fact]
    public async Task GetProfile_Authenticated_ReturnsOwnProfile()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/gamification/profile");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        content.GetProperty("profile").GetProperty("id").GetInt32()
            .Should().Be(TestData.MemberUser.Id);
        content.GetProperty("profile").GetProperty("total_xp").GetInt32()
            .Should().Be(TestData.MemberUser.TotalXp);
        content.GetProperty("recent_xp").ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task GetProfile_Unauthenticated_ReturnsUnauthorized()
    {
        ClearAuthToken();

        var response = await Client.GetAsync("/api/gamification/profile");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region GET /api/gamification/profile/{userId}

    [Fact]
    public async Task GetUserProfile_ExistingUser_ReturnsProfile()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync($"/api/gamification/profile/{TestData.AdminUser.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        content.GetProperty("id").GetInt32().Should().Be(TestData.AdminUser.Id);
        content.GetProperty("total_xp").GetInt32().Should().Be(TestData.AdminUser.TotalXp);
    }

    [Fact]
    public async Task GetUserProfile_NonExistentUser_ReturnsNotFound()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/gamification/profile/999999");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region GET /api/gamification/badges

    [Fact]
    public async Task GetBadges_Authenticated_ReturnsBadgesWithSummary()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/gamification/badges");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
        content.GetProperty("summary").GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        content.GetProperty("summary").GetProperty("earned").GetInt32().Should().BeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task GetBadges_Unauthenticated_ReturnsUnauthorized()
    {
        ClearAuthToken();

        var response = await Client.GetAsync("/api/gamification/badges");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region GET /api/gamification/leaderboard

    [Fact]
    public async Task GetLeaderboard_Authenticated_ReturnsLeaderboard()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/gamification/leaderboard");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);

        // Leaderboard should be ordered by XP (highest first)
        var entries = content.GetProperty("data").EnumerateArray().ToList();
        if (entries.Count >= 2)
        {
            var first = entries[0].GetProperty("total_xp").GetInt32();
            var second = entries[1].GetProperty("total_xp").GetInt32();
            first.Should().BeGreaterThanOrEqualTo(second);
        }
    }

    [Fact]
    public async Task GetLeaderboard_Unauthenticated_ReturnsUnauthorized()
    {
        ClearAuthToken();

        var response = await Client.GetAsync("/api/gamification/leaderboard");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region GET /api/gamification/badges/my

    [Fact]
    public async Task GetMyBadges_Authenticated_ReturnsUserBadges()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/gamification/badges/my");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
        content.GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(0);
    }

    #endregion

    #region GET /api/gamification/xp-history

    [Fact]
    public async Task GetXpHistory_Authenticated_ReturnsHistory()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/gamification/xp-history");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
    }

    #endregion
}
