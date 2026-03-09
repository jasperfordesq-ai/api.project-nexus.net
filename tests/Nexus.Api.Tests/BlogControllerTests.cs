// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Net;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class BlogControllerTests : IntegrationTestBase
{
    public BlogControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task GetBlogPosts_WithoutAuth_ReturnsUnauthorized()
    {
        ClearAuthToken();
        var r = await Client.GetAsync("/api/blog");
        r.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetBlogPosts_AsMember_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.GetAsync("/api/blog");
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetBlogPosts_WithPagination_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.GetAsync("/api/blog?page=1&limit=5");
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetBlogCategories_AsMember_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.GetAsync("/api/blog/categories");
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetBlogPostBySlug_NonExistent_ReturnsNotFound()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.GetAsync("/api/blog/non-existent-slug-xyz");
        r.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetBlogPosts_WithCategoryFilter_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.GetAsync("/api/blog?category_id=1");
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetBlogPosts_WithTagFilter_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.GetAsync("/api/blog?tag=test");
        r.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
