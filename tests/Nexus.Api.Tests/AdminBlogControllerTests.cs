// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
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

    [Fact]
    public async Task BulkActions_V2_ReturnLaravelReactBulkResultsAndPersistTenantScopedChanges()
    {
        int draftOneId;
        int draftTwoId;
        int publishedId;

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var now = DateTime.UtcNow;

            var draftOne = new BlogPost
            {
                TenantId = TestData.Tenant1.Id,
                AuthorId = TestData.AdminUser.Id,
                Title = "Bulk draft one",
                Slug = $"bulk-draft-one-{Guid.NewGuid():N}",
                Content = "Draft one",
                Status = "draft",
                CreatedAt = now.AddMinutes(-3)
            };

            var draftTwo = new BlogPost
            {
                TenantId = TestData.Tenant1.Id,
                AuthorId = TestData.AdminUser.Id,
                Title = "Bulk draft two",
                Slug = $"bulk-draft-two-{Guid.NewGuid():N}",
                Content = "Draft two",
                Status = "draft",
                CreatedAt = now.AddMinutes(-2)
            };

            var published = new BlogPost
            {
                TenantId = TestData.Tenant1.Id,
                AuthorId = TestData.AdminUser.Id,
                Title = "Bulk published",
                Slug = $"bulk-published-{Guid.NewGuid():N}",
                Content = "Published",
                Status = "published",
                PublishedAt = now.AddMinutes(-1),
                CreatedAt = now.AddMinutes(-1)
            };

            db.BlogPosts.AddRange(draftOne, draftTwo, published);
            await db.SaveChangesAsync();

            draftOneId = draftOne.Id;
            draftTwoId = draftTwo.Id;
            publishedId = published.Id;
        }

        await AuthenticateAsAdminAsync();

        var publish = await Client.PostAsJsonAsync("/api/v2/admin/blog/bulk-publish", new
        {
            post_ids = new[] { draftOneId, draftTwoId, publishedId, 999999 }
        });

        publish.StatusCode.Should().Be(HttpStatusCode.OK);
        using (var document = JsonDocument.Parse(await publish.Content.ReadAsStringAsync()))
        {
            document.RootElement.GetProperty("success").GetBoolean().Should().BeTrue();
            var data = document.RootElement.GetProperty("data");
            data.GetProperty("success").GetInt32().Should().Be(2);
            data.GetProperty("failed").GetInt32().Should().Be(1);
            data.GetProperty("skipped_ids").EnumerateArray().Select(x => x.GetInt32())
                .Should().BeEquivalentTo(new[] { publishedId, 999999 });
        }

        var delete = await Client.PostAsJsonAsync("/api/v2/admin/blog/bulk-delete", new
        {
            post_ids = new[] { draftOneId, 999998 }
        });

        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        using (var document = JsonDocument.Parse(await delete.Content.ReadAsStringAsync()))
        {
            document.RootElement.GetProperty("success").GetBoolean().Should().BeTrue();
            var data = document.RootElement.GetProperty("data");
            data.GetProperty("success").GetInt32().Should().Be(1);
            data.GetProperty("failed").GetInt32().Should().Be(1);
            data.GetProperty("skipped_ids").EnumerateArray().Select(x => x.GetInt32())
                .Should().BeEquivalentTo(new[] { 999998 });
        }

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();

            (await db.BlogPosts.IgnoreQueryFilters().AnyAsync(p => p.Id == draftOneId)).Should().BeFalse();
            (await db.BlogPosts.IgnoreQueryFilters().Where(p => p.Id == draftTwoId).Select(p => p.Status).SingleAsync())
                .Should().Be("published");
        }
    }
}
