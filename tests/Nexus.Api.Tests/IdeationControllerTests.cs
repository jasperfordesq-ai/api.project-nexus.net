// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;
using Xunit;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class IdeationControllerTests : IntegrationTestBase
{
    public IdeationControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task ListIdeas_AsAuthenticated_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var response = await Client.GetAsync("/api/ideas");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task CreateIdea_ReturnsCreated()
    {
        await AuthenticateAsMemberAsync();
        var response = await Client.PostAsJsonAsync("/api/ideas", new
        {
            title = "Community garden project",
            content = "We should start a shared community garden for exchanging produce",
            category = "community"
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("id").GetInt32().Should().BeGreaterThan(0);
        content.GetProperty("status").GetString().Should().Be("submitted");
    }

    [Fact]
    public async Task VoteIdea_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var createResp = await Client.PostAsJsonAsync("/api/ideas", new
        {
            title = "Vote test idea",
            content = "Testing voting"
        });
        var idea = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var ideaId = idea.GetProperty("id").GetInt32();

        // Vote as admin (different user)
        await AuthenticateAsAdminAsync();
        var response = await Client.PostAsync($"/api/ideas/{ideaId}/vote", null);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task VoteTwice_ReturnsBadRequest()
    {
        await AuthenticateAsMemberAsync();
        var createResp = await Client.PostAsJsonAsync("/api/ideas", new
        {
            title = "Double vote test",
            content = "Testing duplicate vote prevention"
        });
        var idea = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var ideaId = idea.GetProperty("id").GetInt32();

        await AuthenticateAsAdminAsync();
        await Client.PostAsync($"/api/ideas/{ideaId}/vote", null);
        var second = await Client.PostAsync($"/api/ideas/{ideaId}/vote", null);
        second.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CommentOnIdea_ReturnsCreated()
    {
        await AuthenticateAsMemberAsync();
        var createResp = await Client.PostAsJsonAsync("/api/ideas", new
        {
            title = "Comment test idea",
            content = "Testing comments"
        });
        var idea = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var ideaId = idea.GetProperty("id").GetInt32();

        var response = await Client.PostAsJsonAsync($"/api/ideas/{ideaId}/comments", new
        {
            content = "Great idea, I fully support this!"
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task ListChallenges_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var response = await Client.GetAsync("/api/challenges");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Ideas_Unauthenticated_ReturnsUnauthorized()
    {
        var response = await Client.GetAsync("/api/ideas");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
