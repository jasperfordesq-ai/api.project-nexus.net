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
/// Integration tests for the ReviewsController.
/// Tests creating and listing reviews on users and listings.
/// </summary>
[Collection("Integration")]
public class ReviewsControllerTests : IntegrationTestBase
{
    public ReviewsControllerTests(NexusWebApplicationFactory factory) : base(factory) { }

    #region GET /api/users/{id}/reviews

    [Fact]
    public async Task GetUserReviews_Authenticated_ReturnsReviewList()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync($"/api/users/{TestData.AdminUser.Id}/reviews");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        content.GetProperty("data").ValueKind.Should().Be(JsonValueKind.Array);
        content.GetProperty("summary").GetProperty("total_reviews").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        content.GetProperty("pagination").GetProperty("page").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task GetUserReviews_NonExistentUser_ReturnsNotFound()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.GetAsync("/api/users/999999/reviews");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetUserReviews_Unauthenticated_ReturnsUnauthorized()
    {
        ClearAuthToken();

        var response = await Client.GetAsync($"/api/users/{TestData.AdminUser.Id}/reviews");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region POST /api/users/{id}/reviews

    [Fact]
    public async Task CreateUserReview_ValidRequest_ReturnsCreated()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.PostAsJsonAsync($"/api/users/{TestData.AdminUser.Id}/reviews", new
        {
            rating = 5,
            comment = "Excellent service, highly recommended!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        content.GetProperty("rating").GetInt32().Should().Be(5);
        content.GetProperty("comment").GetString().Should().Be("Excellent service, highly recommended!");
        content.GetProperty("reviewer").GetProperty("id").GetInt32().Should().Be(TestData.MemberUser.Id);
    }

    [Fact]
    public async Task CreateUserReview_ReviewYourself_ReturnsBadRequest()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.PostAsJsonAsync($"/api/users/{TestData.MemberUser.Id}/reviews", new
        {
            rating = 5,
            comment = "Self-review attempt"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateUserReview_InvalidRating_ReturnsBadRequest()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.PostAsJsonAsync($"/api/users/{TestData.AdminUser.Id}/reviews", new
        {
            rating = 6, // > 5 is invalid
            comment = "Invalid rating test"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateUserReview_RatingBelowMin_ReturnsBadRequest()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.PostAsJsonAsync($"/api/users/{TestData.AdminUser.Id}/reviews", new
        {
            rating = 0, // < 1 is invalid
            comment = "Invalid rating test"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateUserReview_NonExistentUser_ReturnsNotFound()
    {
        await AuthenticateAsMemberAsync();

        var response = await Client.PostAsJsonAsync("/api/users/999999/reviews", new
        {
            rating = 4,
            comment = "Review for missing user"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateUserReview_Unauthenticated_ReturnsUnauthorized()
    {
        ClearAuthToken();

        var response = await Client.PostAsJsonAsync($"/api/users/{TestData.AdminUser.Id}/reviews", new
        {
            rating = 5,
            comment = "Unauthenticated attempt"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateUserReview_CrossTenantUser_ReturnsNotFound()
    {
        // Authenticate as tenant1 member
        await AuthenticateAsMemberAsync();

        // Attempt to review a user from tenant2
        var response = await Client.PostAsJsonAsync(
            $"/api/users/{TestData.OtherTenantUser.Id}/reviews",
            new { rating = 3, comment = "Cross-tenant attempt" });

        // Other tenant user is not visible due to global query filter
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion
}
