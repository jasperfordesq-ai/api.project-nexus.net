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
    public async Task AdminListingsDeleteV2_RemovesTenantListingWithLaravelReactContract()
    {
        int listingId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var listing = new Listing
            {
                TenantId = TestData.Tenant1.Id,
                UserId = TestData.MemberUser.Id,
                Title = "Parity listing to delete",
                Description = "Listing seeded for Laravel React admin delete parity.",
                Type = ListingType.Offer,
                Status = ListingStatus.Active,
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            };
            db.Listings.Add(listing);
            await db.SaveChangesAsync();
            listingId = listing.Id;
        }

        await AuthenticateAsAdminAsync();

        var response = await Client.DeleteAsync($"/api/v2/admin/listings/{listingId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.TryGetProperty("compatibility", out _).Should().BeFalse();
        var data = json.GetProperty("data");
        data.GetProperty("deleted").GetBoolean().Should().BeTrue();
        data.GetProperty("id").GetInt32().Should().Be(listingId);

        using var verifyScope = Factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var deleted = await verifyDb.Listings
            .IgnoreQueryFilters()
            .AnyAsync(l => l.TenantId == TestData.Tenant1.Id && l.Id == listingId);
        deleted.Should().BeFalse();
    }

    [Fact]
    public async Task AdminEventsDeleteV2_RemovesTenantEventWithLaravelReactContract()
    {
        int eventId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var evt = new Event
            {
                TenantId = TestData.Tenant1.Id,
                CreatedById = TestData.MemberUser.Id,
                Title = "Parity event to delete",
                Description = "Event seeded for Laravel React admin delete parity.",
                Location = "Community Hall",
                StartsAt = DateTime.UtcNow.AddDays(5),
                EndsAt = DateTime.UtcNow.AddDays(5).AddHours(2),
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            };
            db.Events.Add(evt);
            await db.SaveChangesAsync();
            eventId = evt.Id;

            db.EventRsvps.Add(new EventRsvp
            {
                TenantId = TestData.Tenant1.Id,
                EventId = eventId,
                UserId = TestData.MemberUser.Id,
                Status = Event.RsvpStatus.Going,
                RespondedAt = DateTime.UtcNow.AddDays(-1)
            });
            await db.SaveChangesAsync();
        }

        await AuthenticateAsAdminAsync();

        var response = await Client.DeleteAsync($"/api/v2/admin/events/{eventId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.TryGetProperty("compatibility", out _).Should().BeFalse();
        var data = json.GetProperty("data");
        data.GetProperty("deleted").GetBoolean().Should().BeTrue();
        data.GetProperty("id").GetInt32().Should().Be(eventId);

        using var verifyScope = Factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var eventExists = await verifyDb.Events
            .IgnoreQueryFilters()
            .AnyAsync(e => e.TenantId == TestData.Tenant1.Id && e.Id == eventId);
        var rsvpExists = await verifyDb.EventRsvps
            .IgnoreQueryFilters()
            .AnyAsync(r => r.TenantId == TestData.Tenant1.Id && r.EventId == eventId);
        eventExists.Should().BeFalse();
        rsvpExists.Should().BeFalse();
    }

    [Fact]
    public async Task InviteCodesV2_GenerateListAndDeactivateUseLaravelReactContract()
    {
        await AuthenticateAsAdminAsync();

        var generate = await Client.PostAsJsonAsync("/api/v2/admin/invite-codes", new
        {
            count = 2,
            max_uses = 3,
            expires_at = DateTime.UtcNow.AddDays(7).ToString("O"),
            note = "Laravel React invite-code compatibility"
        });

        generate.StatusCode.Should().Be(HttpStatusCode.OK);
        var generateJson = await generate.Content.ReadFromJsonAsync<JsonElement>();
        generateJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var generateData = generateJson.GetProperty("data");
        generateData.GetProperty("count").GetInt32().Should().Be(2);
        var generatedCodes = generateData.GetProperty("codes")
            .EnumerateArray()
            .Select(code => code.GetString())
            .ToArray();
        generatedCodes.Should().HaveCount(2);
        generatedCodes.Should().OnlyContain(code => !string.IsNullOrWhiteSpace(code));

        var list = await Client.GetAsync("/api/v2/admin/invite-codes?limit=10&offset=0");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var listData = listJson.GetProperty("data");
        listData.GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(2);
        var items = listData.GetProperty("items").EnumerateArray().ToArray();
        items.Select(item => item.GetProperty("code").GetString())
            .Should().Contain(generatedCodes);

        var firstGenerated = items.First(item => item.GetProperty("code").GetString() == generatedCodes[0]);
        firstGenerated.GetProperty("max_uses").GetInt32().Should().Be(3);
        firstGenerated.GetProperty("uses_count").GetInt32().Should().Be(0);
        firstGenerated.GetProperty("is_active").GetBoolean().Should().BeTrue();
        firstGenerated.GetProperty("note").GetString().Should().Be("Laravel React invite-code compatibility");

        var deactivate = await Client.DeleteAsync($"/api/v2/admin/invite-codes/{firstGenerated.GetProperty("id").GetInt32()}");

        deactivate.StatusCode.Should().Be(HttpStatusCode.OK);
        var deactivateJson = await deactivate.Content.ReadFromJsonAsync<JsonElement>();
        deactivateJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        deactivateJson.GetProperty("data").GetProperty("deactivated").GetBoolean().Should().BeTrue();

        var relist = await Client.GetAsync("/api/v2/admin/invite-codes?limit=10&offset=0");
        var relistJson = await relist.Content.ReadFromJsonAsync<JsonElement>();
        var deactivated = relistJson.GetProperty("data").GetProperty("items")
            .EnumerateArray()
            .First(item => item.GetProperty("id").GetInt32() == firstGenerated.GetProperty("id").GetInt32());
        deactivated.GetProperty("is_active").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task ModerationSettingsV2_GetPutAndReloadUseLaravelReactContract()
    {
        await AuthenticateAsAdminAsync();

        var initial = await Client.GetAsync("/api/v2/admin/moderation/settings");

        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        initialJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var initialData = initialJson.GetProperty("data");
        initialData.GetProperty("enabled").ValueKind.Should().Be(JsonValueKind.False);
        initialData.GetProperty("require_post").ValueKind.Should().Be(JsonValueKind.False);
        initialData.GetProperty("require_listing").ValueKind.Should().Be(JsonValueKind.False);
        initialData.GetProperty("require_event").ValueKind.Should().Be(JsonValueKind.False);
        initialData.GetProperty("require_comment").ValueKind.Should().Be(JsonValueKind.False);
        initialData.GetProperty("auto_filter").ValueKind.Should().Be(JsonValueKind.False);

        var update = await Client.PutAsJsonAsync("/api/v2/admin/moderation/settings", new
        {
            enabled = true,
            require_post = true,
            require_listing = false,
            require_event = true,
            require_comment = false,
            auto_filter = true,
            ignored_key = true
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateJson = await update.Content.ReadFromJsonAsync<JsonElement>();
        updateJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var updateData = updateJson.GetProperty("data");
        updateData.GetProperty("message").GetString().Should().NotBeNullOrWhiteSpace();
        var updatedSettings = updateData.GetProperty("settings");
        updatedSettings.GetProperty("enabled").GetBoolean().Should().BeTrue();
        updatedSettings.GetProperty("require_post").GetBoolean().Should().BeTrue();
        updatedSettings.GetProperty("require_listing").GetBoolean().Should().BeFalse();
        updatedSettings.GetProperty("require_event").GetBoolean().Should().BeTrue();
        updatedSettings.GetProperty("require_comment").GetBoolean().Should().BeFalse();
        updatedSettings.GetProperty("auto_filter").GetBoolean().Should().BeTrue();
        updatedSettings.TryGetProperty("ignored_key", out _).Should().BeFalse();

        var reloaded = await Client.GetAsync("/api/v2/admin/moderation/settings");

        reloaded.StatusCode.Should().Be(HttpStatusCode.OK);
        var reloadedJson = await reloaded.Content.ReadFromJsonAsync<JsonElement>();
        var reloadedData = reloadedJson.GetProperty("data");
        reloadedData.GetProperty("enabled").GetBoolean().Should().BeTrue();
        reloadedData.GetProperty("require_post").GetBoolean().Should().BeTrue();
        reloadedData.GetProperty("require_listing").GetBoolean().Should().BeFalse();
        reloadedData.GetProperty("require_event").GetBoolean().Should().BeTrue();
        reloadedData.GetProperty("require_comment").GetBoolean().Should().BeFalse();
        reloadedData.GetProperty("auto_filter").GetBoolean().Should().BeTrue();
        reloadedData.TryGetProperty("ignored_key", out _).Should().BeFalse();
    }

    [Fact]
    public async Task VolunteeringOrganizationsV2_ReturnsTenantOrganisationsWithLaravelReactShape()
    {
        int organisationId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            var now = DateTime.UtcNow;
            var seededOrganisation = new Organisation
            {
                TenantId = TestData.Tenant1.Id,
                Name = "Parity Volunteer Hub",
                Slug = "parity-volunteer-hub-" + Guid.NewGuid().ToString("N"),
                Description = "Volunteer hub exposed through the Laravel React admin API.",
                WebsiteUrl = "https://volunteer.example.test",
                Email = "volunteer-hub@example.test",
                Type = "charity",
                Status = "verified",
                OwnerId = TestData.AdminUser.Id,
                CreatedAt = now.AddDays(-4),
                UpdatedAt = now.AddDays(-1),
                VerifiedAt = now.AddDays(-2)
            };
            db.Organisations.Add(seededOrganisation);
            await db.SaveChangesAsync();

            organisationId = seededOrganisation.Id;
            db.OrganisationMembers.Add(new OrganisationMember
            {
                TenantId = TestData.Tenant1.Id,
                OrganisationId = organisationId,
                UserId = TestData.MemberUser.Id,
                Role = "volunteer",
                JoinedAt = now.AddDays(-3)
            });
            db.OrgWallets.Add(new OrgWallet
            {
                TenantId = TestData.Tenant1.Id,
                OrganisationId = organisationId,
                Balance = 42.5m,
                TotalReceived = 55m,
                TotalSpent = 12.5m,
                CreatedAt = now.AddDays(-3),
                UpdatedAt = now.AddDays(-1)
            });
            await db.SaveChangesAsync();
        }

        await AuthenticateAsAdminAsync();

        var response = await Client.GetAsync("/api/v2/admin/volunteering/organizations");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.TryGetProperty("compatibility", out _).Should().BeFalse();
        var organisation = json.GetProperty("data").EnumerateArray()
            .Single(item => item.GetProperty("id").GetInt32() == organisationId);
        organisation.GetProperty("org_id").GetInt32().Should().Be(organisationId);
        organisation.GetProperty("name").GetString().Should().Be("Parity Volunteer Hub");
        organisation.GetProperty("org_name").GetString().Should().Be("Parity Volunteer Hub");
        organisation.GetProperty("description").GetString().Should().Be("Volunteer hub exposed through the Laravel React admin API.");
        organisation.GetProperty("contact_email").GetString().Should().Be("volunteer-hub@example.test");
        organisation.GetProperty("website").GetString().Should().Be("https://volunteer.example.test");
        organisation.GetProperty("org_type").GetString().Should().Be("charity");
        organisation.GetProperty("status").GetString().Should().Be("verified");
        organisation.GetProperty("balance").GetDecimal().Should().Be(42.5m);
        organisation.GetProperty("member_count").GetInt32().Should().Be(1);
        organisation.GetProperty("volunteer_count").GetInt32().Should().Be(1);
        organisation.GetProperty("opportunity_count").GetInt32().Should().Be(0);
        organisation.GetProperty("total_hours").GetDecimal().Should().Be(0m);
        json.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(1);
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
    public async Task FederationCreditAgreementsV2_CreateListAndActionUseLaravelReactContract()
    {
        await AuthenticateAsAdminAsync();

        var initial = await Client.GetAsync("/api/v2/admin/federation/credit-agreements");

        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        initialJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        initialJson.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);

        var create = await Client.PostAsJsonAsync("/api/v2/admin/federation/credit-agreements", new
        {
            partner_tenant_id = TestData.Tenant2.Id,
            exchange_rate = 1.25m,
            monthly_limit = 250
        });

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var createJson = await create.Content.ReadFromJsonAsync<JsonElement>();
        createJson.TryGetProperty("compatibility", out _).Should().BeFalse();
        var created = createJson.GetProperty("data");
        created.GetProperty("from_tenant_id").GetInt32().Should().Be(TestData.Tenant1.Id);
        created.GetProperty("to_tenant_id").GetInt32().Should().Be(TestData.Tenant2.Id);
        created.GetProperty("exchange_rate").GetDecimal().Should().Be(1.25m);
        created.GetProperty("max_monthly_credits").GetDecimal().Should().Be(250m);
        created.GetProperty("monthly_limit").GetDecimal().Should().Be(250m);
        created.GetProperty("status").GetString().Should().Be("pending");
        var agreementId = created.GetProperty("id").GetInt32();

        var list = await Client.GetAsync("/api/v2/admin/federation/credit-agreements");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        var listed = listJson.GetProperty("data").EnumerateArray()
            .Single(item => item.GetProperty("id").GetInt32() == agreementId);
        listed.GetProperty("from_tenant_name").GetString().Should().Be(TestData.Tenant1.Name);
        listed.GetProperty("to_tenant_name").GetString().Should().Be(TestData.Tenant2.Name);
        listed.GetProperty("to_tenant_slug").GetString().Should().Be(TestData.Tenant2.Slug);

        var approve = await Client.PostAsJsonAsync($"/api/v2/admin/federation/credit-agreements/{agreementId}/approve", new { });

        approve.StatusCode.Should().Be(HttpStatusCode.OK);
        var approveJson = await approve.Content.ReadFromJsonAsync<JsonElement>();
        approveJson.GetProperty("data").GetProperty("success").GetBoolean().Should().BeTrue();

        var afterApprove = await Client.GetAsync("/api/v2/admin/federation/credit-agreements");
        var afterApproveJson = await afterApprove.Content.ReadFromJsonAsync<JsonElement>();
        afterApproveJson.GetProperty("data").EnumerateArray()
            .Single(item => item.GetProperty("id").GetInt32() == agreementId)
            .GetProperty("status").GetString().Should().Be("active");
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
    public async Task MemberPremiumSettings_PersistStripeConnectAccountAndReturnLaravelEnvelope()
    {
        await AuthenticateAsAdminAsync();

        var initial = await Client.GetAsync("/api/v2/admin/member-premium/settings");
        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        var initialSettings = initialJson.GetProperty("data").GetProperty("settings");
        initialSettings.GetProperty("stripe_connect_account_id").GetString().Should().BeEmpty();
        initialSettings.GetProperty("payment_route").GetString().Should().Be("platform_default");
        initialSettings.GetProperty("configured_payment_route").GetString().Should().Be("platform_default");
        initialSettings.GetProperty("account_status").GetProperty("state").GetString().Should().Be("not_connected");

        var update = await Client.PutAsJsonAsync("/api/v2/admin/member-premium/settings", new
        {
            stripe_connect_account_id = "acct_testTenant123"
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateJson = await update.Content.ReadFromJsonAsync<JsonElement>();
        var settings = updateJson.GetProperty("data").GetProperty("settings");
        settings.GetProperty("stripe_connect_account_id").GetString().Should().Be("acct_testTenant123");
        settings.GetProperty("configured_payment_route").GetString().Should().Be("tenant_connect");
        settings.GetProperty("payment_route").GetString().Should().Be("platform_default");
        settings.GetProperty("fallback_reason").GetString().Should().Be("stripe_connect_not_ready");

        var reload = await Client.GetAsync("/api/v2/admin/member-premium/settings");
        var reloadJson = await reload.Content.ReadFromJsonAsync<JsonElement>();
        reloadJson.GetProperty("data").GetProperty("settings")
            .GetProperty("stripe_connect_account_id").GetString().Should().Be("acct_testTenant123");

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var stored = await db.TenantConfigs.IgnoreQueryFilters()
            .SingleAsync(c => c.TenantId == TestData.Tenant1.Id && c.Key == "donations.stripe_connect_account_id");
        stored.Value.Should().Be("acct_testTenant123");
    }

    [Fact]
    public async Task MemberPremiumSettings_RejectInvalidStripeConnectAccount()
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.PutAsJsonAsync("/api/v2/admin/member-premium/settings", new
        {
            stripe_connect_account_id = "not-a-connect-account"
        });

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("error").GetString().Should().Be("VALIDATION_ERROR");
        json.GetProperty("field").GetString().Should().Be("stripe_connect_account_id");
    }

    [Fact]
    public async Task MemberPremiumConnectOnboarding_ReturnsSettingsAndCompatibilityUrl()
    {
        await AuthenticateAsAdminAsync();

        var response = await Client.PostAsJsonAsync("/api/v2/admin/member-premium/connect/onboarding", new
        {
            return_url = "https://app.example.test/admin/member-premium?stripe_connect=return",
            refresh_url = "https://app.example.test/admin/member-premium?stripe_connect=refresh"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        data.GetProperty("settings").GetProperty("stripe_connect_account_id").GetString()
            .Should().StartWith("acct_");
        data.GetProperty("onboarding_url").GetString()
            .Should().StartWith("https://connect.stripe.com/setup/");
    }

    [Fact]
    public async Task MemberPremiumFinance_ReturnsLaravelOverviewAndDisputeEnvelopes()
    {
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            db.MoneyDonations.AddRange(
                new MoneyDonation
                {
                    TenantId = TestData.Tenant1.Id,
                    DonorUserId = TestData.MemberUser.Id,
                    DonorDisplayName = "Active donor",
                    DonorEmail = "donor@example.test",
                    AmountMinorUnits = 2500,
                    Currency = "GBP",
                    Status = MoneyDonationStatus.Succeeded,
                    CompletedAt = DateTime.UtcNow.AddDays(-1),
                    CreatedAt = DateTime.UtcNow.AddDays(-1)
                },
                new MoneyDonation
                {
                    TenantId = TestData.Tenant1.Id,
                    DonorDisplayName = "Pending donor",
                    DonorEmail = "pending@example.test",
                    AmountMinorUnits = 1200,
                    Currency = "GBP",
                    Status = MoneyDonationStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                },
                new MoneyDonation
                {
                    TenantId = TestData.Tenant1.Id,
                    DonorDisplayName = "Refunded donor",
                    DonorEmail = "refunded@example.test",
                    AmountMinorUnits = 900,
                    Currency = "GBP",
                    Status = MoneyDonationStatus.Refunded,
                    CreatedAt = DateTime.UtcNow
                });
            db.TenantConfigs.Add(new TenantConfig
            {
                TenantId = TestData.Tenant1.Id,
                Key = "donations.disputes",
                Value = """
                    [
                      {
                        "id": 7,
                        "stripe_dispute_id": "dp_test_123",
                        "payment_intent_id": "pi_test_123",
                        "amount": 2500,
                        "currency": "gbp",
                        "status": "needs_response",
                        "reason": "fraudulent",
                        "evidence_due_at": null,
                        "payment_route": "platform_default",
                        "stripe_account_id": null,
                        "created_at": "2026-07-05T12:00:00Z"
                      }
                    ]
                    """
            });
            await db.SaveChangesAsync();
        }

        await AuthenticateAsAdminAsync();

        var overviewResponse = await Client.GetAsync("/api/v2/admin/member-premium/finance/overview");
        overviewResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var overviewJson = await overviewResponse.Content.ReadFromJsonAsync<JsonElement>();
        var overview = overviewJson.GetProperty("data").GetProperty("overview");
        overview.GetProperty("totals").GetProperty("completed_cents").GetInt64().Should().BeGreaterThanOrEqualTo(2500);
        overview.GetProperty("totals").GetProperty("pending_cents").GetInt64().Should().BeGreaterThanOrEqualTo(1200);
        overview.GetProperty("routing").GetProperty("platform_fallback_count").GetInt32().Should().BeGreaterThanOrEqualTo(1);

        var disputesResponse = await Client.GetAsync("/api/v2/admin/member-premium/finance/disputes?limit=1");
        disputesResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var disputesJson = await disputesResponse.Content.ReadFromJsonAsync<JsonElement>();
        var dispute = disputesJson.GetProperty("data").GetProperty("items").EnumerateArray().Single();
        dispute.GetProperty("stripe_dispute_id").GetString().Should().Be("dp_test_123");
    }

    [Fact]
    public async Task MemberPremiumFinanceExports_ReturnCsvDownloads()
    {
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
            db.MoneyDonations.Add(new MoneyDonation
            {
                TenantId = TestData.Tenant1.Id,
                DonorUserId = TestData.MemberUser.Id,
                DonorDisplayName = "Receipt donor",
                DonorEmail = "receipt@example.test",
                AmountMinorUnits = 3456,
                Currency = "GBP",
                Status = MoneyDonationStatus.Succeeded,
                CompletedAt = new DateTime(2026, 3, 14, 9, 30, 0, DateTimeKind.Utc),
                CreatedAt = new DateTime(2026, 3, 14, 9, 30, 0, DateTimeKind.Utc)
            });
            await db.SaveChangesAsync();
        }

        await AuthenticateAsAdminAsync();

        var giftAid = await Client.GetAsync("/api/v2/admin/member-premium/finance/gift-aid-export");
        giftAid.StatusCode.Should().Be(HttpStatusCode.OK);
        giftAid.Content.Headers.ContentType?.MediaType.Should().Be("text/csv");
        (await giftAid.Content.ReadAsStringAsync()).Should().Contain("donation_id,donor_name,donor_email,amount,currency");

        var receipts = await Client.GetAsync("/api/v2/admin/member-premium/finance/annual-receipts?year=2026");
        receipts.StatusCode.Should().Be(HttpStatusCode.OK);
        receipts.Content.Headers.ContentType?.MediaType.Should().Be("text/csv");
        var body = await receipts.Content.ReadAsStringAsync();
        body.Should().Contain("donation_id,user_id,donor_name,donor_email,amount,currency,status");
        body.Should().Contain("Receipt donor");
        body.Should().Contain("34.56");
    }

    [Fact]
    public async Task SupportReports_ReturnLaravelListDetailStatsAndAssignees()
    {
        await SeedSupportReportsAsync();
        await AuthenticateAsAdminAsync();

        var list = await Client.GetAsync("/api/v2/admin/support-reports?status=open&impact=blocked&search=checkout&page=1&limit=10");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        var report = listJson.GetProperty("data").EnumerateArray().Single();
        report.GetProperty("reference").GetString().Should().Be("NXR-260705-BLOCK1");
        report.GetProperty("summary").GetString().Should().Contain("Checkout");
        report.TryGetProperty("diagnostics", out _).Should().BeFalse();
        listJson.GetProperty("meta").GetProperty("total").GetInt32().Should().Be(1);
        listJson.GetProperty("meta").GetProperty("total_pages").GetInt32().Should().Be(1);

        var stats = await Client.GetAsync("/api/v2/admin/support-reports/stats");
        stats.StatusCode.Should().Be(HttpStatusCode.OK);
        var statsJson = await stats.Content.ReadFromJsonAsync<JsonElement>();
        var statsData = statsJson.GetProperty("data");
        statsData.GetProperty("total").GetInt32().Should().Be(2);
        statsData.GetProperty("open").GetInt32().Should().Be(1);
        statsData.GetProperty("triaged").GetInt32().Should().Be(1);
        statsData.GetProperty("blocked").GetInt32().Should().Be(1);
        statsData.GetProperty("major").GetInt32().Should().Be(1);
        statsData.GetProperty("unassigned").GetInt32().Should().Be(1);

        var assignees = await Client.GetAsync("/api/v2/admin/support-reports/assignees");
        assignees.StatusCode.Should().Be(HttpStatusCode.OK);
        var assigneesJson = await assignees.Content.ReadFromJsonAsync<JsonElement>();
        assigneesJson.GetProperty("data").GetProperty("assignees").EnumerateArray()
            .Should().Contain(item =>
                item.GetProperty("id").GetInt32() == TestData.AdminUser.Id &&
                item.GetProperty("name").GetString() == "Admin User" &&
                item.GetProperty("email").GetString() == "admin@test.com" &&
                item.GetProperty("role").GetString() == "admin");

        var detail = await Client.GetAsync("/api/v2/admin/support-reports/101");
        detail.StatusCode.Should().Be(HttpStatusCode.OK);
        var detailJson = await detail.Content.ReadFromJsonAsync<JsonElement>();
        var detailData = detailJson.GetProperty("data");
        detailData.GetProperty("diagnostics").GetProperty("browser").GetString().Should().Be("chromium");
        detailData.GetProperty("reporter").GetProperty("email").GetString().Should().Be("member@test.com");
    }

    [Fact]
    public async Task SupportReports_UpdatePersistsLaravelFields()
    {
        await SeedSupportReportsAsync();
        await AuthenticateAsAdminAsync();

        var update = await Client.PutAsJsonAsync("/api/v2/admin/support-reports/101", new
        {
            status = "resolved",
            assigned_user_id = TestData.AdminUser.Id,
            triage_notes = "Reproduced and linked to Sentry.",
            sentry_issue_url = "https://sentry.example.test/issues/123"
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await update.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        data.GetProperty("status").GetString().Should().Be("resolved");
        data.GetProperty("assigned_user_id").GetInt32().Should().Be(TestData.AdminUser.Id);
        data.GetProperty("triage_notes").GetString().Should().Be("Reproduced and linked to Sentry.");
        data.GetProperty("sentry_issue_url").GetString().Should().Be("https://sentry.example.test/issues/123");
        data.GetProperty("resolved_at").GetString().Should().NotBeNullOrWhiteSpace();
        data.GetProperty("assignee").GetProperty("name").GetString().Should().Be("Admin User");

        var reload = await Client.GetAsync("/api/v2/admin/support-reports/101");
        var reloadJson = await reload.Content.ReadFromJsonAsync<JsonElement>();
        reloadJson.GetProperty("data").GetProperty("status").GetString().Should().Be("resolved");
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

    private async Task SeedSupportReportsAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        db.TenantConfigs.Add(new TenantConfig
        {
            TenantId = TestData.Tenant1.Id,
            Key = "admin_explicit.support_reports",
            Value = JsonSerializer.Serialize(new object[]
            {
                new Dictionary<string, object?>
                {
                    ["id"] = 101,
                    ["tenant_id"] = TestData.Tenant1.Id,
                    ["user_id"] = TestData.MemberUser.Id,
                    ["assigned_user_id"] = null,
                    ["reference"] = "NXR-260705-BLOCK1",
                    ["source"] = "in_app",
                    ["summary"] = "Checkout blocks card payment",
                    ["description"] = "The checkout submit button never completes.",
                    ["impact"] = "blocked",
                    ["status"] = "open",
                    ["module"] = "donations",
                    ["route"] = "/admin/member-premium",
                    ["page_url"] = "https://app.example.test/admin/member-premium",
                    ["sentry_event_id"] = null,
                    ["sentry_issue_url"] = null,
                    ["diagnostics"] = new Dictionary<string, object?>
                    {
                        ["browser"] = "chromium",
                        ["viewport"] = "1440x900"
                    },
                    ["user_agent"] = "Playwright",
                    ["triage_notes"] = null,
                    ["triaged_at"] = null,
                    ["resolved_at"] = null,
                    ["closed_at"] = null,
                    ["created_at"] = "2026-07-05T09:00:00Z",
                    ["updated_at"] = "2026-07-05T09:00:00Z"
                },
                new Dictionary<string, object?>
                {
                    ["id"] = 102,
                    ["tenant_id"] = TestData.Tenant1.Id,
                    ["user_id"] = TestData.MemberUser.Id,
                    ["assigned_user_id"] = TestData.AdminUser.Id,
                    ["reference"] = "NXR-260705-MAJOR2",
                    ["source"] = "in_app",
                    ["summary"] = "Profile save is slow",
                    ["description"] = "Saving profile preferences takes several seconds.",
                    ["impact"] = "major",
                    ["status"] = "triaged",
                    ["module"] = "profile",
                    ["route"] = "/profile/settings",
                    ["page_url"] = "https://app.example.test/profile/settings",
                    ["sentry_event_id"] = "evt_test_123",
                    ["sentry_issue_url"] = null,
                    ["diagnostics"] = null,
                    ["user_agent"] = "Playwright",
                    ["triage_notes"] = "Investigating.",
                    ["triaged_at"] = "2026-07-05T10:00:00Z",
                    ["resolved_at"] = null,
                    ["closed_at"] = null,
                    ["created_at"] = "2026-07-05T08:00:00Z",
                    ["updated_at"] = "2026-07-05T10:00:00Z"
                }
            }, JsonOptions)
        });
        await db.SaveChangesAsync();
    }
}
