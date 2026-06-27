// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

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
public class AdminExplicitParityControllerTests : IntegrationTestBase
{
    public AdminExplicitParityControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task UnhandledGetAlias_ReturnsTenantScopedCompatibilityRead()
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync("/api/v2/admin/ad-campaigns");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.TryGetProperty("error", out _).Should().BeFalse();
        json.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
        json.GetProperty("compatibility").GetProperty("mode").GetString().Should().Be("tenant_config_record");
    }

    [Fact]
    public async Task ListingsStats_ReturnsDatabaseBackedCounts()
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync("/api/v2/admin/listings/stats");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        data.GetProperty("total").GetInt32().Should().BeGreaterThan(0);
        data.GetProperty("active").GetInt32().Should().BeGreaterThan(0);
        data.TryGetProperty("compatibility", out _).Should().BeFalse();
    }

    [Fact]
    public async Task BillingSnapshot_UsesSubscriptionPlanStorage()
    {
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var plan = new SubscriptionPlan
            {
                TenantId = TestData.Tenant1.Id,
                Name = "Explicit Parity Test Plan",
                Price = 12.34m,
                Currency = "EUR",
                Features = "[]",
                IsActive = true,
                IsPublic = false
            };
            db.SubscriptionPlans.Add(plan);
            await db.SaveChangesAsync();

            db.UserSubscriptions.Add(new UserSubscription
            {
                TenantId = TestData.Tenant1.Id,
                UserId = TestData.MemberUser.Id,
                PlanId = plan.Id,
                Status = SubscriptionStatus.Active,
                StartedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync("/api/v2/admin/super/billing/snapshot");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        data.GetProperty("active_subscriptions").GetInt32().Should().BeGreaterThan(0);
        data.GetProperty("monthly_recurring_revenue").GetDecimal().Should().BeGreaterThanOrEqualTo(12.34m);
        data.TryGetProperty("compatibility", out _).Should().BeFalse();
    }

    [Fact]
    public async Task BillingInvoices_ReturnsSubscriptionBackedInvoices()
    {
        int subscriptionId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var plan = new SubscriptionPlan
            {
                TenantId = TestData.Tenant1.Id,
                Name = "Explicit Invoice Test Plan",
                Price = 45.67m,
                Currency = "EUR",
                Features = "[]",
                IsActive = true,
                IsPublic = false
            };
            db.SubscriptionPlans.Add(plan);
            await db.SaveChangesAsync();

            var subscription = new UserSubscription
            {
                TenantId = TestData.Tenant1.Id,
                UserId = TestData.MemberUser.Id,
                PlanId = plan.Id,
                Status = SubscriptionStatus.Active,
                StartedAt = DateTime.UtcNow.AddDays(-3),
                NextBillingDate = DateTime.UtcNow.AddDays(27)
            };
            db.UserSubscriptions.Add(subscription);
            await db.SaveChangesAsync();
            subscriptionId = subscription.Id;
        }

        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync("/api/v2/admin/billing/invoices");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("data").EnumerateArray()
            .Should().Contain(item =>
                item.GetProperty("subscription_id").GetInt32() == subscriptionId &&
                item.GetProperty("amount").GetDecimal() == 45.67m &&
                item.GetProperty("status").GetString() == "paid");
    }

    [Fact]
    public async Task GdprConsentTypes_ReturnsPersistedConsentTypes()
    {
        var key = "explicit-parity-" + Guid.NewGuid().ToString("N");
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            db.GdprConsentTypes.Add(new GdprConsentType
            {
                TenantId = TestData.Tenant1.Id,
                Key = key,
                Name = "Explicit Parity Consent",
                Description = "Test consent type",
                IsRequired = false,
                IsActive = true
            });
            await db.SaveChangesAsync();
        }

        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync("/api/v2/admin/enterprise/gdpr/consent-types");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("data").EnumerateArray()
            .Select(item => item.GetProperty("slug").GetString())
            .Should().Contain(key);
    }

    [Fact]
    public async Task FederationTopicSubscriptions_PersistInTenantConfig()
    {
        await AuthenticateAsAdminAsync();

        var put = await Client.PutAsJsonAsync("/api/v2/admin/federation/topics/mine", new
        {
            topics = new[] { "listings.shared", "webhooks.delivery" },
            delivery_enabled = true
        });

        put.StatusCode.Should().Be(HttpStatusCode.OK);

        var mine = await Client.GetAsync("/api/v2/admin/federation/topics/mine");
        mine.StatusCode.Should().Be(HttpStatusCode.OK);
        var mineJson = await mine.Content.ReadFromJsonAsync<JsonElement>();
        mineJson.GetProperty("data").GetProperty("topics").EnumerateArray()
            .Select(item => item.GetString())
            .Should().Contain(new[] { "listings.shared", "webhooks.delivery" });

        var topics = await Client.GetAsync("/api/v2/admin/federation/topics");
        topics.StatusCode.Should().Be(HttpStatusCode.OK);
        var topicsJson = await topics.Content.ReadFromJsonAsync<JsonElement>();
        topicsJson.GetProperty("data").EnumerateArray()
            .Single(item => item.GetProperty("key").GetString() == "listings.shared")
            .GetProperty("subscribed").GetBoolean().Should().BeTrue();

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var config = await db.TenantConfigs.IgnoreQueryFilters()
            .SingleAsync(c => c.TenantId == TestData.Tenant1.Id && c.Key == "admin_explicit.federation.topic_subscriptions");
        config.Value.Should().Contain("webhooks.delivery");
    }

    [Fact]
    public async Task FederationWebhooks_PersistCrudAndTestLogs()
    {
        await AuthenticateAsAdminAsync();

        var create = await Client.PostAsJsonAsync("/api/v2/admin/federation/webhooks", new
        {
            name = "Parity federation webhook",
            url = "https://example.test/federation",
            events = new[] { "listings.shared" }
        });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdJson = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = createdJson.GetProperty("data").GetProperty("id").GetInt32();

        var update = await Client.PutAsJsonAsync($"/api/v2/admin/federation/webhooks/{id}", new
        {
            name = "Updated parity federation webhook",
            enabled = false
        });
        update.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await Client.GetAsync("/api/v2/admin/federation/webhooks");
        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        var webhook = listJson.GetProperty("data").EnumerateArray()
            .Single(item => item.GetProperty("id").GetInt32() == id);
        webhook.GetProperty("name").GetString().Should().Be("Updated parity federation webhook");
        // enabled:false maps to the Paused state, which renders as "paused".
        webhook.GetProperty("status").GetString().Should().Be("paused");

        var test = await Client.PostAsJsonAsync($"/api/v2/admin/federation/webhooks/{id}/test", new { sample = true });
        test.StatusCode.Should().Be(HttpStatusCode.OK);

        var logs = await Client.GetAsync($"/api/v2/admin/federation/webhooks/{id}/logs");
        logs.StatusCode.Should().Be(HttpStatusCode.OK);
        var logsJson = await logs.Content.ReadFromJsonAsync<JsonElement>();
        logsJson.GetProperty("data").EnumerateArray()
            .Should().Contain(item => item.GetProperty("action").GetString() == "test");

        var delete = await Client.DeleteAsync($"/api/v2/admin/federation/webhooks/{id}");
        delete.StatusCode.Should().Be(HttpStatusCode.OK);

        var afterDelete = await Client.GetAsync("/api/v2/admin/federation/webhooks");
        var afterDeleteJson = await afterDelete.Content.ReadFromJsonAsync<JsonElement>();
        afterDeleteJson.GetProperty("data").EnumerateArray()
            .Should().NotContain(item => item.GetProperty("id").GetInt32() == id);
    }

    [Fact]
    public async Task CatchAllPost_PersistsCompatibilityRecord()
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.PostAsJsonAsync("/api/v2/admin/ad-campaigns/42/approve", new
        {
            reason = "explicit parity test"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("data").GetProperty("status").GetString().Should().Be("recorded");
        json.GetProperty("compatibility").GetProperty("side_effect").GetString().Should().Be("recorded_only");

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        // Compatibility writes now land in the typed CompatibilityAuditEntry
        // table, not TenantConfig (CLAUDE.md path-to-1000 item 12 — the legacy
        // TenantConfig JSON dual-write was removed).
        var audit = await db.CompatibilityAuditEntries.IgnoreQueryFilters()
            .Where(e => e.TenantId == TestData.Tenant1.Id
                && e.Endpoint == "/api/v2/admin/ad-campaigns/42/approve")
            .OrderByDescending(e => e.Id)
            .FirstAsync();
        audit.RequestBody.Should().Contain("explicit parity test");
    }
}
