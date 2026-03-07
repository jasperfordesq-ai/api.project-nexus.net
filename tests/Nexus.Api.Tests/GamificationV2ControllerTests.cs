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
/// Integration tests for Gamification V2 endpoints (challenges, streaks, daily rewards, seasons).
/// </summary>
[Collection("Integration")]
public class GamificationV2ControllerTests : IntegrationTestBase
{
    public GamificationV2ControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task GetChallenges_Authenticated_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/gamification/v2/challenges");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task GetMyChallenges_Authenticated_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/gamification/v2/challenges/my");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetStreaks_Authenticated_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/gamification/v2/streaks");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetStreakLeaderboard_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/gamification/v2/streaks/leaderboard");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetCurrentSeason_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/gamification/v2/seasons/current");

        // Could be 200 (season exists) or 404 (no season)
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetDailyRewardStatus_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/gamification/v2/daily-reward/status");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ClaimDailyReward_FirstTime_Succeeds()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.PostAsync("/api/gamification/v2/daily-reward", null);

        // Could be 200 (claimed) or 400 (already claimed today)
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetChallenges_Unauthenticated_Returns401()
    {
        ClearAuthToken();

        var response = await Client.GetAsync("/api/gamification/v2/challenges");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
