using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

/// <summary>
/// Integration tests for gamification endpoints.
/// Tests XP profiles, badges, leaderboard, and XP history via HTTP.
/// </summary>
[Collection("Integration")]
public class GamificationControllerTests : IntegrationTestBase
{
    public GamificationControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    #region Profile Tests

    [Fact]
    public async Task GetProfile_Authenticated_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/gamification/profile");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("profile").ValueKind.Should().Be(JsonValueKind.Object);
        content.GetProperty("profile").GetProperty("totalXp").GetInt32().Should().BeGreaterOrEqualTo(0);
        content.GetProperty("profile").GetProperty("level").GetInt32().Should().BeGreaterOrEqualTo(1);
    }

    [Fact]
    public async Task GetProfile_Unauthenticated_ReturnsUnauthorized()
    {
        // Act
        var response = await Client.GetAsync("/api/gamification/profile");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetUserProfile_ExistingUser_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync($"/api/gamification/profile/{TestData.AdminUser.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("totalXp").GetInt32().Should().BeGreaterOrEqualTo(0);
    }

    [Fact]
    public async Task GetUserProfile_NonExistent_ReturnsNotFound()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/gamification/profile/99999");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region Badge Tests

    [Fact]
    public async Task GetBadges_ReturnsAllBadgesWithEarnedStatus()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/gamification/badges");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").GetArrayLength().Should().BeGreaterThan(0);
        content.GetProperty("summary").GetProperty("total").GetInt32().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetMyBadges_ReturnsEarnedBadges()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/gamification/badges/my");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
    }

    #endregion

    #region Leaderboard Tests

    [Fact]
    public async Task GetLeaderboard_Default_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/gamification/leaderboard");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
        content.GetProperty("pagination").ValueKind.Should().Be(JsonValueKind.Object);
    }

    [Fact]
    public async Task GetLeaderboard_WeeklyPeriod_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/gamification/leaderboard?period=week");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("period").GetString().Should().Be("week");
    }

    [Fact]
    public async Task GetLeaderboard_SupportsPagination()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/gamification/leaderboard?page=1&limit=5");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("pagination").GetProperty("limit").GetInt32().Should().Be(5);
    }

    #endregion

    #region XP History

    [Fact]
    public async Task GetXpHistory_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/gamification/xp-history");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
        content.GetProperty("pagination").ValueKind.Should().Be(JsonValueKind.Object);
    }

    #endregion
}
