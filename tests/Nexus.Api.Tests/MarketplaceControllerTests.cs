// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Net.Http.Headers;
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

    [Fact]
    public async Task MarketplaceMyOffersV2_ReturnsReactListShapeAndActionEnvelopes()
    {
        var listingId = await CreateMarketplaceListingAsync();
        await AuthenticateAsMemberAsync();
        var create = await Client.PostAsJsonAsync($"/api/v2/marketplace/listings/{listingId}/offers", new
        {
            amount = 40m,
            currency = "EUR",
            message = "Could pick up tomorrow"
        });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var offerId = (await create.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data").GetProperty("id").GetInt32();

        var sent = await Client.GetAsync("/api/v2/marketplace/my-offers/sent?limit=20");

        sent.StatusCode.Should().Be(HttpStatusCode.OK);
        var sentJson = await sent.Content.ReadFromJsonAsync<JsonElement>();
        sentJson.GetProperty("success").GetBoolean().Should().BeTrue();
        sentJson.GetProperty("meta").GetProperty("has_more").GetBoolean().Should().BeFalse();
        sentJson.GetProperty("meta").GetProperty("cursor").ValueKind.Should().Be(JsonValueKind.Null);
        var sentOffer = sentJson.GetProperty("data").EnumerateArray().Should().ContainSingle().Subject;
        sentOffer.GetProperty("id").GetInt32().Should().Be(offerId);
        sentOffer.GetProperty("listing").GetProperty("id").GetInt32().Should().Be(listingId);
        sentOffer.GetProperty("listing").GetProperty("title").GetString().Should().Be("Offer-ready marketplace listing");
        sentOffer.GetProperty("seller").GetProperty("id").GetInt32().Should().Be(TestData.AdminUser.Id);
        sentOffer.GetProperty("seller").GetProperty("name").GetString().Should().NotBeNullOrWhiteSpace();

        await AuthenticateAsAdminAsync();
        var received = await Client.GetAsync("/api/v2/marketplace/my-offers/received?limit=20");

        received.StatusCode.Should().Be(HttpStatusCode.OK);
        var receivedJson = await received.Content.ReadFromJsonAsync<JsonElement>();
        receivedJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var receivedOffer = receivedJson.GetProperty("data").EnumerateArray().Should().ContainSingle().Subject;
        receivedOffer.GetProperty("buyer").GetProperty("id").GetInt32().Should().Be(TestData.MemberUser.Id);
        receivedOffer.GetProperty("buyer").GetProperty("name").GetString().Should().NotBeNullOrWhiteSpace();

        var counter = await Client.PutAsJsonAsync($"/api/v2/marketplace/offers/{offerId}/counter", new
        {
            amount = 45m,
            message = "Meet halfway?"
        });

        counter.StatusCode.Should().Be(HttpStatusCode.OK);
        var counterJson = await counter.Content.ReadFromJsonAsync<JsonElement>();
        counterJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var counterData = counterJson.GetProperty("data");
        counterData.GetProperty("status").GetString().Should().Be("countered");
        counterData.GetProperty("counter_amount").GetDecimal().Should().Be(45m);
        counterData.GetProperty("counter_message").GetString().Should().Be("Meet halfway?");

        await AuthenticateAsMemberAsync();
        var acceptCounter = await Client.PutAsJsonAsync($"/api/v2/marketplace/offers/{offerId}/accept-counter", new { });

        acceptCounter.StatusCode.Should().Be(HttpStatusCode.OK);
        var acceptCounterJson = await acceptCounter.Content.ReadFromJsonAsync<JsonElement>();
        acceptCounterJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var acceptedOffer = acceptCounterJson.GetProperty("data");
        acceptedOffer.GetProperty("status").GetString().Should().Be("accepted");
        acceptedOffer.GetProperty("amount").GetDecimal().Should().Be(45m);
    }

    [Fact]
    public async Task MarketplaceSellerCouponsV2_MatchesLaravelReactCrudContract()
    {
        await AuthenticateAsAdminAsync();
        var code = $"SAVE{Guid.NewGuid():N}"[..12].ToUpperInvariant();
        var validFrom = DateTime.UtcNow.AddDays(1);
        var validUntil = DateTime.UtcNow.AddDays(14);

        var create = await Client.PostAsJsonAsync("/api/v2/marketplace/seller/coupons", new
        {
            code,
            title = "Spring repair discount",
            description = "Discount for repair cafe orders",
            discount_type = "percent",
            discount_value = 15,
            min_order_cents = 2500,
            max_uses = 20,
            max_uses_per_member = 2,
            valid_from = validFrom,
            valid_until = validUntil,
            status = "active",
            applies_to = "all_listings"
        });

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var createJson = await create.Content.ReadFromJsonAsync<JsonElement>();
        createJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var created = createJson.GetProperty("data");
        var couponId = created.GetProperty("id").GetInt32();
        created.GetProperty("seller_id").GetInt32().Should().Be(TestData.AdminUser.Id);
        created.GetProperty("code").GetString().Should().Be(code);
        created.GetProperty("title").GetString().Should().Be("Spring repair discount");
        created.GetProperty("description").GetString().Should().Be("Discount for repair cafe orders");
        created.GetProperty("discount_type").GetString().Should().Be("percent");
        created.GetProperty("discount_value").GetDecimal().Should().Be(15m);
        created.GetProperty("min_order_cents").GetInt32().Should().Be(2500);
        created.GetProperty("max_uses").GetInt32().Should().Be(20);
        created.GetProperty("max_uses_per_member").GetInt32().Should().Be(2);
        created.GetProperty("valid_from").GetString().Should().NotBeNullOrWhiteSpace();
        created.GetProperty("valid_until").GetString().Should().NotBeNullOrWhiteSpace();
        created.GetProperty("status").GetString().Should().Be("active");
        created.GetProperty("applies_to").GetString().Should().Be("all_listings");
        created.GetProperty("usage_count").GetInt32().Should().Be(0);
        created.GetProperty("created_at").GetString().Should().NotBeNullOrWhiteSpace();

        var list = await Client.GetAsync("/api/v2/marketplace/seller/coupons");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var listed = listJson.GetProperty("data").GetProperty("items").EnumerateArray()
            .Should().ContainSingle(c => c.GetProperty("id").GetInt32() == couponId).Subject;
        listed.GetProperty("code").GetString().Should().Be(code);
        listed.GetProperty("title").GetString().Should().Be("Spring repair discount");
        listed.GetProperty("status").GetString().Should().Be("active");

        var update = await Client.PutAsJsonAsync($"/api/v2/marketplace/seller/coupons/{couponId}", new
        {
            title = "Updated repair discount",
            discount_type = "fixed",
            discount_value = 500,
            max_uses_per_member = 1,
            status = "paused",
            applies_to = "category_ids"
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateJson = await update.Content.ReadFromJsonAsync<JsonElement>();
        updateJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var updated = updateJson.GetProperty("data");
        updated.GetProperty("id").GetInt32().Should().Be(couponId);
        updated.GetProperty("title").GetString().Should().Be("Updated repair discount");
        updated.GetProperty("discount_type").GetString().Should().Be("fixed");
        updated.GetProperty("discount_value").GetDecimal().Should().Be(500m);
        updated.GetProperty("max_uses_per_member").GetInt32().Should().Be(1);
        updated.GetProperty("status").GetString().Should().Be("paused");
        updated.GetProperty("applies_to").GetString().Should().Be("category_ids");

        var delete = await Client.DeleteAsync($"/api/v2/marketplace/seller/coupons/{couponId}");

        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteJson = await delete.Content.ReadFromJsonAsync<JsonElement>();
        deleteJson.GetProperty("success").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("deleted").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task MarketplaceBuyNowV2_AcceptsReactOrderPayloadAndCouponValidation()
    {
        var listingId = await CreateMarketplaceListingAsync();
        var couponCode = await CreateActiveMarketplaceCouponAsync("percent", 10m);

        await AuthenticateAsMemberAsync();
        var validate = await Client.PostAsJsonAsync("/api/v2/coupons/validate", new
        {
            code = couponCode,
            order_total_cents = 5000,
            listing_id = listingId
        });

        validate.StatusCode.Should().Be(HttpStatusCode.OK);
        var validateJson = await validate.Content.ReadFromJsonAsync<JsonElement>();
        validateJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var couponData = validateJson.GetProperty("data");
        couponData.GetProperty("discount_cents").GetInt32().Should().Be(500);
        couponData.GetProperty("coupon").GetProperty("code").GetString().Should().Be(couponCode);

        var createOrder = await Client.PostAsJsonAsync("/api/v2/marketplace/orders", new
        {
            listing_id = listingId,
            quantity = 1,
            coupon_code = couponCode
        });

        createOrder.StatusCode.Should().Be(HttpStatusCode.Created);
        var orderJson = await createOrder.Content.ReadFromJsonAsync<JsonElement>();
        orderJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var order = orderJson.GetProperty("data");
        order.GetProperty("id").GetInt32().Should().BeGreaterThan(0);
        order.GetProperty("listing_id").GetInt32().Should().Be(listingId);
        order.GetProperty("buyer_id").GetInt32().Should().Be(TestData.MemberUser.Id);
        order.GetProperty("seller_id").GetInt32().Should().Be(TestData.AdminUser.Id);
        order.GetProperty("status").GetString().Should().Be("pending");
        order.GetProperty("order_number").GetString().Should().NotBeNullOrWhiteSpace();
        order.GetProperty("total_cents").GetInt32().Should().Be(5000);
        order.GetProperty("currency").GetString().Should().Be("EUR");

        var createIntent = await Client.PostAsJsonAsync("/api/v2/marketplace/payments/create-intent", new
        {
            order_id = order.GetProperty("id").GetInt32()
        });

        createIntent.StatusCode.Should().Be(HttpStatusCode.OK);
        var intentJson = await createIntent.Content.ReadFromJsonAsync<JsonElement>();
        intentJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var intent = intentJson.GetProperty("data");
        intent.GetProperty("client_secret").GetString().Should().NotBeNullOrWhiteSpace();
        intent.GetProperty("payment_intent_id").GetString().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task MarketplaceListingBrowseDetailV2_ReturnsLaravelReactShapeAndActions()
    {
        var (listingId, otherListingId, categoryId) = await CreateBrowseListingsForMemberAsync();

        await AuthenticateAsMemberAsync();
        var list = await Client.GetAsync($"/api/v2/marketplace/listings?category_id={categoryId}&limit=1");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.GetProperty("success").GetBoolean().Should().BeTrue();
        listJson.GetProperty("meta").GetProperty("per_page").GetInt32().Should().Be(1);
        listJson.GetProperty("meta").GetProperty("has_more").GetBoolean().Should().BeTrue();
        var cursor = listJson.GetProperty("meta").GetProperty("cursor").GetString();
        cursor.Should().NotBeNullOrWhiteSpace();

        var item = listJson.GetProperty("data").EnumerateArray().Should().ContainSingle().Subject;
        item.GetProperty("id").GetInt32().Should().Be(listingId);
        item.GetProperty("title").GetString().Should().Be("React browse listing");
        item.GetProperty("tagline").GetString().Should().Be("Laravel React card shape");
        item.GetProperty("price").GetDecimal().Should().Be(12.50m);
        item.GetProperty("price_currency").GetString().Should().Be("EUR");
        item.GetProperty("price_type").GetString().Should().Be("fixed");
        item.GetProperty("time_credit_price").GetDecimal().Should().Be(1.5m);
        item.GetProperty("condition").GetString().Should().Be("good");
        item.GetProperty("location").GetString().Should().Be("Market Square");
        item.GetProperty("delivery_method").GetString().Should().Be("pickup");
        item.GetProperty("seller_type").GetString().Should().Be("private");
        item.GetProperty("status").GetString().Should().Be("active");
        item.GetProperty("image").GetProperty("url").GetString().Should().Be("/uploads/marketplace/react-browse.jpg");
        item.GetProperty("image").GetProperty("thumbnail_url").GetString().Should().Be("/uploads/marketplace/react-browse.jpg");
        item.GetProperty("image_count").GetInt32().Should().Be(1);
        item.GetProperty("category").GetProperty("id").GetInt32().Should().Be(categoryId);
        item.GetProperty("category").GetProperty("name").GetString().Should().Be("React Browse");
        item.GetProperty("user").GetProperty("id").GetInt32().Should().Be(TestData.AdminUser.Id);
        item.GetProperty("user").GetProperty("name").GetString().Should().NotBeNullOrWhiteSpace();
        item.GetProperty("is_saved").GetBoolean().Should().BeTrue();
        item.GetProperty("is_own").GetBoolean().Should().BeFalse();
        item.GetProperty("is_promoted").GetBoolean().Should().BeTrue();
        item.GetProperty("views_count").GetInt32().Should().Be(3);
        item.GetProperty("created_at").GetString().Should().NotBeNullOrWhiteSpace();

        var nextPage = await Client.GetAsync($"/api/v2/marketplace/listings?category_id={categoryId}&limit=1&cursor={Uri.EscapeDataString(cursor!)}");
        nextPage.StatusCode.Should().Be(HttpStatusCode.OK);
        var nextJson = await nextPage.Content.ReadFromJsonAsync<JsonElement>();
        nextJson.GetProperty("success").GetBoolean().Should().BeTrue();
        nextJson.GetProperty("data").EnumerateArray().Should().ContainSingle()
            .Which.GetProperty("id").GetInt32().Should().Be(otherListingId);

        var detail = await Client.GetAsync($"/api/v2/marketplace/listings/{listingId}");

        detail.StatusCode.Should().Be(HttpStatusCode.OK);
        var detailJson = await detail.Content.ReadFromJsonAsync<JsonElement>();
        detailJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var detailData = detailJson.GetProperty("data");
        detailData.GetProperty("id").GetInt32().Should().Be(listingId);
        detailData.GetProperty("description").GetString().Should().Be("A listing shaped for the Laravel React detail page");
        detailData.GetProperty("quantity").GetInt32().Should().Be(4);
        detailData.GetProperty("shipping_available").GetBoolean().Should().BeTrue();
        detailData.GetProperty("local_pickup").GetBoolean().Should().BeTrue();
        detailData.GetProperty("template_data").GetProperty("material").GetString().Should().Be("wood");
        detailData.GetProperty("images").EnumerateArray().Should().ContainSingle()
            .Which.GetProperty("is_primary").GetBoolean().Should().BeTrue();
        detailData.GetProperty("user").GetProperty("member_since").GetString().Should().NotBeNullOrWhiteSpace();
        detailData.GetProperty("is_saved").GetBoolean().Should().BeTrue();
        detailData.GetProperty("is_own").GetBoolean().Should().BeFalse();
        detailData.GetProperty("saves_count").GetInt32().Should().Be(1);

        var unsave = await Client.DeleteAsync($"/api/v2/marketplace/listings/{listingId}/save");

        unsave.StatusCode.Should().Be(HttpStatusCode.OK);
        var unsaveJson = await unsave.Content.ReadFromJsonAsync<JsonElement>();
        unsaveJson.GetProperty("success").GetBoolean().Should().BeTrue();
        unsaveJson.GetProperty("data").GetProperty("saved").GetBoolean().Should().BeFalse();

        var save = await Client.PostAsync($"/api/v2/marketplace/listings/{listingId}/save", null);

        save.StatusCode.Should().Be(HttpStatusCode.Created);
        var saveJson = await save.Content.ReadFromJsonAsync<JsonElement>();
        saveJson.GetProperty("success").GetBoolean().Should().BeTrue();
        saveJson.GetProperty("data").GetProperty("saved").GetBoolean().Should().BeTrue();

        var report = await Client.PostAsJsonAsync($"/api/v2/marketplace/listings/{listingId}/report", new
        {
            reason = "other",
            description = "This needs a closer look"
        });

        report.StatusCode.Should().Be(HttpStatusCode.Created);
        var reportJson = await report.Content.ReadFromJsonAsync<JsonElement>();
        reportJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var reportData = reportJson.GetProperty("data");
        reportData.GetProperty("listing_id").GetInt32().Should().Be(listingId);
        reportData.GetProperty("reporter_id").GetInt32().Should().Be(TestData.MemberUser.Id);
        reportData.GetProperty("reason").GetString().Should().Be("other");
        reportData.GetProperty("details").GetString().Should().Be("This needs a closer look");
    }

    [Fact]
    public async Task MarketplaceSellerManagementV2_ReturnsLaravelReactDashboardRenewAndDeleteContract()
    {
        var ids = await CreateSellerManagementListingsForMemberAsync();

        await AuthenticateAsMemberAsync();
        var dashboard = await Client.GetAsync("/api/v2/marketplace/seller/dashboard");

        dashboard.StatusCode.Should().Be(HttpStatusCode.OK);
        var dashboardJson = await dashboard.Content.ReadFromJsonAsync<JsonElement>();
        dashboardJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var stats = dashboardJson.GetProperty("data");
        stats.GetProperty("active_listings").GetInt32().Should().Be(1);
        stats.GetProperty("draft_listings").GetInt32().Should().Be(1);
        stats.GetProperty("sold_listings").GetInt32().Should().Be(1);
        stats.GetProperty("expired_listings").GetInt32().Should().Be(1);
        stats.GetProperty("total_listings").GetInt32().Should().Be(4);
        stats.GetProperty("total_views").GetInt32().Should().Be(18);
        stats.GetProperty("total_saves").GetInt32().Should().Be(3);
        stats.GetProperty("pending_offers").GetInt32().Should().Be(1);
        stats.GetProperty("total_revenue").GetDecimal().Should().Be(42m);
        stats.GetProperty("revenue_currency").GetString().Should().Be("EUR");

        var list = await Client.GetAsync($"/api/v2/marketplace/listings?user_id={TestData.MemberUser.Id}&status=active&limit=24");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var active = listJson.GetProperty("data").EnumerateArray().Should().ContainSingle().Subject;
        active.GetProperty("id").GetInt32().Should().Be(ids.ActiveId);
        active.GetProperty("is_own").GetBoolean().Should().BeTrue();
        active.GetProperty("status").GetString().Should().Be("active");

        var renew = await Client.PostAsync($"/api/v2/marketplace/listings/{ids.ExpiredId}/renew", null);

        renew.StatusCode.Should().Be(HttpStatusCode.OK);
        var renewJson = await renew.Content.ReadFromJsonAsync<JsonElement>();
        renewJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var renewed = renewJson.GetProperty("data");
        renewed.GetProperty("id").GetInt32().Should().Be(ids.ExpiredId);
        renewed.GetProperty("status").GetString().Should().Be("active");
        renewed.GetProperty("expires_at").GetString().Should().NotBeNullOrWhiteSpace();
        renewed.GetProperty("is_own").GetBoolean().Should().BeTrue();

        var delete = await Client.DeleteAsync($"/api/v2/marketplace/listings/{ids.DraftId}");

        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteJson = await delete.Content.ReadFromJsonAsync<JsonElement>();
        deleteJson.GetProperty("success").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("deleted").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("id").GetInt32().Should().Be(ids.DraftId);
    }

    [Fact]
    public async Task MarketplaceCreateEditMediaV2_AcceptsLaravelReactPayloadsAndMultipartUploads()
    {
        var categoryId = await CreateMarketplaceCategoryAsync();

        await AuthenticateAsMemberAsync();
        var generate = await Client.PostAsJsonAsync("/api/v2/marketplace/listings/generate-description", new
        {
            title = "Restored coffee table",
            category = "Furniture",
            condition = "good"
        });

        generate.StatusCode.Should().Be(HttpStatusCode.OK);
        var generateJson = await generate.Content.ReadFromJsonAsync<JsonElement>();
        generateJson.GetProperty("success").GetBoolean().Should().BeTrue();
        generateJson.GetProperty("data").GetProperty("description").GetString().Should().Contain("Restored coffee table");

        var create = await Client.PostAsJsonAsync("/api/v2/marketplace/listings", new
        {
            title = "Restored coffee table",
            description = "Solid table with light wear and easy pickup",
            condition = "good",
            price_type = "fixed",
            price = 18.5m,
            price_currency = "EUR",
            category_id = categoryId,
            delivery_method = "pickup",
            quantity = 2,
            status = "active",
            template_data = new { material = "wood", dimensions = "90x60" }
        });

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var createJson = await create.Content.ReadFromJsonAsync<JsonElement>();
        createJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var created = createJson.GetProperty("data");
        var listingId = created.GetProperty("id").GetInt32();
        created.GetProperty("template_data").GetProperty("material").GetString().Should().Be("wood");

        using var imagesForm = new MultipartFormDataContent();
        var imageContent = new ByteArrayContent(new byte[] { 0x89, 0x50, 0x4e, 0x47 });
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        imagesForm.Add(imageContent, "images[0]", "table.png");

        var uploadImages = await Client.PostAsync($"/api/v2/marketplace/listings/{listingId}/images", imagesForm);

        uploadImages.StatusCode.Should().Be(HttpStatusCode.Created);
        var uploadImagesJson = await uploadImages.Content.ReadFromJsonAsync<JsonElement>();
        uploadImagesJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var uploadedImage = uploadImagesJson.GetProperty("data").EnumerateArray().Should().ContainSingle().Subject;
        var imageId = uploadedImage.GetProperty("id").GetInt32();
        uploadedImage.GetProperty("url").GetString().Should().Contain("table.png");
        uploadedImage.GetProperty("thumbnail_url").GetString().Should().Contain("table.png");
        uploadedImage.GetProperty("alt_text").GetString().Should().Be("table.png");
        uploadedImage.GetProperty("is_primary").GetBoolean().Should().BeTrue();

        using var videoForm = new MultipartFormDataContent();
        var videoContent = new ByteArrayContent(new byte[] { 0, 0, 0, 24 });
        videoContent.Headers.ContentType = new MediaTypeHeaderValue("video/mp4");
        videoForm.Add(videoContent, "video", "table.mp4");

        var uploadVideo = await Client.PostAsync($"/api/v2/marketplace/listings/{listingId}/video", videoForm);

        uploadVideo.StatusCode.Should().Be(HttpStatusCode.Created);
        var uploadVideoJson = await uploadVideo.Content.ReadFromJsonAsync<JsonElement>();
        uploadVideoJson.GetProperty("success").GetBoolean().Should().BeTrue();
        uploadVideoJson.GetProperty("data").GetProperty("video_url").GetString().Should().Contain("table.mp4");

        var update = await Client.PutAsJsonAsync($"/api/v2/marketplace/listings/{listingId}", new
        {
            title = "Updated coffee table",
            description = "Updated listing description",
            condition = "like_new",
            price_type = "fixed",
            price = 20m,
            price_currency = "EUR",
            delivery_method = "pickup",
            quantity = 3,
            template_data = new { material = "oak" }
        });

        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updateJson = await update.Content.ReadFromJsonAsync<JsonElement>();
        updateJson.GetProperty("success").GetBoolean().Should().BeTrue();
        updateJson.GetProperty("data").GetProperty("title").GetString().Should().Be("Updated coffee table");
        updateJson.GetProperty("data").GetProperty("template_data").GetProperty("material").GetString().Should().Be("oak");

        var deleteImage = await Client.DeleteAsync($"/api/v2/marketplace/listings/{listingId}/images/{imageId}");
        deleteImage.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var deleteVideo = await Client.DeleteAsync($"/api/v2/marketplace/listings/{listingId}/video");
        deleteVideo.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task MarketplaceOrderHistoryV2_ReturnsLaravelReactShapeAndShipmentActions()
    {
        var (orderId, listingId) = await CreateShippableOrderForMemberAsync();

        await AuthenticateAsMemberAsync();
        var purchases = await Client.GetAsync("/api/v2/marketplace/orders/purchases?status=paid,shipped&limit=20");

        purchases.StatusCode.Should().Be(HttpStatusCode.OK);
        var purchasesJson = await purchases.Content.ReadFromJsonAsync<JsonElement>();
        purchasesJson.GetProperty("success").GetBoolean().Should().BeTrue();
        purchasesJson.GetProperty("meta").GetProperty("has_more").GetBoolean().Should().BeFalse();
        purchasesJson.GetProperty("meta").GetProperty("cursor").ValueKind.Should().Be(JsonValueKind.Null);
        var purchase = purchasesJson.GetProperty("data").EnumerateArray()
            .Should().ContainSingle(o => o.GetProperty("id").GetInt32() == orderId).Subject;
        purchase.GetProperty("order_number").GetString().Should().NotBeNullOrWhiteSpace();
        purchase.GetProperty("listing_id").GetInt32().Should().Be(listingId);
        purchase.GetProperty("status").GetString().Should().Be("paid");
        purchase.GetProperty("quantity").GetInt32().Should().Be(2);
        purchase.GetProperty("unit_price").GetDecimal().Should().Be(25m);
        purchase.GetProperty("total_price").GetDecimal().Should().Be(50m);
        purchase.GetProperty("currency").GetString().Should().Be("EUR");
        purchase.GetProperty("shipping_method").GetString().Should().Be("standard");
        purchase.GetProperty("tracking_number").ValueKind.Should().Be(JsonValueKind.Null);
        purchase.GetProperty("tracking_url").ValueKind.Should().Be(JsonValueKind.Null);
        purchase.GetProperty("listing").GetProperty("id").GetInt32().Should().Be(listingId);
        purchase.GetProperty("listing").GetProperty("title").GetString().Should().Be("Order history shelf");
        purchase.GetProperty("listing").GetProperty("image").ValueKind.Should().Be(JsonValueKind.Null);
        purchase.GetProperty("seller").GetProperty("id").GetInt32().Should().Be(TestData.AdminUser.Id);
        purchase.GetProperty("seller").GetProperty("name").GetString().Should().NotBeNullOrWhiteSpace();
        purchase.GetProperty("buyer").GetProperty("id").GetInt32().Should().Be(TestData.MemberUser.Id);
        purchase.GetProperty("ratings").ValueKind.Should().Be(JsonValueKind.Array);

        await AuthenticateAsAdminAsync();
        var sales = await Client.GetAsync("/api/v2/marketplace/orders/sales?status=paid&limit=20");

        sales.StatusCode.Should().Be(HttpStatusCode.OK);
        var salesJson = await sales.Content.ReadFromJsonAsync<JsonElement>();
        salesJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var sale = salesJson.GetProperty("data").EnumerateArray()
            .Should().ContainSingle(o => o.GetProperty("id").GetInt32() == orderId).Subject;
        sale.GetProperty("buyer").GetProperty("id").GetInt32().Should().Be(TestData.MemberUser.Id);
        sale.GetProperty("buyer").GetProperty("name").GetString().Should().NotBeNullOrWhiteSpace();

        var ship = await Client.PutAsJsonAsync($"/api/v2/marketplace/orders/{orderId}/ship", new
        {
            tracking_number = "TRACK-123",
            tracking_url = "https://carrier.example/track/TRACK-123",
            shipping_method = "tracked"
        });

        ship.StatusCode.Should().Be(HttpStatusCode.OK);
        var shipJson = await ship.Content.ReadFromJsonAsync<JsonElement>();
        shipJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var shipped = shipJson.GetProperty("data");
        shipped.GetProperty("status").GetString().Should().Be("shipped");
        shipped.GetProperty("tracking_number").GetString().Should().Be("TRACK-123");
        shipped.GetProperty("tracking_url").GetString().Should().Be("https://carrier.example/track/TRACK-123");
        shipped.GetProperty("shipping_method").GetString().Should().Be("tracked");
        shipped.GetProperty("shipped_at").GetString().Should().NotBeNullOrWhiteSpace();

        await AuthenticateAsMemberAsync();
        var confirm = await Client.PutAsync($"/api/v2/marketplace/orders/{orderId}/confirm-delivery", null);

        confirm.StatusCode.Should().Be(HttpStatusCode.OK);
        var confirmJson = await confirm.Content.ReadFromJsonAsync<JsonElement>();
        confirmJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var delivered = confirmJson.GetProperty("data");
        delivered.GetProperty("status").GetString().Should().Be("delivered");
        delivered.GetProperty("tracking_number").GetString().Should().Be("TRACK-123");
        delivered.GetProperty("tracking_url").GetString().Should().Be("https://carrier.example/track/TRACK-123");
        delivered.GetProperty("delivered_at").GetString().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task MarketplacePickupSlotsV2_MatchesLaravelReactSellerContract()
    {
        await AuthenticateAsAdminAsync();
        var start = DateTime.UtcNow.AddDays(2).Date.AddHours(10);
        var end = start.AddHours(2);

        var create = await Client.PostAsJsonAsync("/api/v2/marketplace/seller/pickup-slots", new
        {
            slot_start = start,
            slot_end = end,
            capacity = 3,
            is_recurring = true,
            is_active = true
        });

        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var createJson = await create.Content.ReadFromJsonAsync<JsonElement>();
        createJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var created = createJson.GetProperty("data");
        var slotId = created.GetProperty("id").GetInt32();
        created.GetProperty("slot_start").GetString().Should().NotBeNullOrWhiteSpace();
        created.GetProperty("slot_end").GetString().Should().NotBeNullOrWhiteSpace();
        created.GetProperty("capacity").GetInt32().Should().Be(3);
        created.GetProperty("booked_count").GetInt32().Should().Be(0);
        created.GetProperty("remaining").GetInt32().Should().Be(3);
        created.GetProperty("is_recurring").GetBoolean().Should().BeTrue();
        created.GetProperty("is_active").GetBoolean().Should().BeTrue();

        var list = await Client.GetAsync("/api/v2/marketplace/seller/pickup-slots");

        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var listJson = await list.Content.ReadFromJsonAsync<JsonElement>();
        listJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var slot = listJson.GetProperty("data").EnumerateArray().Should().ContainSingle().Subject;
        slot.GetProperty("id").GetInt32().Should().Be(slotId);
        slot.GetProperty("slot_start").GetString().Should().NotBeNullOrWhiteSpace();
        slot.GetProperty("slot_end").GetString().Should().NotBeNullOrWhiteSpace();
        slot.GetProperty("capacity").GetInt32().Should().Be(3);
        slot.GetProperty("booked_count").GetInt32().Should().Be(0);
        slot.GetProperty("remaining").GetInt32().Should().Be(3);
        slot.GetProperty("is_recurring").GetBoolean().Should().BeTrue();
        slot.GetProperty("is_active").GetBoolean().Should().BeTrue();

        var delete = await Client.DeleteAsync($"/api/v2/marketplace/seller/pickup-slots/{slotId}");

        delete.StatusCode.Should().Be(HttpStatusCode.OK);
        var deleteJson = await delete.Content.ReadFromJsonAsync<JsonElement>();
        deleteJson.GetProperty("success").GetBoolean().Should().BeTrue();
        deleteJson.GetProperty("data").GetProperty("deleted").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task MarketplacePickupReservationV2_MatchesLaravelReactBuyerAndSellerContract()
    {
        var (orderId, listingId) = await CreatePickupOrderForMemberAsync();

        await AuthenticateAsAdminAsync();
        var start = DateTime.UtcNow.AddDays(3).Date.AddHours(14);
        var slotResponse = await Client.PostAsJsonAsync("/api/v2/marketplace/seller/pickup-slots", new
        {
            slot_start = start,
            slot_end = start.AddHours(1),
            capacity = 2,
            is_active = true
        });
        slotResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var slotId = (await slotResponse.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data").GetProperty("id").GetInt32();

        await AuthenticateAsMemberAsync();
        var reserve = await Client.PostAsJsonAsync($"/api/v2/marketplace/orders/{orderId}/pickup-reservation", new
        {
            slot_id = slotId
        });

        reserve.StatusCode.Should().Be(HttpStatusCode.Created);
        var reserveJson = await reserve.Content.ReadFromJsonAsync<JsonElement>();
        reserveJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var reservation = reserveJson.GetProperty("data");
        var reservationId = reservation.GetProperty("id").GetInt32();
        reservation.GetProperty("slot_id").GetInt32().Should().Be(slotId);
        reservation.GetProperty("order_id").GetInt32().Should().Be(orderId);
        reservation.GetProperty("listing_id").GetInt32().Should().Be(listingId);
        var qrCode = reservation.GetProperty("qr_code").GetString();
        qrCode.Should().NotBeNullOrWhiteSpace();
        reservation.GetProperty("status").GetString().Should().Be("reserved");
        reservation.GetProperty("reserved_at").GetString().Should().NotBeNullOrWhiteSpace();

        var mine = await Client.GetAsync("/api/v2/marketplace/me/pickups");

        mine.StatusCode.Should().Be(HttpStatusCode.OK);
        var mineJson = await mine.Content.ReadFromJsonAsync<JsonElement>();
        mineJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var mineReservation = mineJson.GetProperty("data").EnumerateArray().Should().ContainSingle().Subject;
        mineReservation.GetProperty("id").GetInt32().Should().Be(reservationId);
        mineReservation.GetProperty("listing_title").GetString().Should().Be("Click and collect shelf");
        mineReservation.GetProperty("qr_code").GetString().Should().Be(qrCode);
        mineReservation.GetProperty("picked_up_at").ValueKind.Should().Be(JsonValueKind.Null);
        mineReservation.GetProperty("slot").GetProperty("slot_start").GetString().Should().NotBeNullOrWhiteSpace();

        await AuthenticateAsAdminAsync();
        var scan = await Client.PostAsJsonAsync("/api/v2/marketplace/seller/pickup-scan", new
        {
            qr_code = qrCode
        });

        scan.StatusCode.Should().Be(HttpStatusCode.OK);
        var scanJson = await scan.Content.ReadFromJsonAsync<JsonElement>();
        scanJson.GetProperty("success").GetBoolean().Should().BeTrue();
        var scanned = scanJson.GetProperty("data");
        scanned.GetProperty("id").GetInt32().Should().Be(reservationId);
        scanned.GetProperty("order_id").GetInt32().Should().Be(orderId);
        scanned.GetProperty("listing_id").GetInt32().Should().Be(listingId);
        scanned.GetProperty("status").GetString().Should().Be("picked_up");
        scanned.GetProperty("picked_up_at").GetString().Should().NotBeNullOrWhiteSpace();
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

    private async Task<string> CreateActiveMarketplaceCouponAsync(string discountType, decimal discountValue)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var code = $"BUY{Guid.NewGuid():N}"[..12].ToUpperInvariant();

        db.MerchantCoupons.Add(new MerchantCoupon
        {
            TenantId = TestData.Tenant1.Id,
            SellerUserId = TestData.AdminUser.Id,
            Code = code,
            Title = "Buy now discount",
            Description = "Discount for the buy-now flow",
            DiscountType = discountType,
            DiscountAmount = discountValue,
            MaxUsesPerMember = 1,
            Status = "active",
            IsActive = true,
            AppliesTo = "all_listings",
            UsageCount = 0
        });
        await db.SaveChangesAsync();

        return code;
    }

    private async Task<(int ListingId, int OtherListingId, int CategoryId)> CreateBrowseListingsForMemberAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();

        var category = new MarketplaceCategory
        {
            TenantId = TestData.Tenant1.Id,
            Name = "React Browse",
            Slug = $"react-browse-{Guid.NewGuid():N}",
            Icon = "shopping-bag",
            IsActive = true
        };
        db.MarketplaceCategories.Add(category);
        await db.SaveChangesAsync();

        var older = new MarketplaceListing
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.AdminUser.Id,
            CategoryId = category.Id,
            Title = "Older browse listing",
            Description = "A second listing for cursor pagination",
            Price = 5m,
            PriceCurrency = "EUR",
            PriceType = "fixed",
            Condition = "good",
            Status = "active",
            MarketplaceStatus = "available",
            ModerationStatus = "approved",
            CreatedAt = DateTime.UtcNow.AddMinutes(-10)
        };
        db.MarketplaceListings.Add(older);
        await db.SaveChangesAsync();

        var listing = new MarketplaceListing
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.AdminUser.Id,
            CategoryId = category.Id,
            Title = "React browse listing",
            Description = "A listing shaped for the Laravel React detail page",
            Tagline = "Laravel React card shape",
            Price = 12.50m,
            PriceCurrency = "EUR",
            PriceType = "fixed",
            TimeCreditPrice = 1.5m,
            Condition = "good",
            Quantity = 4,
            TemplateDataJson = "{\"material\":\"wood\"}",
            Location = "Market Square",
            Latitude = 47.3769,
            Longitude = 8.5417,
            ShippingAvailable = true,
            LocalPickup = true,
            DeliveryMethod = "pickup",
            SellerType = "private",
            Status = "active",
            MarketplaceStatus = "available",
            ModerationStatus = "approved",
            PromotedUntil = DateTime.UtcNow.AddDays(1),
            ViewsCount = 3,
            SavesCount = 1,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow
        };
        db.MarketplaceListings.Add(listing);
        await db.SaveChangesAsync();

        db.MarketplaceImages.Add(new MarketplaceImage
        {
            TenantId = TestData.Tenant1.Id,
            MarketplaceListingId = listing.Id,
            Url = "/uploads/marketplace/react-browse.jpg",
            AltText = "React browse listing",
            SortOrder = 0
        });
        db.MarketplaceSavedListings.Add(new MarketplaceSavedListing
        {
            TenantId = TestData.Tenant1.Id,
            MarketplaceListingId = listing.Id,
            UserId = TestData.MemberUser.Id
        });
        await db.SaveChangesAsync();

        return (listing.Id, older.Id, category.Id);
    }

    private async Task<(int ActiveId, int DraftId, int SoldId, int ExpiredId)> CreateSellerManagementListingsForMemberAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();

        var active = SellerListing("Seller active listing", "active", views: 10, saves: 2);
        var draft = SellerListing("Seller draft listing", "draft", views: 1, saves: 0);
        var sold = SellerListing("Seller sold listing", "sold", views: 5, saves: 1);
        var expired = SellerListing("Seller expired listing", "expired", views: 2, saves: 0);
        expired.ExpiresAt = DateTime.UtcNow.AddDays(-1);

        db.MarketplaceListings.AddRange(active, draft, sold, expired);
        await db.SaveChangesAsync();

        db.MarketplaceOffers.Add(new MarketplaceOffer
        {
            TenantId = TestData.Tenant1.Id,
            MarketplaceListingId = active.Id,
            BuyerUserId = TestData.AdminUser.Id,
            SellerUserId = TestData.MemberUser.Id,
            Amount = 15m,
            Currency = "EUR",
            Message = "Pending dashboard offer",
            Status = "pending"
        });

        db.MarketplaceOrders.Add(new MarketplaceOrder
        {
            TenantId = TestData.Tenant1.Id,
            MarketplaceListingId = sold.Id,
            BuyerUserId = TestData.AdminUser.Id,
            SellerUserId = TestData.MemberUser.Id,
            Quantity = 1,
            TotalAmount = 42m,
            Currency = "EUR",
            Status = "completed"
        });
        await db.SaveChangesAsync();

        return (active.Id, draft.Id, sold.Id, expired.Id);
    }

    private async Task<int> CreateMarketplaceCategoryAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();

        var category = new MarketplaceCategory
        {
            TenantId = TestData.Tenant1.Id,
            Name = "React Create",
            Slug = $"react-create-{Guid.NewGuid():N}",
            Icon = "chair",
            IsActive = true
        };
        db.MarketplaceCategories.Add(category);
        await db.SaveChangesAsync();
        return category.Id;
    }

    private MarketplaceListing SellerListing(string title, string status, int views, int saves) => new()
    {
        TenantId = TestData.Tenant1.Id,
        UserId = TestData.MemberUser.Id,
        Title = title,
        Description = $"{title} description",
        Price = 10m,
        PriceCurrency = "EUR",
        PriceType = "fixed",
        Condition = "good",
        Status = status,
        MarketplaceStatus = status == "sold" ? "sold" : "available",
        ModerationStatus = status == "active" ? "approved" : status,
        ViewsCount = views,
        SavesCount = saves,
        CreatedAt = DateTime.UtcNow
    };

    private async Task<(int OrderId, int ListingId)> CreateShippableOrderForMemberAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();

        var listing = new MarketplaceListing
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.AdminUser.Id,
            Title = "Order history shelf",
            Description = "A shelf with a paid buyer order",
            Price = 25m,
            PriceCurrency = "EUR",
            Status = "active",
            MarketplaceStatus = "available",
            ModerationStatus = "approved",
            DeliveryMethod = "standard"
        };
        db.MarketplaceListings.Add(listing);
        await db.SaveChangesAsync();

        var order = new MarketplaceOrder
        {
            TenantId = TestData.Tenant1.Id,
            MarketplaceListingId = listing.Id,
            BuyerUserId = TestData.MemberUser.Id,
            SellerUserId = TestData.AdminUser.Id,
            Quantity = 2,
            TotalAmount = 50m,
            Currency = "EUR",
            Status = "paid",
            DeliveryMethod = "standard",
            ShippingAddress = "1 Community Lane"
        };
        db.MarketplaceOrders.Add(order);
        await db.SaveChangesAsync();

        return (order.Id, listing.Id);
    }

    private async Task<(int OrderId, int ListingId)> CreatePickupOrderForMemberAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();

        var listing = new MarketplaceListing
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.AdminUser.Id,
            Title = "Click and collect shelf",
            Description = "A shelf that will be collected in a booked pickup slot",
            Price = 25m,
            PriceCurrency = "EUR",
            Status = "active",
            MarketplaceStatus = "available",
            ModerationStatus = "approved",
            DeliveryMethod = "pickup"
        };
        db.MarketplaceListings.Add(listing);
        await db.SaveChangesAsync();

        var order = new MarketplaceOrder
        {
            TenantId = TestData.Tenant1.Id,
            MarketplaceListingId = listing.Id,
            BuyerUserId = TestData.MemberUser.Id,
            SellerUserId = TestData.AdminUser.Id,
            TotalAmount = 25m,
            Currency = "EUR",
            Status = "confirmed",
            DeliveryMethod = "pickup"
        };
        db.MarketplaceOrders.Add(order);
        await db.SaveChangesAsync();

        return (order.Id, listing.Id);
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
