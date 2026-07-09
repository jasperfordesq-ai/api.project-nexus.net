// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public sealed class LaravelReactAdsCompatibilityTests : IntegrationTestBase
{
    public LaravelReactAdsCompatibilityTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task FeedAdTrackingV2_UsesLaravelReactImpressionAndClickEnvelope()
    {
        await AuthenticateAsMemberAsync();

        var impression = await Client.PostAsJsonAsync("/api/v2/ads/impression", new
        {
            creative_id = 10,
            placement = "feed"
        });

        impression.StatusCode.Should().Be(HttpStatusCode.OK);
        var impressionJson = await impression.Content.ReadFromJsonAsync<JsonElement>();
        var impressionId = impressionJson
            .GetProperty("data")
            .GetProperty("impression_id")
            .GetInt32();

        impressionId.Should().BeGreaterThan(0);

        var click = await Client.PostAsync($"/api/v2/ads/impression/{impressionId}/click", null);

        click.StatusCode.Should().Be(HttpStatusCode.OK);
        var clickJson = await click.Content.ReadFromJsonAsync<JsonElement>();
        clickJson.GetProperty("data").GetProperty("ok").GetBoolean().Should().BeTrue();
    }
}
