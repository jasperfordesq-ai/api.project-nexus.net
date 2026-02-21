// Copyright © 2024–2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Nexus.Api.Tests.Fixtures;

namespace Nexus.Api.Tests;

/// <summary>
/// Integration tests for the GroupsController.
/// Tests group CRUD operations, membership, and tenant isolation.
/// </summary>
[Collection("Integration")]
public class GroupsControllerTests : IntegrationTestBase
{
    public GroupsControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    #region Create Group

    [Fact]
    public async Task CreateGroup_ValidRequest_ReturnsCreated()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Test Community Group",
            description = "A test group for the community",
            is_public = true
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        var group = content.GetProperty("group");
        group.GetProperty("name").GetString().Should().Be("Test Community Group");
        group.GetProperty("id").GetInt32().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task CreateGroup_MissingName_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/groups", new
        {
            description = "A group without a name"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateGroup_Unauthenticated_ReturnsUnauthorized()
    {
        // Arrange - No authentication
        ClearAuthToken();

        // Act
        var response = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Unauthorized Group"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region Get Groups

    [Fact]
    public async Task GetGroups_Authenticated_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Create a group first
        await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "List Test Group",
            is_public = true
        });

        // Act
        var response = await Client.GetAsync("/api/groups");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").EnumerateArray().Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetMyGroups_ReturnsOnlyJoinedGroups()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Create a group (creator is auto-joined)
        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "My Group Test",
            is_public = true
        });
        createResponse.EnsureSuccessStatusCode();

        // Act
        var response = await Client.GetAsync("/api/groups/my");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        var groups = content.GetProperty("data").EnumerateArray().ToList();
        groups.Should().Contain(g => g.GetProperty("name").GetString() == "My Group Test");
    }

    #endregion

    #region Group Details

    [Fact]
    public async Task GetGroup_ExistingGroup_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Detail Test Group",
            description = "Testing group details"
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Act
        var response = await Client.GetAsync($"/api/groups/{groupId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("group").GetProperty("name").GetString().Should().Be("Detail Test Group");
    }

    [Fact]
    public async Task GetGroup_NonExistent_ReturnsNotFound()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.GetAsync("/api/groups/99999");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region Update Group

    [Fact]
    public async Task UpdateGroup_AsOwner_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Update Test Group"
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Act
        var response = await Client.PutAsJsonAsync($"/api/groups/{groupId}", new
        {
            name = "Updated Group Name",
            description = "Updated description"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("group").GetProperty("name").GetString().Should().Be("Updated Group Name");
    }

    [Fact]
    public async Task UpdateGroup_NotOwner_ReturnsForbidden()
    {
        // Arrange - Create group as admin
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Admin's Group"
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Switch to member user
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PutAsJsonAsync($"/api/groups/{groupId}", new
        {
            name = "Hijacked Name"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    #endregion

    #region Join/Leave Group

    [Fact]
    public async Task JoinGroup_PublicGroup_ReturnsOk()
    {
        // Arrange - Create group as admin
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Public Join Test",
            is_public = true
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Switch to member user
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PostAsync($"/api/groups/{groupId}/join", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task LeaveGroup_AsMember_ReturnsOk()
    {
        // Arrange - Create group and join as member
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Leave Test Group",
            is_public = true
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        await AuthenticateAsMemberAsync();
        await Client.PostAsync($"/api/groups/{groupId}/join", null);

        // Act
        var response = await Client.DeleteAsync($"/api/groups/{groupId}/leave");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    #endregion

    #region Tenant Isolation

    [Fact]
    public async Task GetGroup_FromOtherTenant_ReturnsNotFound()
    {
        // Arrange - Create group in test-tenant
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Tenant Isolated Group"
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Switch to other-tenant user
        await AuthenticateAsOtherTenantUserAsync();

        // Act
        var response = await Client.GetAsync($"/api/groups/{groupId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region Delete Group

    [Fact]
    public async Task DeleteGroup_AsOwner_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Delete Test Group"
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Act
        var response = await Client.DeleteAsync($"/api/groups/{groupId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify deleted
        var getResponse = await Client.GetAsync($"/api/groups/{groupId}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteGroup_NotOwner_ReturnsForbidden()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Admin Owned Group",
            is_public = true
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Member joins and tries to delete
        await AuthenticateAsMemberAsync();
        await Client.PostAsync($"/api/groups/{groupId}/join", null);
        var response = await Client.DeleteAsync($"/api/groups/{groupId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    #endregion

    #region Members Management

    [Fact]
    public async Task GetGroupMembers_ExistingGroup_ReturnsMembers()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Members List Group"
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Act
        var response = await Client.GetAsync($"/api/groups/{groupId}/members");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("data").GetArrayLength().Should().BeGreaterThan(0); // At least the owner
    }

    [Fact]
    public async Task AddMember_AsOwner_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Add Member Group"
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Act - admin adds member
        var response = await Client.PostAsJsonAsync($"/api/groups/{groupId}/members", new
        {
            user_id = TestData.MemberUser.Id
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task AddMember_NotOwnerOrAdmin_ReturnsForbidden()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "No Add Permission Group",
            is_public = true
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Member joins, then tries to add another member
        await AuthenticateAsMemberAsync();
        await Client.PostAsync($"/api/groups/{groupId}/join", null);

        var response = await Client.PostAsJsonAsync($"/api/groups/{groupId}/members", new
        {
            user_id = TestData.AdminUser.Id
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AddMember_AlreadyMember_ReturnsConflict()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Duplicate Member Group",
            is_public = true
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Add member first time
        await Client.PostAsJsonAsync($"/api/groups/{groupId}/members", new
        {
            user_id = TestData.MemberUser.Id
        });

        // Act - try again
        var response = await Client.PostAsJsonAsync($"/api/groups/{groupId}/members", new
        {
            user_id = TestData.MemberUser.Id
        });

        // Assert - controller returns 400 for already-member
        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task RemoveMember_AsOwner_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Remove Member Group"
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Add member
        await Client.PostAsJsonAsync($"/api/groups/{groupId}/members", new
        {
            user_id = TestData.MemberUser.Id
        });

        // Act - remove member
        var response = await Client.DeleteAsync($"/api/groups/{groupId}/members/{TestData.MemberUser.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateMemberRole_AsOwner_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Role Update Group"
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Add member
        await Client.PostAsJsonAsync($"/api/groups/{groupId}/members", new
        {
            user_id = TestData.MemberUser.Id
        });

        // Act - promote to admin
        var response = await Client.PutAsJsonAsync(
            $"/api/groups/{groupId}/members/{TestData.MemberUser.Id}/role",
            new { role = "admin" });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateMemberRole_NotOwner_ReturnsForbidden()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "No Role Change Group",
            is_public = true
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Member joins and tries to change roles
        await AuthenticateAsMemberAsync();
        await Client.PostAsync($"/api/groups/{groupId}/join", null);

        var response = await Client.PutAsJsonAsync(
            $"/api/groups/{groupId}/members/{TestData.AdminUser.Id}/role",
            new { role = "member" });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task TransferOwnership_AsOwner_ReturnsOk()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Transfer Ownership Group"
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Add member first
        await Client.PostAsJsonAsync($"/api/groups/{groupId}/members", new
        {
            user_id = TestData.MemberUser.Id
        });

        // Act
        var response = await Client.PutAsJsonAsync($"/api/groups/{groupId}/transfer-ownership", new
        {
            new_owner_id = TestData.MemberUser.Id
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task TransferOwnership_NotOwner_ReturnsForbidden()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "No Transfer Group",
            is_public = true
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Member joins and tries to transfer
        await AuthenticateAsMemberAsync();
        await Client.PostAsync($"/api/groups/{groupId}/join", null);

        var response = await Client.PutAsJsonAsync($"/api/groups/{groupId}/transfer-ownership", new
        {
            new_owner_id = TestData.MemberUser.Id
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task TransferOwnership_ToNonMember_ReturnsNotFound()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Transfer Non-Member Group"
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Act - transfer to user not in the group
        var response = await Client.PutAsJsonAsync($"/api/groups/{groupId}/transfer-ownership", new
        {
            new_owner_id = TestData.MemberUser.Id
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task JoinGroup_PrivateGroup_ReturnsForbidden()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Private Group",
            is_private = true
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Act - member tries to join private group
        await AuthenticateAsMemberAsync();
        var response = await Client.PostAsync($"/api/groups/{groupId}/join", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task LeaveGroup_AsOwner_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Owner Leave Group"
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Act - owner tries to leave
        var response = await Client.DeleteAsync($"/api/groups/{groupId}/leave");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region Input Validation

    [Fact]
    public async Task CreateGroup_WithInvalidImageUrl_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Test Group",
            image_url = "not-a-valid-url"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateGroup_WithValidImageUrl_ReturnsCreated()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Group With Image",
            image_url = "https://example.com/group-image.jpg"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        var group = content.GetProperty("group");
        group.GetProperty("imageUrl").GetString().Should().Be("https://example.com/group-image.jpg");
    }

    [Fact]
    public async Task UpdateGroup_WithInvalidImageUrl_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        var createResponse = await Client.PostAsJsonAsync("/api/groups", new
        {
            name = "Update Test Group"
        });
        var createContent = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var groupId = createContent.GetProperty("group").GetProperty("id").GetInt32();

        // Act
        var response = await Client.PutAsJsonAsync($"/api/groups/{groupId}", new
        {
            image_url = "invalid-url"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion
}
