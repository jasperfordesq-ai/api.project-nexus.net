// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Data;
using Nexus.Api.Entities;

namespace Nexus.Api.Tests;

public class CaringCommunityHourGiftsControllerUnitTests
{
    [Fact]
    public void Actions_ExposeLaravelHourGiftRoutes()
    {
        var controllerType = ResolveControllerType();

        controllerType.Should().NotBeNull();
        var type = controllerType!;
        type.GetCustomAttribute<RouteAttribute>()?.Template
            .Should().Be("api/caring-community/hour-gifts");
        type.GetMethod("Inbox")
            ?.GetCustomAttribute<HttpGetAttribute>()?.Template.Should().Be("inbox");
        type.GetMethod("Sent")
            ?.GetCustomAttribute<HttpGetAttribute>()?.Template.Should().Be("sent");
        type.GetMethod("Accept")
            ?.GetCustomAttribute<HttpPostAttribute>()?.Template.Should().Be("{id}/accept");
    }

    [Fact]
    public async Task Inbox_ReturnsPendingReceivedGiftsNewestFirstWithSenderPartner()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        db.Users.AddRange(
            User(42, 10, "alice@example.test", "Alice", "Blue", avatarUrl: "https://cdn.example.test/alice.png"),
            User(42, 20, "riley@example.test", "Riley", "Green"),
            User(7, 70, "other@example.test", "Other", "Tenant"));
        db.Add(CreateGift(42, senderId: 10, recipientId: 20, hours: 1.25m, status: "pending", createdAt: DateTime.UtcNow.AddHours(-1), message: "Tea time"));
        db.Add(CreateGift(42, senderId: 10, recipientId: 20, hours: 2.5m, status: "pending", createdAt: DateTime.UtcNow.AddHours(-3), message: null));
        db.Add(CreateGift(42, senderId: 10, recipientId: 20, hours: 9m, status: "accepted", createdAt: DateTime.UtcNow, message: "Not pending"));
        db.Add(CreateGift(42, senderId: 20, recipientId: 10, hours: 3m, status: "pending", createdAt: DateTime.UtcNow, message: "Sent by recipient"));
        db.Add(CreateGift(7, senderId: 70, recipientId: 20, hours: 8m, status: "pending", createdAt: DateTime.UtcNow, message: "Other tenant"));
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 20);

        var result = await InvokeActionAsync(controller, "Inbox", CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        var items = document.RootElement.GetProperty("data").GetProperty("items").EnumerateArray().ToArray();
        items.Should().HaveCount(2);
        items.Select(item => item.GetProperty("hours").GetDecimal())
            .Should().Equal(1.25m, 2.5m);
        items[0].GetProperty("message").GetString().Should().Be("Tea time");
        items[0].GetProperty("status").GetString().Should().Be("pending");
        var partner = items[0].GetProperty("partner");
        partner.GetProperty("id").GetInt32().Should().Be(10);
        partner.GetProperty("name").GetString().Should().Be("Alice Blue");
        partner.GetProperty("avatar_url").GetString().Should().Be("https://cdn.example.test/alice.png");
    }

    [Fact]
    public async Task Sent_ReturnsAllCurrentUserSentGiftsNewestFirstWithRecipientPartner()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        db.Users.AddRange(
            User(42, 10, "sender@example.test", "Sam", "Sender"),
            User(42, 20, "recipient@example.test", "Robin", "Recipient"),
            User(42, 30, "other@example.test", "Other", "Member"),
            User(7, 70, "foreign@example.test", "Foreign", "Tenant"));
        db.Add(CreateGift(42, senderId: 10, recipientId: 20, hours: 4m, status: "accepted", createdAt: DateTime.UtcNow.AddHours(-1), message: "Accepted"));
        db.Add(CreateGift(42, senderId: 10, recipientId: 30, hours: 1m, status: "declined", createdAt: DateTime.UtcNow.AddHours(-2), message: "Declined"));
        db.Add(CreateGift(42, senderId: 30, recipientId: 10, hours: 5m, status: "pending", createdAt: DateTime.UtcNow, message: "Inbox only"));
        db.Add(CreateGift(7, senderId: 10, recipientId: 70, hours: 8m, status: "pending", createdAt: DateTime.UtcNow, message: "Other tenant"));
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 10);

        var result = await InvokeActionAsync(controller, "Sent", CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        var items = document.RootElement.GetProperty("data").GetProperty("items").EnumerateArray().ToArray();
        items.Should().HaveCount(2);
        items.Select(item => item.GetProperty("status").GetString())
            .Should().Equal("accepted", "declined");
        items[0].GetProperty("partner").GetProperty("id").GetInt32().Should().Be(20);
        items[0].GetProperty("partner").GetProperty("name").GetString().Should().Be("Robin Recipient");
    }

    [Fact]
    public async Task Inbox_WhenFeatureDisabled_ReturnsLaravelFeatureDisabledError()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: false);
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 20);

        var result = await InvokeActionAsync(controller, "Inbox", CancellationToken.None);

        var forbidden = result.Should().BeOfType<ObjectResult>().Subject;
        forbidden.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(forbidden.Value));
        document.RootElement.GetProperty("errors")[0].GetProperty("code").GetString()
            .Should().Be("FEATURE_DISABLED");
    }

    [Fact]
    public async Task Accept_MarksPendingGiftAcceptedAndCreditsRecipientWallet()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        SeedFeature(db, 42, enabled: true);
        db.Users.AddRange(
            User(42, 10, "sender@example.test", "Sam", "Sender"),
            User(42, 20, "recipient@example.test", "Robin", "Recipient"));
        db.Add(CreateGift(
            42,
            senderId: 10,
            recipientId: 20,
            hours: 2.75m,
            status: "pending",
            createdAt: DateTime.UtcNow.AddHours(-2),
            message: "For care travel",
            id: 100));
        await db.SaveChangesAsync();
        var controller = CreateController(db, tenant, userId: 20);

        var result = await InvokeActionAsync(controller, "Accept", 100L, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        using var document = JsonDocument.Parse(JsonSerializer.Serialize(ok.Value));
        document.RootElement.GetProperty("data").GetProperty("success").GetBoolean()
            .Should().BeTrue();

        var gift = await db.CaringHourGifts.IgnoreQueryFilters().SingleAsync(g => g.Id == 100);
        gift.Status.Should().Be("accepted");
        gift.AcceptedAt.Should().NotBeNull();
        gift.UpdatedAt.Should().NotBeNull();

        var walletCredit = await db.Transactions.IgnoreQueryFilters().SingleAsync();
        walletCredit.TenantId.Should().Be(42);
        walletCredit.SenderId.Should().Be(10);
        walletCredit.ReceiverId.Should().Be(20);
        walletCredit.Amount.Should().Be(2.75m);
        walletCredit.Status.Should().Be(TransactionStatus.Completed);
        walletCredit.Description.Should().Be("Caring hour gift accepted");
    }

    private static Type? ResolveControllerType()
    {
        return Type.GetType("Nexus.Api.Controllers.CaringCommunityHourGiftsController, Nexus.Api");
    }

    private static Type ResolveGiftType()
    {
        var type = Type.GetType("Nexus.Api.Entities.CaringHourGift, Nexus.Api");
        type.Should().NotBeNull();
        return type!;
    }

    private static Type ResolveServiceType()
    {
        var type = Type.GetType("Nexus.Api.Services.CaringHourGiftService, Nexus.Api");
        type.Should().NotBeNull();
        return type!;
    }

    private static object CreateGift(
        int tenantId,
        int senderId,
        int recipientId,
        decimal hours,
        string status,
        DateTime createdAt,
        string? message,
        long? id = null)
    {
        var type = ResolveGiftType();
        var gift = Activator.CreateInstance(type)!;
        if (id.HasValue)
        {
            Set(gift, "Id", id.Value);
        }
        Set(gift, "TenantId", tenantId);
        Set(gift, "SenderUserId", senderId);
        Set(gift, "RecipientUserId", recipientId);
        Set(gift, "Hours", hours);
        Set(gift, "Message", message);
        Set(gift, "Status", status);
        Set(gift, "CreatedAt", createdAt);
        Set(gift, "UpdatedAt", createdAt);
        return gift;
    }

    private static void Set(object target, string propertyName, object? value)
    {
        var property = target.GetType().GetProperty(propertyName);
        property.Should().NotBeNull();
        property!.SetValue(target, value);
    }

    private static ControllerBase CreateController(NexusDbContext db, TenantContext tenant, int userId)
    {
        var controllerType = ResolveControllerType();
        controllerType.Should().NotBeNull();
        var service = Activator.CreateInstance(ResolveServiceType(), db, tenant);
        var controller = Activator.CreateInstance(controllerType!, service, tenant)
            .Should().BeAssignableTo<ControllerBase>().Subject;
        controller.ControllerContext = ControllerContextFor(userId, tenant.GetTenantIdOrThrow());
        return controller;
    }

    private static async Task<IActionResult> InvokeActionAsync(
        object controller,
        string actionName,
        params object?[] parameters)
    {
        var method = controller.GetType().GetMethod(actionName);
        method.Should().NotBeNull();
        var result = method!.Invoke(controller, parameters);
        return await result.Should().BeAssignableTo<Task<IActionResult>>().Subject;
    }

    private static User User(
        int tenantId,
        int id,
        string email,
        string firstName,
        string lastName,
        string? avatarUrl = null)
    {
        return new User
        {
            Id = id,
            TenantId = tenantId,
            Email = email,
            PasswordHash = "test",
            FirstName = firstName,
            LastName = lastName,
            Role = "member",
            AvatarUrl = avatarUrl,
            IsActive = true
        };
    }

    private static void SeedFeature(NexusDbContext db, int tenantId, bool enabled)
    {
        db.TenantConfigs.Add(new TenantConfig
        {
            TenantId = tenantId,
            Key = "features.caring_community",
            Value = enabled ? "true" : "false"
        });
    }

    private static TenantContext CreateTenantContext(int tenantId)
    {
        var tenant = new TenantContext();
        tenant.SetTenant(tenantId);
        return tenant;
    }

    private static NexusDbContext CreateDbContext(TenantContext tenant)
    {
        var options = new DbContextOptionsBuilder<NexusDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new NexusDbContext(options, tenant);
    }

    private static ControllerContext ControllerContextFor(int userId, int tenantId)
    {
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                    new Claim("tenant_id", tenantId.ToString()),
                    new Claim(ClaimTypes.Role, "member"),
                    new Claim("role", "member")
                ], "Test"))
            }
        };
    }
}
