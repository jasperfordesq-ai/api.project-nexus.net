// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class LaravelReactFrontendContractTests : IntegrationTestBase
{
    public LaravelReactFrontendContractTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task SwReset_ReturnsBrowserRecoveryDocument()
    {
        ClearAuthToken();

        var response = await Client.GetAsync("/api/sw-reset");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().Be("text/html");
        response.Headers.TryGetValues("Clear-Site-Data", out var clearSiteData).Should().BeTrue();
        clearSiteData!.Single().Should().Contain("\"cache\"");
        var html = await response.Content.ReadAsStringAsync();
        html.Should().Contain("serviceWorker");
        html.Should().Contain("caches");
    }

    [Fact]
    public async Task PartnerAnalytics_WithQueryToken_ReturnsDashboardAndReportsEnvelope()
    {
        const string token = "partner-token-contract";

        await SeedRegionalAnalyticsSubscriptionAsync(token);
        ClearAuthToken();

        var dashboard = await Client.GetAsync($"/api/partner-analytics/me/dashboard?period=last_30d&token={token}");
        dashboard.StatusCode.Should().Be(HttpStatusCode.OK);
        var dashboardJson = await dashboard.Content.ReadFromJsonAsync<JsonElement>();
        dashboardJson.GetProperty("success").GetBoolean().Should().BeTrue();
        dashboardJson.GetProperty("data").TryGetProperty("period", out _).Should().BeTrue();

        var reports = await Client.GetAsync($"/api/partner-analytics/me/reports?token={token}");
        reports.StatusCode.Should().Be(HttpStatusCode.OK);
        var reportsJson = await reports.Content.ReadFromJsonAsync<JsonElement>();
        reportsJson.GetProperty("success").GetBoolean().Should().BeTrue();
        reportsJson.GetProperty("data").GetProperty("reports").GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task MarketplaceSellerShippingOptions_BySellerId_ReturnsActiveOptions()
    {
        await AuthenticateAsMemberAsync();
        await SeedShippingOptionAsync(TestData.AdminUser.Id);

        var response = await Client.GetAsync($"/api/v2/marketplace/sellers/{TestData.AdminUser.Id}/shipping-options");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = json.GetProperty("data");
        data.ValueKind.Should().Be(JsonValueKind.Array);
        data.EnumerateArray().Should().Contain(item =>
            item.GetProperty("name").GetString() == "Tracked courier" &&
            item.GetProperty("currency").GetString() == "EUR");
    }

    [Fact]
    public async Task MembersSearchAlias_ReturnsLaravelReactArrayShape()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/v2/members/search?q=Admin&limit=5");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = json.GetProperty("data");
        data.ValueKind.Should().Be(JsonValueKind.Array);
        data.EnumerateArray().Should().Contain(item =>
            item.GetProperty("id").GetInt32() == TestData.AdminUser.Id &&
            !string.IsNullOrWhiteSpace(item.GetProperty("name").GetString()));
    }

    [Fact]
    public async Task V2UploadAndList_ReturnNewsletterAssetShape()
    {
        await AuthenticateAsAdminAsync();

        using var form = CreateImageForm();
        var upload = await Client.PostAsync("/api/v2/upload", form);

        upload.StatusCode.Should().Be(HttpStatusCode.Created);
        var uploadJson = await upload.Content.ReadFromJsonAsync<JsonElement>();
        uploadJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var uploaded = uploadJson.GetProperty("data");
        uploaded.GetProperty("url").GetString().Should().StartWith("/api/files/");
        var path = uploaded.GetProperty("path").GetString();
        path.Should().NotBeNullOrWhiteSpace();

        var list = await Client.GetAsync("/api/v2/upload/list");
        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.GetProperty("success").GetBoolean().Should().BeTrue();
        listJson.GetProperty("data").GetProperty("images").EnumerateArray()
            .Should().Contain(image => image.GetProperty("path").GetString() == path);
    }

    [Fact]
    public async Task BookmarkCollectionPatchAlias_UpdatesCurrentUsersCollection()
    {
        await AuthenticateAsMemberAsync();

        var create = await Client.PostAsJsonAsync("/api/v2/bookmark-collections", new
        {
            name = "Original",
            description = "Before"
        });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var createJson = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = createJson.GetProperty("data").GetProperty("id").GetInt32();

        var patch = await Client.PatchAsJsonAsync($"/api/v2/bookmark-collections/{id}", new
        {
            name = "Updated",
            description = "After"
        });

        patch.StatusCode.Should().Be(HttpStatusCode.OK);
        var patchJson = await patch.Content.ReadFromJsonAsync<JsonElement>();
        patchJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = patchJson.GetProperty("data");
        data.GetProperty("id").GetInt32().Should().Be(id);
        data.GetProperty("name").GetString().Should().Be("Updated");
        data.GetProperty("description").GetString().Should().Be("After");
    }

    [Fact]
    public async Task AdminPrerenderTenantSafety_ReturnsLaravelReactShape()
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync($"/api/v2/admin/prerender/tenant-safety?tenant={TestData.Tenant1.Slug}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = json.GetProperty("data");
        data.GetProperty("tenant").GetProperty("slug").GetString().Should().Be(TestData.Tenant1.Slug);
        data.GetProperty("counts").TryGetProperty("expected", out _).Should().BeTrue();
        data.GetProperty("static_routes").ValueKind.Should().Be(JsonValueKind.Array);
        data.GetProperty("snapshots").ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task AdminWindowOpenAndDownloadContracts_UseExpectedMethods()
    {
        await AuthenticateAsAdminAsync();

        var template = await Client.GetAsync("/api/v2/admin/users/import/template");
        template.StatusCode.Should().Be(HttpStatusCode.OK);
        template.Content.Headers.ContentType?.MediaType.Should().NotBeNullOrWhiteSpace();

        var export = await Client.PostAsJsonAsync("/api/v2/admin/federation/data/export", new { });
        export.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        export.StatusCode.Should().NotBe(HttpStatusCode.MethodNotAllowed);
    }

    [Fact]
    public async Task AdminSession_FormToken_BridgesToLegacyAdminRedirect()
    {
        var token = await GetAccessTokenAsync("admin@test.com", "test-tenant");
        ClearAuthToken();
        using var redirectClient = Factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var response = await redirectClient.PostAsync("/api/auth/admin-session", new FormUrlEncodedContent([
            new KeyValuePair<string, string>("token", token),
            new KeyValuePair<string, string>("redirect", "/admin-legacy")
        ]));

        response.StatusCode.Should().Be(HttpStatusCode.Redirect);
        response.Headers.Location?.ToString().Should().Be("/admin-legacy");
    }

    [Fact]
    public async Task AdminAttributesV2_ReturnsLaravelReactAttributeShape()
    {
        await AuthenticateAsAdminAsync();

        var create = await Client.PostAsJsonAsync("/api/v2/admin/attributes", new
        {
            name = "Skill Level",
            type = "select",
            category_id = (int?)null
        });

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var createJson = await create.Content.ReadFromJsonAsync<JsonElement>();
        var created = createJson.GetProperty("data");
        created.GetProperty("slug").GetString().Should().Be("skill-level");
        created.GetProperty("type").GetString().Should().Be("select");
        created.GetProperty("category_id").ValueKind.Should().Be(JsonValueKind.Null);
        created.GetProperty("is_active").GetBoolean().Should().BeTrue();
        var id = created.GetProperty("id").GetInt32();

        var list = await Client.GetAsync("/api/v2/admin/attributes");
        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        var listed = listJson.GetProperty("data").EnumerateArray()
            .Single(attribute => attribute.GetProperty("id").GetInt32() == id);
        listed.GetProperty("slug").GetString().Should().Be("skill-level");
        listed.GetProperty("options").ValueKind.Should().Be(JsonValueKind.Null);
        listed.GetProperty("category_name").ValueKind.Should().Be(JsonValueKind.Null);
        listed.GetProperty("target_type").GetString().Should().Be("any");

        var update = await Client.PutAsJsonAsync($"/api/v2/admin/attributes/{id}", new
        {
            name = "Skill Rating",
            is_active = false
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateJson = await update.Content.ReadFromJsonAsync<JsonElement>();
        var updated = updateJson.GetProperty("data");
        updated.GetProperty("slug").GetString().Should().Be("skill-rating");
        updated.GetProperty("is_active").GetBoolean().Should().BeFalse();

        var delete = await Client.DeleteAsync($"/api/v2/admin/attributes/{id}");
        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteJson = await delete.Content.ReadFromJsonAsync<JsonElement>();
        deleteJson.GetProperty("data").GetProperty("deleted").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task AdminBackgroundJobsV2_ReturnsLaravelReactOperationsShape()
    {
        await AuthenticateAsAdminAsync();

        var list = await Client.GetAsync("/api/v2/admin/background-jobs");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        var jobs = listJson.GetProperty("data").EnumerateArray().ToList();
        jobs.Select(job => job.GetProperty("id").GetString()).Should().BeEquivalentTo([
            "digest_emails",
            "badge_checker",
            "streak_updater"
        ]);
        jobs.Should().OnlyContain(job => HasLaravelBackgroundJobShape(job));

        var run = await Client.PostAsync("/api/v2/admin/background-jobs/digest_emails/run", null);

        run.StatusCode.Should().Be(HttpStatusCode.OK);
        var runJson = await run.Content.ReadFromJsonAsync<JsonElement>();
        runJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = runJson.GetProperty("data");
        data.GetProperty("triggered").GetBoolean().Should().BeTrue();
        data.GetProperty("job").GetString().Should().Be("digest_emails");
    }

    [Fact]
    public async Task AdminCacheStatsV2_ReturnsLaravelReactOperationsShape()
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync("/api/v2/admin/cache/stats");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        data.GetProperty("redis_connected").ValueKind.Should().BeOneOf(JsonValueKind.True, JsonValueKind.False);
        data.GetProperty("redis_memory_used").GetString().Should().NotBeNullOrWhiteSpace();
        data.GetProperty("redis_keys_count").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        data.GetProperty("cache_hit_rate").GetDouble().Should().BeGreaterThanOrEqualTo(0);

        var clear = await Client.PostAsJsonAsync("/api/v2/admin/cache/clear", new { type = "tenant" });
        clear.StatusCode.Should().Be(HttpStatusCode.OK);
        var clearJson = await clear.Content.ReadFromJsonAsync<JsonElement>();
        clearJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var clearData = clearJson.GetProperty("data");
        clearData.GetProperty("cleared").GetBoolean().Should().BeTrue();
        clearData.GetProperty("type").GetString().Should().Be("tenant");
    }

    private async Task SeedRegionalAnalyticsSubscriptionAsync(string token)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var subscription = new RegionalAnalyticsSubscription
        {
            TenantId = TestData.Tenant1.Id,
            PartnerName = "Contract Partner",
            ContactEmail = "partner@example.test",
            Status = "active",
            SubscriptionToken = token,
            CurrentPeriodStart = DateTime.UtcNow.AddDays(-30),
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(30)
        };
        db.RegionalAnalyticsSubscriptions.Add(subscription);
        await db.SaveChangesAsync();

        db.RegionalAnalyticsReports.Add(new RegionalAnalyticsReport
        {
            TenantId = TestData.Tenant1.Id,
            SubscriptionId = subscription.Id,
            ReportType = "monthly_summary",
            PeriodStart = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-1)),
            PeriodEnd = DateOnly.FromDateTime(DateTime.UtcNow),
            GeneratedAt = DateTime.UtcNow,
            Status = "ready",
            FileUrl = "/storage/regional-analytics/report.pdf"
        });
        await db.SaveChangesAsync();
    }

    private static bool HasLaravelBackgroundJobShape(JsonElement job)
    {
        return !string.IsNullOrWhiteSpace(job.GetProperty("name").GetString()) &&
            job.TryGetProperty("last_run_at", out _) &&
            job.TryGetProperty("next_run_at", out _);
    }

    private async Task SeedShippingOptionAsync(int sellerId)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        db.MarketplaceShippingOptions.Add(new MarketplaceShippingOption
        {
            TenantId = TestData.Tenant1.Id,
            UserId = sellerId,
            Name = "Tracked courier",
            Price = 4.95m,
            Currency = "EUR",
            Region = "domestic",
            IsActive = true
        });
        await db.SaveChangesAsync();
    }

    private static MultipartFormDataContent CreateImageForm()
    {
        var bytes = new byte[1024];
        bytes[0] = 0x89;
        bytes[1] = 0x50;
        bytes[2] = 0x4E;
        bytes[3] = 0x47;

        var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(fileContent, "file", "newsletter.png");
        return form;
    }
}
