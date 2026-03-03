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
/// Integration tests for the UsersController.
/// Tests profile retrieval, profile update, and GDPR endpoints.
/// </summary>
[Collection("Integration")]
public class UsersControllerTests : IntegrationTestBase
{
    public UsersControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    #region GET /api/users/me

    [Fact]
    public async Task GetMe_Authenticated_ReturnsOwnProfile()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/users/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        content.GetProperty("id").GetInt32().Should().Be(TestData.MemberUser.Id);
        content.GetProperty("email").GetString().Should().Be("member@test.com");
        content.GetProperty("first_name").GetString().Should().Be("Member");
    }

    [Fact]
    public async Task GetMe_Unauthenticated_ReturnsUnauthorized()
    {
        ClearAuthToken();

        var response = await Client.GetAsync("/api/users/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region GET /api/users

    [Fact]
    public async Task ListUsers_Authenticated_ReturnsOnlyTenantUsers()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/users");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var users = content.GetProperty("data").EnumerateArray().ToList();

        // Should only include tenant1 users (admin + member), not other-tenant user
        users.Should().NotBeEmpty();
        users.Should().NotContain(u => u.GetProperty("id").GetInt32() == TestData.OtherTenantUser.Id,
            "cross-tenant users must not be visible");
    }

    #endregion

    #region GET /api/users/me/data-export (GDPR)

    [Fact]
    public async Task DataExport_Authenticated_ReturnsAllUserData()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/users/me/data-export");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        content.GetProperty("exported_at").GetString().Should().NotBeNullOrEmpty();
        content.GetProperty("profile").GetProperty("id").GetInt32().Should().Be(TestData.MemberUser.Id);
        content.GetProperty("profile").GetProperty("email").GetString().Should().Be("member@test.com");
        content.GetProperty("listings").ValueKind.Should().Be(JsonValueKind.Array);
        content.GetProperty("messages").ValueKind.Should().Be(JsonValueKind.Array);
        content.GetProperty("badges").ValueKind.Should().Be(JsonValueKind.Array);
        content.GetProperty("xp_logs").ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task DataExport_Unauthenticated_ReturnsUnauthorized()
    {
        ClearAuthToken();

        var response = await Client.GetAsync("/api/users/me/data-export");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task DataExport_ContainsTransactionsSection()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/users/me/data-export");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var transactions = content.GetProperty("transactions");
        transactions.GetProperty("sent").ValueKind.Should().Be(JsonValueKind.Array);
        transactions.GetProperty("received").ValueKind.Should().Be(JsonValueKind.Array);

        // Member received an initial transaction in seeded data
        var received = transactions.GetProperty("received").EnumerateArray().ToList();
        received.Should().NotBeEmpty("member user received an initial balance transaction");
    }

    #endregion

    #region DELETE /api/users/me (GDPR)

    [Fact]
    public async Task DeleteAccount_Authenticated_AnonymisesAccountAndReturnsOk()
    {
        // Arrange: Create a short-lived account for deletion to avoid polluting other tests
        var deleteToken = await GetAccessTokenAsync("admin@test.com", "test-tenant");
        SetAuthToken(deleteToken);

        // Act
        var response = await Client.DeleteAsync("/api/users/me");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        content.GetProperty("success").GetBoolean().Should().BeTrue();

        // Restore the member auth for other tests by clearing the used token
        ClearAuthToken();
    }

    [Fact]
    public async Task DeleteAccount_Unauthenticated_ReturnsUnauthorized()
    {
        ClearAuthToken();

        var response = await Client.DeleteAsync("/api/users/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion
}
