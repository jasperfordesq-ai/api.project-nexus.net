using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

/// <summary>
/// Integration tests for messages/conversations endpoints.
/// Tests sending, reading, unread counts, and conversation management.
/// </summary>
[Collection("Integration")]
public class MessagesControllerTests : IntegrationTestBase
{
    public MessagesControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    #region Send Message Tests

    [Fact]
    public async Task SendMessage_ValidRequest_ReturnsCreated()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/messages", new
        {
            recipient_id = TestData.AdminUser.Id,
            content = "Hello from integration test"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("content").GetString().Should().Be("Hello from integration test");
        content.GetProperty("conversation_id").GetInt32().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task SendMessage_ToSelf_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/messages", new
        {
            recipient_id = TestData.MemberUser.Id,
            content = "Talking to myself"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SendMessage_EmptyContent_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/messages", new
        {
            recipient_id = TestData.AdminUser.Id,
            content = ""
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SendMessage_ToNonExistentUser_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/messages", new
        {
            recipient_id = 99999,
            content = "Hello ghost"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SendMessage_Unauthenticated_ReturnsUnauthorized()
    {
        // Act
        var response = await Client.PostAsJsonAsync("/api/messages", new
        {
            recipient_id = TestData.AdminUser.Id,
            content = "Should fail"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region Conversation Tests

    [Fact]
    public async Task GetConversations_Authenticated_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/messages");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
        content.GetProperty("pagination").GetProperty("page").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task GetConversation_AfterSendingMessage_ReturnsMessages()
    {
        // Arrange - send a message first
        await AuthenticateAsMemberAsync();
        var sendResponse = await Client.PostAsJsonAsync("/api/messages", new
        {
            recipient_id = TestData.AdminUser.Id,
            content = "Test conversation message"
        });
        var sendContent = await sendResponse.Content.ReadFromJsonAsync<JsonElement>();
        var conversationId = sendContent.GetProperty("conversation_id").GetInt32();

        // Act
        var response = await Client.GetAsync($"/api/messages/{conversationId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("messages").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetConversation_NonParticipant_ReturnsNotFound()
    {
        // Arrange - send a message between admin and member
        await AuthenticateAsMemberAsync();
        var sendResponse = await Client.PostAsJsonAsync("/api/messages", new
        {
            recipient_id = TestData.AdminUser.Id,
            content = "Private conversation"
        });
        var sendContent = await sendResponse.Content.ReadFromJsonAsync<JsonElement>();
        var conversationId = sendContent.GetProperty("conversation_id").GetInt32();

        // Act - try to view as other tenant user
        await AuthenticateAsOtherTenantUserAsync();
        var response = await Client.GetAsync($"/api/messages/{conversationId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region Unread Count Tests

    [Fact]
    public async Task GetUnreadCount_ReturnsCount()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/messages/unread-count");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("unread_count").GetInt32().Should().BeGreaterOrEqualTo(0);
    }

    [Fact]
    public async Task MarkConversationRead_ValidConversation_ReturnsOk()
    {
        // Arrange - send a message from admin to member
        await AuthenticateAsAdminAsync();
        var sendResponse = await Client.PostAsJsonAsync("/api/messages", new
        {
            recipient_id = TestData.MemberUser.Id,
            content = "Unread message for member"
        });
        var sendContent = await sendResponse.Content.ReadFromJsonAsync<JsonElement>();
        var conversationId = sendContent.GetProperty("conversation_id").GetInt32();

        // Act - mark as read as member
        await AuthenticateAsMemberAsync();
        var response = await Client.PutAsync($"/api/messages/{conversationId}/read", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("conversation_id").GetInt32().Should().Be(conversationId);
    }

    [Fact]
    public async Task MarkConversationRead_NonParticipant_ReturnsNotFound()
    {
        // Arrange
        await AuthenticateAsMemberAsync();
        var sendResponse = await Client.PostAsJsonAsync("/api/messages", new
        {
            recipient_id = TestData.AdminUser.Id,
            content = "Another message"
        });
        var sendContent = await sendResponse.Content.ReadFromJsonAsync<JsonElement>();
        var conversationId = sendContent.GetProperty("conversation_id").GetInt32();

        // Act - try to mark as read from other tenant
        await AuthenticateAsOtherTenantUserAsync();
        var response = await Client.PutAsync($"/api/messages/{conversationId}/read", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion
}
