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
        db.ContentLikes.Count(l =>
            l.TenantId == 1 &&
            l.TargetType == "post" &&
            l.TargetId == 10 &&
            l.UserId == 2).Should().Be(1);

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
        db.ContentLikes.Count(l =>
            l.TenantId == 1 &&
            l.TargetType == "post" &&
            l.TargetId == 10 &&
            l.UserId == 2).Should().Be(0);

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
        db.ContentLikes.Add(new ContentLike
        {
            TenantId = 1,
            TargetType = "post",
            TargetId = 10,
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

    [Fact]
    public async Task Likers_ReturnsLaravelReactPolymorphicLikersForListing()
    {
        var tenant = CreateTenantContext();
        await using var db = CreateDbContext(tenant);
        var controller = CreateController(db, tenant, userId: 2);

        db.Users.AddRange(
            new User
            {
                Id = 1,
                TenantId = 1,
                Email = "first@example.test",
                PasswordHash = "hash",
                FirstName = "First",
                LastName = "Liker",
                Role = "member",
                IsActive = true
            },
            new User
            {
                Id = 3,
                TenantId = 1,
                Email = "second@example.test",
                PasswordHash = "hash",
                FirstName = "Second",
                LastName = "Liker",
                AvatarUrl = "/avatars/second.png",
                Role = "member",
                IsActive = true
            });
        db.ContentLikes.AddRange(
            new ContentLike
            {
                TenantId = 1,
                TargetType = "listing",
                TargetId = 20,
                UserId = 1,
                CreatedAt = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc)
            },
            new ContentLike
            {
                TenantId = 1,
                TargetType = "listing",
                TargetId = 20,
                UserId = 3,
                CreatedAt = new DateTime(2026, 1, 3, 3, 4, 5, DateTimeKind.Utc)
            },
            new ContentLike
            {
                TenantId = 1,
                TargetType = "event",
                TargetId = 20,
                UserId = 1,
                CreatedAt = new DateTime(2026, 1, 4, 3, 4, 5, DateTimeKind.Utc)
            });
        await db.SaveChangesAsync();

        var result = await controller.Likers(JsonDocument.Parse("""
        {
          "target_type": "listing",
          "target_id": 20,
          "page": 1,
          "limit": 5
        }
        """).RootElement);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        document.RootElement.GetProperty("success").GetBoolean().Should().BeTrue();
        var data = document.RootElement.GetProperty("data");
        data.GetProperty("total_count").GetInt32().Should().Be(2);
        data.GetProperty("page").GetInt32().Should().Be(1);
        data.GetProperty("has_more").GetBoolean().Should().BeFalse();
        var likers = data.GetProperty("likers").EnumerateArray().ToArray();
        likers.Should().HaveCount(2);
        likers[0].GetProperty("id").GetInt32().Should().Be(3);
        likers[0].GetProperty("name").GetString().Should().Be("Second Liker");
        likers[0].GetProperty("avatar_url").GetString().Should().Be("/avatars/second.png");
        likers[0].GetProperty("liked_at_formatted").GetString().Should().Be("Jan 3, 2026");
        likers[1].GetProperty("id").GetInt32().Should().Be(1);
        likers[1].GetProperty("avatar_url").GetString().Should().Be("/assets/img/defaults/default_avatar.png");
    }

    [Fact]
    public async Task SocialComments_AcceptsLaravelActionFetchAndSubmitPayloads()
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
            AvatarUrl = "/avatars/member.png",
            Role = "member",
            IsActive = true
        });
        db.Listings.Add(new Listing
        {
            Id = 20,
            TenantId = 1,
            UserId = 2,
            Title = "Commentable listing",
            Description = "Listing with Laravel social comments",
            Type = ListingType.Offer,
            Status = ListingStatus.Active
        });
        db.ThreadedComments.Add(new ThreadedComment
        {
            Id = 100,
            TenantId = 1,
            TargetType = "listing",
            TargetId = 20,
            AuthorId = 2,
            Content = "Existing comment",
            CreatedAt = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc)
        });
        await db.SaveChangesAsync();

        var fetch = await controller.Comments(JsonDocument.Parse("""
        {
          "action": "fetch",
          "target_type": "listing",
          "target_id": 20
        }
        """).RootElement);

        var fetchOk = fetch.Should().BeOfType<OkObjectResult>().Subject;
        using var fetchDocument = JsonDocument.Parse(JsonSerializer.Serialize(fetchOk.Value));
        var fetchData = fetchDocument.RootElement.GetProperty("data");
        fetchData.GetProperty("available_reactions").EnumerateArray().Select(item => item.GetString()).Should().Contain("love");
        var existing = fetchData.GetProperty("comments").EnumerateArray().Should().ContainSingle().Subject;
        existing.GetProperty("id").GetInt32().Should().Be(100);
        existing.GetProperty("content").GetString().Should().Be("Existing comment");
        existing.GetProperty("author_name").GetString().Should().Be("Member User");
        existing.GetProperty("author_avatar").GetString().Should().Be("/avatars/member.png");

        var submit = await controller.Comments(JsonDocument.Parse("""
        {
          "action": "submit",
          "target_type": "listing",
          "target_id": 20,
          "parent_id": 100,
          "content": "Reply from legacy social comments"
        }
        """).RootElement);

        var submitOk = submit.Should().BeOfType<OkObjectResult>().Subject;
        using var submitDocument = JsonDocument.Parse(JsonSerializer.Serialize(submitOk.Value));
        var submitData = submitDocument.RootElement.GetProperty("data");
        submitData.GetProperty("status").GetString().Should().Be("success");
        submitData.GetProperty("comment").GetProperty("content").GetString().Should().Be("Reply from legacy social comments");
        db.ThreadedComments.Count(c => c.TenantId == 1 && c.TargetType == "listing" && c.TargetId == 20 && c.ParentId == 100)
            .Should().Be(1);
    }

    [Fact]
    public async Task MentionSearchLegacy_ReturnsLaravelUsersEnvelope()
    {
        var tenant = CreateTenantContext();
        await using var db = CreateDbContext(tenant);
        var controller = CreateController(db, tenant, userId: 2);

        db.Users.AddRange(
            new User
            {
                Id = 1,
                TenantId = 1,
                Email = "alina@example.test",
                PasswordHash = "hash",
                FirstName = "Alina",
                LastName = "Able",
                AvatarUrl = "/avatars/alina.png",
                Role = "member",
                IsActive = true
            },
            new User
            {
                Id = 3,
                TenantId = 2,
                Email = "alina-other@example.test",
                PasswordHash = "hash",
                FirstName = "Alina",
                LastName = "Other",
                Role = "member",
                IsActive = true
            },
            new User
            {
                Id = 4,
                TenantId = 1,
                Email = "inactive@example.test",
                PasswordHash = "hash",
                FirstName = "Alina",
                LastName = "Inactive",
                Role = "member",
                IsActive = false
            });
        await db.SaveChangesAsync();

        var result = await controller.MentionSearch(JsonDocument.Parse("""
        {
          "query": "Ali"
        }
        """).RootElement);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        document.RootElement.GetProperty("success").GetBoolean().Should().BeTrue();
        var users = document.RootElement.GetProperty("data").GetProperty("users").EnumerateArray().ToArray();
        users.Should().ContainSingle();
        users[0].GetProperty("id").GetInt32().Should().Be(1);
        users[0].GetProperty("name").GetString().Should().Be("Alina Able");
        users[0].GetProperty("first_name").GetString().Should().Be("Alina");
        users[0].GetProperty("username").GetString().Should().Be("alina@example.test");
        users[0].GetProperty("avatar_url").GetString().Should().Be("/avatars/alina.png");
    }

    [Fact]
    public async Task SocialReaction_TogglesLaravelCommentReactionPayload()
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
        db.ThreadedComments.Add(new ThreadedComment
        {
            Id = 100,
            TenantId = 1,
            TargetType = "listing",
            TargetId = 20,
            AuthorId = 2,
            Content = "Reactable comment"
        });
        await db.SaveChangesAsync();

        var add = await controller.ToggleReaction(null, JsonDocument.Parse("""
        {
          "comment_id": 100,
          "emoji": "love"
        }
        """).RootElement);

        var addOk = add.Should().BeOfType<OkObjectResult>().Subject;
        using var addDocument = JsonDocument.Parse(JsonSerializer.Serialize(addOk.Value));
        var addData = addDocument.RootElement.GetProperty("data");
        addData.GetProperty("action").GetString().Should().Be("added");
        addData.GetProperty("reactions").GetProperty("love").GetInt32().Should().Be(1);
        db.CommentReactions.Count(r => r.TenantId == 1 && r.CommentId == 100 && r.UserId == 2 && r.ReactionType == "love")
            .Should().Be(1);

        var remove = await controller.ToggleReaction(null, JsonDocument.Parse("""
        {
          "target_id": 100,
          "emoji": "love"
        }
        """).RootElement);

        var removeOk = remove.Should().BeOfType<OkObjectResult>().Subject;
        using var removeDocument = JsonDocument.Parse(JsonSerializer.Serialize(removeOk.Value));
        var removeData = removeDocument.RootElement.GetProperty("data");
        removeData.GetProperty("action").GetString().Should().Be("removed");
        removeData.GetProperty("reactions").EnumerateObject().Should().BeEmpty();
        db.CommentReactions.Count(r => r.TenantId == 1 && r.CommentId == 100 && r.UserId == 2)
            .Should().Be(0);
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
