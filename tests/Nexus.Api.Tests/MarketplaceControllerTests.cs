// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Tests.Fixtures;
using Xunit;

namespace Nexus.Api.Tests;

[Collection("Integration")]
public class MarketplaceControllerTests : IntegrationTestBase
{
    public MarketplaceControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task Categories_Public_ReturnsDefaultCategories()
    {
        Client.DefaultRequestHeaders.Add("X-Tenant-ID", TestData.Tenant1.Id.ToString());
        var response = await Client.GetAsync("/api/marketplace/categories");
        Client.DefaultRequestHeaders.Remove("X-Tenant-ID");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
        content.GetProperty("meta").GetProperty("total").GetInt32().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task CreateListing_AsAuthenticated_ReturnsCreated()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.PostAsJsonAsync("/api/marketplace/listings", new
        {
            title = "Community drill",
            description = "Cordless drill available for local pickup",
            price = 0,
            price_type = "free",
            condition = "good",
            status = "active"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").GetProperty("title").GetString().Should().Be("Community drill");
        content.GetProperty("data").GetProperty("moderationStatus").GetString().Should().Be("pending");
    }

    [Fact]
    public async Task AdminApproveListing_AsAdmin_ReturnsOk()
    {
        await AuthenticateAsMemberAsync();
        var create = await Client.PostAsJsonAsync("/api/marketplace/listings", new
        {
            title = "Garden tools bundle",
            description = "Hand tools for a community garden day",
            price_type = "free",
            status = "active"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("data").GetProperty("id").GetInt32();

        await AuthenticateAsAdminAsync();
        var response = await Client.PostAsync($"/api/admin/marketplace/listings/{id}/approve", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").GetProperty("moderationStatus").GetString().Should().Be("approved");
    }

    [Fact]
    public async Task MerchantOnboardingV2_MatchesLaravelReactWizardContract()
    {
        await AuthenticateAsMemberAsync();

        var initial = await Client.GetAsync("/api/v2/merchant-onboarding/status");

        initial.StatusCode.Should().Be(HttpStatusCode.OK);
        var initialJson = await initial.Content.ReadFromJsonAsync<JsonElement>();
        var initialData = initialJson.GetProperty("data");
        initialData.GetProperty("has_profile").GetBoolean().Should().BeFalse();
        initialData.GetProperty("onboarding_completed").GetBoolean().Should().BeFalse();
        initialData.GetProperty("profile").ValueKind.Should().Be(JsonValueKind.Null);

        var step1 = await Client.PostAsJsonAsync("/api/v2/merchant-onboarding/step-1", new
        {
            seller_type = "business",
            business_name = "Repair Coop",
            display_name = "Repair Coop Basel",
            bio = "Community repair and reuse partner",
            business_registration = "CHE-123.456.789"
        });

        step1.StatusCode.Should().Be(HttpStatusCode.OK);
        var step1Json = await step1.Content.ReadFromJsonAsync<JsonElement>();
        var step1Profile = step1Json.GetProperty("data").GetProperty("profile");
        step1Profile.GetProperty("seller_type").GetString().Should().Be("business");
        step1Profile.GetProperty("business_name").GetString().Should().Be("Repair Coop");
        step1Profile.GetProperty("display_name").GetString().Should().Be("Repair Coop Basel");
        step1Profile.GetProperty("business_registration").GetString().Should().Be("CHE-123.456.789");

        var step2 = await Client.PostAsJsonAsync("/api/v2/merchant-onboarding/step-2", new
        {
            business_address = new
            {
                street = "Marktgasse 1",
                city = "Basel",
                postal_code = "4001",
                country = "CH"
            },
            opening_hours = new
            {
                mon = new { open = "09:00", close = "18:00" },
                sun = (object?)null
            }
        });

        step2.StatusCode.Should().Be(HttpStatusCode.OK);
        var step2Json = await step2.Content.ReadFromJsonAsync<JsonElement>();
        var step2Profile = step2Json.GetProperty("data").GetProperty("profile");
        step2Profile.GetProperty("business_address").GetProperty("city").GetString().Should().Be("Basel");
        step2Profile.GetProperty("opening_hours").GetProperty("mon").GetProperty("open").GetString().Should().Be("09:00");

        var step3 = await Client.PostAsJsonAsync("/api/v2/merchant-onboarding/step-3", new
        {
            avatar_url = "https://cdn.example.test/repair-avatar.png",
            cover_image_url = "https://cdn.example.test/repair-cover.png"
        });

        step3.StatusCode.Should().Be(HttpStatusCode.OK);
        var step3Json = await step3.Content.ReadFromJsonAsync<JsonElement>();
        var step3Profile = step3Json.GetProperty("data").GetProperty("profile");
        step3Profile.GetProperty("avatar_url").GetString().Should().Be("https://cdn.example.test/repair-avatar.png");
        step3Profile.GetProperty("cover_image_url").GetString().Should().Be("https://cdn.example.test/repair-cover.png");

        var completed = await Client.PostAsJsonAsync("/api/v2/merchant-onboarding/complete", new { });

        completed.StatusCode.Should().Be(HttpStatusCode.OK);
        var completedJson = await completed.Content.ReadFromJsonAsync<JsonElement>();
        var completedData = completedJson.GetProperty("data");
        completedData.GetProperty("badge_granted").GetBoolean().Should().BeTrue();
        completedData.GetProperty("onboarding_completed_at").GetString().Should().NotBeNullOrWhiteSpace();

        var final = await Client.GetAsync("/api/v2/merchant-onboarding/status");
        var finalJson = await final.Content.ReadFromJsonAsync<JsonElement>();
        var finalData = finalJson.GetProperty("data");
        finalData.GetProperty("has_profile").GetBoolean().Should().BeTrue();
        finalData.GetProperty("onboarding_completed").GetBoolean().Should().BeTrue();
        finalData.GetProperty("profile").GetProperty("business_name").GetString().Should().Be("Repair Coop");
    }

    [Fact]
    public async Task PromotionProductsV2_MatchesLaravelReactSelectorContract()
    {
        Client.DefaultRequestHeaders.Add("X-Tenant-ID", TestData.Tenant1.Id.ToString());
        var response = await Client.GetAsync("/api/v2/marketplace/promotions/products");
        Client.DefaultRequestHeaders.Remove("X-Tenant-ID");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        var products = json.GetProperty("data").EnumerateArray().ToArray();

        products.Should().Contain(product =>
            product.GetProperty("type").GetString() == "bump" &&
            product.GetProperty("label").GetString() == "Bump to Top" &&
            product.GetProperty("description").GetString()!.Contains("top") &&
            product.GetProperty("price").GetDecimal() == 0m &&
            product.GetProperty("currency").GetString() == "EUR" &&
            product.GetProperty("duration_hours").GetInt32() == 24);

        products.Should().Contain(product =>
            product.GetProperty("type").GetString() == "featured" &&
            product.GetProperty("label").GetString() == "Featured Listing" &&
            product.GetProperty("price").GetDecimal() == 4.99m &&
            product.GetProperty("duration_hours").GetInt32() == 168);

        products.Should().Contain(product =>
            product.GetProperty("type").GetString() == "homepage_carousel" &&
            product.GetProperty("label").GetString() == "Homepage Carousel" &&
            product.GetProperty("price").GetDecimal() == 9.99m &&
            product.GetProperty("duration_hours").GetInt32() == 48);
    }

    [Fact]
    public async Task PromoteListingV2_AcceptsLaravelReactPromotionTypePayload()
    {
        await AuthenticateAsMemberAsync();
        var create = await Client.PostAsJsonAsync("/api/v2/marketplace/listings", new
        {
            title = "Promotable bicycle",
            description = "A city bicycle ready for a new rider",
            price = 95,
            price_type = "fixed",
            condition = "good",
            status = "active"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var listingId = created.GetProperty("data").GetProperty("id").GetInt32();

        var response = await Client.PostAsJsonAsync($"/api/v2/marketplace/listings/{listingId}/promote", new
        {
            promotion_type = "homepage_carousel"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = json.GetProperty("data");
        data.GetProperty("promotion_type").GetString().Should().Be("homepage_carousel");
        data.GetProperty("currency").GetString().Should().Be("EUR");
        data.GetProperty("amount_paid").GetDecimal().Should().Be(9.99m);
        data.GetProperty("is_active").GetBoolean().Should().BeTrue();
        data.GetProperty("expires_at").GetString().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task CommunityDeliveryOfferV2_AcceptsLaravelReactPayloadAndReturnsOfferShape()
    {
        var orderId = await CreateCommunityDeliveryOrderAsync();
        await AuthenticateAsMemberAsync();

        var response = await Client.PostAsJsonAsync($"/api/v2/marketplace/orders/{orderId}/delivery-offers", new
        {
            time_credits = 2.5m,
            estimated_minutes = 45,
            notes = "I can deliver by bike this afternoon"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("data").GetProperty("order_id").GetInt32().Should().Be(orderId);
        json.GetProperty("data").GetProperty("deliverer_id").GetInt32().Should().Be(TestData.MemberUser.Id);
        json.GetProperty("data").GetProperty("time_credits").GetDecimal().Should().Be(2.5m);
        json.GetProperty("data").GetProperty("estimated_minutes").ValueKind.Should().Be(JsonValueKind.Null);
        json.GetProperty("data").GetProperty("notes").ValueKind.Should().Be(JsonValueKind.Null);
        json.GetProperty("data").GetProperty("status").GetString().Should().Be("pending");
        json.GetProperty("data").GetProperty("accepted_at").ValueKind.Should().Be(JsonValueKind.Null);
        json.GetProperty("data").GetProperty("completed_at").ValueKind.Should().Be(JsonValueKind.Null);
        json.GetProperty("data").GetProperty("created_at").GetString().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task CommunityDeliveryOffersV2_ReturnsLaravelReactListShape()
    {
        var orderId = await CreateCommunityDeliveryOrderAsync();
        await AuthenticateAsMemberAsync();
        var create = await Client.PostAsJsonAsync($"/api/v2/marketplace/orders/{orderId}/delivery-offers", new
        {
            time_credits = 1.75m
        });
        create.StatusCode.Should().Be(HttpStatusCode.Created);

        await AuthenticateAsAdminAsync();
        var response = await Client.GetAsync($"/api/v2/marketplace/orders/{orderId}/delivery-offers");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var offer = json.GetProperty("data").EnumerateArray().Should().ContainSingle().Subject;
        offer.GetProperty("order_id").GetInt32().Should().Be(orderId);
        offer.GetProperty("deliverer_id").GetInt32().Should().Be(TestData.MemberUser.Id);
        offer.GetProperty("time_credits").GetDecimal().Should().Be(1.75m);
        offer.GetProperty("status").GetString().Should().Be("pending");
        var deliverer = offer.GetProperty("deliverer");
        deliverer.GetProperty("id").GetInt32().Should().Be(TestData.MemberUser.Id);
        deliverer.GetProperty("name").GetString().Should().Be("Member User");
        deliverer.GetProperty("avatar_url").ValueKind.Should().Be(JsonValueKind.Null);
        deliverer.GetProperty("is_verified").ValueKind.Should().BeOneOf(JsonValueKind.True, JsonValueKind.False);
    }

    [Fact]
    public async Task CommunityDeliveryOfferActionsV2_ReturnLaravelReactMessageContract()
    {
        var orderId = await CreateCommunityDeliveryOrderAsync();
        await AuthenticateAsMemberAsync();
        var create = await Client.PostAsJsonAsync($"/api/v2/marketplace/orders/{orderId}/delivery-offers", new
        {
            time_credits = 1.25m
        });
        create.StatusCode.Should().Be(HttpStatusCode.Created);

        await AuthenticateAsAdminAsync();
        var accept = await Client.PutAsJsonAsync(
            $"/api/v2/marketplace/orders/{orderId}/delivery-offers/{TestData.MemberUser.Id}/accept",
            new { });

        accept.StatusCode.Should().Be(HttpStatusCode.OK);
        var acceptJson = await accept.Content.ReadFromJsonAsync<JsonElement>();
        acceptJson.GetProperty("data").GetProperty("message").GetString().Should().NotBeNullOrWhiteSpace();

        var acceptedList = await Client.GetAsync($"/api/v2/marketplace/orders/{orderId}/delivery-offers");
        var acceptedOffer = (await acceptedList.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data").EnumerateArray().Should().ContainSingle().Subject;
        acceptedOffer.GetProperty("status").GetString().Should().Be("accepted");

        var confirm = await Client.PutAsJsonAsync(
            $"/api/v2/marketplace/orders/{orderId}/delivery-offers/{TestData.MemberUser.Id}/confirm",
            new { });

        confirm.StatusCode.Should().Be(HttpStatusCode.OK);
        var confirmJson = await confirm.Content.ReadFromJsonAsync<JsonElement>();
        confirmJson.GetProperty("data").GetProperty("message").GetString().Should().NotBeNullOrWhiteSpace();

        var completedList = await Client.GetAsync($"/api/v2/marketplace/orders/{orderId}/delivery-offers");
        var completedOffer = (await completedList.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data").EnumerateArray().Should().ContainSingle().Subject;
        completedOffer.GetProperty("status").GetString().Should().Be("completed");
    }

    [Fact]
    public async Task MarketplaceOfferV2_AcceptsLaravelReactPayloadAndReturnsSuccessEnvelope()
    {
        var listingId = await CreateMarketplaceListingAsync();
        await AuthenticateAsMemberAsync();

        var response = await Client.PostAsJsonAsync($"/api/v2/marketplace/listings/{listingId}/offers", new
        {
            amount = 42.50m,
            currency = "EUR",
            message = "I can collect this week"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = json.GetProperty("data");
        data.GetProperty("marketplace_listing_id").GetInt32().Should().Be(listingId);
        data.GetProperty("buyer_id").GetInt32().Should().Be(TestData.MemberUser.Id);
        data.GetProperty("seller_id").GetInt32().Should().Be(TestData.AdminUser.Id);
        data.GetProperty("amount").GetDecimal().Should().Be(42.50m);
        data.GetProperty("currency").GetString().Should().Be("EUR");
        data.GetProperty("message").GetString().Should().Be("I can collect this week");
        data.GetProperty("status").GetString().Should().Be("pending");
        data.GetProperty("counter_amount").ValueKind.Should().Be(JsonValueKind.Null);
        data.GetProperty("counter_message").ValueKind.Should().Be(JsonValueKind.Null);
        data.GetProperty("created_at").GetString().Should().NotBeNullOrWhiteSpace();
    }

    private async Task<int> CreateMarketplaceListingAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();

        var listing = new MarketplaceListing
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.AdminUser.Id,
            Title = "Offer-ready marketplace listing",
            Description = "A listing that accepts buyer offers",
            Price = 50m,
            PriceCurrency = "EUR",
            Status = "active",
            MarketplaceStatus = "available",
            ModerationStatus = "approved"
        };
        db.MarketplaceListings.Add(listing);
        await db.SaveChangesAsync();

        return listing.Id;
    }

    private async Task<int> CreateCommunityDeliveryOrderAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();

        var buyer = new User
        {
            TenantId = TestData.Tenant1.Id,
            Email = $"marketplace-buyer-{Guid.NewGuid():N}@example.test",
            PasswordHash = "unused",
            FirstName = "Market",
            LastName = "Buyer",
            Role = "member",
            IsActive = true,
            EmailVerifiedAt = DateTime.UtcNow
        };
        db.Users.Add(buyer);
        await db.SaveChangesAsync();

        var listing = new MarketplaceListing
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.AdminUser.Id,
            Title = "Community delivery table",
            Description = "A small table that needs community delivery",
            Status = "active",
            MarketplaceStatus = "available",
            ModerationStatus = "approved",
            DeliveryMethod = "community_delivery"
        };
        db.MarketplaceListings.Add(listing);
        await db.SaveChangesAsync();

        var order = new MarketplaceOrder
        {
            TenantId = TestData.Tenant1.Id,
            MarketplaceListingId = listing.Id,
            BuyerUserId = buyer.Id,
            SellerUserId = TestData.AdminUser.Id,
            Status = "confirmed",
            DeliveryMethod = "community_delivery"
        };
        db.MarketplaceOrders.Add(order);
        await db.SaveChangesAsync();

        return order.Id;
    }
}
