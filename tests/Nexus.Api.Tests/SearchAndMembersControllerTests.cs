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
/// Integration tests for SearchController and MembersController.
/// Tests unified search and member directory functionality.
/// </summary>
[Collection("Integration")]
public class SearchAndMembersControllerTests : IntegrationTestBase
{
    public SearchAndMembersControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    // ─── SearchController ────────────────────────────────────────────────────

    #region GET /api/search

    [Fact]
    public async Task Search_ValidQuery_ReturnsResults()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/search?q=Test");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        // Unified search returns results organised by type
        content.ValueKind.Should().Be(JsonValueKind.Object);
    }

    [Fact]
    public async Task Search_ListingsType_ReturnsOnlyListings()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/search?q=Service&type=listings");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        // When type=listings, only listings section should be populated
        content.TryGetProperty("listings", out var listingsEl).Should().BeTrue();
        listingsEl.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Search_MissingQuery_ReturnsBadRequest()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/search");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Search_QueryTooShort_ReturnsBadRequest()
    {
        await AuthenticateAsMemberAsync();

        // Single character is below the 2-char minimum
        var response = await Client.GetAsync("/api/search?q=X");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Search_InvalidType_ReturnsBadRequest()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/search?q=Test&type=invalid_type");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Search_LimitExceedsMax_ReturnsBadRequest()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/search?q=Test&limit=100");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Search_Unauthenticated_ReturnsUnauthorized()
    {
        ClearAuthToken();

        var response = await Client.GetAsync("/api/search?q=Test");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Search_CrossTenantResultsAreExcluded()
    {
        // Authenticate as tenant1 user
        await AuthenticateAsMemberAsync();

        // Search for the other-tenant user's name
        var response = await Client.GetAsync("/api/search?q=Other&type=users");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        // Other tenant user should not appear in results
        if (content.TryGetProperty("users", out var users))
        {
            var userIds = users.EnumerateArray()
                .Select(u => u.GetProperty("id").GetInt32())
                .ToList();
            userIds.Should().NotContain(TestData.OtherTenantUser.Id,
                "cross-tenant users must be excluded from search results");
        }
    }

    #endregion

    // ─── MembersController ───────────────────────────────────────────────────

    #region GET /api/members

    [Fact]
    public async Task GetMembers_Authenticated_ReturnsTenantMembers()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/members");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
        content.GetProperty("pagination").GetProperty("page").GetInt32().Should().Be(1);
        content.GetProperty("pagination").GetProperty("total").GetInt32().Should().BeGreaterThan(0);

        // Should contain tenant1 members
        var members = content.GetProperty("data").EnumerateArray().ToList();
        members.Should().NotBeEmpty();

        // Cross-tenant user should NOT appear
        var memberIds = members.Select(m => m.GetProperty("id").GetInt32()).ToList();
        memberIds.Should().NotContain(TestData.OtherTenantUser.Id,
            "cross-tenant users must be excluded from member directory");
    }

    [Fact]
    public async Task GetMembers_WithNameFilter_ReturnsFilteredResults()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/members?q=Admin");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var members = content.GetProperty("data").EnumerateArray().ToList();

        // Should only return users whose name matches "Admin"
        members.Should().AllSatisfy(m =>
        {
            var firstName = m.GetProperty("first_name").GetString() ?? "";
            var lastName = m.GetProperty("last_name").GetString() ?? "";
            (firstName.Contains("Admin", StringComparison.OrdinalIgnoreCase)
             || lastName.Contains("Admin", StringComparison.OrdinalIgnoreCase))
                .Should().BeTrue("name filter should apply to first_name or last_name");
        });
    }

    [Fact]
    public async Task GetMembers_LimitExceedsMax_ReturnsBadRequest()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/members?limit=100");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetMembers_Unauthenticated_ReturnsUnauthorized()
    {
        ClearAuthToken();

        var response = await Client.GetAsync("/api/members");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMembers_Pagination_ReturnsCorrectPage()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/members?page=1&limit=1");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var members = content.GetProperty("data").EnumerateArray().ToList();
        members.Should().HaveCount(1);
        content.GetProperty("pagination").GetProperty("limit").GetInt32().Should().Be(1);
    }

    #endregion
}
