// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class AdminBlogControllerTests : IntegrationTestBase
{
    public AdminBlogControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task CreateBlogPost_WithoutAuth_ReturnsUnauthorized()
    {
        ClearAuthToken();
        var r = await Client.PostAsJsonAsync("/api/admin/blog", new { title = "Test", content = "Test" });
        r.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateBlogPost_AsMember_ReturnsForbidden()
    {
        await AuthenticateAsMemberAsync();
        var r = await Client.PostAsJsonAsync("/api/admin/blog", new { title = "Test", content = "Test" });
        r.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateBlogPost_AsAdmin_ReturnsOkOrCreated()
    {
        await AuthenticateAsAdminAsync();
        var r = await Client.PostAsJsonAsync("/api/admin/blog", new
        {
            title = "Test Blog Post",
            content = "This is test content",
            slug = "test-blog-post",
            excerpt = "Test excerpt"
        });
        r.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);
    }

    [Fact]
    public async Task UpdateBlogPost_NonExistent_ReturnsNotFound()
    {
        await AuthenticateAsAdminAsync();
        var r = await Client.PutAsJsonAsync("/api/admin/blog/99999", new { title = "Updated" });
        r.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteBlogPost_NonExistent_ReturnsNotFound()
    {
        await AuthenticateAsAdminAsync();
        var r = await Client.DeleteAsync("/api/admin/blog/99999");
        r.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ToggleStatus_NonExistent_ReturnsNotFound()
    {
        await AuthenticateAsAdminAsync();
        var r = await Client.PostAsync("/api/admin/blog/99999/toggle-status", null);
        r.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateBlogCategory_AsAdmin_ReturnsOkOrCreated()
    {
        await AuthenticateAsAdminAsync();
        var r = await Client.PostAsJsonAsync("/api/admin/blog/categories", new
        {
            name = "Test Category",
            slug = "test-category"
        });
        r.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);
    }

    [Fact]
    public async Task DeleteBlogCategory_NonExistent_ReturnsNotFound()
    {
        await AuthenticateAsAdminAsync();
        var r = await Client.DeleteAsync("/api/admin/blog/categories/99999");
        r.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
