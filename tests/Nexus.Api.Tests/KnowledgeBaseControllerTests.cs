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
public class KnowledgeBaseControllerTests : IntegrationTestBase
{
    public KnowledgeBaseControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task ListArticles_AsAuthenticated_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var response = await Client.GetAsync("/api/kb/articles");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task CreateArticle_AsAdmin_ReturnsCreated()
    {
        await AuthenticateAsAdminAsync();
        var response = await Client.PostAsJsonAsync("/api/admin/kb/articles", new
        {
            title = "Getting Started Guide",
            slug = "getting-started",
            content = "# Welcome\n\nThis is the getting started guide.",
            category = "Getting Started",
            tags = "intro,help,onboarding",
            is_published = true
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("title").GetString().Should().Be("Getting Started Guide");
    }

    [Fact]
    public async Task CreateArticle_AsMember_ReturnsForbidden()
    {
        await AuthenticateAsMemberAsync();
        var response = await Client.PostAsJsonAsync("/api/admin/kb/articles", new
        {
            title = "Unauthorized Article",
            slug = "unauthorized",
            content = "Should not be allowed"
        });

        response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetArticleBySlug_NonExistent_ReturnsNotFound()
    {
        await AuthenticateAsMemberAsync();
        var response = await Client.GetAsync("/api/kb/articles/by-slug/nonexistent-slug");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
