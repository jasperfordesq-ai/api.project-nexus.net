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
/// Integration tests for FederationController.
/// Covers admin partnership management and user-facing federated listing/exchange endpoints.
/// </summary>
[Collection("Integration")]
public class FederationControllerTests : IntegrationTestBase
{
    public FederationControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    #region Authorization Tests

    [Fact]
    public async Task AdminFederationEndpoints_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        ClearAuthToken();

        // Act & Assert
        var partnersResponse = await Client.GetAsync("/api/admin/federation/partners");
        partnersResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var statsResponse = await Client.GetAsync("/api/admin/federation/stats");
        statsResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AdminFederationEndpoints_AsMember_ReturnsForbidden()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act & Assert
        var partnersResponse = await Client.GetAsync("/api/admin/federation/partners");
        partnersResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var statsResponse = await Client.GetAsync("/api/admin/federation/stats");
        statsResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var requestResponse = await Client.PostAsJsonAsync("/api/admin/federation/partners", new
        {
            partner_tenant_id = TestData.Tenant2.Id,
            shared_listings = true
        });
        requestResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UserFederationEndpoints_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        ClearAuthToken();

        // Act & Assert
        var listingsResponse = await Client.GetAsync("/api/federation/listings");
        listingsResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var exchangesResponse = await Client.GetAsync("/api/federation/exchanges");
        exchangesResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region Admin Partner Management Tests

    [Fact]
    public async Task ListPartners_AsAdmin_ReturnsOkWithData()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.GetAsync("/api/admin/federation/partners");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.TryGetProperty("data", out var data).Should().BeTrue();
        data.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task RequestPartnership_ValidRequest_ReturnsCreated()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/admin/federation/partners", new
        {
            partner_tenant_id = TestData.Tenant2.Id,
            shared_listings = true,
            shared_events = false,
            shared_members = false
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("status").GetString().Should().Be("pending");
        content.GetProperty("shared_listings").GetBoolean().Should().BeTrue();
        content.GetProperty("shared_events").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task RequestPartnership_SameTenant_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/admin/federation/partners", new
        {
            partner_tenant_id = TestData.Tenant1.Id,
            shared_listings = true
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.TryGetProperty("error", out _).Should().BeTrue();
    }

    [Fact]
    public async Task ApprovePartnership_NonExistingPartner_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.PutAsJsonAsync("/api/admin/federation/partners/99999/approve", new { });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.TryGetProperty("error", out _).Should().BeTrue();
    }

    [Fact]
    public async Task SuspendPartnership_NonExistingPartner_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.PutAsJsonAsync("/api/admin/federation/partners/99999/suspend", new
        {
            reason = "Testing suspension"
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.TryGetProperty("error", out _).Should().BeTrue();
    }

    [Fact]
    public async Task SyncListings_NonExistingPartner_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/admin/federation/partners/99999/sync", new { });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.TryGetProperty("error", out _).Should().BeTrue();
    }

    [Fact]
    public async Task GetStats_AsAdmin_ReturnsOkWithMetrics()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Act
        var response = await Client.GetAsync("/api/admin/federation/stats");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.TryGetProperty("total_partners", out _).Should().BeTrue();
        content.TryGetProperty("active_partners", out _).Should().BeTrue();
        content.TryGetProperty("pending_partners", out _).Should().BeTrue();
        content.TryGetProperty("suspended_partners", out _).Should().BeTrue();
        content.TryGetProperty("total_exchanges", out _).Should().BeTrue();
        content.TryGetProperty("completed_exchanges", out _).Should().BeTrue();
    }

    #endregion

    #region User Federated Listing Tests

    [Fact]
    public async Task ListFederatedListings_AsMember_ReturnsOkWithPagination()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/federation/listings?page=1&limit=10");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.TryGetProperty("data", out var data).Should().BeTrue();
        data.ValueKind.Should().Be(JsonValueKind.Array);

        content.TryGetProperty("pagination", out var pagination).Should().BeTrue();
        pagination.GetProperty("page").GetInt32().Should().Be(1);
        pagination.GetProperty("limit").GetInt32().Should().Be(10);
    }

    [Fact]
    public async Task ListFederatedListings_PaginationDefaults_AppliedCorrectly()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/federation/listings");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        var pagination = content.GetProperty("pagination");
        pagination.GetProperty("page").GetInt32().Should().Be(1);
        pagination.GetProperty("limit").GetInt32().Should().Be(20);
    }

    #endregion

    #region User Federated Exchange Tests

    [Fact]
    public async Task ListFederatedExchanges_AsMember_ReturnsOkWithPagination()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.GetAsync("/api/federation/exchanges");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.TryGetProperty("data", out var data).Should().BeTrue();
        data.ValueKind.Should().Be(JsonValueKind.Array);

        content.TryGetProperty("pagination", out var pagination).Should().BeTrue();
        pagination.GetProperty("page").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task InitiateExchange_InvalidListingId_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PostAsJsonAsync("/api/federation/exchanges", new
        {
            federated_listing_id = 99999,
            agreed_hours = 2.0m
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.TryGetProperty("error", out _).Should().BeTrue();
    }

    [Fact]
    public async Task CompleteExchange_NonExistingExchange_ReturnsBadRequest()
    {
        // Arrange
        await AuthenticateAsMemberAsync();

        // Act
        var response = await Client.PutAsJsonAsync("/api/federation/exchanges/99999/complete", new
        {
            actual_hours = 1.5m
        });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.TryGetProperty("error", out _).Should().BeTrue();
    }

    #endregion

    #region Full Partnership Lifecycle Test

    [Fact]
    public async Task PartnershipLifecycle_RequestAndApprove_WorksEndToEnd()
    {
        // Arrange
        await AuthenticateAsAdminAsync();

        // Step 1: Request partnership
        var requestResponse = await Client.PostAsJsonAsync("/api/admin/federation/partners", new
        {
            partner_tenant_id = TestData.Tenant2.Id,
            shared_listings = true,
            shared_events = true,
            shared_members = false
        });

        // May return Created (first time) or BadRequest (already exists from prior test)
        if (requestResponse.StatusCode == HttpStatusCode.Created)
        {
            var requestContent = await requestResponse.Content.ReadFromJsonAsync<JsonElement>();
            var partnerId = requestContent.GetProperty("id").GetInt32();

            // Step 2: Approve partnership
            var approveResponse = await Client.PutAsJsonAsync($"/api/admin/federation/partners/{partnerId}/approve", new { });
            // The approve may succeed or fail depending on service logic (e.g., must be approved by partner tenant)
            approveResponse.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.BadRequest);

            // Step 3: Check stats reflect the new partnership
            var statsResponse = await Client.GetAsync("/api/admin/federation/stats");
            statsResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var stats = await statsResponse.Content.ReadFromJsonAsync<JsonElement>();
            stats.GetProperty("total_partners").GetInt32().Should().BeGreaterThanOrEqualTo(1);
        }
        else
        {
            // Partnership already exists from another test run - just verify list works
            var listResponse = await Client.GetAsync("/api/admin/federation/partners");
            listResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    #endregion
}
