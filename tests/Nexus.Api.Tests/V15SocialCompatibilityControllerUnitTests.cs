// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Security.Claims;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Nexus.Api.Controllers;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Services;

namespace Nexus.Api.Tests;

public sealed class V15SocialCompatibilityControllerUnitTests
{
    [Fact]
    public async Task ToggleLikeV2_AcceptsLaravelReactTargetPayloadForPostAndListing()
    {
        var tenant = CreateTenantContext();
        await using var db = CreateDbContext(tenant);
        var controller = CreateController(db, tenant, userId: 2);

        db.Users.Add(new User
        {
            Id = 2,
            TenantId = 1,
            Email = "member@example.test",
            PasswordHash = "hash",
            FirstName = "Member",
            LastName = "User",
            Role = "member",
            IsActive = true
        });
        db.FeedPosts.Add(new FeedPost
        {
            Id = 10,
            TenantId = 1,
            UserId = 1,
            Content = "React likeable post"
        });
        db.Listings.Add(new Listing
        {
            Id = 20,
            TenantId = 1,
            UserId = 1,
            Title = "React likeable listing",
            Description = "Listing liked through the Laravel React feed API",
            Type = ListingType.Offer,
            Status = ListingStatus.Active
        });
        await db.SaveChangesAsync();

        var postLike = await controller.ToggleLike(JsonDocument.Parse("""
        {
          "target_type": "post",
          "target_id": 10
        }
        """).RootElement);

        var postOk = postLike.Should().BeOfType<OkObjectResult>().Subject;
        using var postDocument = JsonDocument.Parse(JsonSerializer.Serialize(postOk.Value));
        postDocument.RootElement.GetProperty("success").GetBoolean().Should().BeTrue();
        var postData = postDocument.RootElement.GetProperty("data");
        postData.GetProperty("action").GetString().Should().Be("liked");
        postData.GetProperty("status").GetString().Should().Be("liked");
        postData.GetProperty("likes_count").GetInt32().Should().Be(1);
        db.PostLikes.Count(l => l.TenantId == 1 && l.PostId == 10 && l.UserId == 2).Should().Be(1);

        var postUnlike = await controller.ToggleLike(JsonDocument.Parse("""
        {
          "target_type": "post",
          "target_id": 10
        }
        """).RootElement);

        var postUnlikeOk = postUnlike.Should().BeOfType<OkObjectResult>().Subject;
        using var postUnlikeDocument = JsonDocument.Parse(JsonSerializer.Serialize(postUnlikeOk.Value));
        var postUnlikeData = postUnlikeDocument.RootElement.GetProperty("data");
        postUnlikeData.GetProperty("action").GetString().Should().Be("unliked");
        postUnlikeData.GetProperty("likes_count").GetInt32().Should().Be(0);

        var listingLike = await controller.ToggleLike(JsonDocument.Parse("""
        {
          "target_type": "listing",
          "target_id": 20
        }
        """).RootElement);

        var listingOk = listingLike.Should().BeOfType<OkObjectResult>().Subject;
        using var listingDocument = JsonDocument.Parse(JsonSerializer.Serialize(listingOk.Value));
        var listingData = listingDocument.RootElement.GetProperty("data");
        listingData.GetProperty("action").GetString().Should().Be("liked");
        listingData.GetProperty("likes_count").GetInt32().Should().Be(1);
        db.ContentLikes.Count(r =>
            r.TenantId == 1 &&
            r.TargetType == "listing" &&
            r.TargetId == 20 &&
            r.UserId == 2).Should().Be(1);
    }

    [Fact]
    public async Task Likers_ReturnsLaravelReactLikersResultShape()
    {
        var tenant = CreateTenantContext();
        await using var db = CreateDbContext(tenant);
        var controller = CreateController(db, tenant, userId: 2);

        db.Users.Add(new User
        {
            Id = 1,
            TenantId = 1,
            Email = "admin@example.test",
            PasswordHash = "hash",
            FirstName = "Admin",
            LastName = "User",
            Role = "admin",
            IsActive = true
        });
        db.FeedPosts.Add(new FeedPost
        {
            Id = 10,
            TenantId = 1,
            UserId = 2,
            Content = "Liked post"
        });
        db.PostLikes.Add(new PostLike
        {
            TenantId = 1,
            PostId = 10,
            UserId = 1,
            CreatedAt = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc)
        });
        await db.SaveChangesAsync();

        var result = await controller.Likers(JsonDocument.Parse("""
        {
          "target_type": "post",
          "target_id": 10,
          "page": 1,
          "limit": 20
        }
        """).RootElement);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        document.RootElement.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = document.RootElement.GetProperty("data");
        data.GetProperty("total_count").GetInt32().Should().Be(1);
        data.GetProperty("page").GetInt32().Should().Be(1);
        data.GetProperty("has_more").GetBoolean().Should().BeFalse();
        var liker = data.GetProperty("likers").EnumerateArray().Should().ContainSingle().Subject;
        liker.GetProperty("id").GetInt32().Should().Be(1);
        liker.GetProperty("name").GetString().Should().Be("Admin User");
        liker.GetProperty("avatar_url").GetString().Should().Be("/assets/img/defaults/default_avatar.png");
        liker.GetProperty("liked_at").GetString().Should().Contain("2026-01-02");
        liker.GetProperty("liked_at_formatted").GetString().Should().Be("Jan 2, 2026");
    }

    private static NexusDbContext CreateDbContext(TenantContext tenant)
    {
        var options = new DbContextOptionsBuilder<NexusDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new NexusDbContext(options, tenant);
    }

    private static TenantContext CreateTenantContext()
    {
        var tenant = new TenantContext();
        tenant.SetTenant(1);
        return tenant;
    }

    private static V15SocialCompatibilityController CreateController(NexusDbContext db, TenantContext tenant, int userId)
    {
        var configuration = new ConfigurationBuilder().Build();
        var push = new PushNotificationService(
            db,
            tenant,
            configuration,
            NullLogger<PushNotificationService>.Instance);

        var controller = new V15SocialCompatibilityController(db, tenant, push, configuration)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        new[]
                        {
                            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                            new Claim("tenant_id", "1")
                        },
                        "TestAuth"))
                }
            }
        };

        return controller;
    }
}
