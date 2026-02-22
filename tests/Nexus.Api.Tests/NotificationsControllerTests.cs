using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Nexus.Api.Data;
using Nexus.Api.Entities;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

/// <summary>
/// Integration tests for notifications endpoints.
/// Tests listing, reading, bulk read, and deletion of notifications.
/// </summary>
[Collection("Integration")]
public class NotificationsControllerTests : IntegrationTestBase
{
    public NotificationsControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    /// <summary>
    /// Seeds a test notification for the member user.
    /// </summary>
    private async Task<int> SeedNotificationAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NexusDbContext>();
        var notification = new Notification
        {
            TenantId = TestData.Tenant1.Id,
            UserId = TestData.MemberUser.Id,
            Type = "test",
            Title = "Test Notification",
            Body = "This is a test notification",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        db.Notifications.Add(notification);
        await db.SaveChangesAsync();
        return notification.Id;
    }

    #region List Notifications

    [Fact]
    public async Task GetNotifications_Authenticated_ReturnsOk()
    {
        // Arrange
        await SeedNotificationAsync();
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/notifications");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
        content.GetProperty("data").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetNotifications_UnreadOnly_FiltersCorrectly()
    {
        // Arrange
        await SeedNotificationAsync();
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/notifications?unread_only=true");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        var notifications = content.GetProperty("data").EnumerateArray().ToList();
        notifications.Should().AllSatisfy(n =>
            n.GetProperty("isRead").GetBoolean().Should().BeFalse());
    }

    [Fact]
    public async Task GetNotifications_Unauthenticated_ReturnsUnauthorized()
    {
        // Act
        var response = await Client.GetAsync("/api/notifications");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region Get Unread Count

    [Fact]
    public async Task GetUnreadCount_ReturnsCount()
    {
        // Arrange
        await SeedNotificationAsync();
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/notifications/unread-count");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("unread_count").GetInt32().Should().BeGreaterThan(0);
    }

    #endregion

    #region Get Single Notification

    [Fact]
    public async Task GetNotification_ExistingNotification_ReturnsOk()
    {
        // Arrange
        var notificationId = await SeedNotificationAsync();
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync($"/api/notifications/{notificationId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("id").GetInt32().Should().Be(notificationId);
        content.GetProperty("title").GetString().Should().Be("Test Notification");
    }

    [Fact]
    public async Task GetNotification_NonExistent_ReturnsNotFound()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/notifications/99999");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region Mark Read

    [Fact]
    public async Task MarkAsRead_UnreadNotification_ReturnsOk()
    {
        // Arrange
        var notificationId = await SeedNotificationAsync();
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PutAsync($"/api/notifications/{notificationId}/read", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("success").GetBoolean().Should().BeTrue();

        // Verify it's actually read
        var getResponse = await Client.GetAsync($"/api/notifications/{notificationId}");
        var getContent = await getResponse.Content.ReadFromJsonAsync<JsonElement>();
        getContent.GetProperty("isRead").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task MarkAllAsRead_ReturnsOkWithCount()
    {
        // Arrange - seed multiple notifications
        await SeedNotificationAsync();
        await SeedNotificationAsync();
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PutAsync("/api/notifications/read-all", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("success").GetBoolean().Should().BeTrue();
        content.GetProperty("marked_count").GetInt32().Should().BeGreaterOrEqualTo(0);
    }

    #endregion

    #region Delete Notification

    [Fact]
    public async Task DeleteNotification_OwnNotification_ReturnsOk()
    {
        // Arrange
        var notificationId = await SeedNotificationAsync();
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.DeleteAsync($"/api/notifications/{notificationId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify it's deleted
        var getResponse = await Client.GetAsync($"/api/notifications/{notificationId}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteNotification_NonExistent_ReturnsNotFound()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.DeleteAsync("/api/notifications/99999");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion
}
