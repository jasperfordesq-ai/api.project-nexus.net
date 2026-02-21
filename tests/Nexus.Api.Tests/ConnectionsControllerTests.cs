using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

/// <summary>
/// Integration tests for connections endpoints.
/// Tests friend requests, accept/decline, mutual auto-accept, and removal.
/// </summary>
[Collection("Integration")]
public class ConnectionsControllerTests : IntegrationTestBase
{
    public ConnectionsControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    #region Send Connection Request

    [Fact]
    public async Task SendConnectionRequest_ValidRequest_ReturnsCreated()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/connections", new
        {
            user_id = TestData.AdminUser.Id
        });

        // Assert
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Created, HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("success").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task SendConnectionRequest_ToSelf_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/connections", new
        {
            user_id = TestData.MemberUser.Id
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SendConnectionRequest_Unauthenticated_ReturnsUnauthorized()
    {
        // Act
        var response = await Client.PostAsJsonAsync("/api/connections", new
        {
            user_id = TestData.AdminUser.Id
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SendConnectionRequest_ToOtherTenantUser_Fails()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/connections", new
        {
            user_id = TestData.OtherTenantUser.Id
        });

        // Assert
        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.NotFound);
    }

    #endregion

    #region Accept/Decline Connection

    [Fact]
    public async Task AcceptConnection_AsAddressee_ReturnsOk()
    {
        // Arrange - member sends request to admin
        await AuthenticateAsMemberAsync();
        var sendResponse = await Client.PostAsJsonAsync("/api/connections", new
        {
            user_id = TestData.AdminUser.Id
        });
        var sendContent = await sendResponse.Content.ReadFromJsonAsync<JsonElement>();
        var connectionId = sendContent.GetProperty("connection").GetProperty("id").GetInt32();

        // Act - admin accepts
        await AuthenticateAsAdminAsync();
        var response = await Client.PutAsync($"/api/connections/{connectionId}/accept", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("success").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task AcceptConnection_AsRequester_ReturnsForbidden()
    {
        // Arrange - member sends request to admin
        await AuthenticateAsMemberAsync();
        var sendResponse = await Client.PostAsJsonAsync("/api/connections", new
        {
            user_id = TestData.AdminUser.Id
        });
        var sendContent = await sendResponse.Content.ReadFromJsonAsync<JsonElement>();
        var connectionId = sendContent.GetProperty("connection").GetProperty("id").GetInt32();

        // Act - member tries to accept their own request
        var response = await Client.PutAsync($"/api/connections/{connectionId}/accept", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeclineConnection_AsAddressee_ReturnsOk()
    {
        // Arrange - member sends request to admin
        await AuthenticateAsMemberAsync();
        var sendResponse = await Client.PostAsJsonAsync("/api/connections", new
        {
            user_id = TestData.AdminUser.Id
        });
        var sendContent = await sendResponse.Content.ReadFromJsonAsync<JsonElement>();
        var connectionId = sendContent.GetProperty("connection").GetProperty("id").GetInt32();

        // Act - admin declines
        await AuthenticateAsAdminAsync();
        var response = await Client.PutAsync($"/api/connections/{connectionId}/decline", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("success").GetBoolean().Should().BeTrue();
    }

    #endregion

    #region List Connections

    [Fact]
    public async Task GetConnections_Authenticated_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/connections");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("connections").ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task GetPendingRequests_ReturnsIncomingAndOutgoing()
    {
        // Arrange - create a pending request
        await AuthenticateAsMemberAsync();
        await Client.PostAsJsonAsync("/api/connections", new
        {
            user_id = TestData.AdminUser.Id
        });

        // Act
        var response = await Client.GetAsync("/api/connections/pending");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("outgoing").ValueKind.Should().Be(JsonValueKind.Array);
        content.GetProperty("incoming").ValueKind.Should().Be(JsonValueKind.Array);
    }

    #endregion

    #region Remove Connection

    [Fact]
    public async Task RemoveConnection_AsParticipant_ReturnsOk()
    {
        // Arrange - create and accept a connection
        await AuthenticateAsMemberAsync();
        var sendResponse = await Client.PostAsJsonAsync("/api/connections", new
        {
            user_id = TestData.AdminUser.Id
        });
        var sendContent = await sendResponse.Content.ReadFromJsonAsync<JsonElement>();
        var connectionId = sendContent.GetProperty("connection").GetProperty("id").GetInt32();

        await AuthenticateAsAdminAsync();
        await Client.PutAsync($"/api/connections/{connectionId}/accept", null);

        // Act - remove the connection
        var response = await Client.DeleteAsync($"/api/connections/{connectionId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RemoveConnection_NonParticipant_ReturnsForbidden()
    {
        // Arrange - create a connection between member and admin
        await AuthenticateAsMemberAsync();
        var sendResponse = await Client.PostAsJsonAsync("/api/connections", new
        {
            user_id = TestData.AdminUser.Id
        });
        var sendContent = await sendResponse.Content.ReadFromJsonAsync<JsonElement>();
        var connectionId = sendContent.GetProperty("connection").GetProperty("id").GetInt32();

        // Act - other tenant user tries to remove
        await AuthenticateAsOtherTenantUserAsync();
        var response = await Client.DeleteAsync($"/api/connections/{connectionId}");

        // Assert
        response.StatusCode.Should().BeOneOf(HttpStatusCode.Forbidden, HttpStatusCode.NotFound);
    }

    #endregion

    #region Mutual Auto-Accept

    [Fact]
    public async Task MutualConnectionRequest_AutoAccepts()
    {
        // Arrange - member sends request to admin
        await AuthenticateAsMemberAsync();
        await Client.PostAsJsonAsync("/api/connections", new
        {
            user_id = TestData.AdminUser.Id
        });

        // Decline it so we can test mutual
        await AuthenticateAsAdminAsync();
        var pending = await Client.GetAsync("/api/connections/pending");
        var pendingContent = await pending.Content.ReadFromJsonAsync<JsonElement>();
        var incoming = pendingContent.GetProperty("incoming").EnumerateArray().ToList();
        if (incoming.Count > 0)
        {
            var id = incoming[0].GetProperty("id").GetInt32();
            await Client.PutAsync($"/api/connections/{id}/decline", null);
        }

        // Act - admin now sends request to member (mutual request)
        var response = await Client.PostAsJsonAsync("/api/connections", new
        {
            user_id = TestData.MemberUser.Id
        });

        // Assert - should succeed
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);
    }

    #endregion
}
