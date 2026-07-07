// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Nexus.Api.Controllers;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Services;

namespace Nexus.Api.Tests;

public class AdminMarketplaceControllerUnitTests
{
    [Fact]
    public async Task Dashboard_ReturnsLaravelReactMarketplaceAdminStats()
    {
        var tenantContext = CreateTenantContext(42);
        await using var db = CreateDbContext(tenantContext);

        db.MarketplaceListings.AddRange(
            CreateListing(1, userId: 1001, categoryId: null, "Approved active", status: "active", moderationStatus: "approved"),
            CreateListing(2, userId: 1001, categoryId: null, "Pending active", status: "active", moderationStatus: "pending"),
            CreateListing(3, userId: 1001, categoryId: null, "Other tenant", tenantId: 99, status: "active", moderationStatus: "approved"));
        db.MarketplaceSellerProfiles.AddRange(
            new MarketplaceSellerProfile { TenantId = 42, UserId = 1001, DisplayName = "Seller One" },
            new MarketplaceSellerProfile { TenantId = 99, UserId = 9001, DisplayName = "Other Seller" });
        db.MarketplaceOrders.AddRange(
            new MarketplaceOrder { TenantId = 42, MarketplaceListingId = 1, BuyerUserId = 2001, SellerUserId = 1001, Status = "completed", TotalAmount = 25m },
            new MarketplaceOrder { TenantId = 42, MarketplaceListingId = 2, BuyerUserId = 2002, SellerUserId = 1001, Status = "cancelled", TotalAmount = 99m },
            new MarketplaceOrder { TenantId = 99, MarketplaceListingId = 3, BuyerUserId = 2003, SellerUserId = 9001, Status = "completed", TotalAmount = 50m });
        await db.SaveChangesAsync();

        var result = await CreateController(db).Dashboard();

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        var root = document.RootElement;
        root.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = root.GetProperty("data");
        data.GetProperty("total_listings").GetInt32().Should().Be(2);
        data.GetProperty("active_listings").GetInt32().Should().Be(1);
        data.GetProperty("pending_moderation").GetInt32().Should().Be(1);
        data.GetProperty("total_sellers").GetInt32().Should().Be(1);
        data.GetProperty("total_orders").GetInt32().Should().Be(1);
        data.GetProperty("revenue").GetDecimal().Should().Be(25m);
        data.GetProperty("currency").GetString().Should().Be("EUR");
    }

    [Fact]
    public async Task Listings_ReturnsLaravelReactAdminRowsAndPagination()
    {
        var tenantContext = CreateTenantContext(42);
        await using var db = CreateDbContext(tenantContext);

        var category = new MarketplaceCategory
        {
            TenantId = 42,
            Name = "Tools",
            Slug = "tools",
            IsActive = true
        };
        db.MarketplaceCategories.Add(category);
        db.Users.Add(CreateUser(1001, "seller@example.test"));
        await db.SaveChangesAsync();

        db.MarketplaceListings.AddRange(
            CreateListing(1, userId: 1001, category.Id, "Hidden rejected", moderationStatus: "rejected"),
            CreateListing(2, userId: 1001, category.Id, "Visible pending", moderationStatus: "pending"),
            CreateListing(3, userId: 1001, category.Id, "Other tenant pending", tenantId: 99, moderationStatus: "pending"));
        db.MarketplaceImages.Add(new MarketplaceImage
        {
            TenantId = 42,
            MarketplaceListingId = 2,
            Url = "https://cdn.example.test/drill.jpg",
            SortOrder = 0
        });
        await db.SaveChangesAsync();

        var result = await CreateController(db).Listings(page: 1, limit: 20, moderation_status: "pending", q: "Visible");

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        var root = document.RootElement;
        root.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = root.GetProperty("data").EnumerateArray().ToArray();
        data.Should().ContainSingle();
        var row = data[0];
        row.GetProperty("id").GetInt32().Should().Be(2);
        row.GetProperty("title").GetString().Should().Be("Visible pending");
        row.GetProperty("price").GetDecimal().Should().Be(12.50m);
        row.GetProperty("price_currency").GetString().Should().Be("EUR");
        row.GetProperty("price_type").GetString().Should().Be("fixed");
        row.GetProperty("status").GetString().Should().Be("active");
        row.GetProperty("moderation_status").GetString().Should().Be("pending");
        row.GetProperty("seller_type").GetString().Should().Be("private");
        row.GetProperty("views_count").GetInt32().Should().Be(7);
        row.GetProperty("image").GetString().Should().Be("https://cdn.example.test/drill.jpg");
        row.GetProperty("category").GetString().Should().Be("Tools");
        row.GetProperty("user").GetProperty("id").GetInt32().Should().Be(1001);
        row.GetProperty("user").GetProperty("name").GetString().Should().Be("Seller 1001");
        row.GetProperty("created_at").GetString().Should().StartWith("2026-07-08");
        var meta = root.GetProperty("meta");
        meta.GetProperty("total").GetInt32().Should().Be(1);
        meta.GetProperty("page").GetInt32().Should().Be(1);
        meta.GetProperty("per_page").GetInt32().Should().Be(20);
    }

    [Fact]
    public async Task Coupons_ReturnsLaravelReactItemsEnvelopeWithFormattedCouponRows()
    {
        var tenantContext = CreateTenantContext(42);
        await using var db = CreateDbContext(tenantContext);

        db.MerchantCoupons.Add(new MerchantCoupon
        {
            TenantId = 42,
            SellerUserId = 1001,
            Code = "SAVE10",
            Title = "Save ten",
            Description = "Ten percent off",
            DiscountType = "percent",
            DiscountAmount = 10m,
            Status = "active",
            IsActive = true,
            UsageCount = 3,
            ExpiresAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
            CreatedAt = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc)
        });
        db.MerchantCoupons.Add(new MerchantCoupon
        {
            TenantId = 99,
            SellerUserId = 9001,
            Code = "OTHER",
            Title = "Other tenant",
            DiscountType = "fixed",
            DiscountAmount = 500m,
            Status = "active",
            IsActive = true
        });
        await db.SaveChangesAsync();

        var result = await CreateController(db).Coupons();

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        var root = document.RootElement;
        root.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = root.GetProperty("data");
        var items = data.GetProperty("items").EnumerateArray().ToArray();
        items.Should().ContainSingle();
        var item = items[0];
        item.GetProperty("seller_id").GetInt32().Should().Be(1001);
        item.GetProperty("code").GetString().Should().Be("SAVE10");
        item.GetProperty("title").GetString().Should().Be("Save ten");
        item.GetProperty("discount_type").GetString().Should().Be("percent");
        item.GetProperty("discount_value").GetDecimal().Should().Be(10m);
        item.GetProperty("status").GetString().Should().Be("active");
        item.GetProperty("usage_count").GetInt32().Should().Be(3);
        item.GetProperty("valid_until").GetString().Should().StartWith("2026-08-01");
        root.GetProperty("meta").GetProperty("total").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task CouponSuspendAndDelete_ReturnLaravelReactMutationEnvelopes()
    {
        var tenantContext = CreateTenantContext(42);
        await using var db = CreateDbContext(tenantContext);

        var coupon = new MerchantCoupon
        {
            TenantId = 42,
            SellerUserId = 1001,
            Code = "PAUSEME",
            Title = "Pause me",
            DiscountType = "fixed",
            DiscountAmount = 500m,
            Status = "active",
            IsActive = true
        };
        db.MerchantCoupons.Add(coupon);
        await db.SaveChangesAsync();

        var controller = CreateController(db);

        var suspend = await controller.SuspendCoupon(coupon.Id);

        var suspendOk = suspend.Should().BeOfType<OkObjectResult>().Subject;
        using var suspendDocument = JsonDocument.Parse(JsonSerializer.Serialize(suspendOk.Value));
        var suspendRoot = suspendDocument.RootElement;
        suspendRoot.GetProperty("success").GetBoolean().Should().BeTrue();
        var suspended = suspendRoot.GetProperty("data");
        suspended.GetProperty("id").GetInt32().Should().Be(coupon.Id);
        suspended.GetProperty("status").GetString().Should().Be("paused");

        var delete = await controller.DeleteCoupon(coupon.Id);

        var deleteOk = delete.Should().BeOfType<OkObjectResult>().Subject;
        using var deleteDocument = JsonDocument.Parse(JsonSerializer.Serialize(deleteOk.Value));
        var deleteRoot = deleteDocument.RootElement;
        deleteRoot.GetProperty("success").GetBoolean().Should().BeTrue();
        deleteRoot.GetProperty("data").GetProperty("deleted").GetBoolean().Should().BeTrue();
        (await db.MerchantCoupons.AnyAsync(c => c.Id == coupon.Id)).Should().BeFalse();
    }

    private static AdminMarketplaceController CreateController(NexusDbContext db)
        => new(new MarketplaceService(db, NullLogger<MarketplaceService>.Instance), db);

    private static TenantContext CreateTenantContext(int tenantId)
    {
        var tenantContext = new TenantContext();
        tenantContext.SetTenant(tenantId);
        return tenantContext;
    }

    private static NexusDbContext CreateDbContext(TenantContext tenantContext)
    {
        var options = new DbContextOptionsBuilder<NexusDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new NexusDbContext(options, tenantContext);
    }

    private static User CreateUser(int id, string email)
        => new()
        {
            Id = id,
            TenantId = 42,
            Email = email,
            PasswordHash = "hash",
            FirstName = "Seller",
            LastName = id.ToString(),
            Role = "member",
            IsActive = true
        };

    private static MarketplaceListing CreateListing(
        int id,
        int userId,
        int? categoryId,
        string title,
        int tenantId = 42,
        string status = "active",
        string moderationStatus = "pending")
        => new()
        {
            Id = id,
            TenantId = tenantId,
            UserId = userId,
            CategoryId = categoryId,
            Title = title,
            Description = $"{title} description",
            Price = 12.50m,
            PriceCurrency = "EUR",
            PriceType = "fixed",
            Status = status,
            ModerationStatus = moderationStatus,
            SellerType = "private",
            ViewsCount = 7,
            CreatedAt = new DateTime(2026, 7, 8, 9, 0, 0, DateTimeKind.Utc).AddMinutes(id)
        };
}
