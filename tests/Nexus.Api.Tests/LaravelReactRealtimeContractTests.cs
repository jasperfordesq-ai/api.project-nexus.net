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
public sealed class LaravelReactRealtimeContractTests : IntegrationTestBase
{
    public LaravelReactRealtimeContractTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task RealtimeConfig_ReturnsLaravelReactPusherBootstrapShape()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/v2/realtime/config");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = await ReadDataAsync(response);
        data.GetProperty("driver").GetString().Should().Be("pusher");
        data.GetProperty("key").GetString().Should().NotBeNull();
        data.GetProperty("cluster").GetString().Should().NotBeNullOrWhiteSpace();
        data.GetProperty("authEndpoint").GetString().Should().Be("/api/pusher/auth");
        data.GetProperty("enabled").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task PusherAuth_RejectsMissingSocketOrChannelWithLaravelErrorEnvelope()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.PostAsJsonAsync("/api/pusher/auth", new { socket_id = "123.456" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("success").GetBoolean().Should().BeFalse();
        json.GetProperty("code").GetString().Should().Be("VALIDATION_ERROR");
    }

    [Fact]
    public async Task MessageTyping_AcceptsLaravelReactToUserPayload()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.PostAsJsonAsync("/api/v2/messages/typing", new
        {
            to_user_id = TestData.AdminUser.Id,
            is_typing = true
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var data = await ReadDataAsync(response);
        data.GetProperty("sent").GetBoolean().Should().BeTrue();
        data.GetProperty("recipient_id").GetInt32().Should().Be(TestData.AdminUser.Id);
        data.GetProperty("is_typing").GetBoolean().Should().BeTrue();
    }

    private static async Task<JsonElement> ReadDataAsync(HttpResponseMessage response)
    {
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        return json.GetProperty("data");
    }
}
